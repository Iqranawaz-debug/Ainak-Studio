import { useNavigate } from 'react-router'
import { getCurrentUser, logOut } from '../auth.js'
import AppHeader from './AppHeader.jsx'
import Credits from './Credits.jsx'

// The header and footer bar shared by the pages for logged-in users. App.jsx keeps everyone else out.
// Everything sits in one container, so that it all lines up. footerNote is a line for the footer bar.
function PageShell({ footerNote, children }) {
  const navigate = useNavigate()
  const user = getCurrentUser()

  // Leaving the Studio also turns the camera off, see FaceCamera
  function handleLogOut() {
    logOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader user={user} onLogOut={handleLogOut} />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col items-center px-4 py-4 lg:px-8">{children}</main>

      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 px-4 text-caption text-ink/70 lg:h-8 lg:px-8">
          <p className="py-1 lg:py-0">{footerNote}</p>
          <Credits />
        </div>
      </footer>
    </div>
  )
}

export default PageShell
