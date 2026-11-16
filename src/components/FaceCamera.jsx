import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { cancelFaceLandmarkerLoad, getFaceLandmarker, pickLargestFace } from '../faceDetection.js'
import { createFaceGuide, createTrackingStatus, guideHints } from '../faceGuide.js'
import { createFaceShapeMeasurer } from '../faceShape.js'
import { getFrameArt } from '../frames/frameArt.js'
import { frames } from '../frames/index.js'
import { getFrameLook, getGlasses3d, loadLook, saveLook } from '../frames/look.js'
import {
  applySelectionChange,
  loadMode,
  loadSelection,
  saveMode,
  saveSelection,
} from '../frames/selection.js'
import { drawDebugDots, drawDebugPoints, drawGlasses, getGlassesPose, smoothPose } from '../glassesOverlay.js'
import { findMood, getMoodSurface, loadMood, moods, saveMood } from '../moods.js'
import { usePerformanceMode } from '../performance.js'
import { composePhoto } from '../photos.js'
import { getSplitSides } from '../splitView.js'
import CollectionPanel from './CollectionPanel.jsx'
import CustomizeBar from './CustomizeBar.jsx'
import FaceGuide from './FaceGuide.jsx'
import FitDebugPanel, { Fit3dDebugPanel } from './FitDebugPanel.jsx'
import PhotoPreview from './PhotoPreview.jsx'
import PhotoStudio from './PhotoStudio.jsx'
import SplitDivider from './SplitDivider.jsx'
import StudioTour, { hasSeenTour } from './StudioTour.jsx'
import VideoControls from './VideoControls.jsx'
import Viewfinder from './Viewfinder.jsx'
import Button from './ui/Button.jsx'
import Card from './ui/Card.jsx'
import Skeleton from './ui/Skeleton.jsx'
import { useToast } from './ui/Toast.jsx'

// How long the camera gets to supply a picture after the countdown, in ms
const CAPTURE_TIMEOUT = 2000

function findFrame(frameId) {
  return frames.find((frame) => frame.id === frameId)
}

// When the face is lost, the glasses stay this long in case it's just one missed frame, and then fade
// out over the second time, in ms. The second must match .glasses-fade in index.css.
const GLASSES_HOLD_MS = 150
const GLASSES_FADE_MS = 350
// A longer gap than this between detections means the tab was in the background, in ms
const BACKGROUND_GAP_MS = 1000
// When to mention that the model is still downloading, in ms
const MODEL_SLOW_AFTER = 10000
// How long a camera can send nothing before it counts as gone, in ms
const CAMERA_SILENT_AFTER = 4000

// The video card's shape, which Photo mode shares. @container lets the controls fit themselves to its width.
// Below desktop, limited to about half the screen's height, leaving room to pick a frame. Phones get a square,
// which leaves more room around a face for the controls. Clipped and not just hidden, as the film grain
// reaches past its edges, and a hidden overflow could still be scrolled sideways by the browser.
const VIDEO_CARD_SHAPE =
  '@container relative mx-auto aspect-[4/3] w-full overflow-clip max-sm:aspect-square max-lg:max-w-[calc(55vh*4/3)] max-sm:max-w-[55vh] lg:aspect-auto lg:h-(--video-height) lg:w-(--video-width)'

// The one message at the top of the video, for what needs doing right now, or null if all is well.
// There's nothing to say once a face is found and lined up, so it says nothing.
function getContextMessage(status, guide) {
  if (status === 'loading') return null
  if (status === 'multipleFaces') return 'Several faces: using the largest'
  if (guide.hint) return guideHints[guide.hint]
  if (status === 'noFace') return "I can't see your face yet"
  return null
}

// How long (ms) a result must last before the message changes, so it doesn't flicker
const statusHoldTimes = { noFace: 1000, multipleFaces: 300, faceFound: 0 }

// The friendly message for each way the camera or model can fail.
// Photo mode needs no camera, so it's offered wherever the camera is the problem. It does need the model.
const errorMessages = {
  denied: {
    title: 'I need your camera to try on frames',
    intro: 'Camera access is turned off for this site. Here is how to turn it on:',
    steps: [
      'Click the camera or lock icon in the address bar.',
      'Set Camera to Allow.',
      'Come back here and press Try again.',
    ],
    canUsePhoto: true,
  },
  noCamera: {
    title: "I can't find a camera",
    intro: 'A camera is needed to try on frames live. Here is what to check:',
    steps: ['Make sure your camera is plugged in and switched on.', 'Come back here and press Try again.'],
    canUsePhoto: true,
  },
  inUse: {
    title: 'Your camera is busy',
    intro: 'Another app seems to be using it. Here is what to do:',
    steps: ['Close other apps that use the camera, such as video calls.', 'Come back here and press Try again.'],
    canUsePhoto: true,
  },
  unplugged: {
    title: 'Your camera stopped',
    intro: 'It may have been unplugged, or another app may have taken it over. Here is what to do:',
    steps: ['Check that your camera is plugged in and switched on.', 'Press Try again.'],
    canUsePhoto: true,
  },
  paused: {
    title: 'Your camera paused while you were away',
    intro: 'This browser stopped the video while this tab was in the background.',
    steps: ['Press Try again to start it back up.'],
    canUsePhoto: true,
  },
  model: {
    title: "The try-on model didn't load",
    intro: 'It downloads once and then runs on your device. Here is what to check:',
    steps: ['Check your internet connection.', 'Press Try again.'],
  },
  other: {
    title: 'Something got in the way',
    intro: 'The lenses stopped working this time. Here is what to try:',
    steps: ['Press Try again.', 'If it keeps happening, reload this page.'],
    canUsePhoto: true,
  },
}

// Turn a camera error from the browser into one of the messages above
function getCameraErrorKind(error) {
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'denied'
  // The camera exists, but the system won't hand it over
  if (error.name === 'NotReadableError' || error.name === 'AbortError') return 'inUse'
  if (['NotFoundError', 'OverconstrainedError'].includes(error.name)) return 'noCamera'
  // Some browsers and insecure pages have no camera support at all
  if (!navigator.mediaDevices?.getUserMedia) return 'noCamera'
  return 'other'
}

// A soft placeholder over the video while the camera and model start up
function LoadingCard({ isSlow, onRetry }) {
  return (
    <div aria-busy="true" className="absolute inset-0 z-10 flex items-center justify-center bg-ivory p-gutter">
      <Card raised className="flex w-full max-w-xs items-center gap-gutter">
        <Skeleton className="aspect-[3/4] w-14 shrink-0 !rounded-[50%]" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-title font-semibold">Getting your mirror ready</p>
          {isSlow ? (
            <>
              <p role="status" className="mt-0.5 text-caption text-ink/70">
                The try-on model is still downloading. This can take a while on a slow connection.
              </p>
              <Button size="sm" onClick={onRetry} className="mt-2">
                Try again
              </Button>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-caption text-ink/70">If your browser asks, please allow the camera.</p>
              <Skeleton className="mt-2 h-2 w-3/4" />
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

function FaceCamera() {
  const showToast = useToast()
  const videoRef = useRef(null)
  // Layered over the video and mirrored with it, so the glasses line up with the face
  const canvasRef = useRef(null)
  // A second layer for the 3D glasses, as a canvas can only be used for 2D or 3D, not both
  const canvas3dRef = useRef(null)
  // Holds both glasses layers, and fades them out when the face is lost
  const glassesFadeRef = useRef(null)
  // What to draw and debug mode, kept in refs so the detection loop always sees the latest values
  const overlayRef = useRef(null)
  const debugRef = useRef(false)
  const scene3dRef = useRef(null)
  const modeRef = useRef(loadMode())
  const selection3dRef = useRef(null)
  // The second frame's art in Compare, how the view is split, and the waiting photo for the loop to take
  const compareOverlayRef = useRef(null)
  const viewRef = useRef({ view: 'single', divider: 0.5, isMirrored: true, videoFilter: 'none' })
  const captureRef = useRef(null)

  // The chosen frame and color, starting from whatever was saved last time
  const [selection, setSelection] = useState(loadSelection)
  // The chosen lens and finish. Anything not chosen yet is null, and uses what the frame comes with.
  const [savedLook, setSavedLook] = useState(loadLook)
  const [mode, setMode] = useState(loadMode)
  // The live camera, or a still photo
  const [source, setSource] = useState('live')
  // In Photo mode, why there's no face shape to show
  const [photoFaceNote, setPhotoFaceNote] = useState(null)
  const [isTourOpen, setIsTourOpen] = useState(() => !hasSeenTour())
  const location = useLocation()
  const navigate = useNavigate()
  // The model is taking a while to download
  const [isModelSlow, setIsModelSlow] = useState(false)
  // The estimated face shape, or null while still measuring
  const [faceShape, setFaceShape] = useState(null)
  const [debug, setDebug] = useState(false)
  const [status, setStatus] = useState('loading')
  // Whether the face is lined up with the oval, the hint to show, and whether a face is being followed
  const [guide, setGuide] = useState({ aligned: false, hint: null })
  const [tracking, setTracking] = useState('searching')
  const previousTrackingRef = useRef('searching')
  const isPerformanceMode = usePerformanceMode()
  // Counts the scans so that each one plays afresh, and whether one is playing now
  const [scanCount, setScanCount] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [moodId, setMoodId] = useState(loadMood)
  const [errorKind, setErrorKind] = useState(null)
  // Changing this runs the camera effect again
  const [attempt, setAttempt] = useState(0)
  // Selfie cameras are mirrored, but a phone's rear camera isn't
  const [isMirrored, setIsMirrored] = useState(true)
  // The cameras on this device, once the browser allows listing them
  const [cameraIds, setCameraIds] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Filling the browser window, where real fullscreen isn't available
  const [isFillingWindow, setIsFillingWindow] = useState(false)
  // The camera chosen with Flip, or null for the default front camera, and the one now in use
  const wantedCameraRef = useRef(null)
  const currentCameraRef = useRef(null)
  const videoCardRef = useRef(null)
  // Plain try-on, before/after, or compare, and where the divider is as a fraction across the video
  const [view, setView] = useState('single')
  const [divider, setDivider] = useState(0.5)
  // In Compare: the frame on the right, and which side picking a frame changes
  const [compareFrameId, setCompareFrameId] = useState(frames[1].id)
  const [compareSide, setCompareSide] = useState('right')
  // 3, 2 or 1 during a countdown, and otherwise null
  const [countdown, setCountdown] = useState(null)
  // Changing this plays the flash again
  const [flashCount, setFlashCount] = useState(0)
  // The photo just taken, waiting in its preview
  const [photo, setPhoto] = useState(null)

  // The user menu's Replay tour link comes here with a note, which is cleared so that a reload doesn't replay it
  useEffect(() => {
    if (!location.state?.replayTour) return
    if (source === 'photo') chooseSource('live')
    setIsTourOpen(true)
    navigate(location.pathname, { replace: true, state: null })
    // chooseSource only sets state, so an older copy of it is still correct
  }, [location, navigate, source])

  // Keep track of fullscreen, as the browser can also leave it, for example with Escape
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // The browser doesn't know about filling the window, so Escape has to be handled here
  useEffect(() => {
    if (!isFillingWindow) return
    function handleKeyDown(event) {
      // Escape in an open photo preview only closes the preview
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) setIsFillingWindow(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFillingWindow])

  // Whenever the choice changes, switch the glasses on the video and remember it
  useEffect(() => {
    const { frameId, colorId } = selection
    const frame = frames.find((item) => item.id === frameId)
    let isLatest = true

    saveSelection(selection)
    saveLook(savedLook)
    // The old glasses stay on the video until the new art is ready, so nothing flashes
    getFrameArt(frame, colorId, getFrameLook(frame, savedLook))
      .then((art) => {
        if (isLatest) overlayRef.current = { art, frame }
      })
      .catch((error) => {
        console.error(error)
        showToast("That frame didn't load. Please try another one.", 'error')
      })

    // Ignore this result if another choice is made while it is loading
    return () => {
      isLatest = false
    }
  }, [selection, savedLook, showToast])

  // The same for the second frame in Compare, which wears the same color where it can
  const secondColorId = applySelectionChange(selection, { frameId: compareFrameId, colorId: selection.colorId }).colorId
  useEffect(() => {
    if (view !== 'compare') return
    const frame = findFrame(compareFrameId)
    let isLatest = true

    getFrameArt(frame, secondColorId, getFrameLook(frame, savedLook))
      .then((art) => {
        if (isLatest) compareOverlayRef.current = { art, frame }
      })
      .catch((error) => console.error(error))

    return () => {
      isLatest = false
    }
  }, [view, compareFrameId, secondColorId, savedLook])

  // Keep the detection loop up to date with the view and mood
  useEffect(() => {
    viewRef.current = { view, divider, isMirrored, videoFilter: findMood(moodId).filter }
  }, [view, divider, isMirrored, moodId])

  useEffect(() => {
    saveMood(moodId)
  }, [moodId])

  // Scan once per detection: when a face appears after none for a while, and not when
  // one returns from a moment's loss, which would replay it over and over
  useEffect(() => {
    if (tracking === 'tracking' && previousTrackingRef.current === 'searching') {
      setScanCount((count) => count + 1)
      setIsScanning(true)
    }
    previousTrackingRef.current = tracking
  }, [tracking])

  // A blob stays in memory until it's released, so let go of each photo when it's finished with
  useEffect(() => {
    if (!photo) return
    return () => URL.revokeObjectURL(photo.url)
  }, [photo])

  // Count down once a second, then take the photo
  useEffect(() => {
    if (countdown === null) return
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1)
        return
      }
      setCountdown(null)
      takePhoto()
    }, 1000)
    return () => clearTimeout(timer)
    // takePhoto only reads refs, so an older copy of it is still correct
  }, [countdown])

  useEffect(() => {
    saveMode(mode)
  }, [mode])

  // Set up the 3D scene when it's needed. three.js only downloads at this point, so people who stay
  // in 2D never pay for it. Switching away, leaving the page, Photo mode, an error or a restart all
  // remove it, along with its graphics memory.
  const needsScene3d = mode === '3d' && source === 'live' && !errorKind
  useEffect(() => {
    if (!needsScene3d) return

    let cancelled = false
    function turnOff3d() {
      setMode('2d')
      showToast("3D couldn't start on this device, so you're back in 2D.", 'error')
    }

    import('../glasses3d/glassesScene.js')
      .then(({ createGlassesScene }) => {
        // There's no canvas while the error card is showing. "Try again" runs this again.
        if (cancelled || !canvas3dRef.current) return
        scene3dRef.current = createGlassesScene(canvas3dRef.current, turnOff3d)
      })
      .catch(turnOff3d)

    return () => {
      cancelled = true
      scene3dRef.current?.dispose()
      scene3dRef.current = null
    }
  }, [needsScene3d, attempt, showToast])

  // Keep the detection loop up to date with the mode
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  // Tell the 3D glasses about the chosen frame, color, lens and finish, and the second frame in Compare
  // (the loop applies this on its next frame).
  useEffect(() => {
    selection3dRef.current = {
      ...getGlasses3d(findFrame(selection.frameId), selection.colorId, savedLook),
      second: getGlasses3d(findFrame(compareFrameId), secondColorId, savedLook),
    }
  }, [selection, savedLook, compareFrameId, secondColorId])

  // Press D to turn debug mode on or off (but leave shortcuts like Ctrl+D alone)
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key.toLowerCase() !== 'd' || event.repeat) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      // Typing a "d" in the search box shouldn't open debug mode
      if (event.target.matches?.('input[type="search"]')) return

      debugRef.current = !debugRef.current
      setDebug(debugRef.current)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (source !== 'live') return
    const video = videoRef.current
    const canvas = canvasRef.current
    const glassesFade = glassesFadeRef.current
    let stopped = false
    let stream = null
    let frameId = 0
    let modelSlowTimer = null
    let silentTimer = null
    // When a face was last seen, and whether the glasses are already gone
    let lastFaceAt = 0
    let isGlassesCleared = true

    // Stop the detection loop and turn the camera off
    function stopCamera() {
      stopped = true
      cancelAnimationFrame(frameId)
      clearTimeout(modelSlowTimer)
      clearTimeout(silentTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stream?.getTracks().forEach((track) => track.stop())
      video.srcObject = null
      clearGlasses()
    }

    function clearGlasses() {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      scene3dRef.current?.hide()
      isGlassesCleared = true
    }

    // With no face, what was last drawn stays on its canvas while it fades out, and is then cleared
    function fadeOutGlasses(now) {
      if (isGlassesCleared) return
      const missing = now - lastFaceAt
      if (missing >= GLASSES_HOLD_MS) glassesFade.style.opacity = '0'
      if (missing >= GLASSES_HOLD_MS + GLASSES_FADE_MS) clearGlasses()
    }

    // A camera going quiet is normal for a moment, but not for long while this tab is showing
    function watchForSilence(track) {
      clearTimeout(silentTimer)
      if (!track.muted || document.hidden) return
      silentTimer = setTimeout(() => {
        if (track.muted && !document.hidden) fail('unplugged')
      }, CAMERA_SILENT_AFTER)
    }

    // Tabs in the background get no animation frames, which already pauses detection.
    // Coming back, carry on from where things are, and say so if the camera can't.
    function handleVisibilityChange() {
      if (document.hidden) {
        // A countdown can't take a picture of someone who has left
        setCountdown(null)
        return
      }
      const track = stream?.getVideoTracks()[0]
      if (!track) return
      if (track.readyState === 'ended') {
        fail('unplugged')
        return
      }
      watchForSilence(track)
      if (video.paused) video.play().catch(() => fail('paused'))
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Turn everything off and show the friendly error card
    function fail(kind) {
      stopCamera()
      captureRef.current = null
      setCountdown(null)
      setErrorKind(kind)
    }

    // Draw the 3D glasses on the largest face.
    // The debug dots still use the 2D canvas, which sits on top.
    function updateGlasses3d(scene3d, face, matrix, context) {
      if (!matrix) {
        scene3d.hide()
        return
      }
      const glasses = selection3dRef.current
      const sides = getSplitSides(viewRef.current, video)
      scene3d.setFrame(glasses.frameId)
      scene3d.setSecondFrame(viewRef.current.view === 'compare' ? glasses.second.frameId : null)
      scene3d.setColor(glasses.hex)
      scene3d.setLook(glasses.finish, glasses.lensPaint)
      scene3d.update(
        face,
        matrix.data,
        video.videoWidth,
        video.videoHeight,
        sides && sides.map((side) => ({ ...side, glasses: side.content === 'second' ? glasses.second : glasses })),
      )
      if (debugRef.current) drawDebugPoints(context, face, scene3d.getLensCenters())
    }

    // Draw the glasses on the largest face, or fade out what's there if there is no face
    function updateGlasses(face, matrix, lastPose, now) {
      // The canvas uses the video's own pixels, so landmarks map straight onto it.
      // Setting its size also clears it, so only do that when the size changes.
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      if (!face) {
        fadeOutGlasses(now)
        return null
      }
      lastFaceAt = now
      isGlassesCleared = false
      glassesFade.style.opacity = '1'

      const context = canvas.getContext('2d')
      context.clearRect(0, 0, canvas.width, canvas.height)

      if (modeRef.current === '3d') {
        // The scene may still be loading on the first few frames
        if (scene3dRef.current) updateGlasses3d(scene3dRef.current, face, matrix, context)
        return null
      }

      // Jump straight to a face that just appeared, and smooth from then on
      const nextPose = getGlassesPose(face, canvas.width, canvas.height)
      const pose = lastPose ? smoothPose(lastPose, nextPose) : nextPose
      if (overlayRef.current) {
        const { art, frame } = overlayRef.current
        const sides = getSplitSides(viewRef.current, video)
        if (sides) {
          // Each side of the divider draws only inside its own part of the canvas
          for (const side of sides) {
            const overlay = side.content === 'second' ? compareOverlayRef.current : side.content && overlayRef.current
            if (!overlay) continue
            context.save()
            context.beginPath()
            context.rect(side.from * canvas.width, 0, (side.to - side.from) * canvas.width, canvas.height)
            context.clip()
            drawGlasses(context, overlay.art, overlay.frame, pose)
            context.restore()
          }
        } else {
          drawGlasses(context, art, frame, pose)
        }
        if (debugRef.current) drawDebugDots(context, face, frame, pose)
      }
      return pose
    }

    function startDetectionLoop(landmarker) {
      let lastVideoTime = -1
      let candidate = null
      let candidateSince = 0
      let pose = null
      let lastDetectedAt = 0
      const updateFaceShape = createFaceShapeMeasurer()
      const updateGuide = createFaceGuide()
      const updateTracking = createTrackingStatus()

      function detectFrame() {
        frameId = requestAnimationFrame(detectFrame)

        // Skip until the video has a new frame to look at
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return
        lastVideoTime = video.currentTime

        try {
          const now = performance.now()
          const result = landmarker.detectForVideo(video, now)
          const faces = result.faceLandmarks
          const largestFace = pickLargestFace(faces)
          // The head pose results are in the same order as the faces
          const matrix = result.facialTransformationMatrixes?.[faces.indexOf(largestFace)]
          // After time in the background, the glasses go straight to the face rather than sliding there
          if (now - lastDetectedAt > BACKGROUND_GAP_MS) pose = null
          lastDetectedAt = now
          pose = updateGlasses(largestFace, matrix, pose, now)
          // Take a waiting photo now, as the 3D canvas is only readable straight after drawing
          if (captureRef.current) {
            // Glasses still fading out don't belong in the photo
            if (!largestFace) clearGlasses()
            captureRef.current(Boolean(largestFace))
            captureRef.current = null
          }
          // React skips the update when the result hasn't changed, so this is cheap on every frame
          setFaceShape(updateFaceShape(largestFace, faces.length, video.videoWidth, video.videoHeight, now))
          setGuide(updateGuide(largestFace, matrix, video, now))
          setTracking(updateTracking(Boolean(largestFace), now))

          let seen = 'faceFound'
          if (faces.length === 0) seen = 'noFace'
          if (faces.length > 1) seen = 'multipleFaces'

          // Only change the pill once this result has lasted long enough
          if (seen !== candidate) {
            candidate = seen
            candidateSince = now
          }
          if (now - candidateSince >= statusHoldTimes[seen]) setStatus(seen)
        } catch {
          fail('other')
        }
      }

      detectFrame()
    }

    async function start() {
      let landmarker
      try {
        // Open the front camera first, so the model isn't downloaded if access is refused
        const whichCamera = wantedCameraRef.current
          ? { deviceId: { exact: wantedCameraRef.current } }
          : { facingMode: 'user' }
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { ...whichCamera, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        // The user may have left the page while the browser was asking for permission
        if (stopped) {
          newStream.getTracks().forEach((track) => track.stop())
          return
        }
        stream = newStream
        // The camera was unplugged or switched off while in use
        const track = stream.getVideoTracks()[0]
        track.onended = () => fail('unplugged')
        // Some systems only mute a camera that was taken away, rather than ending it
        track.onmute = () => watchForSilence(track)
        track.onunmute = () => clearTimeout(silentTimer)

        video.srcObject = stream
        await video.play()

        // Now that the camera is allowed, see which one this is and what else is available
        const settings = stream.getVideoTracks()[0].getSettings()
        currentCameraRef.current = settings.deviceId
        setIsMirrored(settings.facingMode !== 'environment')
        const devices = await navigator.mediaDevices.enumerateDevices()
        setCameraIds(devices.filter((device) => device.kind === 'videoinput').map((device) => device.deviceId))
      } catch (error) {
        if (!stopped) fail(getCameraErrorKind(error))
        return
      }

      try {
        modelSlowTimer = setTimeout(() => setIsModelSlow(true), MODEL_SLOW_AFTER)
        landmarker = await getFaceLandmarker()
        clearTimeout(modelSlowTimer)
        setIsModelSlow(false)
      } catch (error) {
        console.error(error)
        if (!stopped) fail('model')
        return
      }
      if (!stopped) startDetectionLoop(landmarker)
    }

    start()
    // Runs when leaving the page, logging out, switching to Photo mode, and before each "Try again"
    return stopCamera
  }, [attempt, source])

  // Ask the detection loop to take the photo on its next video frame, straight after drawing it.
  // This only reads refs, as it can run up to a second after the countdown's last render.
  function takePhoto() {
    const timeout = setTimeout(() => {
      captureRef.current = null
      showToast("The camera didn't send a picture, so no photo was taken. Please try again.", 'error')
    }, CAPTURE_TIMEOUT)

    captureRef.current = (hasFace) => {
      clearTimeout(timeout)
      const { view: currentView, divider: currentDivider, isMirrored: mirrored, videoFilter } = viewRef.current
      const is3d = modeRef.current === '3d'
      const canvas = composePhoto({
        video: videoRef.current,
        layers: is3d ? [canvas3dRef.current, canvasRef.current] : [canvasRef.current],
        isMirrored: mirrored,
        divider: currentView === 'single' ? null : currentDivider,
        videoFilter,
      })

      const glasses = selection3dRef.current
      const firstName = findFrame(glasses.frameId).name
      const labels = {
        single: firstName,
        beforeAfter: `Before and after: ${firstName}`,
        compare: `Compare: ${firstName} and ${findFrame(glasses.second.frameId).name}`,
      }
      const label = `${labels[currentView]} (${is3d ? '3D' : '2D'})`

      setFlashCount((count) => count + 1)
      canvas.toBlob((blob) => {
        setPhoto({ canvas, url: URL.createObjectURL(blob), label, hasGlasses: hasFace })
        showToast('Photo taken')
      }, 'image/png')
    }
  }

  // Start the countdown, or cancel the one already running
  function handleCapture() {
    setCountdown(countdown === null ? 3 : null)
  }

  // Close the preview and count down again
  function handleRetake() {
    setPhoto(null)
    handleCapture()
  }

  // Start the camera and detection again from the beginning
  function restartCamera() {
    resetLiveState()
    setAttempt(attempt + 1)
  }

  function resetLiveState() {
    setCountdown(null)
    setErrorKind(null)
    setIsModelSlow(false)
    setStatus('loading')
    setGuide({ aligned: false, hint: null })
    setTracking('searching')
    setFaceShape(null)
  }

  // After an error, go back to the default camera, in case the chosen one is the problem,
  // and start again any download that's still stuck
  function handleTryAgain() {
    wantedCameraRef.current = null
    cancelFaceLandmarkerLoad()
    restartCamera()
  }

  // Switch between the live camera and a photo. Photo mode shows one plain view, with no camera running.
  function chooseSource(nextSource) {
    if (document.fullscreenElement) document.exitFullscreen()
    setIsFillingWindow(false)
    setView('single')
    setPhoto(null)
    resetLiveState()
    setSource(nextSource)
  }

  // Move on to the next camera on this device
  function flipCamera() {
    const nextIndex = (cameraIds.indexOf(currentCameraRef.current) + 1) % cameraIds.length
    wantedCameraRef.current = cameraIds[nextIndex]
    restartCamera()
  }

  // Fullscreen shows the video and glasses alone. iPhones and some embedded browsers don't allow
  // real fullscreen, so there the video fills the browser window instead.
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else if (isFillingWindow) setIsFillingWindow(false)
    else if (!document.fullscreenEnabled) setIsFillingWindow(true)
    else videoCardRef.current.requestFullscreen().catch(() => setIsFillingWindow(true))
  }

  // There's nothing to highlight on this card, so a first-time tour waits until the studio is showing
  if (errorKind) {
    const message = errorMessages[errorKind]

    return (
      <div className="flex w-full max-w-xl flex-col items-center">
        <Card role="alert" padding="none" raised className="w-full p-6 text-center sm:p-10">
          <h2 className="text-heading font-semibold">{message.title}</h2>
          <p className="mt-3">{message.intro}</p>
          <ol className="mx-auto mt-4 max-w-sm list-decimal space-y-1 pl-5 text-left">
            {message.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="primary" size="lg" onClick={handleTryAgain}>
              Try again
            </Button>
            {message.canUsePhoto && (
              <Button size="lg" onClick={() => chooseSource('photo')}>
                Use a photo instead
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // Merge into the latest choice, so a change is never lost to an older copy of it
  function handleSelectionChange(change) {
    setSelection((current) => applySelectionChange(current, change))
  }

  // Choose a view. Compare starts with two different frames.
  function chooseView(nextView) {
    setView(nextView)
    if (nextView === 'compare' && compareFrameId === selection.frameId) {
      const index = frames.findIndex((frame) => frame.id === selection.frameId)
      setCompareFrameId(frames[(index + 1) % frames.length].id)
    }
  }

  // Picking a frame changes the chosen one, or in Compare, the side being changed
  function pickFrame(frameId) {
    if (view === 'compare' && compareSide === 'right') setCompareFrameId(frameId)
    else handleSelectionChange({ frameId })
  }

  // Fullscreen has no panel, so its arrows step through the frames instead
  const steppedFrameId = view === 'compare' && compareSide === 'right' ? compareFrameId : selection.frameId
  function stepFrame(direction) {
    const index = frames.findIndex((frame) => frame.id === steppedFrameId)
    pickFrame(frames[(index + direction + frames.length) % frames.length].id)
  }

  // The same frame and color choices apply in both 2D and 3D
  const selectedFrame = frames.find((frame) => frame.id === selection.frameId)
  const isLoading = status === 'loading'
  const isFullView = isFullscreen || isFillingWindow

  // Mirrors a layer like a selfie. Every layer uses this, so the glasses always line up with the face.
  const mirrorClass = isMirrored ? '-scale-x-100' : ''

  const mood = findMood(moodId)

  return (
    <>
    {/* A soft tint for each mood behind the whole page, which crossfade when the mood changes */}
    {moods.map((option) =>
      option.tintColor ? (
        <div
          key={option.id}
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500 ${moodId === option.id ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: getMoodSurface(option) }}
        />
      ) : null,
    )}

    {/* Filling the window needs this container's size containment off, as it would trap the video inside it */}
    <div className={`try-layout w-full ${isFillingWindow ? '[container-type:normal]' : ''}`} style={{ '--mood-surface': getMoodSurface(mood) }}>
      {/* Mobile and tablet: the panel sits below the video. Desktop: it becomes a side panel. */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_var(--layout-panel-width)] lg:gap-(--layout-column-gap)">
        {/* The video stays in view while the page scrolls, so you can see each frame you pick.
            Desktop: this whole column sticks. Smaller screens: "contents" lets its parts join the page's grid,
            so that only the video sticks. Neither applies with the taller debug panel open. */}
        <div
          className={`flex min-w-0 flex-col items-center gap-3 self-start max-lg:contents ${
            debug ? '' : 'lg:sticky lg:top-4'
          } ${isFillingWindow ? 'z-50' : ''}`}
        >
          {/* Not sticky on short phones, where it would fill the screen */}
          <div
            className={`top-0 w-full bg-(--mood-surface) pb-1 lg:pb-0 ${isFillingWindow ? 'z-50' : 'z-10'} ${
              debug ? '' : 'max-lg:[@media(min-height:640px)]:sticky'
            }`}
          >
            {source === 'photo' ? (
              <PhotoStudio
                className={VIDEO_CARD_SHAPE}
                frame={selectedFrame}
                colorId={selection.colorId}
                savedLook={savedLook}
                mode={mode}
                onChooseMode={setMode}
                onChooseSource={chooseSource}
                photoFilter={mood.filter}
                onFaceResult={(shape, note) => {
                  setFaceShape(shape)
                  setPhotoFaceNote(note)
                }}
              />
            ) : (
            <Card
              ref={videoCardRef}
              padding="none"
              raised
              data-tour="video"
              className={`${VIDEO_CARD_SHAPE} [&:fullscreen]:h-full [&:fullscreen]:w-full [&:fullscreen]:max-w-none [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:bg-ink ${
                isFillingWindow ? '!fixed !inset-0 !aspect-auto !h-dvh !w-full !max-w-none !rounded-none !border-0 !bg-ink' : ''
              }`}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`absolute inset-0 size-full object-cover ${mirrorClass}`}
                style={{ filter: mood.filter }}
              />
              <div ref={glassesFadeRef} className="glasses-fade pointer-events-none absolute inset-0">
                {/* Fades the glasses in when switching between 2D and 3D, see index.css */}
                <div data-mode={mode} className="glasses-layer pointer-events-none absolute inset-0">
                  {/* Only here in 3D. A restart gets a fresh canvas, as disposing the scene closes this one's context. */}
                  {mode === '3d' && (
                    <canvas
                      key={attempt}
                      ref={canvas3dRef}
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 size-full object-cover ${mirrorClass}`}
                    />
                  )}
                  <canvas
                    ref={canvasRef}
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 size-full object-cover ${mirrorClass}`}
                  />
                </div>
              </div>

              <Viewfinder scanKey={isScanning && !isPerformanceMode ? scanCount : null} onScanEnd={() => setIsScanning(false)} />

              {isLoading ? <LoadingCard isSlow={isModelSlow} onRetry={handleTryAgain} /> : <FaceGuide guide={guide} />}

              {view !== 'single' && !isLoading && <SplitDivider position={divider} onChange={setDivider} />}

              <VideoControls
                isLoading={isLoading}
                tracking={tracking}
                contextMessage={getContextMessage(status, guide)}
                view={view}
                onChooseView={chooseView}
                countdown={countdown}
                onCapture={handleCapture}
                leftName={selectedFrame.name}
                rightName={findFrame(compareFrameId).name}
                compareSide={compareSide}
                onChooseSide={setCompareSide}
                isFullscreen={isFullView}
                steppedName={findFrame(steppedFrameId).name}
                onStepFrame={stepFrame}
                toolbar={{
                  source,
                  onChooseSource: chooseSource,
                  mode,
                  onChooseMode: setMode,
                  onRestart: restartCamera,
                  onFlip: cameraIds.length > 1 ? flipCamera : null,
                  onToggleFullscreen: toggleFullscreen,
                }}
              />

              {countdown !== null && (
                <p
                  role="status"
                  className="pointer-events-none absolute top-1/2 left-1/2 z-20 flex size-24 -translate-1/2 items-center justify-center rounded-pill border border-ink/15 bg-ivory font-heading text-countdown font-semibold shadow-raised"
                >
                  {countdown}
                </p>
              )}

              {/* Rendered inside the card, as only this card is on screen in fullscreen */}
              {flashCount > 0 && <span key={flashCount} aria-hidden="true" className="camera-flash pointer-events-none absolute inset-0 z-30" />}
              {/* The key gives every photo a fresh dialog, with its own "saved" state */}
              {photo && <PhotoPreview key={photo.url} photo={photo} onRetake={handleRetake} onClose={() => setPhoto(null)} />}
            </Card>
            )}
          </div>

          <div data-tour="customize" className="w-full">
            <CustomizeBar
              frame={selectedFrame}
              colorId={selection.colorId}
              onChangeColor={(colorId) => handleSelectionChange({ colorId })}
              savedLook={savedLook}
              onChangeLook={(change) => setSavedLook((current) => ({ ...current, ...change }))}
              moodId={moodId}
              onChooseMood={setMoodId}
            />
          </div>

          {debug && source === 'live' && (
            <div className="w-full">
              {mode === '3d' && <Fit3dDebugPanel faceShape={faceShape} />}
              {mode === '2d' && <FitDebugPanel key={selection.frameId} frame={selectedFrame} faceShape={faceShape} />}
            </div>
          )}
        </div>

        <CollectionPanel
          selection={selection}
          savedLook={savedLook}
          faceShape={faceShape}
          waitingMessage={source === 'photo' ? photoFaceNote : null}
          compare={view === 'compare' ? { side: compareSide, rightFrameId: compareFrameId } : null}
          onPickFrame={pickFrame}
          onChange={handleSelectionChange}
        />
      </div>
    </div>

    {isTourOpen && <StudioTour onClose={() => setIsTourOpen(false)} />}
    </>
  )
}

export default FaceCamera
