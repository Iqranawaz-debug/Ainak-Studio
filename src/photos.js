// Taking photos of the try-on, and keeping them in this browser's localStorage. Nothing is ever uploaded.
import { getCurrentUser } from './auth.js'
import { readList, writeList, writeListForKeeps } from './storage.js'

// localStorage only holds about 5 MB, so My Collection keeps a smaller JPEG of each photo
const SAVED_MAX_WIDTH = 960
const SAVED_QUALITY = 0.85

// Combine the video and the glasses layers into one image, showing just what's on screen:
// cropped to fill the card, mirrored if the video is, and with the divider if there is one.
// layers are canvases over the video. Call this straight after they're drawn, as a 3D canvas clears itself.
// videoFilter is the mood's look, which applies to the video and not the glasses.
export function composePhoto({ video, layers, isMirrored, divider, videoFilter }) {
  const { videoWidth, videoHeight } = video
  const shownWidth = Math.min(videoWidth, videoHeight * (video.clientWidth / video.clientHeight))
  const shownHeight = shownWidth * (video.clientHeight / video.clientWidth)
  const cropX = (videoWidth - shownWidth) / 2
  const cropY = (videoHeight - shownHeight) / 2

  const photo = document.createElement('canvas')
  photo.width = Math.round(shownWidth)
  photo.height = Math.round(shownHeight)
  const context = photo.getContext('2d')

  if (isMirrored) {
    context.translate(photo.width, 0)
    context.scale(-1, 1)
  }
  context.filter = videoFilter
  context.drawImage(video, cropX, cropY, shownWidth, shownHeight, 0, 0, photo.width, photo.height)
  context.filter = 'none'
  for (const layer of layers) {
    // A 3D layer can have fewer pixels than the video
    const scale = layer.width / videoWidth
    context.drawImage(layer, cropX * scale, cropY * scale, shownWidth * scale, shownHeight * scale, 0, 0, photo.width, photo.height)
  }
  context.setTransform(1, 0, 0, 1, 0, 0)

  if (divider !== null) {
    const lineWidth = Math.max(2, Math.round(photo.width / 400))
    context.fillStyle = '#FAF6F0'
    context.fillRect(divider * photo.width - lineWidth / 2, 0, lineWidth, photo.height)
  }
  return photo
}

// A file name with the date and time, so that downloads don't overwrite each other
export function getPhotoFileName(extension) {
  const stamp = new Date().toISOString().slice(0, 19).replace('T', '-').replaceAll(':', '')
  return `visuallens-${stamp}.${extension}`
}

// Each account on this browser has its own photos
function getPhotosKey() {
  return `visuallens.photos.${getCurrentUser().email}`
}

// The saved photos, newest first, or an empty list if they're missing or broken
export function loadPhotos() {
  return readList(getPhotosKey(), (photo) => typeof photo?.id === 'string' && typeof photo?.image === 'string')
}

// Save a smaller copy. Returns false if there is no room left on this device.
export function savePhoto(photoCanvas, label) {
  const scale = Math.min(1, SAVED_MAX_WIDTH / photoCanvas.width)
  const copy = document.createElement('canvas')
  copy.width = Math.round(photoCanvas.width * scale)
  copy.height = Math.round(photoCanvas.height * scale)
  copy.getContext('2d').drawImage(photoCanvas, 0, 0, copy.width, copy.height)

  const photo = { id: String(Date.now()), savedAt: Date.now(), label, image: copy.toDataURL('image/jpeg', SAVED_QUALITY) }
  return writeListForKeeps(getPhotosKey(), [photo, ...loadPhotos()])
}

export function deletePhoto(id) {
  writeList(getPhotosKey(), loadPhotos().filter((photo) => photo.id !== id))
}
