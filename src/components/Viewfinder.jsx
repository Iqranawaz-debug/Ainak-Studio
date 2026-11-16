// One corner bracket, drawn for the top left and turned to fit the other corners
function Bracket({ className }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`pointer-events-none absolute size-6 ${className}`} fill="none" strokeLinecap="round">
      {/* A thin dark line beneath the ivory one keeps it visible against light backgrounds */}
      <path d="M2 22 V10 Q2 2 10 2 H22" stroke="#1C1917" strokeOpacity="0.45" strokeWidth="3" />
      <path d="M2 22 V10 Q2 2 10 2 H22" stroke="#FAF6F0" strokeWidth="1.5" />
    </svg>
  )
}

// The camera look over the video: vignette, film grain, corner brackets, and a one-time scan.
// All of this is on the page and not the canvases, so none of it appears in a photo.
//   scanKey: changes to play the scan again, or is null for no scan
function Viewfinder({ scanKey, onScanEnd }) {
  return (
    <>
      <div aria-hidden="true" className="video-vignette pointer-events-none absolute inset-0" />
      {/* Oversized, as it shifts around to look like moving film */}
      <div aria-hidden="true" className="film-grain pointer-events-none absolute -inset-1/2" />

      <Bracket className="top-2 left-2" />
      <Bracket className="top-2 right-2 rotate-90" />
      <Bracket className="right-2 bottom-2 rotate-180" />
      <Bracket className="bottom-2 left-2 -rotate-90" />

      {scanKey !== null && (
        <div key={scanKey} aria-hidden="true" onAnimationEnd={onScanEnd} className="face-scan pointer-events-none absolute inset-0 z-[5]">
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-coral" />
        </div>
      )}
    </>
  )
}

export default Viewfinder
