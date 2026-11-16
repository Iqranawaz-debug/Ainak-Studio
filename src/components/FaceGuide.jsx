import { FACE_GUIDE } from '../faceGuide.js'

// The oval to line a face up with: dashed coral until lined up, then solid ivory edged in charcoal,
// which shows up against both light and dark backgrounds. It's on the page and not the canvas, so
// it never appears in a photo. Two ovals crossfade, as only opacity and transforms should animate.
function FaceGuide({ guide }) {
  const oval = 'pointer-events-none absolute top-1/2 left-1/2 aspect-[3/4] -translate-1/2 rounded-[50%] transition-opacity duration-300'
  const height = { height: `${FACE_GUIDE.ovalHeight * 100}%` }

  return (
    <>
      <div aria-hidden="true" className={`${oval} border-2 border-dashed border-coral ${guide.aligned ? 'opacity-0' : 'opacity-100'}`} style={height} />
      <div aria-hidden="true" className={`${oval} border-2 border-ivory outline-1 outline-ink/60 ${guide.aligned ? 'opacity-100' : 'opacity-0'}`} style={height} />
      {/* The oval's change can't be seen by everyone, so screen readers are told too */}
      {guide.aligned && !guide.hint && <p className="sr-only" aria-live="polite">Your face is lined up</p>}
    </>
  )
}

export default FaceGuide
