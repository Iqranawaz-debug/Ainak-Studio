import { useState } from 'react'
import { getFrameFit, GLASSES_3D, GLASSES_FIT, setFrameFit } from '../glassesOverlay.js'
import Button from './ui/Button.jsx'
import Card from './ui/Card.jsx'

// One labelled slider
function FitSlider({ label, value, range, digits, onChange }) {
  return (
    <label className="block text-label">
      <span className="flex justify-between font-medium">
        {label}
        <span>{value.toFixed(digits)}</span>
      </span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full cursor-pointer accent-coral"
      />
    </label>
  )
}

// Debug mode panel for the 3D glasses. The sliders change GLASSES_3D until the page is reloaded.
export function Fit3dDebugPanel({ faceShape }) {
  const { scaleRange, offsetXRange, offsetYRange, offsetZRange, armLengthRange } = GLASSES_3D.debug
  const [fit, setFit] = useState({ ...GLASSES_3D })
  const [copyMessage, setCopyMessage] = useState('')

  function handleChange(change) {
    Object.assign(GLASSES_3D, change)
    setFit({ ...GLASSES_3D })
    setCopyMessage('')
  }

  const configLine = `scale: ${fit.scale}, offsetX: ${fit.offsetX}, offsetY: ${fit.offsetY}, offsetZ: ${fit.offsetZ}, armLength: ${fit.armLength},`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(configLine)
      setCopyMessage('Copied. Use these values in GLASSES_3D at the top of src/glassesOverlay.js.')
    } catch {
      setCopyMessage("Couldn't reach the clipboard, so select the line above and copy it.")
    }
  }

  return (
    <Card className="mt-4 w-full space-y-3">
      <p className="text-label font-semibold">Fit debug: 3D glasses, press D to hide</p>
      <FitSlider label="Scale" value={fit.scale} range={scaleRange} digits={2} onChange={(scale) => handleChange({ scale })} />
      <FitSlider label="Offset right (cm)" value={fit.offsetX} range={offsetXRange} digits={2} onChange={(offsetX) => handleChange({ offsetX })} />
      <FitSlider label="Offset up (cm)" value={fit.offsetY} range={offsetYRange} digits={2} onChange={(offsetY) => handleChange({ offsetY })} />
      <FitSlider label="Offset forward (cm)" value={fit.offsetZ} range={offsetZRange} digits={2} onChange={(offsetZ) => handleChange({ offsetZ })} />
      <FitSlider label="Arm length (cm)" value={fit.armLength} range={armLengthRange} digits={1} onChange={(armLength) => handleChange({ armLength })} />

      <label className="flex cursor-pointer items-center gap-2 text-label">
        <input
          type="checkbox"
          checked={fit.showOccluder}
          onChange={(event) => handleChange({ showOccluder: event.target.checked })}
          className="accent-coral"
        />
        Show the invisible head shape
      </label>

      <code className="block rounded-inner bg-ink/5 p-2 text-caption break-all select-all">{configLine}</code>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button size="sm" onClick={handleCopy}>
          Copy the 3D values
        </Button>
        {copyMessage && (
          <span role="status" className="text-caption">
            {copyMessage}
          </span>
        )}
      </div>

      <p className="text-caption">Slider changes are lost on reload. Coral dots mark the irises, amber dots the lens centers.</p>
      <FaceRatios faceShape={faceShape} />
    </Card>
  )
}

// The averaged ratios behind the face shape, for tuning the thresholds in faceShape.js
function FaceRatios({ faceShape }) {
  return (
    <p className="text-caption">
      {faceShape
        ? `Face ratios: length ${faceShape.ratios.length.toFixed(2)}, jaw ${faceShape.ratios.jaw.toFixed(2)}, forehead ${faceShape.ratios.forehead.toFixed(2)} (${faceShape.label})`
        : 'Face ratios: still measuring'}
    </p>
  )
}

// Debug mode panel, shown by pressing D. The sliders only affect the selected frame,
// and FaceCamera remakes this panel when the frame changes, so they start from that frame's values.
function FitDebugPanel({ frame, faceShape }) {
  const { widthMultiplierRange, verticalOffsetRange } = GLASSES_FIT.debug
  const [fit, setFit] = useState(() => getFrameFit(frame))
  const [copyMessage, setCopyMessage] = useState('')

  function handleChange(change) {
    setFrameFit(frame, change)
    setFit(getFrameFit(frame))
    setCopyMessage('')
  }

  // Three decimal places is plenty, and keeps the line tidy
  const configLine = `'${frame.id}': { widthMultiplier: ${Number(fit.widthMultiplier.toFixed(3))}, verticalOffset: ${Number(fit.verticalOffset.toFixed(3))} },`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(configLine)
      setCopyMessage('Copied. Paste it into frameOverrides at the top of src/glassesOverlay.js.')
    } catch {
      setCopyMessage("Couldn't reach the clipboard, so select the line above and copy it.")
    }
  }

  return (
    <Card className="mt-4 w-full space-y-3">
      <p className="text-label font-semibold">
        Fit debug: {frame.name} ({frame.id}), press D to hide
      </p>
      <FitSlider
        label="Vertical offset"
        value={fit.verticalOffset}
        range={verticalOffsetRange}
        digits={3}
        onChange={(verticalOffset) => handleChange({ verticalOffset })}
      />
      <FitSlider
        label="Width multiplier"
        value={fit.widthMultiplier}
        range={widthMultiplierRange}
        digits={2}
        onChange={(widthMultiplier) => handleChange({ widthMultiplier })}
      />

      {/* The line to paste, always visible so it can also be selected by hand */}
      <code className="block rounded-inner bg-ink/5 p-2 text-caption break-all select-all">{configLine}</code>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button size="sm" onClick={handleCopy}>
          Copy this frame's values
        </Button>
        {copyMessage && (
          <span role="status" className="text-caption">
            {copyMessage}
          </span>
        )}
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-caption">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-pill bg-coral" /> Iris
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-pill bg-amber" /> Lens center
        </span>
        <span>Slider changes affect only this frame and are lost on reload</span>
      </p>
      <FaceRatios faceShape={faceShape} />
    </Card>
  )
}

export default FitDebugPanel
