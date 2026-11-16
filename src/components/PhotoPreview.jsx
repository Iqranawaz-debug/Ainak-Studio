import { useState } from 'react'
import { Link } from 'react-router'
import { getPhotoFileName, savePhoto } from '../photos.js'
import Button from './ui/Button.jsx'
import { DownloadIcon, HeartIcon, RestartIcon } from './ui/Icons.jsx'
import Modal from './ui/Modal.jsx'
import { useToast } from './ui/Toast.jsx'

// Shows the photo just taken, to download, keep, or take again. Nothing leaves this device.
function PhotoPreview({ photo, onRetake, onClose }) {
  const showToast = useToast()
  const [isSaved, setIsSaved] = useState(false)

  function handleSave() {
    if (savePhoto(photo.canvas, photo.label)) {
      setIsSaved(true)
      showToast('Saved on this device')
    } else {
      showToast('This device has no room left for more photos. Delete some from My Collection, or download this one.', 'error')
    }
  }

  return (
    <Modal title="Your photo" subtitle={photo.label} onClose={onClose}>
      <img src={photo.url} alt={`Try-on photo: ${photo.label}`} className="mt-3 max-h-[52vh] w-full rounded-control object-contain" />

      {!photo.hasGlasses && (
        <p role="alert" className="mt-2 text-label font-medium">
          I couldn't see your face at that moment, so this photo has no glasses. Try taking it again.
        </p>
      )}

      <div className="mt-gutter flex flex-wrap gap-2">
        <Button variant="primary" as="a" href={photo.url} download={getPhotoFileName('png')}>
          <DownloadIcon />
          Download PNG
        </Button>
        <Button disabled={isSaved} onClick={handleSave}>
          <HeartIcon />
          {isSaved ? 'Saved' : 'Save to My Collection'}
        </Button>
        <Button onClick={onRetake}>
          <RestartIcon />
          Retake
        </Button>
      </div>

      <p className="mt-3 text-caption text-ink/70">
        {isSaved ? (
          <>
            Saved on this device.{' '}
            <Link to="/collection" className="font-medium text-ink underline">
              View My Collection
            </Link>
          </>
        ) : (
          'This photo stays on this device. My Collection keeps a smaller copy, so download the PNG for full size.'
        )}
      </p>
    </Modal>
  )
}

export default PhotoPreview
