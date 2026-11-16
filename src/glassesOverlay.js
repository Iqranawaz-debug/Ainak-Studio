// Works out where the glasses go on a face, and draws them on the canvas.

// Tweak these to change how the glasses sit on the face
export const GLASSES_FIT = {
  // Frame image width, compared with the distance between the outer eye corners
  widthMultiplier: 2.1,
  // How far to shift the glasses up, as a fraction of the frame width (negative moves them down)
  verticalOffset: -0.01,
  // How far the glasses move towards the face on each video frame (lower is smoother but slower)
  smoothing: 0.3,

  // Fit for individual frames, replacing the values above for that frame. Paste lines from
  // the debug panel's "Copy this frame's values" button here, for example:
  // 'real-round': { widthMultiplier: 1.62, verticalOffset: -0.01 },
  frameOverrides: {},

  // MediaPipe's landmark numbers. The irises place the glasses.
  // The eye corners set the size and tilt, because they don't move when the eyes look around.
  landmarks: { leftIris: 468, rightIris: 473, leftEyeOuter: 33, rightEyeOuter: 263 },

  // Debug mode (press D): the slider ranges and the dots, sized in video pixels
  debug: {
    widthMultiplierRange: { min: 1, max: 3, step: 0.01 },
    verticalOffsetRange: { min: -0.2, max: 0.2, step: 0.005 },
    dotRadius: 7,
    dotOutlineWidth: 3,
    dotOutlineColor: '#FAF6F0',
    irisDotColor: '#E8553D',
    lensDotColor: '#C98A2B',
  },
}

// Tweak these to change the 3D glasses. Distances are in centimeters on the head.
export const GLASSES_3D = {
  // Rim-to-rim width of a standard frame. Each frame's lensSize in frameDefs.js adjusts it.
  frameWidth: 12.4,
  // Makes every frame larger or smaller, on top of frameWidth
  scale: 1,
  // Moves the glasses from the point between the irises: right, up, and forward from the eyes
  offsetX: 0,
  offsetY: 0,
  offsetZ: 2.6,
  // How far back the temple arms reach before curving behind the ears
  armLength: 10,
  // How far out from the middle the arms run along the side of the head
  armX: 6.9,

  // How bright the reflected room is. Higher washes out the frame color so it stops matching its swatch.
  lightLevel: 0.35,
  // The soft key light. It comes from high and to the side, as a light near the camera
  // would glare off the flat rims and turn black frames grey.
  keyLight: 0.9,
  keyLightPosition: [7, 8, 2],

  // Debug mode: draw the invisible head shape in color, to see what is hiding the glasses
  showOccluder: false,
  // How far the head shape reaches back behind the edge of the face mesh
  headDepth: 12,
  // How far the head shape sits behind the real face, so small landmark errors don't nick the frame
  headInset: 1,
  // A simple block for each ear, as the landmarks don't reach them: distance out, up and forward
  // from the middle of the head, then its size
  earX: 8.3,
  earY: 0.5,
  earZ: -2.75,
  earSize: [1, 6.5, 4.5],

  // MediaPipe's head pose assumes this camera, and its face model has this eye corner (x, y, z)
  cameraFovDegrees: 63,
  eyeCorner: [4.445859, 2.663991, 3.173422],
  // Rendering sharper than this costs a lot on phones for little visible gain
  maxPixelRatio: 2,

  // Debug mode (press D): the slider ranges
  debug: {
    scaleRange: { min: 0.7, max: 1.3, step: 0.01 },
    offsetXRange: { min: -3, max: 3, step: 0.05 },
    offsetYRange: { min: -3, max: 3, step: 0.05 },
    offsetZRange: { min: -2, max: 6, step: 0.05 },
    armLengthRange: { min: 5, max: 16, step: 0.1 },
  },
}

// The fit for one frame: its override if it has one, otherwise the shared values
export function getFrameFit(frame) {
  return {
    widthMultiplier: GLASSES_FIT.widthMultiplier * frame.frameWidthMultiplier,
    verticalOffset: GLASSES_FIT.verticalOffset,
    ...GLASSES_FIT.frameOverrides[frame.id],
  }
}

// Debug sliders: change one frame's fit until the page is reloaded. This never touches this file.
export function setFrameFit(frame, change) {
  GLASSES_FIT.frameOverrides[frame.id] = { ...getFrameFit(frame), ...change }
}

// Position (x, y) of the point between the irises, plus the eye distance and rotation, in video pixels
export function getGlassesPose(landmarks, videoWidth, videoHeight) {
  const { leftIris, rightIris, leftEyeOuter, rightEyeOuter } = GLASSES_FIT.landmarks

  // Landmarks run from 0 to 1, so convert them to pixels before measuring
  const dx = (landmarks[rightEyeOuter].x - landmarks[leftEyeOuter].x) * videoWidth
  const dy = (landmarks[rightEyeOuter].y - landmarks[leftEyeOuter].y) * videoHeight

  return {
    x: ((landmarks[leftIris].x + landmarks[rightIris].x) / 2) * videoWidth,
    y: ((landmarks[leftIris].y + landmarks[rightIris].y) / 2) * videoHeight,
    eyeDistance: Math.hypot(dx, dy),
    angle: Math.atan2(dy, dx),
  }
}

function lerp(from, to) {
  return from + (to - from) * GLASSES_FIT.smoothing
}

// Low-pass filter: move part of the way from the last pose to the new one, to stop jitter
export function smoothPose(last, next) {
  return {
    x: lerp(last.x, next.x),
    y: lerp(last.y, next.y),
    eyeDistance: lerp(last.eyeDistance, next.eyeDistance),
    angle: lerp(last.angle, next.angle),
  }
}

// The width of this frame on the video, in video pixels
function getFrameWidth(frame, pose) {
  return pose.eyeDistance * getFrameFit(frame).widthMultiplier
}

// How far to shift the glasses up, in video pixels
function getShiftUp(frame, pose) {
  return getFrameWidth(frame, pose) * getFrameFit(frame).verticalOffset
}

// Draw the frame's art (an image or canvas) so its lens center lands on the pose
export function drawGlasses(context, art, frame, pose) {
  // A Classic frame's image may still be loading on the first few frames
  if (!art.width) return

  const width = getFrameWidth(frame, pose)
  const height = width * (art.height / art.width)
  const top = -frame.lensCenterY * height - getShiftUp(frame, pose)

  context.save()
  context.translate(pose.x, pose.y)
  // Rotating first means "up" follows the tilt of the head
  context.rotate(pose.angle)
  context.drawImage(art, -width / 2, top, width, height)
  context.restore()
}

// A colored dot with a light outline, so it shows up against skin
function drawDot(context, x, y, color) {
  const { dotRadius, dotOutlineWidth, dotOutlineColor } = GLASSES_FIT.debug

  context.fillStyle = color
  context.strokeStyle = dotOutlineColor
  context.lineWidth = dotOutlineWidth
  context.beginPath()
  context.arc(x, y, dotRadius, 0, Math.PI * 2)
  context.fill()
  context.stroke()
}

// 3D debug mode: mark both irises, and both lens centers (given as fractions of the video)
export function drawDebugPoints(context, landmarks, lensCenters) {
  const { canvas } = context
  const { leftIris, rightIris } = GLASSES_FIT.landmarks
  const { irisDotColor, lensDotColor } = GLASSES_FIT.debug

  for (const iris of [landmarks[leftIris], landmarks[rightIris]]) {
    drawDot(context, iris.x * canvas.width, iris.y * canvas.height, irisDotColor)
  }
  for (const lens of lensCenters) {
    drawDot(context, lens.x * canvas.width, lens.y * canvas.height, lensDotColor)
  }
}

// Debug mode: mark both irises and both lens centers, to show how well they line up.
// The iris dots show the latest detection, and the lens dots show the smoothed glasses,
// so the two can drift apart briefly while the head is moving.
export function drawDebugDots(context, landmarks, frame, pose) {
  const { canvas } = context
  const { leftIris, rightIris } = GLASSES_FIT.landmarks
  const { irisDotColor, lensDotColor } = GLASSES_FIT.debug

  for (const iris of [landmarks[leftIris], landmarks[rightIris]]) {
    drawDot(context, iris.x * canvas.width, iris.y * canvas.height, irisDotColor)
  }

  const lensDistance = (0.5 - frame.lensCenterX) * getFrameWidth(frame, pose)
  const shiftUp = getShiftUp(frame, pose)
  context.save()
  context.translate(pose.x, pose.y)
  context.rotate(pose.angle)
  drawDot(context, -lensDistance, -shiftUp, lensDotColor)
  drawDot(context, lensDistance, -shiftUp, lensDotColor)
  context.restore()
}
