// A row of options where exactly one is chosen, such as 2D / 3D. Each option has an id and a label,
// and can have an icon. fill stretches the options to share the full width.
// arrowKeys makes it a radio group: one Tab stop, with the arrow keys moving between the options.
function SegmentedToggle({ label, options, value, onChoose, fill = false, arrowKeys = false, className = '' }) {
  function handleKeyDown(event) {
    const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    const step = steps[event.key]
    if (!step) return

    event.preventDefault()
    const index = options.findIndex((option) => option.id === value)
    const nextIndex = (index + step + options.length) % options.length
    onChoose(options[nextIndex].id)
    event.currentTarget.children[nextIndex].focus()
  }

  // What each option says about itself, in each of the two kinds of group
  const optionProps = (option) =>
    arrowKeys
      ? { role: 'radio', 'aria-checked': value === option.id, tabIndex: value === option.id ? 0 : -1 }
      : { 'aria-pressed': value === option.id }

  return (
    <div
      role={arrowKeys ? 'radiogroup' : 'group'}
      aria-label={label}
      onKeyDown={arrowKeys ? handleKeyDown : undefined}
      className={`flex gap-0.5 rounded-control border border-ink/15 bg-ivory p-0.5 ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          {...optionProps(option)}
          title={option.title}
          onClick={() => onChoose(option.id)}
          className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-inner px-3 py-2 text-caption font-medium whitespace-nowrap transition-transform duration-100 active:scale-[0.97] motion-reduce:active:scale-100 lg:py-1.5 ${
            fill ? 'flex-1' : ''
          } ${value === option.id ? 'bg-ink text-ivory' : 'hover:bg-ivory-hover active:bg-ivory-pressed'}`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default SegmentedToggle
