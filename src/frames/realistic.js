// The PNG frames, shown as "More styles" in the panel. The images are in public/frames/realistic,
// and their licenses are listed in public/frames/licenses.md.
//
// lensCenterX and lensCenterY mark the middle of the left lens, as fractions of the image.
// They were measured from the pixels of the finished PNGs, not estimated.
// frameWidthMultiplier scales the glasses on top of GLASSES_FIT.widthMultiplier.
// frameMinAlpha is how solid a pixel must be to count as frame when recoloring.
// It is only above 1 for frames with tinted lenses, so that the lenses keep their own color.
// originalOnly marks frames that look bad when recolored, so they only offer the Original swatch.
export const realisticFrames = [
  { id: 'real-round', name: 'Wire Round', file: 'round.png', lensCenterX: 0.234, lensCenterY: 0.5, frameWidthMultiplier: 0.77, frameMinAlpha: 1 },
  { id: 'real-square', name: 'Bold Square', file: 'square.png', lensCenterX: 0.247, lensCenterY: 0.5184, frameWidthMultiplier: 0.77, frameMinAlpha: 1 },
  { id: 'real-rectangle', name: 'Rectangle', file: 'rectangle.png', lensCenterX: 0.22, lensCenterY: 0.5693, frameWidthMultiplier: 0.77, frameMinAlpha: 1 },
  { id: 'real-wayfarer', name: 'Wayfarer', file: 'wayfarer.png', lensCenterX: 0.244, lensCenterY: 0.503, frameWidthMultiplier: 0.77, frameMinAlpha: 1 },
  { id: 'real-aviator', name: 'Aviator', file: 'aviator.png', lensCenterX: 0.2325, lensCenterY: 0.4972, frameWidthMultiplier: 0.77, frameMinAlpha: 240, originalOnly: true },
  { id: 'real-cat-eye', name: 'Cat-eye', file: 'cat-eye.png', lensCenterX: 0.248, lensCenterY: 0.5155, frameWidthMultiplier: 0.82, frameMinAlpha: 1 },
  { id: 'real-oversized', name: 'Oversized', file: 'oversized.png', lensCenterX: 0.239, lensCenterY: 0.513, frameWidthMultiplier: 0.88, frameMinAlpha: 1 },
  { id: 'real-tinted', name: 'Tinted', file: 'tinted.png', lensCenterX: 0.22, lensCenterY: 0.5678, frameWidthMultiplier: 0.77, frameMinAlpha: 240, originalOnly: true },
].map((frame) => ({ ...frame, category: 'Realistic', file: `${import.meta.env.BASE_URL}frames/realistic/${frame.file}` }))
