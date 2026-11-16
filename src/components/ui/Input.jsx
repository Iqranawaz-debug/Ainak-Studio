import { useId } from 'react'
import { AlertIcon } from './Icons.jsx'

// A labelled text input, with an optional icon and error message.
//   hideLabel: keeps the label for screen readers only, for when the placeholder and icon say enough
//   trailing: a small control inside the input's right edge, such as show password
function Input({ label, error, icon, trailing, hideLabel = false, className = '', ...props }) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'block text-label font-medium'}>
        {label}
      </label>
      <div className={`relative ${hideLabel ? '' : 'mt-1.5'}`}>
        {icon && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink/70">{icon}</span>}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-control border bg-ivory py-2.5 text-label placeholder:text-ink/60 hover:border-ink/50 disabled:cursor-not-allowed disabled:opacity-50 ${
            icon ? 'pl-10' : 'pl-3'
          } ${trailing ? 'pr-11' : 'pr-3'} ${error ? 'border-coral' : 'border-ink/30'}`}
          {...props}
        />
        {trailing && <span className="absolute top-1/2 right-1.5 flex -translate-y-1/2">{trailing}</span>}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-label">
          <AlertIcon className="size-4 text-coral" />
          {error}
        </p>
      )}
    </div>
  )
}

export default Input
