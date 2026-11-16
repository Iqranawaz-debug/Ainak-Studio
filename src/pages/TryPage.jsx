import FaceCamera from '../components/FaceCamera.jsx'
import PageShell from '../components/PageShell.jsx'

// The try-on studio
function TryPage() {
  return (
    <PageShell footerNote="Your camera stays on your device. Your choices are saved on this device only.">
      {/* Screen readers still get a page title, though the video takes its place on screen */}
      <h1 className="sr-only">Try-on studio</h1>
      <FaceCamera />
    </PageShell>
  )
}

export default TryPage
