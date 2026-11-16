import { lensTints } from '../frames/colors.js'
import { finishes, getFrameLook, getLensPaint, lensTypes } from '../frames/look.js'
import Swatch, { SwatchGroup } from './ui/Swatch.jsx'

// These are drawn on ivory, so a swatch looks like the lens does against light skin
const LENS_SWATCH_BASE = '#FAF6F0'
const DARK_CHECK = '#1C1917'
const LIGHT_CHECK = '#FAF6F0'

// What each finish swatch looks like, drawn on near black so the sheen shows clearly
const finishSwatches = {
  glossy: 'radial-gradient(circle at 32% 28%, #FAF6F0 0 12%, #1C1917 42%)',
  matte: '#4A4744',
  metallic: 'linear-gradient(135deg, #1C1917 8%, #FAF6F0 34%, #4A4744 52%, #FAF6F0 72%, #1C1917 94%)',
}

// A swatch showing this lens type in the current tint
function getLensSwatchBackground(lensType, lensTint) {
  const { color, opacity, isGradient } = getLensPaint({ lensType, lensTint })
  const alphaHex = (alpha) => Math.round(alpha * 255).toString(16).padStart(2, '0')
  const bottom = isGradient ? 0.1 : opacity
  return `linear-gradient(${color}${alphaHex(opacity)}, ${color}${alphaHex(bottom)}), ${LENS_SWATCH_BASE}`
}

// The lens types and tints. Picking either keeps the two together, so they then carry across every frame.
export function LensSwatches({ frame, savedLook, onChange }) {
  const look = getFrameLook(frame, savedLook)
  const isClear = look.lensType === 'clear'
  const lensLabel = lensTypes.find((type) => type.id === look.lensType).label
  const tintLabel = lensTints.find((tint) => tint.id === look.lensTint).label

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SwatchGroup title="Lens" value={lensLabel} hideHeading>
        {lensTypes.map((type) => (
          <Swatch
            key={type.id}
            label={type.label}
            background={getLensSwatchBackground(type.id, look.lensTint)}
            checkColor={type.id === 'sunglass' ? LIGHT_CHECK : DARK_CHECK}
            selected={type.id === look.lensType}
            onSelect={() => onChange({ lensType: type.id, lensTint: look.lensTint })}
          />
        ))}
      </SwatchGroup>

      <span aria-hidden="true" className="h-6 border-l border-ink/15" />

      {/* A clear lens has no tint, so there's nothing for these to change */}
      <SwatchGroup title="Tint" value={isClear ? 'None on clear lenses' : tintLabel} hideHeading>
        {lensTints.map((tint) => (
          <Swatch
            key={tint.id}
            label={`${tint.label} tint`}
            background={tint.hex}
            checkColor={tint.checkColor}
            selected={!isClear && tint.id === look.lensTint}
            disabled={isClear}
            onSelect={() => onChange({ lensType: look.lensType, lensTint: tint.id })}
          />
        ))}
      </SwatchGroup>
    </div>
  )
}

export function FinishSwatches({ frame, savedLook, onChange }) {
  const look = getFrameLook(frame, savedLook)
  const finishLabel = finishes.find((finish) => finish.id === look.finish).label

  return (
    <SwatchGroup title="Finish" value={finishLabel} hideHeading>
      {finishes.map((finish) => (
        <Swatch
          key={finish.id}
          label={finish.label}
          background={finishSwatches[finish.id]}
          checkColor={LIGHT_CHECK}
          selected={finish.id === look.finish}
          onSelect={() => onChange({ finish: finish.id })}
        />
      ))}
    </SwatchGroup>
  )
}
