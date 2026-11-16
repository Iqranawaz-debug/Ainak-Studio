import { frameColors, ORIGINAL_COLOR_ID } from '../frames/colors.js'
import Swatch, { SwatchGroup } from './ui/Swatch.jsx'

// The color choices. showOriginal and showColors say which swatches this frame offers.
function ColorSwatches({ colorId, showOriginal, showColors, onSelect, hideHeading = false, className = '' }) {
  const colorLabel =
    colorId === ORIGINAL_COLOR_ID ? 'Original' : frameColors.find((color) => color.id === colorId).label

  return (
    <SwatchGroup title="Color" value={colorLabel} hideHeading={hideHeading} className={className}>
      {showOriginal && (
        <Swatch
          label="Original"
          background="linear-gradient(135deg, #C98A2B 50%, #FAF6F0 50%)"
          checkColor="#1C1917"
          selected={colorId === ORIGINAL_COLOR_ID}
          onSelect={() => onSelect(ORIGINAL_COLOR_ID)}
        />
      )}
      {showColors &&
        frameColors.map((color) => (
          <Swatch
            key={color.id}
            label={color.label}
            background={color.hex}
            checkColor={color.checkColor}
            selected={color.id === colorId}
            onSelect={() => onSelect(color.id)}
          />
        ))}
    </SwatchGroup>
  )
}

export default ColorSwatches
