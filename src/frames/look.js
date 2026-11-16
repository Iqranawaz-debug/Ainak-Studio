// The lens and finish choices, used by both the 2D and the 3D glasses, and saved in localStorage.
import { readChoice, writeItem } from '../storage.js'
import { frameCatalog } from './catalog.js'
import { CLEAR_LENS_HEX, frameColors, lensTints } from './colors.js'

// opacity is how much of the eyes the lens covers. Keep it low enough that eyes stay visible:
// a gradient is only this dark at its top edge, well above the eyes.
export const lensTypes = [
  { id: 'clear', label: 'Clear', opacity: 0.1 },
  { id: 'light', label: 'Light tint', opacity: 0.22 },
  { id: 'sunglass', label: 'Sunglass tint', opacity: 0.5 },
  { id: 'gradient', label: 'Gradient', opacity: 0.6, isGradient: true },
]

// How strong a gradient is at its bottom edge, compared with its top edge
export const GRADIENT_FADE = 0.12

export const finishes = [
  { id: 'glossy', label: 'Glossy' },
  { id: 'matte', label: 'Matte' },
  { id: 'metallic', label: 'Metallic' },
]

// Each saved choice: its localStorage key and the values it can have
const savedChoices = {
  lensType: { key: 'visuallens.lensType', options: lensTypes },
  lensTint: { key: 'visuallens.lensTint', options: lensTints },
  finish: { key: 'visuallens.finish', options: finishes },
}

// What was chosen. Anything never chosen (or no longer an option) is null, and uses the frame's own.
export function loadLook() {
  return Object.fromEntries(
    Object.entries(savedChoices).map(([name, { key, options }]) => [
      name,
      readChoice(key, (saved) => options.some((option) => option.id === saved)),
    ]),
  )
}

export function saveLook(look) {
  for (const [name, { key }] of Object.entries(savedChoices)) {
    if (look[name]) writeItem(key, look[name])
  }
}

// What this frame wears: the saved choices, or else the lens and finish it comes with
export function getFrameLook(frame, savedLook) {
  const { lensType, lensTint, finish } = frameCatalog[frame.id]
  return {
    lensType: savedLook.lensType ?? lensType,
    lensTint: savedLook.lensTint ?? lensTint,
    finish: savedLook.finish ?? finish,
  }
}

// How to paint a lens: its color, its opacity (at the top edge, for a gradient), and whether it fades
export function getLensPaint({ lensType, lensTint }) {
  const type = lensTypes.find((option) => option.id === lensType)
  const color = lensType === 'clear' ? CLEAR_LENS_HEX : lensTints.find((tint) => tint.id === lensTint).hex
  return { color, opacity: type.opacity, isGradient: Boolean(type.isGradient) }
}

// What the 3D glasses need to know about a frame. A hex of null means the frame's Original color.
export function getGlasses3d(frame, colorId, savedLook) {
  const look = getFrameLook(frame, savedLook)
  return {
    frameId: frame.id,
    hex: frameColors.find((color) => color.id === colorId)?.hex ?? null,
    finish: look.finish,
    lensPaint: getLensPaint(look),
  }
}

// The lens in words, for example "Gradient, green"
export function describeLens({ lensType, lensTint }) {
  const type = lensTypes.find((option) => option.id === lensType)
  if (lensType === 'clear') return type.label
  return `${type.label}, ${lensTints.find((tint) => tint.id === lensTint).label.toLowerCase()}`
}

export function describeFinish({ finish }) {
  return finishes.find((option) => option.id === finish).label
}
