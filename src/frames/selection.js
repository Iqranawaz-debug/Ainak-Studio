// Remembers the chosen frame and color in this browser's localStorage.
import { readChoice, writeItem } from '../storage.js'
import { frameColors, ORIGINAL_COLOR_ID } from './colors.js'
import { frames } from './index.js'

const FRAME_KEY = 'visuallens.frame'
const COLOR_KEY = 'visuallens.color'

function findFrame(frameId) {
  return frames.find((frame) => frame.id === frameId)
}

// "Original" only means something for PNG frames, as Classic frames have no original color
function isColorAllowed(frame, colorId) {
  if (frame.originalOnly) return colorId === ORIGINAL_COLOR_ID
  if (colorId === ORIGINAL_COLOR_ID) return frame.category === 'Realistic'
  return frameColors.some((color) => color.id === colorId)
}

// The color to use when the current one isn't allowed on this frame
function getFallbackColor(frame) {
  return frame.originalOnly ? ORIGINAL_COLOR_ID : frameColors[0].id
}

// The saved choice, falling back to the defaults if it is missing or no longer exists
export function loadSelection() {
  const frame = findFrame(readChoice(FRAME_KEY, findFrame)) ?? frames[0]
  const colorId = readChoice(COLOR_KEY, (saved) => isColorAllowed(frame, saved))

  return { frameId: frame.id, colorId: colorId ?? getFallbackColor(frame) }
}

export function saveSelection({ frameId, colorId }) {
  writeItem(FRAME_KEY, frameId)
  writeItem(COLOR_KEY, colorId)
}

const MODE_KEY = 'visuallens.mode'

// Whether the glasses were last shown in 2D or 3D
export function loadMode() {
  return readChoice(MODE_KEY, (saved) => saved === '2d' || saved === '3d') ?? '2d'
}

export function saveMode(mode) {
  writeItem(MODE_KEY, mode)
}

// Apply a change from the panel, keeping the frame and color a valid pair
export function applySelectionChange(current, change) {
  const next = { ...current, ...change }
  const frame = findFrame(next.frameId)
  const movedToRealistic = frame.category === 'Realistic' && findFrame(current.frameId).category === 'Classic'

  // Show a PNG as it really looks when first moving over to the Realistic group,
  // unless a color was chosen along with it
  if (change.frameId && !change.colorId && movedToRealistic) next.colorId = ORIGINAL_COLOR_ID
  if (!isColorAllowed(frame, next.colorId)) next.colorId = getFallbackColor(frame)
  return next
}
