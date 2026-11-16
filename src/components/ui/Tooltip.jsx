import { useState } from 'react'
import { createPortal } from 'react-dom'

// How far a tooltip stays from its control and from the screen's edge, in pixels
const GAP = 8
const EDGE_MARGIN = 70
const LONG_EDGE_MARGIN = 136
// How long a tapped tooltip stays, in ms
const TAP_SHOW_MS = 3500

// A small label for a control that shows only an icon or a color. It appears on mouse hover and keyboard
// focus, and hides with Escape. It's drawn outside the page's flow so that scrolling panels can't clip it.
// The control must have its own aria-label, as screen readers use that instead.
//   isLong: for a sentence, which wraps and so must stay further from the screen's edge
//   showOnTap: also shows for a few seconds after a tap, for a note that touch screens need too
function Tooltip({ label, isLong = false, showOnTap = false, children }) {
  const [place, setPlace] = useState(null)
  const edgeMargin = isLong ? LONG_EDGE_MARGIN : EDGE_MARGIN

  function show(event) {
    const box = event.currentTarget.getBoundingClientRect()
    const flipBelow = box.top < 40
    setPlace({
      // A dialog or fullscreen video sits above the rest of the page, so the tooltip must go inside it
      host: event.currentTarget.closest('dialog, :fullscreen') ?? document.body,
      left: Math.min(window.innerWidth - edgeMargin, Math.max(edgeMargin, box.left + box.width / 2)),
      top: flipBelow ? box.bottom + GAP : box.top - GAP,
      flipBelow,
    })
  }

  return (
    <span
      className="inline-flex"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') show(event)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setPlace(null)
      }}
      onPointerUp={(event) => {
        if (!showOnTap || event.pointerType === 'mouse') return
        show(event)
        setTimeout(() => setPlace(null), TAP_SHOW_MS)
      }}
      onFocus={(event) => {
        if (event.target.matches(':focus-visible')) show(event)
      }}
      onBlur={() => setPlace(null)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setPlace(null)
      }}
    >
      {children}
      {place &&
        createPortal(
          <span
            aria-hidden="true"
            className={`pointer-events-none fixed z-50 -translate-x-1/2 ${place.flipBelow ? '' : '-translate-y-full'}`}
            style={{ left: place.left, top: place.top }}
          >
            <span className={`ui-tooltip block rounded-inner bg-ink px-2 py-1 text-caption font-medium text-ivory shadow-card ${isLong ? 'w-64' : 'whitespace-nowrap'}`}>
              {label}
            </span>
          </span>,
          place.host,
        )}
    </span>
  )
}

export default Tooltip
