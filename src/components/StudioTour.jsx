import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { readItem, writeItem } from '../storage.js'
import Button from './ui/Button.jsx'

const SEEN_KEY = 'visuallens.tourSeen'
// Space around a highlight, and between things and the screen's edges, in pixels
const HOLE_PADDING = 6
const EDGE = 12
const HOLE_RADIUS = 16

// targets name data-tour attributes on the real elements. The first decides where the card goes,
// and prefer is the side of it to try first.
const steps = [
  {
    targets: ['video'],
    title: 'Allow the camera and center your face',
    text: 'If your browser asks, choose Allow. Video stays on your device. Line your face up with the oval.',
  },
  {
    targets: ['customize', 'frames'],
    prefer: 'above',
    title: 'Pick a frame and change its color',
    text: 'Tap any frame to try it on, then use the Color tab here to change it. Lens, Finish and Mood are beside it.',
  },
  {
    targets: ['face-shape'],
    title: 'Check your face shape and recommendations',
    text: 'Once your face is measured, its shape shows here and frames that may suit you are marked Recommended. Why? explains it.',
  },
]

export function hasSeenTour() {
  return readItem(SEEN_KEY) === 'true'
}

// A rounded rectangle around a highlighted element, as an SVG path
function getHolePath(hole) {
  const left = hole.left - HOLE_PADDING
  const top = hole.top - HOLE_PADDING
  const right = hole.right + HOLE_PADDING
  const bottom = hole.bottom + HOLE_PADDING
  const r = HOLE_RADIUS
  return `M${left + r} ${top} H${right - r} Q${right} ${top} ${right} ${top + r} V${bottom - r} Q${right} ${bottom} ${right - r} ${bottom} H${left + r} Q${left} ${bottom} ${left} ${bottom - r} V${top + r} Q${left} ${top} ${left + r} ${top} Z`
}

function getTargetElements(step) {
  return step.targets.map((name) => document.querySelector(`[data-tour="${name}"]`)).filter(Boolean)
}

// Bring the step's first element into view. Below desktop the video sticks to the top of the screen,
// and would cover anything scrolled up beneath it, so the element stops just under the video.
function scrollToStep(step) {
  const [target] = getTargetElements(step)
  if (!target) return
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  // On desktop these are all in the sticky columns, and already in view
  if (window.matchMedia('(min-width: 1024px)').matches) return

  const video = document.querySelector('[data-tour="video"]')
  if (target === video) {
    window.scrollTo({ top: 0, behavior })
    return
  }
  const isVideoSticky = getComputedStyle(video.parentElement).position === 'sticky'
  const offset = (isVideoSticky ? video.offsetHeight : 0) + 2 * EDGE
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior })
}

// Where the card goes: beside the first highlight, on the first side it fits, or else at the screen's bottom
function placeCard(hole, card, prefer) {
  const width = window.innerWidth
  const height = window.innerHeight
  const clampX = (x) => Math.max(EDGE, Math.min(x, width - card.width - EDGE))
  const clampY = (y) => Math.max(EDGE, Math.min(y, height - card.height - EDGE))
  if (!hole) return { left: clampX((width - card.width) / 2), top: clampY((height - card.height) / 2) }

  const places = {
    below: height - hole.bottom >= card.height + 2 * EDGE && { left: clampX(hole.left), top: hole.bottom + EDGE },
    above: hole.top >= card.height + 2 * EDGE && { left: clampX(hole.left), top: hole.top - card.height - EDGE },
    right: width - hole.right >= card.width + 2 * EDGE && { left: hole.right + EDGE, top: clampY(hole.top) },
    left: hole.left >= card.width + 2 * EDGE && { left: hole.left - card.width - EDGE, top: clampY(hole.top) },
  }
  const order = prefer === 'above' ? ['above', 'below', 'right', 'left'] : ['below', 'above', 'right', 'left']
  const side = order.find((name) => places[name])
  return side ? places[side] : { left: clampX(hole.left), top: height - card.height - EDGE }
}

// A short guided tour over the real studio. The native dialog keeps the keyboard inside it, closes with
// Escape, and returns focus afterwards. It's seen once on each device, and the user menu can replay it.
function StudioTour({ onClose }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [holes, setHoles] = useState([])
  const [cardPlace, setCardPlace] = useState(null)
  const dialogRef = useRef(null)
  const cardRef = useRef(null)
  const nextRef = useRef(null)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    return () => dialog.close()
  }, [])

  // Follow the highlighted elements as the page scrolls or the screen changes size
  useEffect(() => {
    function measure() {
      const boxes = getTargetElements(step).map((element) => element.getBoundingClientRect())
      setHoles(boxes)
      setCardPlace(placeCard(boxes[0] ?? null, cardRef.current.getBoundingClientRect(), step.prefer))
    }

    scrollToStep(step)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step])

  // Move to Next once the card can be seen, as a hidden button can't take focus
  const isPlaced = cardPlace !== null
  useEffect(() => {
    if (isPlaced) nextRef.current.focus()
  }, [stepIndex, isPlaced])

  function finish() {
    writeItem(SEEN_KEY, 'true')
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Studio tour"
      // Escape counts as Skip. Stopping the browser's own close keeps this in step with React.
      onCancel={(event) => {
        event.preventDefault()
        finish()
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      {/* The dimmed page, with a hole cut out for each highlighted element. The even-odd fill leaves
          the inside of each hole's outline unpainted. */}
      <svg aria-hidden="true" className="absolute inset-0 size-full">
        <path
          fill="#1C1917"
          fillOpacity="0.55"
          fillRule="evenodd"
          d={`M0 0 H${window.innerWidth} V${window.innerHeight} H0 Z ${holes.map(getHolePath).join(' ')}`}
        />
        {holes.map((hole, index) => (
          <path key={index} d={getHolePath(hole)} fill="none" stroke="#E8553D" strokeWidth="2" />
        ))}
      </svg>

      {/* Hidden until it has been measured and placed, so it doesn't jump */}
      <section
        ref={cardRef}
        key={stepIndex}
        aria-live="polite"
        style={cardPlace ?? { left: 0, top: 0, visibility: 'hidden' }}
        className="ui-enter absolute w-[min(22rem,calc(100vw-1.5rem))] rounded-card border border-ink/15 bg-ivory p-4 shadow-raised"
      >
        <p className="text-caption text-ink/70">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h2 className="mt-0.5 text-title font-semibold">{step.title}</h2>
        <p className="mt-1 text-label">{step.text}</p>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={finish} className="mr-auto">
            Skip
          </Button>
          {stepIndex > 0 && (
            <Button size="sm" onClick={() => setStepIndex(stepIndex - 1)}>
              Back
            </Button>
          )}
          <Button ref={nextRef} variant="primary" size="sm" onClick={() => (isLast ? finish() : setStepIndex(stepIndex + 1))}>
            {isLast ? 'Done' : 'Next'}
          </Button>
        </div>
      </section>
    </dialog>
  )
}

export default StudioTour
