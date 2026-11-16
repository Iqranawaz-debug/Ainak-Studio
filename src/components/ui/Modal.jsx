import { useLayoutEffect, useRef } from 'react'
import Button from './Button.jsx'

const VARIANTS = {
  modal: 'ui-modal m-auto max-h-[92vh] w-[min(40rem,calc(100vw-2rem))] max-w-none rounded-card backdrop:bg-ink/40',
  // Sits at the bottom on mobile, and at the side on desktop, leaving the video in view
  drawer:
    'ui-drawer m-0 mt-auto max-h-[85vh] w-full max-w-none rounded-t-card backdrop:bg-ink/15 lg:mt-0 lg:ml-auto lg:h-full lg:max-h-none lg:w-[26rem] lg:rounded-t-none lg:rounded-l-card',
}

// A modal or drawer, shown for as long as it's on the page: to close it, stop rendering it.
// A native dialog keeps keyboard focus inside it, closes with Escape, and returns focus afterwards.
function Modal({ title, eyebrow, subtitle, variant = 'modal', onClose, children }) {
  const dialogRef = useRef(null)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    // Closing while still on the page is what returns focus to where it was
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      // Escape and the browser's own ways of closing. React's double run of the effect in
      // development also fires this, but by then the dialog is open again, so it's ignored.
      onClose={() => {
        if (!dialogRef.current?.open) onClose()
      }}
      // Clicking the dimmed area around it closes it. That counts as a click on the dialog itself,
      // but so does a click on its padding, so check where the click actually was.
      onClick={(event) => {
        if (event.target !== dialogRef.current) return
        const box = dialogRef.current.getBoundingClientRect()
        const isInside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom
        if (!isInside) onClose()
      }}
      className={`overflow-y-auto bg-ivory p-section text-ink shadow-raised ${VARIANTS[variant]}`}
    >
      <div className="flex items-start justify-between gap-gutter">
        <div className="min-w-0">
          {eyebrow && <p className="text-caption text-ink/70">{eyebrow}</p>}
          <h2 className="text-heading font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-label text-ink/70">{subtitle}</p>}
        </div>
        <Button size="sm" onClick={onClose} className="shrink-0">
          Close
        </Button>
      </div>
      {children}
    </dialog>
  )
}

export default Modal
