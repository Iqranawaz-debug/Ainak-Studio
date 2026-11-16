import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { setPerformanceMode, usePerformanceMode } from '../performance.js'
import Button from './ui/Button.jsx'
import Card from './ui/Card.jsx'
import { ChevronDownIcon } from './ui/Icons.jsx'
import Switch from './ui/Switch.jsx'

// Only pages that exist belong here. Add Catalog and About as they get built.
const navItems = [
  { label: 'Studio', to: '/try' },
  { label: 'My Collection', to: '/collection' },
]

// A small drawn pair of glasses, used as the logo
export function LogoMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 20" className="h-5 w-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="7.5" className="stroke-coral" />
      <circle cx="30" cy="10" r="7.5" />
      <path d="M17.5 9 Q20 6.5 22.5 9" />
    </svg>
  )
}

// The name button, which opens a small menu with Log out
function UserMenu({ user, onLogOut }) {
  const [isOpen, setIsOpen] = useState(false)
  const isPerformanceMode = usePerformanceMode()
  const navigate = useNavigate()
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  // While open, Escape or a click elsewhere closes the menu
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      buttonRef.current.focus()
    }
    function handlePointerDown(event) {
      const inside = menuRef.current.contains(event.target) || buttonRef.current.contains(event.target)
      if (!inside) setIsOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  return (
    <div className="relative">
      {/* A rounder shape than other buttons, to fit around the initial */}
      <Button
        ref={buttonRef}
        size="sm"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="!rounded-pill !py-1 !pr-3 !pl-1"
      >
        <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-pill bg-ink text-caption font-medium text-ivory">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[3rem] truncate sm:max-w-[14rem]">
          <span className="max-sm:sr-only">Welcome, </span>
          {user.name}
        </span>
        <ChevronDownIcon className={`size-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <Card ref={menuRef} padding="sm" raised className="absolute top-full right-0 z-30 mt-2 w-60">
          <p className="truncate px-3 py-2 text-caption text-ink/70">{user.email}</p>
          <div className="border-y border-ink/10 py-1">
            <p className="px-3 pt-1 text-caption font-medium text-ink/70">Settings</p>
            <Switch
              label="Performance"
              hint="Turns off film grain, the face scan and parallax. Saved on this device."
              checked={isPerformanceMode}
              onChange={setPerformanceMode}
            />
          </div>
          {/* The Studio picks up this note and starts the tour, from whichever page this is */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false)
              navigate('/try', { state: { replayTour: true } })
            }}
            className="mt-1 w-full !justify-start"
          >
            Replay tour
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogOut} className="w-full !justify-start">
            Log out
          </Button>
        </Card>
      )}
    </div>
  )
}

// The top of the app: the logo and project name, navigation, and the user menu
function AppHeader({ user, onLogOut }) {
  return (
    <header className="border-b border-ink/10">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-gutter px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <NavLink to="/try" className="flex shrink-0 items-center gap-2.5 rounded-control">
            <LogoMark />
            <span className="font-heading text-title font-semibold max-sm:sr-only">VisualLens AI</span>
          </NavLink>
          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  {/* NavLink marks the current page with aria-current, which also sets its background */}
                  <Button as={NavLink} to={item.to} variant="ghost" size="sm" className="max-sm:!px-2 aria-[current=page]:bg-ink/5">
                    {item.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <UserMenu user={user} onLogOut={onLogOut} />
      </div>
    </header>
  )
}

export default AppHeader
