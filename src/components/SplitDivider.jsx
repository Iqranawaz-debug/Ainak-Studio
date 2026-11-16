import { ChevronLeftIcon, ChevronRightIcon } from './ui/Icons.jsx'

// How far the divider can go, so that its handle is never lost off the edge of the video
const MIN_POSITION = 0.05
const MAX_POSITION = 0.95
const KEY_STEP = 0.02

function clamp(position) {
  return Math.min(MAX_POSITION, Math.max(MIN_POSITION, position))
}

// The line over the video that can be dragged, or moved with the arrow keys.
// position is the fraction across the video. The touch area is wider than the line, for fingers.
function SplitDivider({ position, onChange }) {
  function moveToPointer(event) {
    const box = event.currentTarget.parentElement.getBoundingClientRect()
    onChange(clamp((event.clientX - box.left) / box.width))
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') onChange(clamp(position - KEY_STEP))
    if (event.key === 'ArrowRight') onChange(clamp(position + KEY_STEP))
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Divider position"
      aria-orientation="horizontal"
      aria-valuemin={MIN_POSITION * 100}
      aria-valuemax={MAX_POSITION * 100}
      aria-valuenow={Math.round(position * 100)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        moveToPointer(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveToPointer(event)
      }}
      onKeyDown={handleKeyDown}
      className="absolute inset-y-0 z-10 w-11 -translate-x-1/2 cursor-ew-resize touch-none"
      style={{ left: `${position * 100}%` }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-ivory" />
      <span aria-hidden="true" className="absolute top-1/2 left-1/2 flex size-9 -translate-1/2 items-center justify-center rounded-pill border border-ink/15 bg-ivory shadow-card">
        <ChevronLeftIcon className="-mr-1 size-3.5 text-ink" />
        <ChevronRightIcon className="-ml-1 size-3.5 text-ink" />
      </span>
    </div>
  )
}

export default SplitDivider
