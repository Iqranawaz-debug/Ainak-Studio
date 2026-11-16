import { aviatorFrame } from './aviator.js'
import { catEyeFrame } from './catEye.js'
import { frameColors } from './colors.js'
import { realisticFrames } from './realistic.js'
import { roundFrame } from './round.js'
import { squareFrame } from './square.js'

// The drawn SVG frames
const classicFrames = [roundFrame, squareFrame, aviatorFrame, catEyeFrame]

// Every frame, in the order they appear in the panel. The first one is the default.
// Each has an id, name, category, lensCenterX, lensCenterY and frameWidthMultiplier,
// plus either svg (Classic) or file (Realistic).
export const frames = [...classicFrames, ...realisticFrames]

// The groups in the panel. The id matches each frame's category, and the label is what people see.
export const frameCategories = [
  { id: 'Classic', label: 'Classic' },
  { id: 'Realistic', label: 'More styles' },
]

// A Classic frame's SVG in one color, as a URL that an image can load
export function frameImageUrl(frame, color) {
  return `data:image/svg+xml,${encodeURIComponent(frame.svg(color))}`
}

// Load every Classic frame in every color once, so switching between them is instant.
// Looked up as frameImages[frameId][colorId], ready to draw on a canvas.
export const frameImages = Object.fromEntries(
  classicFrames.map((frame) => [
    frame.id,
    Object.fromEntries(
      frameColors.map((color) => {
        const image = new Image()
        image.src = frameImageUrl(frame, color.hex)
        return [color.id, image]
      }),
    ),
  ]),
)
