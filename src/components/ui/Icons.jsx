// The app's icons: all inline SVG on a 20 x 20 grid with the same 1.5 stroke, rounded, in the text color.
// They're decorative, so the button or label around each one gives it a name.
function Icon({ children, className = 'size-5', filled = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`shrink-0 ${className}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function CameraIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 6.5 H6 L7.5 4 H12.5 L14 6.5 H17.5 V16 H2.5 Z" />
      <circle cx="10" cy="11" r="3" />
    </Icon>
  )
}

// A small landscape picture, for photos
export function ImageIcon(props) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="4" width="15" height="12" rx="1.5" />
      <circle cx="7" cy="8" r="1.25" />
      <path d="M3 14.5 L8 10.5 L11 13 L13.5 11 L17 14" />
    </Icon>
  )
}

export function UploadIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 13 V3.5" />
      <path d="M6 7.5 L10 3.5 L14 7.5" />
      <path d="M3.5 16.5 H16.5" />
    </Icon>
  )
}

// A light bulb, for tips
export function BulbIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7.5 13.5 C7.5 11.5 5 10.5 5 7.8 A5 5 0 0 1 15 7.8 C15 10.5 12.5 11.5 12.5 13.5 Z" />
      <path d="M8 16.5 H12" />
    </Icon>
  )
}

export function FlipIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7.5 A6.5 6.5 0 0 1 16 7" />
      <path d="M16.5 3.5 V7.5 H12.5" />
      <path d="M16 12.5 A6.5 6.5 0 0 1 4 13" />
      <path d="M3.5 16.5 V12.5 H7.5" />
    </Icon>
  )
}

export function FullscreenIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5 V3.5 H7.5" />
      <path d="M12.5 3.5 H16.5 V7.5" />
      <path d="M16.5 12.5 V16.5 H12.5" />
      <path d="M7.5 16.5 H3.5 V12.5" />
    </Icon>
  )
}

export function HeartIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 16.5 C5.5 13.5 3 11 3 7.8 C3 5.6 4.7 4 6.7 4 C8 4 9.3 4.7 10 5.9 C10.7 4.7 12 4 13.3 4 C15.3 4 17 5.6 17 7.8 C17 11 14.5 13.5 10 16.5 Z" />
    </Icon>
  )
}

// Two halves with a line between them, like the divider in Compare
export function CompareIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 2.5 V17.5" />
      <path d="M7 5 H3.5 V15 H7" />
      <path d="M13 5 H16.5 V15 H13" />
    </Icon>
  )
}

export function DownloadIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 3 V12.5" />
      <path d="M6 8.5 L10 12.5 L14 8.5" />
      <path d="M3.5 16.5 H16.5" />
    </Icon>
  )
}

export function FilterIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3 5 H17" />
      <path d="M5.5 10 H14.5" />
      <path d="M8.5 15 H11.5" />
    </Icon>
  )
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13 L17 17" />
    </Icon>
  )
}

// Supporting icons, drawn the same way
export function EyeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 10 C4 6 7 4 10 4 C13 4 16 6 18 10 C16 14 13 16 10 16 C7 16 4 14 2 10 Z" />
      <circle cx="10" cy="10" r="2.5" />
    </Icon>
  )
}

export function EyeOffIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 10 C4 6 7 4 10 4 C13 4 16 6 18 10 C16 14 13 16 10 16 C7 16 4 14 2 10 Z" />
      <path d="M4 16 L16 4" />
    </Icon>
  )
}

export function FaceIcon(props) {
  return (
    <Icon {...props}>
      <ellipse cx="10" cy="10" rx="6" ry="7.5" />
      <path d="M7.5 8.5 V8.6 M12.5 8.5 V8.6" />
      <path d="M7.5 12.5 Q10 14.5 12.5 12.5" />
    </Icon>
  )
}

export function LockIcon(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="9" width="12" height="8" rx="2" />
      <path d="M6.5 9 V6.5 A3.5 3.5 0 0 1 13.5 6.5 V9" />
    </Icon>
  )
}

// Spins with its button's loading state, as a quarter-open circle
export function SpinnerIcon({ className = 'size-5' }) {
  return (
    <Icon className={`motion-safe:animate-spin ${className}`}>
      <path d="M10 3 A7 7 0 1 1 3 10" />
    </Icon>
  )
}

export function RestartIcon(props) {
  return (
    <Icon {...props}>
      <path d="M16 10 A6 6 0 1 1 13.8 5.4" />
      <path d="M14 2 V5.6 H10.4" />
    </Icon>
  )
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 10.5 L8 14.5 L16 5.5" />
    </Icon>
  )
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 5 L15 15 M15 5 L5 15" />
    </Icon>
  )
}

export function AlertIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5 V10.5" />
      <path d="M10 13.5 V13.6" />
    </Icon>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12.5 4.5 L7 10 L12.5 15.5" />
    </Icon>
  )
}

export function ChevronRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="M7.5 4.5 L13 10 L7.5 15.5" />
    </Icon>
  )
}

export function ChevronDownIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4.5 7.5 L10 13 L15.5 7.5" />
    </Icon>
  )
}
