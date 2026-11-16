import { CLASSIC_FRAME, DEFAULT_FRAME_COLOR, FRAME_VIEW_HEIGHT, frameSvg } from './frameSvg.js'

// Squared lenses with softened corners
export const squareFrame = {
  ...CLASSIC_FRAME,
  id: 'square',
  name: 'Classic Square',
  // The lenses run from y = 14 to y = 66
  lensCenterY: 40 / FRAME_VIEW_HEIGHT,
  svg: (color = DEFAULT_FRAME_COLOR) =>
    frameSvg(
      color,
      `<rect x="24" y="14" width="68" height="52" rx="7" />
       <path d="M24 26 L6 21" fill="none" />`,
      'M92 32 Q100 26 108 32',
    ),
}
