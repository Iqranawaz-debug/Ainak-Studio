import { frameCatalog } from '../frames/catalog.js'
import { frameCategories } from '../frames/index.js'
import { describeFinish, describeLens, getFrameLook } from '../frames/look.js'
import { applySelectionChange } from '../frames/selection.js'
import ColorSwatches from './ColorSwatches.jsx'
import FramePreview from './FramePreview.jsx'
import Button from './ui/Button.jsx'
import Chip from './ui/Chip.jsx'
import Modal from './ui/Modal.jsx'

// How wide the drawer's larger preview is, in pixels
const LARGE_PREVIEW_WIDTH = 800

// More about one frame
function FrameDetailsDrawer({ frame, selection, savedLook, recommended, onChange, onClose }) {
  const details = frameCatalog[frame.id]
  const look = getFrameLook(frame, savedLook)
  const group = frameCategories.find((category) => category.id === frame.category).label
  const isSelected = selection.frameId === frame.id
  // The color this frame is wearing now, or would start with if it were chosen
  const { colorId } = isSelected ? selection : applySelectionChange(selection, { frameId: frame.id })

  return (
    <Modal variant="drawer" title={frame.name} eyebrow={`${group} · ${details.style}`} onClose={onClose}>
      <FramePreview frame={frame} colorId={colorId} savedLook={savedLook} width={LARGE_PREVIEW_WIDTH} className="mt-gutter" />

      {recommended && (
        <Chip tone="coral" className="mt-3">
          Recommended
        </Chip>
      )}
      <p className="mt-3 text-label">{details.description}</p>

      {/* Picking a color tries this frame on in that color */}
      <ColorSwatches
        colorId={colorId}
        showOriginal={frame.category === 'Realistic'}
        showColors={!frame.originalOnly}
        onSelect={(chosenColorId) => onChange({ frameId: frame.id, colorId: chosenColorId })}
        className="mt-gutter"
      />
      {frame.originalOnly && <p className="mt-1 text-caption text-ink/70">This frame only comes in its original color.</p>}

      <h3 className="mt-gutter text-label font-medium">Lens and finish</h3>
      <dl className="mt-1 text-label">
        <div className="flex justify-between gap-gutter border-b border-ink/10 py-1.5">
          <dt className="text-ink/70">Lens</dt>
          <dd>{describeLens(look)}</dd>
        </div>
        <div className="flex justify-between gap-gutter py-1.5">
          <dt className="text-ink/70">Finish</dt>
          <dd>{describeFinish(look)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-caption text-ink/70">
        Every frame can have clear, light, sunglass or gradient lenses in neutral, brown or green. Change them under the
        video.
      </p>

      <Button
        variant="primary"
        size="lg"
        onClick={() => {
          onChange({ frameId: frame.id })
          onClose()
        }}
        className="mt-gutter w-full"
      >
        {isSelected ? 'Keep trying this frame' : 'Try this frame'}
      </Button>
    </Modal>
  )
}

export default FrameDetailsDrawer
