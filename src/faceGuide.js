// Helps people line up with the camera, and says whether a face is being tracked.
// This only reads what detection already gives on each frame, plus the video's brightness.
import { FACE_SHAPE_CONFIG } from './faceShape.js'

// Tweak these to change when the oval confirms and when hints appear.
// They are starting estimates, tried on one test portrait and not yet on real webcams.
export const FACE_GUIDE = {
  // The oval's height, as a fraction of the video card
  ovalHeight: 0.6,
  // Forehead to chin, as a fraction of the visible video's height
  minFaceHeight: 0.38,
  maxFaceHeight: 0.68,
  // How far the face's middle can sit from the middle of the view, as a fraction of its width and height
  maxOffset: 0.12,
  // How far the head can turn sideways, and nod up or down
  maxYawDegrees: 15,
  maxPitchDegrees: 15,
  // Average brightness of the video from 0 to 255: the hint appears below the first and clears above
  // the second, so that it doesn't flicker when the light is in between
  darkBelow: 55,
  brightAbove: 70,
  // How often to measure the brightness, in ms. It changes slowly, so every frame would be wasted.
  brightnessEvery: 500,
  // How long a new result must last before it shows, in ms, so the oval and hints don't flicker
  holdMs: 400,
  // No face for this long means Lost, and then this long means Searching again, in ms
  lostAfterMs: 500,
  searchingAfterMs: 5000,
}

export const guideHints = {
  moreLight: 'More light please',
  moveCloser: 'Move closer',
  moveBack: 'Move back',
  faceCamera: 'Face the camera',
  center: 'Center your face',
}

export const trackingLabels = {
  tracking: 'Tracking',
  searching: 'Searching',
  lost: 'Lost',
}

const toDegrees = 180 / Math.PI

// The size of the tiny copy of the video that the brightness is measured from
const SAMPLE_WIDTH = 32
const SAMPLE_HEIGHT = 18

// Where the face is in the part of the video on screen, how big it is, and how far it's turned.
// The video is cropped to fill its card, so this works from what's visible. Mirroring makes no
// difference, as only the distance from the middle matters.
function measureFace(face, matrix, video) {
  const { foreheadTop, chin } = FACE_SHAPE_CONFIG.landmarks
  const top = face[foreheadTop]
  const bottom = face[chin]

  const shownAspect = video.clientWidth / video.clientHeight
  const videoAspect = video.videoWidth / video.videoHeight
  const shownWidth = Math.min(1, shownAspect / videoAspect)
  const shownHeight = Math.min(1, videoAspect / shownAspect)

  const measured = {
    height: Math.hypot((bottom.x - top.x) * video.videoWidth, (bottom.y - top.y) * video.videoHeight) / (video.videoHeight * shownHeight),
    offsetX: Math.abs((top.x + bottom.x) / 2 - 0.5) / shownWidth,
    offsetY: Math.abs((top.y + bottom.y) / 2 - 0.5) / shownHeight,
    yaw: 0,
    pitch: 0,
  }

  // The head pose matrix's third column is the direction the face points in, and the camera is along z
  if (matrix) {
    const { data } = matrix
    measured.yaw = Math.abs(Math.atan2(data[8], data[10])) * toDegrees
    measured.pitch = Math.abs(Math.atan2(data[9], data[10])) * toDegrees
  }
  return measured
}

// What the oval and hint should say for one video frame
function judgeFace(face, matrix, video, isDark) {
  // With no face there's nothing to line up, though poor light can be the reason why
  if (!face) return { aligned: false, hint: isDark ? 'moreLight' : null }

  const { height, offsetX, offsetY, yaw, pitch } = measureFace(face, matrix, video)
  const tooSmall = height < FACE_GUIDE.minFaceHeight
  const tooBig = height > FACE_GUIDE.maxFaceHeight
  const turned = yaw > FACE_GUIDE.maxYawDegrees || pitch > FACE_GUIDE.maxPitchDegrees
  const offCenter = offsetX > FACE_GUIDE.maxOffset || offsetY > FACE_GUIDE.maxOffset

  // Show one hint at a time, the one that helps most first. Light isn't part of lining up, so it can
  // show alongside a confirmed oval. Angle comes before size, as a nod makes a face look shorter.
  let hint = null
  if (isDark) hint = 'moreLight'
  else if (turned) hint = 'faceCamera'
  else if (tooSmall) hint = 'moveCloser'
  else if (tooBig) hint = 'moveBack'
  else if (offCenter) hint = 'center'

  return { aligned: !tooSmall && !tooBig && !turned && !offCenter, hint }
}

// Remembers the light and the last result between frames. Call update on every video frame.
export function createFaceGuide() {
  const sample = document.createElement('canvas')
  sample.width = SAMPLE_WIDTH
  sample.height = SAMPLE_HEIGHT
  const sampleContext = sample.getContext('2d', { willReadFrequently: true })

  let isDark = false
  let nextBrightnessAt = 0
  let shown = { aligned: false, hint: null }
  let candidate = null
  let candidateSince = 0

  // Average the video's brightness, using a tiny copy of it to keep this cheap
  function measureLight(video, now) {
    if (now < nextBrightnessAt) return
    nextBrightnessAt = now + FACE_GUIDE.brightnessEvery

    sampleContext.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
    const { data } = sampleContext.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
    let total = 0
    for (let i = 0; i < data.length; i += 4) total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    const brightness = total / (SAMPLE_WIDTH * SAMPLE_HEIGHT)

    if (brightness < FACE_GUIDE.darkBelow) isDark = true
    if (brightness > FACE_GUIDE.brightAbove) isDark = false
  }

  return function update(face, matrix, video, now) {
    measureLight(video, now)
    const result = judgeFace(face, matrix, video, isDark)

    // Only change what's shown once this result has lasted long enough
    const key = `${result.aligned}/${result.hint}`
    if (key !== candidate) {
      candidate = key
      candidateSince = now
    }
    if (now - candidateSince >= FACE_GUIDE.holdMs) shown = result
    return shown
  }
}

// Turns "is there a face on this frame" into a status that doesn't flicker on a single missed frame.
// Searching means no face yet, or none for a while. Lost means one was there a moment ago.
export function createTrackingStatus() {
  let lastSeen = null

  return function update(hasFace, now) {
    if (hasFace) lastSeen = now
    if (lastSeen === null) return 'searching'

    const missing = now - lastSeen
    if (missing < FACE_GUIDE.lostAfterMs) return 'tracking'
    return missing < FACE_GUIDE.searchingAfterMs ? 'lost' : 'searching'
  }
}
