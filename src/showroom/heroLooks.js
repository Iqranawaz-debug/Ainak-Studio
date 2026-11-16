// What the sign-in page's hero glasses cycle through. There are 4 styles and 5 colors,
// which share no common step, so stepping both each time shows all 20 pairings in turn.
import { lensTints, showroomColors } from '../frames/colors.js'

const BROWN_TINT = lensTints.find((tint) => tint.id === 'brown').hex

// Nearly clear, with just a faint warmth
const CLEAR_LENS = { color: BROWN_TINT, opacity: 0.12, isGradient: false }
// Darker at the top, and fading down so that it still reads as a lens and not a solid fill
const SUNGLASS_LENS = { color: BROWN_TINT, opacity: 0.5, isGradient: true }

// frameId is the frame in glasses3d/frameDefs.js
export const heroStyles = [
  { id: 'round', label: 'Round', frameId: 'real-round', lens: CLEAR_LENS },
  { id: 'square', label: 'Square', frameId: 'real-square', lens: CLEAR_LENS },
  { id: 'aviator', label: 'Aviator', frameId: 'real-aviator', lens: SUNGLASS_LENS },
  { id: 'catEye', label: 'Cat-eye', frameId: 'real-cat-eye', lens: CLEAR_LENS },
]

export const heroColors = showroomColors

// How often the hero changes, and how long it takes to fade out and then in, in ms.
// The two never overlap, so only one frame is ever on show.
export const HERO_CYCLE_MS = 4500
export const HERO_FADE_OUT_MS = 350
export const HERO_FADE_IN_MS = 450

// The look for a step of the cycle. The first look starts on Tortoise, the most eyewear-like.
export function getHeroLook(step) {
  return {
    style: heroStyles[step % heroStyles.length],
    color: heroColors[(step + 1) % heroColors.length],
  }
}
