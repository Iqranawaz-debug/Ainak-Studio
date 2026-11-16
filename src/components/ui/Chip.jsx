const SIZES = {
  none: 'text-caption',
  sm: 'px-2.5 py-1 text-caption',
  md: 'px-4 py-2 text-label',
}

const TONES = {
  neutral: 'border-ink/15 bg-ivory',
  coral: 'border-coral bg-coral',
  outlined: 'border-coral bg-ivory',
}

// A small rounded label. With onClick it becomes a button, which selected marks as chosen.
//   dot: the class of a small colored dot in front of the text, such as 'bg-coral'
function Chip({ selected = false, tone = 'neutral', size = 'sm', dot, onClick, className = '', children, ...props }) {
  const look = `inline-flex items-center justify-center gap-1.5 rounded-pill border font-medium ${SIZES[size]} ${className}`
  const content = (
    <>
      {dot && <span aria-hidden="true" className={`size-2 shrink-0 rounded-pill ${dot}`} />}
      {children}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={`${look} shrink-0 cursor-pointer whitespace-nowrap transition-transform duration-100 active:scale-[0.97] motion-reduce:active:scale-100 ${
          selected ? 'border-ink bg-ink text-ivory' : 'border-ink/15 bg-ivory hover:bg-ivory-hover active:bg-ivory-pressed'
        }`}
        {...props}
      >
        {content}
      </button>
    )
  }

  return (
    <p className={`${look} ${TONES[tone]}`} {...props}>
      {content}
    </p>
  )
}

export default Chip
