// Trying glasses on a still photo. The photo is only ever read in this browser: nothing is uploaded.
// The fit and the face shape come from the same functions the live camera uses.
import { getPhotoLandmarker, pickLargestFace } from './faceDetection.js'
import { classifyFaceShape, FACE_SHAPE_CONFIG, measureHeadTurn, measureRatios } from './faceShape.js'

export const PHOTO_TYPES = ['image/jpeg', 'image/png']
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
// Larger photos are scaled down to this on their longest side, which keeps detection and memory use reasonable
const MAX_PHOTO_SIDE = 2048

// What's wrong with this file, in words, or null if it can be used
export function getPhotoFileProblem(file) {
  if (!PHOTO_TYPES.includes(file.type)) return 'Please choose a JPG or PNG photo.'
  if (file.size > MAX_PHOTO_BYTES) return 'That photo is over 10 MB. Please choose a smaller one.'
  return null
}

// Open the file onto a canvas, the right way up. Throws if the file isn't really an image.
export async function openPhotoFile(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  // A see-through PNG goes on ivory, as the detector would otherwise see black behind it
  context.fillStyle = '#FAF6F0'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

// Find the faces, using the largest one if there are several
export async function detectPhotoFace(canvas) {
  const landmarker = await getPhotoLandmarker()
  const result = landmarker.detect(canvas)
  const faces = result.faceLandmarks
  const face = pickLargestFace(faces)
  return { face, matrix: result.facialTransformationMatrixes?.[faces.indexOf(face)] ?? null, faceCount: faces.length }
}

// The face shape from this one view, or null if the head is turned too far to measure
export function getPhotoFaceShape(face, width, height) {
  if (measureHeadTurn(face, width, height) > FACE_SHAPE_CONFIG.maxHeadTurn) return null
  const ratios = measureRatios(face, width, height)
  const id = classifyFaceShape(ratios)
  return { ...FACE_SHAPE_CONFIG.shapes[id], id, ratios }
}

// Combine the photo and the glasses into one image, at the photo's size.
// Call this straight after drawing the layer, as a 3D canvas clears itself.
export function composeTryOnPhoto(photo, layer, photoFilter) {
  const result = document.createElement('canvas')
  result.width = photo.width
  result.height = photo.height
  const context = result.getContext('2d')
  context.filter = photoFilter
  context.drawImage(photo, 0, 0)
  context.filter = 'none'
  context.drawImage(layer, 0, 0, photo.width, photo.height)
  return result
}
