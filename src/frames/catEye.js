import { CLASSIC_FRAME, DEFAULT_FRAME_COLOR, FRAME_VIEW_HEIGHT, frameSvg } from './frameSvg.js'

// Lenses that sweep up to a point at the outer corners
export const catEyeFrame = {
  ...CLASSIC_FRAME,
  id: 'catEye',
  name: 'Classic Cat-eye',
  // Measured where the eye sits (x = 58), from about y = 17 to y = 67.
  // The upswept tip is left out, or the eyes would sit too low in the lens.
  lensCenterY: 42 / FRAME_VIEW_HEIGHT,
  svg: (color = DEFAULT_FRAME_COLOR) =>
    frameSvg(
      color,
      `<path d="M16 11 Q52 14 90 26 Q94 50 72 64 Q50 73 34 58 Q24 44 16 11 Z" />
       <path d="M16 11 L6 7" fill="none" />`,
      'M90 30 Q100 24 110 30',
    ),
}
