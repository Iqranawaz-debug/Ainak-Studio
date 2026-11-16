import { CLASSIC_FRAME, DEFAULT_FRAME_COLOR, FRAME_VIEW_HEIGHT, frameSvg } from './frameSvg.js'

// Teardrop lenses with the classic double bridge
export const aviatorFrame = {
  ...CLASSIC_FRAME,
  id: 'aviator',
  name: 'Classic Aviator',
  // The lenses curve from about y = 12 at the top to about y = 67.5 at the bottom
  lensCenterY: 39.75 / FRAME_VIEW_HEIGHT,
  svg: (color = DEFAULT_FRAME_COLOR) =>
    frameSvg(
      color,
      `<path d="M24 18 Q56 6 90 18 Q94 46 76 62 Q58 73 40 62 Q20 46 24 18 Z" />
       <path d="M24 20 L6 16" fill="none" />`,
      'M90 20 Q100 16 110 20 M92 33 L108 33',
    ),
}
