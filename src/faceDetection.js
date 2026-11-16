import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { forgetCachedModel, loadModelBytes } from './modelCache.js'

// These files are only downloaded. Detection runs in this browser, and no video leaves the device.
// The WASM version must match @mediapipe/tasks-vision in package.json exactly.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// Look for several faces so we can tell the user when there is more than one
const MAX_FACES = 4

// Give up on a download after this long, in ms, so that it can't wait forever
const LOAD_TIMEOUT = 90000

async function createFaceLandmarker(vision, delegate, runningMode, modelBytes) {
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetBuffer: modelBytes, delegate },
    runningMode,
    numFaces: MAX_FACES,
    // The head's position and rotation, used by the 3D glasses
    outputFacialTransformationMatrixes: true,
  })
}

// Load the model, for video or for still images
async function loadLandmarker(runningMode, signal) {
  const [vision, modelBytes] = await Promise.all([FilesetResolver.forVisionTasks(WASM_URL), loadModelBytes(MODEL_URL, signal)])
  try {
    // Use the GPU when possible, and fall back to the CPU on devices without it
    return await createFaceLandmarker(vision, 'GPU', runningMode, modelBytes).catch(() => createFaceLandmarker(vision, 'CPU', runningMode, modelBytes))
  } catch (error) {
    // The copy from the cache may be the problem, so the next try starts from a fresh one
    await forgetCachedModel(MODEL_URL)
    throw error
  }
}

// Fail if loading takes too long, cancelling the download. Returns the load and a way to cancel it.
function startLoad(runningMode) {
  const controller = new AbortController()
  const timeout = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      controller.abort()
      reject(new Error('Loading the model took too long'))
    }, LOAD_TIMEOUT)
    controller.signal.addEventListener('abort', () => clearTimeout(timer))
  })
  const promise = Promise.race([loadLandmarker(runningMode, controller.signal), timeout]).finally(() => controller.abort())
  return { promise, cancel: () => controller.abort() }
}

// Keep one loaded copy, so coming back to the page does not load the model again
let landmarkerPromise = null
let cancelLoad = null

export function getFaceLandmarker() {
  if (!landmarkerPromise) {
    const { promise, cancel } = startLoad('VIDEO')
    cancelLoad = cancel
    landmarkerPromise = promise
      .then((landmarker) => {
        cancelLoad = null
        return landmarker
      })
      .catch((error) => {
        // Forget the failure, so "Try again" really does try again
        if (cancelLoad === cancel) {
          landmarkerPromise = null
          cancelLoad = null
        }
        throw error
      })
  }
  return landmarkerPromise
}

// Drop a load that's still going, so that the next request starts it again. A finished one is kept.
export function cancelFaceLandmarkerLoad() {
  if (!cancelLoad) return
  cancelLoad()
  cancelLoad = null
  landmarkerPromise = null
}

// A second copy for photos, in the model's still image mode. It's kept apart so that it can't disturb
// the live camera's timing, and closed when leaving Photo mode to give its memory back.
let photoLandmarkerPromise = null

export function getPhotoLandmarker() {
  if (!photoLandmarkerPromise) {
    const loading = startLoad('IMAGE').promise.catch((error) => {
      if (photoLandmarkerPromise === loading) photoLandmarkerPromise = null
      throw error
    })
    photoLandmarkerPromise = loading
  }
  return photoLandmarkerPromise
}

export function closePhotoLandmarker() {
  photoLandmarkerPromise?.then((landmarker) => landmarker.close()).catch(() => {})
  photoLandmarkerPromise = null
}

// Area of the box around a face's landmarks, as a fraction of the video
function faceArea(landmarks) {
  const xs = landmarks.map((point) => point.x)
  const ys = landmarks.map((point) => point.y)
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
}

// The biggest face in the list, or null if there are none
export function pickLargestFace(faces) {
  if (faces.length === 0) return null
  return faces.reduce((largest, face) => (faceArea(face) > faceArea(largest) ? face : largest))
}
