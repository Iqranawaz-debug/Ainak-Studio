import { CLASSIC_FRAME, DEFAULT_FRAME_COLOR, FRAME_VIEW_HEIGHT, frameSvg } from './frameSvg.js'

// Round lenses with a curved bridge
export const roundFrame = {
  ...CLASSIC_FRAME,
  id: 'round',
  name: 'Classic Round',
  // The circles are centered on y = 40
  lensCenterY: 40 / FRAME_VIEW_HEIGHT,
  svg: (color = DEFAULT_FRAME_COLOR) =>
    frameSvg(
      color,
      `<circle cx="58" cy="40" r="32" />
       <path d="M27 33 L6 27" fill="none" />`,
      'M90 36 Q100 27 110 36',
    ),
}
