// Shared drawing code for the Classic (SVG) frames.
// Every frame uses the same 200 x 80 canvas, so all frames sit on a face the same way.
// Each frame file sets its own lensCenterY, the vertical middle of its lenses.
const FRAME_VIEW_WIDTH = 200
export const FRAME_VIEW_HEIGHT = 80
export const DEFAULT_FRAME_COLOR = '#1C1917'

// The settings all Classic frames share. The middle of the left lens is 58 units across
// (the right lens mirrors it), and they need no size adjustment.
export const CLASSIC_FRAME = {
  category: 'Classic',
  lensCenterX: 58 / FRAME_VIEW_WIDTH,
  frameWidthMultiplier: 1,
}

// The lens tint stays the same whatever color the frame is
const LENS_TINT_COLOR = '#1C1917'
const LENS_TINT_OPACITY = 0.12

// Build the SVG text for a frame. leftSide is the left lens and temple arm,
// bridge is the path joining the lenses, and color sets the frame but not the lenses.
export function frameSvg(color, leftSide, bridge) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME_VIEW_WIDTH} ${FRAME_VIEW_HEIGHT}" width="800" height="320"
    fill="${LENS_TINT_COLOR}" fill-opacity="${LENS_TINT_OPACITY}" stroke="${color}" stroke-width="5"
    stroke-linecap="round" stroke-linejoin="round">
    ${leftSide}
    <g transform="matrix(-1 0 0 1 ${FRAME_VIEW_WIDTH} 0)">${leftSide}</g>
    <path d="${bridge}" fill="none" />
  </svg>`
}
