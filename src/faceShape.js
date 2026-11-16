// Estimates a face shape from the landmarks and picks frames to recommend.
// This runs entirely in the browser. It is a general style guide, not a measurement.

// Tweak these to change how face shapes are decided
export const FACE_SHAPE_CONFIG = {
  // MediaPipe's landmark numbers
  landmarks: {
    foreheadTop: 10,
    chin: 152,
    leftCheek: 234,
    rightCheek: 454,
    leftJaw: 172,
    rightJaw: 397,
    leftForehead: 54,
    rightForehead: 284,
    noseTip: 1,
  },

  // All ratios are compared with the cheekbone width, for example length = face length / cheekbone width.
  // The first matching rule below wins, and any face that matches none of them is oval.
  // These are starting estimates, spaced around one test portrait (length 1.25, jaw 0.80, forehead 0.87).
  // They have not been checked against a range of real faces. Press D to read the ratios for a face.
  // The length limits sit close together because the landmark model flattens differences:
  // stretching the portrait 20% taller only raised its length ratio about 12%.
  thresholds: {
    oblongMinLength: 1.35, // Long face
    squareMinJaw: 0.85, // Jaw nearly as wide as the cheekbones
    roundMaxLength: 1.17, // Short face
    heartMaxJaw: 0.75, // Narrow jaw...
    heartMinForehead: 0.85, // ...with a wide forehead
  },

  // How much stable, front-facing video to average before deciding
  measureMs: 2000,
  minSamples: 15,
  // Ignore long gaps between frames, for example when the tab was in the background
  maxFrameGapMs: 500,
  // How far the nose can sit from the middle of the cheekbones, as a fraction of cheekbone width
  maxHeadTurn: 0.08,
  // How far the nose can move between frames, as a fraction of cheekbone width
  maxFrameMovement: 0.03,
  // Measure again if the face has been gone this long, as it may be someone else
  resetAfterNoFaceMs: 1500,

  // Wording and the recommended frames for each shape: two Classic and two from More styles
  shapes: {
    round: {
      label: 'Round',
      reason: 'Your face is about as wide as it is long, so angular frames add contrast.',
      recommended: ['square', 'aviator', 'real-rectangle', 'real-wayfarer'],
    },
    square: {
      label: 'Square',
      reason: 'Your jaw is about as wide as your cheekbones, so curved frames soften the angles.',
      recommended: ['round', 'catEye', 'real-round', 'real-cat-eye'],
    },
    oval: {
      label: 'Oval',
      reason: 'Your face is nicely balanced, so all frames suit you. These are a good place to start.',
      recommended: ['round', 'aviator', 'real-round', 'real-wayfarer'],
    },
    heart: {
      label: 'Heart',
      reason: 'Your forehead is wider than your jaw, so softly curved frames add balance.',
      recommended: ['aviator', 'round', 'real-aviator', 'real-round'],
    },
    oblong: {
      label: 'Oblong',
      reason: 'Your face is longer than it is wide, so deeper frames add balance.',
      recommended: ['square', 'round', 'real-square', 'real-oversized'],
    },
  },
}

// Distance between two landmarks in video pixels, as landmarks run from 0 to 1 on each side
function distance(a, b, videoWidth, videoHeight) {
  return Math.hypot((a.x - b.x) * videoWidth, (a.y - b.y) * videoHeight)
}

// The three face ratios for one video frame
export function measureRatios(landmarks, videoWidth, videoHeight) {
  const points = FACE_SHAPE_CONFIG.landmarks
  const measure = (from, to) => distance(landmarks[from], landmarks[to], videoWidth, videoHeight)
  const cheekWidth = measure(points.leftCheek, points.rightCheek)

  return {
    length: measure(points.foreheadTop, points.chin) / cheekWidth,
    jaw: measure(points.leftJaw, points.rightJaw) / cheekWidth,
    forehead: measure(points.leftForehead, points.rightForehead) / cheekWidth,
  }
}

// How far the head is turned: 0 means the nose is exactly between the cheekbones.
// Measured along the line between the cheekbones, so tilting the head doesn't count as turning it.
export function measureHeadTurn(landmarks, videoWidth, videoHeight) {
  const { leftCheek, rightCheek, noseTip } = FACE_SHAPE_CONFIG.landmarks
  const left = landmarks[leftCheek]
  const right = landmarks[rightCheek]
  const nose = landmarks[noseTip]

  const cheekX = (right.x - left.x) * videoWidth
  const cheekY = (right.y - left.y) * videoHeight
  const noseX = (nose.x - (left.x + right.x) / 2) * videoWidth
  const noseY = (nose.y - (left.y + right.y) / 2) * videoHeight

  // Dividing by the width twice gives the distance along the line, as a fraction of the width
  return Math.abs(noseX * cheekX + noseY * cheekY) / (cheekX * cheekX + cheekY * cheekY)
}

// Turn averaged ratios into a face shape id
export function classifyFaceShape({ length, jaw, forehead }) {
  const { oblongMinLength, squareMinJaw, roundMaxLength, heartMaxJaw, heartMinForehead } =
    FACE_SHAPE_CONFIG.thresholds

  if (length >= oblongMinLength) return 'oblong'
  if (jaw >= squareMinJaw) return 'square'
  if (length <= roundMaxLength) return 'round'
  if (jaw <= heartMaxJaw && forehead >= heartMinForehead) return 'heart'
  return 'oval'
}

// Average a list of ratio readings
function averageRatios(samples) {
  const average = (key) => samples.reduce((total, sample) => total + sample[key], 0) / samples.length
  return { length: average('length'), jaw: average('jaw'), forehead: average('forehead') }
}

// Collects readings frame by frame, and settles on one result so it doesn't flicker
export function createFaceShapeMeasurer() {
  const config = FACE_SHAPE_CONFIG
  let result = null
  let samples = []
  let measuredMs = 0
  let lastGoodFrame = null
  let noFaceSince = null

  // Call on every video frame with the largest face (or null) and how many faces were found.
  // Returns the settled result, or null while still measuring.
  return function update(landmarks, faceCount, videoWidth, videoHeight, now) {
    if (!landmarks) {
      noFaceSince ??= now
      lastGoodFrame = null
      if (now - noFaceSince >= config.resetAfterNoFaceMs) {
        result = null
        samples = []
        measuredMs = 0
      }
      return result
    }

    noFaceSince = null
    if (result) return result

    // Pause (but keep what we have) while the view isn't good enough to measure
    const headTurn = measureHeadTurn(landmarks, videoWidth, videoHeight)
    if (faceCount !== 1 || headTurn > config.maxHeadTurn) {
      lastGoodFrame = null
      return null
    }

    const { noseTip, leftCheek, rightCheek } = config.landmarks
    const cheekWidth = distance(landmarks[leftCheek], landmarks[rightCheek], videoWidth, videoHeight)
    const nose = landmarks[noseTip]

    if (lastGoodFrame) {
      const movement = distance(nose, lastGoodFrame.nose, videoWidth, videoHeight) / cheekWidth
      const gap = now - lastGoodFrame.time

      if (movement <= config.maxFrameMovement && gap <= config.maxFrameGapMs) {
        samples.push(measureRatios(landmarks, videoWidth, videoHeight))
        measuredMs += gap
      }
    }
    lastGoodFrame = { nose, time: now }

    if (measuredMs >= config.measureMs && samples.length >= config.minSamples) {
      const ratios = averageRatios(samples)
      const shapeId = classifyFaceShape(ratios)
      result = { ...config.shapes[shapeId], id: shapeId, ratios }
    }
    return result
  }
}
