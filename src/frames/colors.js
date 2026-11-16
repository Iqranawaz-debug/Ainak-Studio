// The extra swatch that shows a Realistic PNG untinted
export const ORIGINAL_COLOR_ID = 'original'

// The colors a frame can be. The first one is the default.
// These are product options for the glasses only, and the one place blue is allowed.
// checkColor is the checkmark on the swatch, chosen to stand out against that color.
export const frameColors = [
  { id: 'black', label: 'Black', hex: '#1C1917', checkColor: '#FAF6F0' },
  { id: 'green', label: 'Green', hex: '#2F6B3F', checkColor: '#FAF6F0' },
  { id: 'blue', label: 'Blue', hex: '#2F5FA8', checkColor: '#FAF6F0' },
  { id: 'yellow', label: 'Yellow', hex: '#E3B505', checkColor: '#1C1917' },
  { id: 'orange', label: 'Orange', hex: '#E8772E', checkColor: '#1C1917' },
  { id: 'pink', label: 'Pink', hex: '#E87FA3', checkColor: '#1C1917' },
  { id: 'cream', label: 'Cream', hex: '#F3E7CF', checkColor: '#1C1917' },
  { id: 'brown', label: 'Deep brown', hex: '#4A2C1A', checkColor: '#FAF6F0' },
]

// The lens tints, also for the glasses and their swatches only. Neutral, brown or green, never blue.
export const lensTints = [
  { id: 'neutral', label: 'Neutral', hex: '#4A4744', checkColor: '#FAF6F0' },
  { id: 'brown', label: 'Brown', hex: '#5C3A21', checkColor: '#FAF6F0' },
  { id: 'green', label: 'Green', hex: '#3E5A32', checkColor: '#FAF6F0' },
]

// The colors the sign-in page's showroom cycles through, on its hero glasses and nowhere else
export const showroomColors = [
  { id: 'black', label: 'Black', hex: '#1C1917' },
  { id: 'tortoise', label: 'Tortoise', hex: '#6B3F1D', isTortoise: true },
  { id: 'coral', label: 'Coral', hex: '#E8553D' },
  { id: 'green', label: 'Green', hex: '#2F6B3F' },
  { id: 'cream', label: 'Cream', hex: '#F3E7CF' },
]

// A clear lens has no tint, only this faint warmth so that it still reads as glass
export const CLEAR_LENS_HEX = '#EFE6D6'
