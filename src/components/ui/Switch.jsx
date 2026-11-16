// An on or off setting, with its name and a short explanation
function Switch({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-control px-3 py-2 text-left hover:bg-ink/5 active:bg-ink/10"
    >
      <span>
        <span className="block text-label font-medium">{label}</span>
        <span className="block text-caption text-ink/70">{hint}</span>
      </span>
      <span aria-hidden="true" className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-pill border border-ink/30 p-0.5 ${checked ? 'bg-ink' : 'bg-ivory'}`}>
        <span className={`size-3.5 rounded-pill transition-transform duration-150 ${checked ? 'translate-x-4 bg-ivory' : 'bg-ink'}`} />
      </span>
    </button>
  )
}

export default Switch
