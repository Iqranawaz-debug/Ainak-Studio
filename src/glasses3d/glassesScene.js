// The 3D scene over the video. It has no loop of its own: FaceCamera's detection loop
// calls update() once for each new video frame, so there is only ever one loop running.
import {
  DirectionalLight,
  Matrix4,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { GLASSES_3D, GLASSES_FIT } from '../glassesOverlay.js'
import { buildFrame, createFrameMaterials } from './frameBuilder.js'
import { frameDefs } from './frameDefs.js'
import { createHeadOccluder } from './headOccluder.js'

const toRadians = Math.PI / 180

export function createGlassesScene(canvas, onContextLost) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  canvas.addEventListener('webglcontextlost', onContextLost)

  const scene = new Scene()
  // MediaPipe's head pose is measured from a camera at the origin looking down -z, as here
  const camera = new PerspectiveCamera(GLASSES_3D.cameraFovDegrees, 1, 1, 1000)

  // A soft room for the frames and lenses to reflect, which also lights them. This is made once.
  const environment = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environmentTarget = environment.fromScene(room, 0.04)
  scene.environment = environmentTarget.texture
  scene.environmentIntensity = GLASSES_3D.lightLevel
  environment.dispose()

  // One soft warm light from above and to the side. No shadows, to stay light on phones.
  const keyLight = new DirectionalLight('#FFF4E6', GLASSES_3D.keyLight)
  keyLight.position.set(...GLASSES_3D.keyLightPosition)
  scene.add(keyLight)

  const materials = createFrameMaterials()
  const occluder = createHeadOccluder()
  scene.add(occluder.group)

  // Each frame is built once and then kept, so switching back to one is instant
  const models = new Map()
  let model = null
  let wantedFrameId = null
  let frameReady = Promise.resolve()
  let appliedFinish = null
  let appliedLensPaint = null
  // The second frame in Compare, on one side of the divider
  let secondModel = null
  let wantedSecondId = null

  // Reused every frame, to avoid creating lots of short-lived objects
  const headMatrix = new Matrix4()
  const headPosition = new Vector3()
  const headRotation = new Quaternion()
  const headScale = new Vector3()
  const targetPosition = new Vector3()
  const backward = new Vector3()
  const offset = new Vector3()
  const eyeLine = new Vector3()
  const smoothPosition = new Vector3()
  const smoothRotation = new Quaternion()

  let isTracking = false
  let isDisposed = false

  // Match the video's shape, with enough pixels for how large it appears on screen
  function updateSize(videoWidth, videoHeight) {
    const aspect = videoWidth / videoHeight
    const pixelRatio = Math.min(window.devicePixelRatio || 1, GLASSES_3D.maxPixelRatio)
    // The canvas is cropped to fill its card just as the video is, so work out the uncropped size
    const shownHeight = Math.max(canvas.clientHeight, canvas.clientWidth / aspect)
    const height = Math.round(shownHeight * pixelRatio)
    const width = Math.round(height * aspect)

    if (canvas.width !== width || canvas.height !== height) renderer.setSize(width, height, false)
    if (camera.aspect !== aspect) {
      camera.aspect = aspect
      camera.updateProjectionMatrix()
    }
  }

  // A frame's model, building it first if this is the first time it's needed
  function getModel(frameId) {
    const build = models.get(frameId) ?? buildFrame(frameDefs[frameId], materials)
    models.set(frameId, build)
    return Promise.resolve(build)
  }

  // Put a model on the head, using the latest smoothed position
  function placeModel(built) {
    built.group.position.copy(smoothPosition)
    built.group.quaternion.copy(smoothRotation)
    built.group.scale.setScalar(GLASSES_3D.scale)
    built.updateArms()
  }

  // Show a frame. The old one stays until the new one is ready, which the returned promise says.
  function setFrame(frameId) {
    if (frameId === wantedFrameId) return frameReady
    wantedFrameId = frameId

    frameReady = getModel(frameId)
      .then((built) => {
        if (isDisposed || wantedFrameId !== frameId) return
        if (model) model.group.visible = false
        model = built
        model.group.visible = true
        model.group.position.copy(smoothPosition)
        model.group.quaternion.copy(smoothRotation)
        scene.add(model.group)
      })
      .catch((error) => console.error(error))
    return frameReady
  }

  // Choose the second frame for Compare, or null when it isn't needed
  function setSecondFrame(frameId) {
    if (frameId === wantedSecondId) return
    wantedSecondId = frameId
    if (secondModel) secondModel.group.visible = false
    secondModel = null
    if (!frameId) return

    getModel(frameId)
      .then((built) => {
        if (isDisposed || wantedSecondId !== frameId) return
        secondModel = built
        // A pass of renderSides shows it when its turn comes
        if (built !== model) built.group.visible = false
        scene.add(built.group)
      })
      .catch((error) => console.error(error))
  }

  function hide() {
    isTracking = false
    if (model) model.group.visible = false
    if (secondModel) secondModel.group.visible = false
    occluder.group.visible = false
    renderer.render(scene, camera)
  }

  // The chosen finish and lens paint. This is called on every frame, so only act on a change.
  function setLook(finish, lensPaint) {
    if (finish !== appliedFinish) materials.setFinish(finish)
    if (lensPaint !== appliedLensPaint) materials.setLens(lensPaint)
    appliedFinish = finish
    appliedLensPaint = lensPaint
  }

  // Draw each side of the divider in turn, limited to its own part of the canvas, in one shared canvas.
  // The materials are shared too, so each side sets its own color, lens and finish first.
  function renderSides(sides) {
    const { width, height } = canvas
    renderer.setScissorTest(true)
    for (const { from, to, content, glasses } of sides) {
      const left = Math.round(from * width)
      renderer.setScissor(left, 0, Math.round(to * width) - left, height)

      if (model) model.group.visible = false
      if (secondModel) secondModel.group.visible = false
      const shown = content === 'first' ? model : content === 'second' ? secondModel : null
      if (shown) shown.group.visible = true

      materials.setColor(glasses.hex ?? frameDefs[glasses.frameId]?.originalColor ?? '#1C1917')
      setLook(glasses.finish, glasses.lensPaint)
      renderer.render(scene, camera)
    }
    renderer.setScissorTest(false)
  }

  // Draw the glasses for one video frame. sides splits the view at the divider, or is null for one view.
  function update(landmarks, matrixData, videoWidth, videoHeight, sides) {
    updateSize(videoWidth, videoHeight)

    // The matrix is the head's rotation and position, in centimeters from the camera
    headMatrix.fromArray(matrixData)
    headMatrix.decompose(headPosition, headRotation, headScale)

    // How far the eyes are from the camera
    const [, eyeY, eyeZ] = GLASSES_3D.eyeCorner
    eyeLine.set(0, eyeY, eyeZ).applyMatrix4(headMatrix)
    const eyeDepth = -eyeLine.z

    // Size of the view at the eyes' distance, used to turn landmarks into centimeters
    const halfHeight = eyeDepth * Math.tan((camera.fov * toRadians) / 2)
    const viewHeight = 2 * halfHeight
    const viewWidth = viewHeight * camera.aspect

    const { leftIris, rightIris, leftEyeOuter, rightEyeOuter } = GLASSES_FIT.landmarks
    const eyeLandmarkZ = (landmarks[leftEyeOuter].z + landmarks[rightEyeOuter].z) / 2

    // Where a landmark is in front of the camera. Its z is relative to the eyes, and landmark
    // z uses the same scale as x, which is the video's width.
    function place({ x, y, z }) {
      const depth = eyeDepth + (z - eyeLandmarkZ) * viewWidth
      const scale = depth / eyeDepth
      return { x: (x - 0.5) * viewWidth * scale, y: (0.5 - y) * viewHeight * scale, z: -depth }
    }

    // Anchor on the point between the irises, at the eyes' depth, then apply the offsets
    const irisX = (landmarks[leftIris].x + landmarks[rightIris].x) / 2
    const irisY = (landmarks[leftIris].y + landmarks[rightIris].y) / 2
    targetPosition.set((irisX - 0.5) * viewWidth, (0.5 - irisY) * viewHeight, -eyeDepth)
    offset.set(GLASSES_3D.offsetX, GLASSES_3D.offsetY, GLASSES_3D.offsetZ).applyQuaternion(headRotation)
    targetPosition.add(offset)

    // Jump straight to a face that just appeared, and smooth from then on
    if (isTracking) {
      smoothPosition.lerp(targetPosition, GLASSES_FIT.smoothing)
      smoothRotation.slerp(headRotation, GLASSES_FIT.smoothing)
    } else {
      smoothPosition.copy(targetPosition)
      smoothRotation.copy(headRotation)
    }
    isTracking = true

    if (model) placeModel(model)
    if (secondModel) placeModel(secondModel)

    backward.set(0, 0, -1).applyQuaternion(headRotation)
    occluder.update(landmarks, place, backward, headMatrix)
    occluder.group.visible = true

    if (sides) {
      renderSides(sides)
      return
    }
    if (secondModel) secondModel.group.visible = false
    if (model) model.group.visible = true
    renderer.render(scene, camera)
  }

  return {
    update,
    hide,
    setFrame,
    setSecondFrame,
    setLook,

    // A hex of null means the frame's Original color. Classic frames have none, so they use black.
    setColor(hex) {
      materials.setColor(hex ?? frameDefs[wantedFrameId]?.originalColor ?? '#1C1917')
    },

    // Where both lens centers appear, as fractions of the video (for the debug dots)
    getLensCenters() {
      if (!model) return []
      return [-model.lensCenterX, model.lensCenterX].map((x) => {
        const point = new Vector3(x, 0, 0).applyMatrix4(model.group.matrixWorld).project(camera)
        return { x: (point.x + 1) / 2, y: (1 - point.y) / 2 }
      })
    },

    dispose() {
      isDisposed = true
      canvas.removeEventListener('webglcontextlost', onContextLost)
      for (const build of models.values()) {
        Promise.resolve(build).then((built) => built.dispose())
      }
      materials.dispose()
      occluder.dispose()
      environmentTarget.dispose()
      room.dispose?.()
      renderer.dispose()
      // Give the graphics context back too, as browsers only allow a limited number of them
      renderer.forceContextLoss()
    },
  }
}
