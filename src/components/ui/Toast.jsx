import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Button from './Button.jsx'
import { AlertIcon, CheckIcon, CloseIcon } from './Icons.jsx'

// How long toasts stay, in ms. Errors stay longer, as there's more to read and act on.
const DURATIONS = { success: 3500, error: 7000 }
const MAX_SHOWN = 3

const ToastContext = createContext(() => {})

// Gives a function to show a toast: showToast('Saved on this device'), or showToast('...', 'error')
export function useToast() {
  return useContext(ToastContext)
}

// Holds the toasts, and draws them at the top of the screen for the whole app
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextIdRef = useRef(0)
  const viewportRef = useRef(null)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message, tone = 'success') => {
      const id = nextIdRef.current++
      setToasts((current) => [...current.slice(1 - MAX_SHOWN), { id, message, tone }])
      setTimeout(() => dismiss(id), DURATIONS[tone])
    },
    [dismiss],
  )

  // A popover sits above everything, including open dialogs and fullscreen video.
  // Showing it again after each change keeps it above anything opened since.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport.showPopover) return
    if (viewport.matches(':popover-open')) viewport.hidePopover()
    if (toasts.length > 0) viewport.showPopover()
  }, [toasts])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        ref={viewportRef}
        popover="manual"
        aria-live="polite"
        className="fixed inset-x-0 top-4 bottom-auto mx-auto h-fit w-fit max-w-[calc(100vw-2rem)] overflow-visible border-0 bg-transparent p-0"
      >
        <div className="flex flex-col items-center gap-2">
          {toasts.map((toast) => (
            <div key={toast.id} className="ui-toast flex items-center gap-2 rounded-card border border-ink/15 bg-ivory py-1.5 pr-1.5 pl-3 text-label text-ink shadow-raised">
              {toast.tone === 'error' ? <AlertIcon className="size-5 text-coral" /> : <CheckIcon className="size-5" />}
              <span>{toast.message}</span>
              <Button variant="icon" emphasis="ghost" size="sm" label="Dismiss" onClick={() => dismiss(toast.id)}>
                <CloseIcon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}
