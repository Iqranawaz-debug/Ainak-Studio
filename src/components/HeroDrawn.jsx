// The drawn version of the showroom's hero: shown while the 3D loads, and for good if 3D can't run.
// It has the same looks as the 3D hero, with shaded rims, tinted lenses and a glare.

// The left lens of each style, on a 200 x 80 canvas. The right lens is the same shape mirrored.
const LENSES = {
  round: 'M90 40 A32 32 0 1 1 26 40 A32 32 0 1 1 90 40 Z',
  square: 'M31 14 H85 Q92 14 92 21 V59 Q92 66 85 66 H31 Q24 66 24 59 V21 Q24 14 31 14 Z',
  aviator: 'M24 18 Q56 6 90 18 Q94 46 76 62 Q58 73 40 62 Q20 46 24 18 Z',
  catEye: 'M16 11 Q52 14 90 26 Q94 50 72 64 Q50 73 34 58 Q24 44 16 11 Z',
}

const BRIDGES = {
  round: 'M90 36 Q100 27 110 36',
  square: 'M92 30 Q100 24 108 30',
  aviator: 'M90 20 Q100 16 110 20 M92 33 H108',
  catEye: 'M90 28 Q100 22 110 28',
}

// The arm stub at each lens's outer top corner
const ARMS = {
  round: 'M28 32 L6 26',
  square: 'M24 22 L6 18',
  aviator: 'M24 20 L6 16',
  catEye: 'M16 11 L5 8',
}

// A color mixed toward black or white, for the shaded parts of a rim
function shade(hex, amount) {
  const target = amount < 0 ? 0 : 255
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16)
    return Math.round(value + (target - value) * Math.abs(amount))
  })
  return `rgb(${channels.join(', ')})`
}

// One lens and its rim, drawn from the layers that make it look solid
function Lens({ d, arm, rim, tintId }) {
  return (
    <>
      <path d={arm} fill="none" stroke={rim} strokeWidth="5" strokeLinecap="round" />
      <path d={d} fill={`url(#${tintId})`} />
      {/* The glare: a soft diagonal sheet of light, clipped to the lens by its own shape */}
      <path d={d} fill="url(#hero-glare)" />
      <path d={d} fill="none" stroke={rim} strokeWidth="6" strokeLinejoin="round" />
      {/* A thin highlight along the rim, slightly above it */}
      <path d={d} fill="none" stroke="#FAF6F0" strokeOpacity="0.4" strokeWidth="1" strokeLinejoin="round" transform="translate(0 -1.2)" />
    </>
  )
}

function HeroDrawn({ look, isMoving }) {
  const { style, color } = look
  const d = LENSES[style.id]
  const tintId = 'hero-lens'
  const rim = 'url(#hero-rim)'

  return (
    <div className={`size-full ${isMoving ? 'hero-drawn-turn' : ''}`}>
      <svg viewBox="0 0 200 80" className="size-full drop-shadow-[0_6px_6px_rgb(28_25_23/0.22)]">
        <defs>
          {/* Lit from above: lighter along the top of the rim, darker along the bottom */}
          <linearGradient id="hero-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(color.hex, 0.28)} />
            <stop offset="0.45" stopColor={color.hex} />
            <stop offset="1" stopColor={shade(color.hex, -0.35)} />
          </linearGradient>
          <linearGradient id="hero-lens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={style.lens.color} stopOpacity={style.lens.opacity} />
            <stop offset="1" stopColor={style.lens.color} stopOpacity={style.lens.isGradient ? style.lens.opacity * 0.12 : style.lens.opacity} />
          </linearGradient>
          <linearGradient id="hero-glare" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.12" stopColor="#FAF6F0" stopOpacity="0" />
            <stop offset="0.3" stopColor="#FAF6F0" stopOpacity="0.55" />
            <stop offset="0.42" stopColor="#FAF6F0" stopOpacity="0" />
          </linearGradient>
        </defs>

        <Lens d={d} arm={ARMS[style.id]} rim={rim} tintId={tintId} />
        <g transform="matrix(-1 0 0 1 200 0)">
          <Lens d={d} arm={ARMS[style.id]} rim={rim} tintId={tintId} />
        </g>
        <path d={BRIDGES[style.id]} fill="none" stroke={shade(color.hex, -0.1)} strokeWidth="4.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default HeroDrawn
