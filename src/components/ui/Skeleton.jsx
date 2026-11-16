// A soft placeholder shape, shown while something loads. It pulses using opacity alone.
function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`block rounded-inner bg-ink/10 motion-safe:animate-pulse ${className}`} />
}

export default Skeleton
