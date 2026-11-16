// The sign-in page's 3D hero: one pair of glasses from the app's frame builder, on a transparent canvas.
// This file pulls in three.js, so it's only ever imported dynamically, by the sign-in page.
import {
  Box3,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildFrame, createFrameMaterials } from '../glasses3d/frameBuilder.js'
import { frameDefs } from '../glasses3d/frameDefs.js'
import { getHeroLook, HERO_CYCLE_MS, HERO_FADE_IN_MS, HERO_FADE_OUT_MS, heroStyles } from './heroLooks.js'

const MAX_PIXEL_RATIO = 2
// The Performance setting draws fewer pixels, less often
const LOW_POWER_FRAME_MS = 33

// The sway: about 12 degrees either way, once every 14 seconds, and a fixed angle if nothing may move
const TURN_DEGREES = 12
const TURN_SECONDS = 14
const STILL_DEGREES = -8
const toRadians = Math.PI / 180

const CAMERA_FOV = 26
// Every style is scaled to this width across its front, so that they all appear the same size
const FRONT_WIDTH = 12.6
// How much wider the canvas is than the glasses' front. It matches the canvas's size in Showroom.jsx,
// which reaches past the hero's box to leave room for the arms and the sway.
const HERO_BLEED = 1.3
// How strong the glare on the lenses is
const GLARE_OPACITY = 0.3
// The glasses turn around a point just behind their front, so that the sway doesn't swing them sideways
const PIVOT_DEPTH = 1.5
// A small tilt, to see the arms going back
const TILT_RADIANS = 0.07

// A mottled tortoiseshell pattern, drawn once. These colors appear only on the hero glasses.
function createTortoiseTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  context.fillStyle = '#7A4A22'
  context.fillRect(0, 0, 256, 256)

  // A fixed sequence of numbers, so it always looks the same
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const blotchColors = ['#2E1809', '#3D2210', '#A8702F', '#54300F']
  for (let i = 0; i < 130; i++) {
    const x = next() * 256
    const y = next() * 256
    const radius = 8 + next() * 26
    const color = blotchColors[Math.floor(next() * blotchColors.length)]
    // Drawn again on each side, so that the pattern repeats without a seam
    for (const [shiftX, shiftY] of [[0, 0], [-256, 0], [256, 0], [0, -256], [0, 256]]) {
      const gradient = context.createRadialGradient(x + shiftX, y + shiftY, 0, x + shiftX, y + shiftY, radius)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, `${color}00`)
      context.fillStyle = gradient
      context.fillRect(x + shiftX - radius, y + shiftY - radius, radius * 2, radius * 2)
    }
  }

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  // The frame's surfaces measure their texture in centimeters
  texture.repeat.set(0.3, 0.3)
  return texture
}

// A plain white pattern for solid colors. Always having a pattern means the shader is never rebuilt.
function createPlainTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const context = canvas.getContext('2d')
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, 2, 2)
  return new CanvasTexture(canvas)
}

// A soft glare: two slanted bands of light on a transparent tile, which repeats once per lens
function createGlareTexture(tileWidth) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')

  const drawBand = (center, halfWidth, strength) => {
    const gradient = context.createLinearGradient(center - halfWidth, 0, center + halfWidth, 0)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${strength})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = gradient
    context.fillRect(center - halfWidth, -256, halfWidth * 2, 768)
  }
  context.translate(128, 128)
  context.transform(1, 0, -0.55, 1, 0, 0)
  context.translate(-128, -128)
  drawBand(92, 26, 1)
  drawBand(136, 10, 0.7)

  // Fade the bands out toward the tile's top and bottom, so that it never shows an edge where it repeats
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalCompositeOperation = 'destination-in'
  const fade = context.createLinearGradient(0, 0, 0, 256)
  fade.addColorStop(0.08, 'rgba(0, 0, 0, 0)')
  fade.addColorStop(0.35, 'rgba(0, 0, 0, 1)')
  fade.addColorStop(0.65, 'rgba(0, 0, 0, 1)')
  fade.addColorStop(0.92, 'rgba(0, 0, 0, 0)')
  context.fillStyle = fade
  context.fillRect(0, 0, 256, 256)

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  // A lens's surface measures its texture in centimeters, so this makes one tile a lens's spacing wide,
  // and the offset puts the middle of a tile on the middle of each lens
  texture.repeat.set(1 / tileWidth, 1 / tileWidth)
  texture.offset.set(0, 0.5)
  return texture
}

// Gives a built frame the same place and size as every other style, and adds its glare.
// Measured from its rims, which are what the eye sees as the frame's width: the distance from one
// outer edge to the other, including a cat-eye's tips and an aviator's wide lenses.
export function fitHeroFrame(model) {
  const rimBox = new Box3()
  const lensMeshes = []
  model.group.traverse((part) => {
    if (part.geometry?.type === 'ShapeGeometry') lensMeshes.push(part)
    if (part.geometry?.type === 'ExtrudeGeometry') {
      part.geometry.computeBoundingBox()
      rimBox.union(part.geometry.boundingBox)
    }
  })

  const scale = FRONT_WIDTH / (rimBox.max.x - rimBox.min.x)
  model.group.scale.setScalar(scale)
  model.group.position.set(-((rimBox.min.x + rimBox.max.x) / 2) * scale, -((rimBox.min.y + rimBox.max.y) / 2) * scale, PIVOT_DEPTH)

  const glareTexture = createGlareTexture(model.lensCenterX * 2)
  const glareMaterial = new MeshBasicMaterial({ map: glareTexture, transparent: true, opacity: GLARE_OPACITY, depthWrite: false })
  for (const lens of lensMeshes) {
    const glare = new Mesh(lens.geometry, glareMaterial)
    glare.renderOrder = 2
    model.group.add(glare)
  }

  return () => {
    glareTexture.dispose()
    glareMaterial.dispose()
  }
}

// Sets up the hero and resolves once its first picture is on the canvas. Fails if WebGL can't start.
//   canvas: where the 3D is drawn. It stays hidden until reveal() is called.
//   caption: the element naming the look, which fades along with it
//   isStill: draw one fixed picture, with no movement or cycling
//   isLowPower: the Performance setting
//   onLookChange(step): called at the swap, while nothing is on show
//   onContextLost: called if the browser takes WebGL away
export async function createHeroScene({ canvas, caption, isStill, isLowPower, onLookChange, onContextLost }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  canvas.addEventListener('webglcontextlost', onContextLost)

  const scene = new Scene()
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 1, 200)

  // The same soft room and warm key light as the try-on's glasses, a little brighter for a showroom
  const environment = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environmentTarget = environment.fromScene(room, 0.04)
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = 0.6
  environment.dispose()
  const keyLight = new DirectionalLight('#FFF4E6', 1.2)
  keyLight.position.set(5, 9, 8)
  scene.add(keyLight)

  const plainTexture = createPlainTexture()
  const tortoiseTexture = createTortoiseTexture()
  const materials = createFrameMaterials()
  materials.setFinish('glossy')
  materials.frame.map = plainTexture

  // The holder turns, and each frame sits forward in it so that the turn is around a point behind the front
  const holder = new Group()
  holder.rotation.x = TILT_RADIANS
  scene.add(holder)

  // Build every style up front, so that no change of look has to stop and build one
  const models = new Map()
  const glareCleanups = []
  await Promise.all(
    heroStyles.map(async (style) => {
      const model = await buildFrame(frameDefs[style.frameId], materials)
      glareCleanups.push(fitHeroFrame(model))
      model.group.visible = false
      holder.add(model.group)
      models.set(style.id, model)
    }),
  )

  let step = 0
  let shownModel = null

  function applyLook(nextStep) {
    const { style, color } = getHeroLook(nextStep)
    if (shownModel) shownModel.group.visible = false
    shownModel = models.get(style.id)
    shownModel.group.visible = true

    materials.frame.map = color.isTortoise ? tortoiseTexture : plainTexture
    materials.setColor(color.isTortoise ? '#FFFFFF' : color.hex)
    materials.setLens(style.lens)
    step = nextStep
  }

  function draw() {
    renderer.render(scene, camera)
  }

  // Fit the canvas to its box, with the glasses' front always the same share of its width
  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas
    if (!width || !height) return

    const pixelRatio = isLowPower ? 1 : Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)

    const halfView = Math.tan((CAMERA_FOV * toRadians) / 2)
    camera.aspect = width / height
    camera.position.z = PIVOT_DEPTH + ((FRONT_WIDTH / 2) * HERO_BLEED) / (halfView * camera.aspect)
    camera.updateProjectionMatrix()
    draw()
  }

  // The change of look: fade fully out, swap while nothing is on show, then fade in. Only one frame is
  // ever visible, and the caption changes at the swap, so it always matches. These steps run from the
  // loop, so that they pause along with it. fadeTime is how far into the current fade it is, or null.
  let fadeTime = null
  let isFadingIn = false
  let isRevealing = false

  function setOpacity(opacity) {
    canvas.style.opacity = opacity
    // The first reveal is only the hero, as the caption is already showing the right look
    if (!isRevealing) caption.style.opacity = opacity
  }

  function advanceFade(delta) {
    fadeTime += delta

    if (!isFadingIn) {
      setOpacity(Math.max(0, 1 - fadeTime / HERO_FADE_OUT_MS))
      if (fadeTime >= HERO_FADE_OUT_MS) {
        applyLook(step + 1)
        onLookChange(step)
        isFadingIn = true
        fadeTime = 0
      }
      return
    }

    setOpacity(Math.min(1, fadeTime / HERO_FADE_IN_MS))
    if (fadeTime >= HERO_FADE_IN_MS) {
      fadeTime = null
      isFadingIn = false
      isRevealing = false
    }
  }

  // One loop, which stops whenever the tab is hidden or the hero is out of view
  let frameId = null
  let lastTime = 0
  let turnClock = 0
  let cycleClock = 0

  function loop(now) {
    frameId = requestAnimationFrame(loop)
    const elapsed = now - lastTime
    if (isLowPower && elapsed < LOW_POWER_FRAME_MS) return
    lastTime = now

    // Real time, so that a slow device still changes look on schedule, but no big jump after a pause
    const delta = Math.min(elapsed, 1000)
    turnClock += delta
    cycleClock += delta

    holder.rotation.y = Math.sin((turnClock / 1000 / TURN_SECONDS) * Math.PI * 2) * TURN_DEGREES * toRadians
    if (fadeTime !== null) {
      advanceFade(delta)
    } else if (cycleClock >= HERO_CYCLE_MS) {
      cycleClock = 0
      fadeTime = 0
    }
    draw()
  }

  function start() {
    if (isStill || frameId !== null) return
    lastTime = performance.now()
    frameId = requestAnimationFrame(loop)
  }

  function stop() {
    cancelAnimationFrame(frameId)
    frameId = null
  }

  let isInView = true
  function updateRunning() {
    if (isInView && !document.hidden) start()
    else stop()
  }

  document.addEventListener('visibilitychange', updateRunning)
  const viewObserver = new IntersectionObserver(([entry]) => {
    isInView = entry.isIntersecting
    updateRunning()
  })
  viewObserver.observe(canvas)
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(canvas)

  // Prepare every look's shaders now, while the drawn hero is still showing. Otherwise the first
  // aviator would freeze for a moment partway through its crossfade.
  if (!isStill) {
    heroStyles.forEach((style, index) => {
      applyLook(index)
      renderer.compile(scene, camera)
    })
  }

  holder.rotation.y = isStill ? STILL_DEGREES * toRadians : 0
  applyLook(0)
  resize()
  updateRunning()

  return {
    // Show the hero for the first time: straight away if nothing may move, or else with a fade in
    reveal() {
      if (isStill) {
        canvas.style.opacity = 1
        return
      }
      isRevealing = true
      isFadingIn = true
      fadeTime = 0
      cycleClock = 0
    },

    dispose() {
      stop()
      document.removeEventListener('visibilitychange', updateRunning)
      viewObserver.disconnect()
      sizeObserver.disconnect()
      canvas.removeEventListener('webglcontextlost', onContextLost)
      models.forEach((model) => model.dispose())
      glareCleanups.forEach((cleanUp) => cleanUp())
      materials.dispose()
      plainTexture.dispose()
      tortoiseTexture.dispose()
      environmentTarget.dispose()
      room.dispose?.()
      renderer.dispose()
    },
  }
}
