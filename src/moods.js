// The mood presets. They only change how the video looks on screen and a soft tint behind the page.
// Detection reads the camera's own pixels, so a mood can't affect tracking, fit or the face shape.
//   filter: the CSS filter on the video, and never on the glasses
//   tint: the page's backdrop color, as a share of ink or amber mixed into the ivory
import { readChoice, writeItem } from './storage.js'

const MOOD_KEY = 'visuallens.mood'

export const moods = [
  { id: 'studio', label: 'Studio', filter: 'none', tintColor: null, tintShare: 0 },
  {
    id: 'golden',
    label: 'Golden Hour',
    filter: 'sepia(0.22) saturate(1.2) brightness(1.04)',
    tintColor: 'var(--color-amber)',
    tintShare: 16,
  },
  {
    id: 'noir',
    label: 'Film Noir',
    filter: 'grayscale(1) contrast(1.15) brightness(0.96)',
    tintColor: 'var(--color-ink)',
    tintShare: 10,
  },
]

export function findMood(moodId) {
  return moods.find((mood) => mood.id === moodId) ?? moods[0]
}

// The saved mood, or Studio
export function loadMood() {
  return findMood(readChoice(MOOD_KEY, (saved) => moods.some((mood) => mood.id === saved))).id
}

export function saveMood(moodId) {
  writeItem(MOOD_KEY, moodId)
}

// The solid page color for a mood, for parts of the page that must hide what scrolls beneath them
export function getMoodSurface(mood) {
  return mood.tintColor ? `color-mix(in srgb, ${mood.tintColor} ${mood.tintShare}%, var(--color-ivory))` : 'var(--color-ivory)'
}
