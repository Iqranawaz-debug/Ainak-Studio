import { useEffect, useRef, useState } from 'react'
import Card from './ui/Card.jsx'
import Chip from './ui/Chip.jsx'
import { BulbIcon } from './ui/Icons.jsx'

const tips = ['Face the light, so that it falls on your face.', 'Remove reflections: tilt or take off your own glasses.', 'Look straight at the camera.']

// A small button on the video that opens a few tips. Escape or a click elsewhere closes them.
function TipsPopover({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      rootRef.current.querySelector('button').focus()
    }
    function handlePointerDown(event) {
      if (!rootRef.current.contains(event.target)) setIsOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  return (
    <div ref={rootRef} className={className}>
      <Chip aria-pressed={undefined} aria-expanded={isOpen} aria-label="Tips for best results" onClick={() => setIsOpen(!isOpen)}>
        <BulbIcon className="size-4" />
        Tips
      </Chip>
      {isOpen && (
        <Card padding="sm" raised role="group" aria-label="Tips for best results" className="absolute right-0 bottom-full mb-2 w-64 max-w-[calc(100cqw-2rem)]">
          <p className="px-1 text-label font-semibold">Tips for best results</p>
          <ul className="mt-1 list-disc space-y-1 pr-1 pl-5 text-caption">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export default TipsPopover
