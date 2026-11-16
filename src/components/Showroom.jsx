import { useEffect, useRef, useState } from 'react'
import { usePerformanceMode } from '../performance.js'
import { getHeroLook, HERO_CYCLE_MS, HERO_FADE_IN_MS, HERO_FADE_OUT_MS } from '../showroom/heroLooks.js'
import HeroDrawn from './HeroDrawn.jsx'
import { CameraIcon, FaceIcon, LockIcon } from './ui/Icons.jsx'

// The three things worth knowing. Also used as chips on small screens, see AuthPage.
export const showroomFeatures = [
  { id: 'live', icon: CameraIcon, title: 'Live try-on', text: 'Frames on your face as you move.' },
  { id: 'shape', icon: FaceIcon, title: 'Face shape guide', text: 'A starting point for what may suit you.' },
  { id: 'private', icon: LockIcon, title: 'Private by design', text: 'Your camera stays on your device.' },
]

// A few quiet accents: tiny circles of light
function Accents() {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 400" preserveAspectRatio="xMaxYMin slice" className="pointer-events-none absolute inset-0 size-full">
      <circle cx="60" cy="58" r="3" fill="#FAF6F0" fillOpacity="0.9" />
      <circle cx="372" cy="36" r="2" fill="#E8553D" fillOpacity="0.5" />
      <circle cx="32" cy="200" r="1.5" fill="#1C1917" fillOpacity="0.25" />
    </svg>
  )
}

// Fades an element out or in over the hero's own timings
function fadeElement(element, isVisible) {
  element.style.transition = `opacity ${isVisible ? HERO_FADE_IN_MS : HERO_FADE_OUT_MS}ms ease-in-out`
  element.style.opacity = isVisible ? 1 : 0
}

// The hero: 3D glasses from the app's frame builder, or the drawn ones until that's ready, or if it can't run.
// Only one is ever on show: the drawn hero fades away completely before the 3D one fades in.
function Hero({ look, captionRef, onLookChange }) {
  const canvasRef = useRef(null)
  const drawnRef = useRef(null)
  const isLowPower = usePerformanceMode()
  // 'loading', 'ready', or 'drawn' if 3D couldn't start
  const [status, setStatus] = useState('loading')
  const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // three.js only downloads here, so the rest of the app never waits for this page's hero
  useEffect(() => {
    let isCancelled = false
    let hero = null
    let revealTimer = null

    function useDrawnHero() {
      clearTimeout(revealTimer)
      hero?.dispose()
      hero = null
      if (isCancelled) return
      captionRef.current.style.opacity = 1
      if (drawnRef.current) drawnRef.current.style.opacity = 1
      setStatus('drawn')
    }

    import('../showroom/heroScene.js')
      .then(({ createHeroScene }) => {
        if (isCancelled) return null
        return createHeroScene({
          canvas: canvasRef.current,
          caption: captionRef.current,
          isStill,
          isLowPower,
          onLookChange,
          onContextLost: useDrawnHero,
        })
      })
      .then((created) => {
        if (!created) return
        if (isCancelled) {
          created.dispose()
          return
        }
        hero = created
        if (isStill) {
          hero.reveal()
          setStatus('ready')
          return
        }
        fadeElement(drawnRef.current, false)
        revealTimer = setTimeout(() => {
          hero.reveal()
          setStatus('ready')
        }, HERO_FADE_OUT_MS)
      })
      .catch(useDrawnHero)

    return () => {
      isCancelled = true
      clearTimeout(revealTimer)
      hero?.dispose()
    }
  }, [isStill, isLowPower, onLookChange, captionRef])

  // The drawn hero has no scene to drive it, so it cycles here the same way: out, swap, in
  useEffect(() => {
    if (status !== 'drawn' || isStill) return
    let step = 0
    let swapTimer = null
    const cycleTimer = setInterval(() => {
      if (document.hidden) return
      fadeElement(drawnRef.current, false)
      fadeElement(captionRef.current, false)
      swapTimer = setTimeout(() => {
        step += 1
        onLookChange(step)
        fadeElement(drawnRef.current, true)
        fadeElement(captionRef.current, true)
      }, HERO_FADE_OUT_MS)
    }, HERO_CYCLE_MS)
    return () => {
      clearInterval(cycleTimer)
      clearTimeout(swapTimer)
    }
  }, [status, isStill, onLookChange, captionRef])

  return (
    <>
      {status !== 'ready' && (
        <div ref={drawnRef} className="absolute inset-0">
          <HeroDrawn look={look} isMoving={status === 'drawn' && !isStill} />
        </div>
      )}
      {/* Reaches past the hero's box on all sides, leaving room for the arms and the sway. The scene frames the
          glasses to match, see HERO_BLEED in heroScene.js. It starts hidden, and the scene fades it in. */}
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute -inset-x-[15%] -inset-y-[25%] h-[150%] w-[130%] ${status === 'drawn' ? 'invisible' : ''}`}
        style={{ opacity: 0 }}
      />
    </>
  )
}

// The sign-in page's other half: one hero pair on a warm backdrop, with what the app does.
// A column of two parts: the hero, shadow and caption centered in whatever space is free, then the
// tagline and features at the bottom. On a short screen the free space shrinks, and the hero with it.
function Showroom({ className = '' }) {
  const [step, setStep] = useState(0)
  const captionRef = useRef(null)
  const look = getHeroLook(step)

  return (
    <aside className={`showroom-backdrop relative flex flex-col overflow-hidden ${className}`}>
      <div aria-hidden="true" className="film-grain film-grain-still pointer-events-none absolute inset-0" />
      <Accents />

      {/* The hero is decoration, so screen readers skip it and its changing caption */}
      <div aria-hidden="true" className="@container-size relative flex min-h-0 flex-1 flex-col items-center justify-center py-2 lg:pt-16 lg:pb-6">
        {/* About 62% of the panel's width, but never over 70%, over 38% of the screen's height, or too tall for the
            free space, which leaves 3.5rem for the shadow and caption. The hero's box is 2.4 times as wide as tall,
            and the shadow takes up to 0.06 of its width. */}
        <div className="flex w-[clamp(0px,min(62cqw,calc(38vh*2.4),calc((100cqh-3.5rem)*2)),70cqw)] flex-col items-center">
          <div className="hero-float relative aspect-[2.4/1] w-full">
            <Hero look={look} captionRef={captionRef} onLookChange={setStep} />
          </div>
          <div className="hero-floor-shadow mt-2 aspect-[14/1] w-4/5" />
        </div>
        <p ref={captionRef} className="mt-3.5 text-label font-medium tracking-wide whitespace-nowrap text-ink/90 lg:text-base">
          {look.style.label} · {look.color.label}
        </p>
      </div>

      {/* Desktop only: small screens get these as chips under the form. The margin keeps it clear of the caption. */}
      <div className="relative mt-10 hidden shrink-0 px-12 pb-10 lg:block">
        <p className="font-heading text-showcase font-semibold text-balance">Find the frames that fit your face.</p>
        <ul className="mt-5 grid grid-cols-3 gap-5">
          {showroomFeatures.map(({ id, icon: Icon, title, text }) => (
            <li key={id}>
              <Icon className="size-5" />
              <p className="mt-1.5 text-label font-semibold">{title}</p>
              <p className="mt-0.5 text-label text-ink/90">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

export default Showroom
