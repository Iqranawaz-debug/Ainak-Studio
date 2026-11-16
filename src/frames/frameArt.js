// Turns a frame, a color, and a lens and finish into a canvas that can be drawn.
import { frameColors, ORIGINAL_COLOR_ID } from './colors.js'
import { frameImages } from './index.js'
import { getLensPaint, GRADIENT_FADE } from './look.js'

// How wide the small panel previews are, in pixels
const PREVIEW_WIDTH = 240

function getColorHex(colorId) {
  return frameColors.find((color) => color.id === colorId)?.hex ?? frameColors[0].hex
}

// Load each PNG once
const pngLoads = new Map()

function loadPng(file) {
  if (!pngLoads.has(file)) {
    const load = new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(`Could not load ${file}`))
      image.src = file
    })
    pngLoads.set(file, load)
  }
  return pngLoads.get(file)
}

function hexToRgb(hex) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
}

// Copy a PNG onto a canvas in a new color. Only frame pixels change, and every pixel keeps
// its own transparency, so clear lenses stay clear and tinted lenses keep their tint.
function tintImage(image, hex, frameMinAlpha, width = image.naturalWidth) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round((image.naturalHeight / image.naturalWidth) * width)

  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = pixels

  // Find the frame's typical brightness. Shading is measured against this, rather than
  // being multiplied into the color, so a black frame takes the new color instead of staying black.
  const levels = new Array(256).fill(0)
  let framePixels = 0
  const brightnessAt = (i) => Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= frameMinAlpha) {
      levels[brightnessAt(i)]++
      framePixels++
    }
  }
  let typical = 0
  for (let seen = 0; seen < framePixels / 2; typical++) seen += levels[typical]

  const [red, green, blue] = hexToRgb(hex)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < frameMinAlpha) continue

    // Lighter than typical blends towards white, darker blends towards black
    const shade = (brightnessAt(i) - typical) / 255
    const target = shade > 0 ? 255 : 0
    const amount = Math.abs(shade)
    data[i] = red + (target - red) * amount
    data[i + 1] = green + (target - green) * amount
    data[i + 2] = blue + (target - blue) * amount
  }

  context.putImageData(pixels, 0, 0)
  return canvas
}

// Copy an image onto a new canvas, so that lenses and a finish can be painted on it
function copyToCanvas(image, width) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round((image.naturalHeight / image.naturalWidth) * width)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

// The frame in its color, as a canvas, without any lens or finish yet
async function getFrameCanvas(frame, colorId, width) {
  if (frame.category === 'Classic') {
    // A Classic card can be asked for "Original", which it doesn't have, so it shows its default color
    const image = frameImages[frame.id][colorId] ?? frameImages[frame.id][frameColors[0].id]
    // Only wait if it's still loading, as waiting on a decode can stall while the page is hidden
    if (!image.complete) await image.decode()
    return copyToCanvas(image, width ?? image.naturalWidth)
  }

  const image = await loadPng(frame.file)
  if (colorId === ORIGINAL_COLOR_ID || frame.originalOnly) return copyToCanvas(image, width ?? image.naturalWidth)
  return tintImage(image, getColorHex(colorId), frame.frameMinAlpha, width)
}

// Less solid than this counts as glass and not frame. Classic lenses and the edges of PNG frames are
// well below it. Frames whose PNG has tinted lenses set a higher frameMinAlpha.
const LENS_MAX_ALPHA = 64
// How much more blue than red a pixel must have to count as blue-leaning
const BLUE_LEAN = 12
// A lens is one of the two largest gaps enclosed by the frame, and not a small slot like a rivet
const LENS_COUNT = 2

// Finding the lenses never depends on the color or size, so each frame's are only worked out once
const lensMasks = new Map()

function getLensMask(frame) {
  if (!lensMasks.has(frame.id)) {
    // Always at full size and in the original colors, as thin rims would fade away and let the flood
    // through in a small preview. The result is then scaled down to fit whatever is being painted.
    lensMasks.set(frame.id, getFrameCanvas(frame, ORIGINAL_COLOR_ID).then((canvas) => findLenses(frame, canvas)))
  }
  return lensMasks.get(frame.id)
}

// Find the lenses by flooding in from the edges of the image: any see-through area the flood
// can't reach is enclosed by the frame. Gives a canvas that's solid only where the lenses are,
// and where they start and end, as fractions of the image's height.
function findLenses(frame, canvas) {
  const { width, height } = canvas
  const { data } = canvas.getContext('2d').getImageData(0, 0, width, height)
  const maxAlpha = Math.max(frame.frameMinAlpha ?? 0, LENS_MAX_ALPHA)
  const hasArtLenses = maxAlpha > LENS_MAX_ALPHA
  const seen = new Uint8Array(width * height)
  const stack = new Int32Array(width * height)

  // Whether a pixel is glass. PNGs with tinted lenses also have solid teal streaks in them, and their
  // frames are never blue-leaning, so anything blue-leaning counts as glass too.
  function isGlass(pixel) {
    const i = pixel * 4
    return data[i + 3] < maxAlpha || (hasArtLenses && data[i + 2] > data[i] + BLUE_LEAN)
  }

  // Mark every see-through pixel connected to this one, and return them all
  function flood(start) {
    const found = []
    let size = 0
    stack[size++] = start
    seen[start] = 1
    while (size > 0) {
      const pixel = stack[--size]
      found.push(pixel)
      const x = pixel % width
      const neighbors = [x > 0 ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1, pixel - width, pixel + width]
      for (const next of neighbors) {
        if (next < 0 || next >= seen.length || seen[next] || !isGlass(next)) continue
        seen[next] = 1
        stack[size++] = next
      }
    }
    return found
  }

  // Flood from the border first, which leaves only the enclosed areas
  for (let x = 0; x < width; x++) {
    for (const pixel of [x, (height - 1) * width + x]) {
      if (!seen[pixel] && isGlass(pixel)) flood(pixel)
    }
  }
  for (let y = 0; y < height; y++) {
    for (const pixel of [y * width, y * width + width - 1]) {
      if (!seen[pixel] && isGlass(pixel)) flood(pixel)
    }
  }

  const enclosed = []
  for (let pixel = 0; pixel < seen.length; pixel++) {
    if (!seen[pixel] && isGlass(pixel)) enclosed.push(flood(pixel))
  }
  const lenses = enclosed.sort((a, b) => b.length - a.length).slice(0, LENS_COUNT)

  const mask = document.createElement('canvas')
  mask.width = width
  mask.height = height
  const maskContext = mask.getContext('2d')
  const maskPixels = maskContext.createImageData(width, height)
  let top = height
  let bottom = 0
  for (const pixel of lenses.flat()) {
    maskPixels.data[pixel * 4 + 3] = 255
    const y = Math.floor(pixel / width)
    if (y < top) top = y
    if (y > bottom) bottom = y
  }
  maskContext.putImageData(maskPixels, 0, 0)

  return { mask, top: top / height, bottom: bottom / height }
}

// The closest 2D look for each finish: a fixed sheen painted over the frame. Only 3D has real
// reflections that move with the head. Each is a gradient from the top of the frame to the bottom.
const FINISH_SHEENS = {
  glossy: [
    [0, 'rgba(255, 255, 255, 0.28)'],
    [0.4, 'rgba(255, 255, 255, 0)'],
  ],
  // A flat veil of grey lifts the darks and hides the highlights
  matte: [
    [0, 'rgba(128, 124, 118, 0.24)'],
    [1, 'rgba(128, 124, 118, 0.24)'],
  ],
  metallic: [
    [0, 'rgba(255, 255, 255, 0.5)'],
    [0.28, 'rgba(255, 255, 255, 0.04)'],
    [0.5, 'rgba(0, 0, 0, 0.24)'],
    [0.72, 'rgba(255, 255, 255, 0.34)'],
    [1, 'rgba(0, 0, 0, 0.26)'],
  ],
}

function fillWithGradient(context, stops, top, bottom) {
  const gradient = context.createLinearGradient(0, top, 0, bottom)
  stops.forEach(([position, color]) => gradient.addColorStop(position, color))
  context.fillStyle = gradient
  context.fillRect(0, 0, context.canvas.width, context.canvas.height)
}

// Paint the lens under the frame, spreading slightly under the rims so that no gap shows at their soft edges
function paintLens(context, { mask, top, bottom }, { color, opacity, isGradient }) {
  const { width, height } = context.canvas
  const spread = Math.max(1, Math.round(width / 500))
  const lens = document.createElement('canvas')
  lens.width = width
  lens.height = height
  const lensContext = lens.getContext('2d')
  for (const [x, y] of [[-spread, 0], [spread, 0], [0, -spread], [0, spread], [0, 0]]) {
    lensContext.drawImage(mask, x, y, width, height)
  }

  const [red, green, blue] = hexToRgb(color)
  const paint = (alpha) => `rgba(${red}, ${green}, ${blue}, ${alpha})`
  lensContext.globalCompositeOperation = 'source-in'
  fillWithGradient(
    lensContext,
    [
      [0, paint(opacity)],
      [1, paint(isGradient ? opacity * GRADIENT_FADE : opacity)],
    ],
    top * height,
    bottom * height,
  )

  context.globalCompositeOperation = 'destination-over'
  context.drawImage(lens, 0, 0)
}

// The frame in its color, with the chosen finish and lens painted on, as a canvas
async function paintFrame(frame, colorId, look, width) {
  const canvas = await getFrameCanvas(frame, colorId, width)
  const context = canvas.getContext('2d')
  const lensMask = await getLensMask(frame)

  // Remove any lens that's part of the art
  context.globalCompositeOperation = 'destination-out'
  context.drawImage(lensMask.mask, 0, 0, canvas.width, canvas.height)

  // Only paints where there is already frame
  context.globalCompositeOperation = 'source-atop'
  fillWithGradient(context, FINISH_SHEENS[look.finish], 0, canvas.height)

  paintLens(context, lensMask, getLensPaint(look))
  return canvas
}

// What to draw on the video for this frame, color, and lens and finish
export function getFrameArt(frame, colorId, look) {
  return paintFrame(frame, colorId, look)
}

// Previews are small and reused, so each one is only made once
const previews = new Map()
// A change can repaint all the cards at once. Painting one at a time, with a pause
// between them, lets the video keep running in the meantime.
let previewQueue = Promise.resolve()

// A URL for a preview of this frame and look. The details drawer asks for a larger one.
export function getFramePreview(frame, colorId, look, width = PREVIEW_WIDTH) {
  const key = `${frame.id}/${colorId}/${look.lensType}/${look.lensTint}/${look.finish}/${width}`
  if (!previews.has(key)) {
    const preview = previewQueue.then(async () => (await paintFrame(frame, colorId, look, width)).toDataURL())
    previewQueue = preview.catch(() => {}).then(() => new Promise((resolve) => setTimeout(resolve)))
    previews.set(key, preview)
  }
  return previews.get(key)
}
