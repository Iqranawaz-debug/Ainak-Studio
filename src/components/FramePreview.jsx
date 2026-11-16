import { useEffect, useState } from 'react'
import { getFramePreview } from '../frames/frameArt.js'
import { getFrameLook } from '../frames/look.js'
import Skeleton from './ui/Skeleton.jsx'

// Classic drawings include arm stubs and a margin, while the PNGs are trimmed to the rims.
// This enlarges the Classic ones so the rims come out the same width on every card.
const CLASSIC_PREVIEW_SCALE = 1.19

// The one preview style used for every frame: the same soft neutral tile, with the frame centered at
// the same width. Previews are painted on a canvas, so a soft placeholder shows until they arrive.
// This filter is fixed and never animated.
function FramePreview({ frame, colorId, savedLook, width, tileShape = 'aspect-[5/2]', className = '' }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const { lensType, lensTint, finish } = getFrameLook(frame, savedLook)

  useEffect(() => {
    let isLatest = true
    getFramePreview(frame, colorId, { lensType, lensTint, finish }, width)
      .then((url) => {
        if (isLatest) setPreviewUrl(url)
      })
      .catch((error) => console.error(error))
    return () => {
      isLatest = false
    }
  }, [frame, colorId, lensType, lensTint, finish, width])

  return (
    <span className={`flex ${tileShape} items-center justify-center overflow-hidden rounded-control bg-ink/10 ${className}`}>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          // The faint edge keeps the palest frame colors readable on the soft tile
          className="block aspect-[5/2] w-[78%] object-contain drop-shadow-[0_0_1px_rgb(28_25_23/0.6)]"
          style={frame.category === 'Classic' ? { scale: CLASSIC_PREVIEW_SCALE } : undefined}
        />
      ) : (
        <Skeleton className="size-full" />
      )}
    </span>
  )
}

export default FramePreview
