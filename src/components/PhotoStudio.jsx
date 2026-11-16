import { useEffect, useRef, useState } from 'react'
import { cancelFaceLandmarkerLoad, closePhotoLandmarker } from '../faceDetection.js'
import { getFrameArt } from '../frames/frameArt.js'
import { getFrameLook, getGlasses3d } from '../frames/look.js'
import { drawGlasses, getGlassesPose } from '../glassesOverlay.js'
import { composeTryOnPhoto, detectPhotoFace, getPhotoFaceShape, getPhotoFileProblem, openPhotoFile, PHOTO_TYPES } from '../photoTryOn.js'
import { getPhotoFileName } from '../photos.js'
import { VideoToolbar } from './VideoControls.jsx'
import Button from './ui/Button.jsx'
import Card from './ui/Card.jsx'
import Chip from './ui/Chip.jsx'
import { DownloadIcon, ImageIcon, UploadIcon } from './ui/Icons.jsx'
import { useToast } from './ui/Toast.jsx'

const PRIVACY_NOTE = 'Your photo stays on this device. Nothing is uploaded.'
// When to mention that the model is still downloading, in ms
const SLOW_AFTER = 10000

// Photo mode, in the same place as the video: choose a photo, then see the same glasses on it.
// The photo is only kept in memory, and is gone when leaving this mode.
//   onFaceResult: says the face shape, or null and a note saying why there isn't one
function PhotoStudio({ className, frame, colorId, savedLook, mode, onChooseMode, onChooseSource, photoFilter, onFaceResult }) {
  const showToast = useToast()
  // { url, canvas } of the chosen photo, and what was found in it
  const [photo, setPhoto] = useState(null)
  const [found, setFound] = useState(null)
  // empty, working, ready, noFace or modelError
  const [stage, setStage] = useState('empty')
  const [isSlow, setIsSlow] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [art, setArt] = useState(null)
  const [scene3d, setScene3d] = useState(null)
  const inputRef = useRef(null)
  const canvasRef = useRef(null)
  const canvas3dRef = useRef(null)
  // Only the latest photo's result counts
  const latestRef = useRef(0)

  const look = getFrameLook(frame, savedLook)
  const is3d = mode === '3d'
  const hasGlasses = stage === 'ready' && found?.face

  // Give back the photo's memory when it's replaced, and the model's when leaving this mode
  useEffect(() => {
    if (!photo) return
    return () => URL.revokeObjectURL(photo.url)
  }, [photo])
  useEffect(() => closePhotoLandmarker, [])

  // Look for a face, and report what the side panel should say
  async function findFace(canvas) {
    const job = ++latestRef.current
    setStage('working')
    setFound(null)
    setIsSlow(false)
    onFaceResult(null, 'Looking for a face in your photo...')
    const slowTimer = setTimeout(() => setIsSlow(true), SLOW_AFTER)

    try {
      const result = await detectPhotoFace(canvas)
      if (job !== latestRef.current) return
      setFound(result)
      if (result.face) {
        const shape = getPhotoFaceShape(result.face, canvas.width, canvas.height)
        setStage('ready')
        onFaceResult(shape, "This photo is at too much of an angle to estimate a face shape.")
      } else {
        setStage('noFace')
        onFaceResult(null, 'No face found in this photo.')
      }
    } catch (error) {
      console.error(error)
      if (job !== latestRef.current) return
      setStage('modelError')
      onFaceResult(null, "The try-on model didn't load.")
    } finally {
      clearTimeout(slowTimer)
    }
  }

  async function handleFile(file) {
    if (!file) return
    const problem = getPhotoFileProblem(file)
    if (problem) {
      showToast(problem, 'error')
      return
    }
    try {
      const canvas = await openPhotoFile(file)
      setPhoto({ url: URL.createObjectURL(file), canvas })
      findFace(canvas)
    } catch {
      showToast("That file couldn't be opened. Please try another JPG or PNG.", 'error')
    }
  }

  function retryModel() {
    cancelFaceLandmarkerLoad()
    closePhotoLandmarker()
    findFace(photo.canvas)
  }

  // Tell the side panel what to say before there is a photo, and clear it when leaving
  useEffect(() => {
    onFaceResult(null, 'Add a photo to see your face shape.')
    return () => onFaceResult(null, null)
    // onFaceResult only sets state, so an older copy of it is still correct
  }, [])

  // Paint the chosen frame. The old one stays until the new one is ready.
  useEffect(() => {
    let isLatest = true
    getFrameArt(frame, colorId, look)
      .then((nextArt) => {
        if (isLatest) setArt(nextArt)
      })
      .catch((error) => console.error(error))
    return () => {
      isLatest = false
    }
  }, [frame, colorId, look.lensType, look.lensTint, look.finish])

  // Draw the 2D glasses, using the same fit as the live camera
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !photo) return
    canvas.width = photo.canvas.width
    canvas.height = photo.canvas.height
    if (is3d || !hasGlasses || !art) return
    drawGlasses(canvas.getContext('2d'), art, frame, getGlassesPose(found.face, canvas.width, canvas.height))
    // art is painted from frame, so it's what changes last
  }, [photo, found, art, is3d, hasGlasses])

  // Set up the 3D scene only when it's needed, and remove it afterwards
  const needs3d = is3d && Boolean(photo)
  useEffect(() => {
    if (!needs3d) return
    let cancelled = false
    let scene = null

    import('../glasses3d/glassesScene.js')
      .then(({ createGlassesScene }) => {
        if (cancelled || !canvas3dRef.current) return
        scene = createGlassesScene(canvas3dRef.current, () => {
          onChooseMode('2d')
          showToast("3D couldn't start on this device, so you're back in 2D.", 'error')
        })
        setScene3d(scene)
      })
      .catch(() => onChooseMode('2d'))

    return () => {
      cancelled = true
      scene?.dispose()
      setScene3d(null)
    }
  }, [needs3d])

  // Draw the 3D glasses once. Starting from hide() puts them straight on the face, with no smoothing.
  async function draw3d() {
    const glasses = getGlasses3d(frame, colorId, savedLook)
    await scene3d.setFrame(glasses.frameId)
    scene3d.setColor(glasses.hex)
    scene3d.setLook(glasses.finish, glasses.lensPaint)
    scene3d.hide()
    if (hasGlasses && found.matrix) scene3d.update(found.face, found.matrix.data, photo.canvas.width, photo.canvas.height, null)
  }

  useEffect(() => {
    if (scene3d && photo) draw3d()
    // draw3d reads these same values
  }, [scene3d, photo, found, frame, colorId, look.lensType, look.lensTint, look.finish])

  async function handleDownload() {
    if (is3d && scene3d) await draw3d()
    const result = composeTryOnPhoto(photo.canvas, is3d ? canvas3dRef.current : canvasRef.current, photoFilter)
    result.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = getPhotoFileName('png')
      link.click()
      // Give the browser time to start the download before letting go of the file
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      showToast('Downloaded. Your photo stayed on this device.')
    }, 'image/png')
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  const chooseButton = (emphasis, label) => (
    <Button variant={emphasis} onClick={() => inputRef.current.click()} className="whitespace-nowrap">
      <UploadIcon />
      {label}
    </Button>
  )

  return (
    <Card
      padding="none"
      raised
      data-tour="video"
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false)
      }}
      onDrop={handleDrop}
      className={`${className} ${isDragging ? 'outline-2 -outline-offset-2 outline-coral' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_TYPES.join(',')}
        aria-label="Choose a photo"
        tabIndex={-1}
        onChange={(event) => {
          handleFile(event.target.files[0])
          // Choosing the same file again should still count as a change
          event.target.value = ''
        }}
        className="sr-only"
      />

      {photo && (
        <>
          <img src={photo.url} alt="Your chosen photo" className="absolute inset-0 size-full object-contain" style={{ filter: photoFilter }} />
          <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full object-contain ${is3d ? 'invisible' : ''}`} />
          {is3d && <canvas ref={canvas3dRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full object-contain" />}
        </>
      )}

      <div className="absolute top-4 right-4 z-20 flex justify-end">
        <VideoToolbar source="photo" onChooseSource={onChooseSource} mode={mode} onChooseMode={onChooseMode} />
      </div>

      {stage === 'empty' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-gutter pt-16 text-center">
          <ImageIcon className="size-8 text-ink/70" />
          <h2 className="mt-2 text-title font-semibold">Try frames on a photo</h2>
          <p className="mt-1 text-label">Choose a JPG or PNG up to 10 MB, or drop it here.</p>
          <div className="mt-3">{chooseButton('primary', 'Choose a photo')}</div>
          <p className="mt-3 text-caption text-ink/70">{PRIVACY_NOTE}</p>
        </div>
      )}

      {stage === 'working' && (
        <div role="status" className="absolute top-1/2 left-1/2 z-10 max-w-[calc(100%-2rem)] -translate-1/2">
          <Card raised padding="sm" className="text-center">
            <p className="text-label font-medium">Looking for a face...</p>
            {isSlow && (
              <>
                <p className="mt-1 text-caption text-ink/70">The try-on model is still downloading. This can take a while on a slow connection.</p>
                <Button size="sm" onClick={retryModel} className="mt-2">
                  Try again
                </Button>
              </>
            )}
          </Card>
        </div>
      )}

      {(stage === 'noFace' || stage === 'modelError') && (
        <div role="alert" className="absolute top-1/2 left-1/2 z-10 w-[min(22rem,calc(100%-2rem))] -translate-1/2">
          <Card raised className="text-center">
            {stage === 'noFace' ? (
              <>
                <p className="font-heading text-title font-semibold">I can't find a face in this photo</p>
                <p className="mt-1 text-label">Try one where your face is well lit and looking at the camera.</p>
                <div className="mt-3">{chooseButton('primary', 'Choose another photo')}</div>
              </>
            ) : (
              <>
                <p className="font-heading text-title font-semibold">The try-on model didn't load</p>
                <p className="mt-1 text-label">Please check your internet connection. Your photo still hasn't left this device.</p>
                <Button variant="primary" onClick={retryModel} className="mt-3">
                  Try again
                </Button>
              </>
            )}
          </Card>
        </div>
      )}

      {stage === 'ready' && (
        <>
          {found.faceCount > 1 && (
            <Chip role="status" className="pointer-events-none absolute top-[3.75rem] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap">
              Several faces: using the largest
            </Chip>
          )}
          <div className="absolute inset-x-4 bottom-4 z-20 flex flex-col items-center gap-2">
            <Chip size="sm" className="pointer-events-none max-w-full text-center">
              {PRIVACY_NOTE}
            </Chip>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" onClick={handleDownload} className="whitespace-nowrap">
                <DownloadIcon />
                Download PNG
              </Button>
              {chooseButton('secondary', 'Choose another')}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

export default PhotoStudio
