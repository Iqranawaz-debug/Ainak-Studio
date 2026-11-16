// The ways of looking at the glasses, and how the draggable divider splits the video between two sides.

export const views = [
  { id: 'single', label: 'Try on' },
  { id: 'beforeAfter', label: 'Before/after' },
  { id: 'compare', label: 'Compare' },
]

export const modeOptions = [
  { id: '2d', label: '2D' },
  { id: '3d', label: '3D' },
]

// What each side of the divider shows, as seen on screen: no glasses, the chosen frame, or the second frame
const sideContents = {
  beforeAfter: { left: null, right: 'first' },
  compare: { left: 'first', right: 'second' },
}

// Which parts of the canvases show what, as fractions of their width, or null if nothing is split.
// divider is the fraction across the video as seen on screen. The canvases are cropped to fill their
// card and can be mirrored, so that has to be turned into a position on the canvas.
export function getSplitSides({ view, divider, isMirrored }, video) {
  const contents = sideContents[view]
  if (!contents) return null

  const shownFraction = Math.min(1, video.clientWidth / video.clientHeight / (video.videoWidth / video.videoHeight))
  const cut = (1 - shownFraction) / 2 + divider * shownFraction

  // A mirrored canvas has the screen's left side on its right
  return isMirrored
    ? [
        { from: 0, to: 1 - cut, content: contents.right },
        { from: 1 - cut, to: 1, content: contents.left },
      ]
    : [
        { from: 0, to: cut, content: contents.left },
        { from: cut, to: 1, content: contents.right },
      ]
}
