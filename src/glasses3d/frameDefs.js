// Describes all 12 frames in 3D. frameBuilder.js turns these descriptions into geometry.
//
// Classic frames draw lensOutline, using the same lens shapes as their 2D drawings (a 200 x 80 canvas).
// More styles frames reuse parts of their original SVG instead, so they match their 2D shape:
//   parts: which paths in the SVG make up the frame (their order in the file)
//   holes: a path that is really a lens, to cut out of a rim that was drawn solid
//   mirror: a path to also draw mirrored, for art where only one side is usable
//   level: degrees to rotate the art, for art drawn slightly crooked
//
// Every frame also has:
//   lensSize: width compared with GLASSES_3D.frameWidth
//   rimWidth: Classic rim width in cm (More styles rims come from their art)
//   bridge: 'arc', 'keyhole' or 'double'. More styles have no bridge here, as it's in their art.
//   arm: 'acetate' (broad and flat) or 'metal' (thin)
//   originalColor: the frame color shown by the Original swatch
// A frame's lens and finish aren't here, as they're shared with 2D: see frames/look.js and frames/catalog.js.
import { Shape } from 'three'

// Near black, as the Original PNGs are, but with enough value left to catch reflections
const NEAR_BLACK = '#141210'

function circleLens() {
  const shape = new Shape()
  shape.absarc(58, 40, 32, 0, Math.PI * 2, false)
  return shape
}

function squareLens() {
  const [left, right, top, bottom, corner] = [24, 92, 14, 66, 7]
  const shape = new Shape()
  shape.moveTo(left + corner, top)
  shape.lineTo(right - corner, top)
  shape.quadraticCurveTo(right, top, right, top + corner)
  shape.lineTo(right, bottom - corner)
  shape.quadraticCurveTo(right, bottom, right - corner, bottom)
  shape.lineTo(left + corner, bottom)
  shape.quadraticCurveTo(left, bottom, left, bottom - corner)
  shape.lineTo(left, top + corner)
  shape.quadraticCurveTo(left, top, left + corner, top)
  return shape
}

function aviatorLens() {
  const shape = new Shape()
  shape.moveTo(24, 18)
  shape.quadraticCurveTo(56, 6, 90, 18)
  shape.quadraticCurveTo(94, 46, 76, 62)
  shape.quadraticCurveTo(58, 73, 40, 62)
  shape.quadraticCurveTo(20, 46, 24, 18)
  return shape
}

function catEyeLens() {
  const shape = new Shape()
  shape.moveTo(16, 11)
  shape.quadraticCurveTo(52, 14, 90, 26)
  shape.quadraticCurveTo(94, 50, 72, 64)
  shape.quadraticCurveTo(50, 73, 34, 58)
  shape.quadraticCurveTo(24, 44, 16, 11)
  return shape
}

export const frameDefs = {
  round: { lensOutline: circleLens, lensSize: 1, rimWidth: 0.3, bridge: 'keyhole', arm: 'metal' },
  square: { lensOutline: squareLens, lensSize: 1, rimWidth: 0.38, bridge: 'arc', arm: 'acetate' },
  aviator: { lensOutline: aviatorLens, lensSize: 1.02, rimWidth: 0.3, bridge: 'double', arm: 'metal' },
  catEye: { lensOutline: catEyeLens, lensSize: 1.02, rimWidth: 0.38, bridge: 'arc', arm: 'acetate' },

  'real-round': { svg: { file: 'round', parts: [0], level: 0.66 }, lensSize: 1, arm: 'acetate', originalColor: NEAR_BLACK },
  'real-square': { svg: { file: 'square', parts: [0] }, lensSize: 1, arm: 'acetate', originalColor: '#222222' },
  'real-rectangle': { svg: { file: 'rectangle', parts: [0, 1, 2] }, lensSize: 1, arm: 'metal', originalColor: NEAR_BLACK },
  'real-wayfarer': { svg: { file: 'wayfarer', parts: [0] }, lensSize: 1, arm: 'acetate', originalColor: NEAR_BLACK },
  'real-aviator': {
    svg: { file: 'aviator', parts: [21, 31, 32], holes: { 21: 19 }, mirror: [21] },
    lensSize: 1.02,
    arm: 'metal',
    originalColor: '#8C0100',
  },
  'real-cat-eye': { svg: { file: 'cat-eye', parts: [0] }, lensSize: 1.01, arm: 'acetate', originalColor: NEAR_BLACK },
  'real-oversized': { svg: { file: 'oversized', parts: [0] }, lensSize: 1.02, arm: 'acetate', originalColor: NEAR_BLACK },
  'real-tinted': { svg: { file: 'tinted', parts: [7, 8, 9] }, lensSize: 1, arm: 'metal', originalColor: NEAR_BLACK },
}
