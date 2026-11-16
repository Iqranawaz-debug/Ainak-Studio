import { CheckIcon } from './Icons.jsx'
import Tooltip from './Tooltip.jsx'

// One round swatch, with a checkmark when selected. background is inline because these are
// product colors and not part of the UI theme. A little smaller on desktop, to fit under the video.
function Swatch({ label, background, checkColor, selected, disabled = false, onSelect }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
        className={`flex size-10 cursor-pointer items-center justify-center rounded-pill border border-ink/30 transition-transform duration-100 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 lg:size-8 ${
          selected ? 'ui-pop' : ''
        }`}
        style={{ background, color: checkColor }}
      >
        {selected && <CheckIcon className="size-5 lg:size-4" />}
      </button>
    </Tooltip>
  )
}

// A titled row of swatches, saying what's chosen now. hideHeading leaves out the visible line,
// for when something nearby already says it.
export function SwatchGroup({ title, value, hideHeading = false, className = '', children }) {
  return (
    <div role="group" aria-label={title} className={className}>
      {!hideHeading && (
        <p className="mb-1.5 text-caption">
          <span className="font-medium">{title}:</span> {value}
        </p>
      )}
      <div className="flex flex-wrap gap-2 p-0.5 lg:gap-1.5">{children}</div>
    </div>
  )
}

export default Swatch
