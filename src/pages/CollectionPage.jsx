import { useState } from 'react'
import { Link } from 'react-router'
import PageShell from '../components/PageShell.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import { CameraIcon, DownloadIcon } from '../components/ui/Icons.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { deletePhoto, getPhotoFileName, loadPhotos } from '../photos.js'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// One saved photo. Deleting can't be undone, so it asks first.
function PhotoCard({ photo, onDelete }) {
  const [isConfirming, setIsConfirming] = useState(false)

  return (
    <Card as="li" padding="none" className="overflow-hidden">
      <img src={photo.image} alt={`Try-on photo: ${photo.label}`} className="block w-full" />
      <div className="p-3">
        <p className="text-label font-medium">{photo.label}</p>
        <p className="text-caption text-ink/70">{dateFormat.format(photo.savedAt)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {isConfirming ? (
            <>
              <Button variant="primary" size="sm" onClick={onDelete}>
                Yes, delete
              </Button>
              <Button size="sm" onClick={() => setIsConfirming(false)}>
                Keep it
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" as="a" href={photo.image} download={getPhotoFileName('jpg')}>
                <DownloadIcon className="size-4" />
                Download
              </Button>
              <Button size="sm" onClick={() => setIsConfirming(true)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

// The photos saved from the Studio, kept only in this browser
function CollectionPage() {
  const [photos, setPhotos] = useState(loadPhotos)
  const showToast = useToast()

  function handleDelete(id) {
    deletePhoto(id)
    setPhotos(loadPhotos())
    showToast('Photo deleted')
  }

  return (
    <PageShell>
      <div className="w-full">
        <h1 className="text-heading font-semibold">My Collection</h1>
        <p aria-live="polite" className="mt-1 text-label text-ink/70">
          {photos.length === 1 ? '1 photo' : `${photos.length} photos`} saved on this device.
        </p>

        {photos.length === 0 ? (
          <Card padding="lg" className="mt-section text-center">
            <span className="mb-1 flex justify-center text-ink/70">
              <CameraIcon />
            </span>
            <p>Photos you save from the Studio appear here.</p>
            <Button variant="primary" as={Link} to="/try" className="mt-3">
              Go to the Studio
            </Button>
          </Card>
        ) : (
          <ul className="mt-section grid gap-gutter sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} onDelete={() => handleDelete(photo.id)} />
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}

export default CollectionPage
