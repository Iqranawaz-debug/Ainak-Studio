import { dismissStorageIssue, useStorageIssue } from '../storage.js'
import Button from './ui/Button.jsx'
import { AlertIcon, CloseIcon } from './ui/Icons.jsx'

const messages = {
  blocked: "This browser isn't allowing saving, so your choices last until you close this tab.",
  full: 'Storage on this device is full, so new choices last until you close this tab.',
  broken: "Some saved choices couldn't be read, so defaults are in use.",
}

// A small note in the corner when storage has a problem. The app keeps working either way.
function StorageNotice() {
  const issue = useStorageIssue()
  if (!issue) return null

  return (
    <div
      role="status"
      className="fixed bottom-10 left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-card border border-ink/15 bg-ivory py-1 pr-1 pl-2.5 text-caption shadow-raised sm:max-w-sm"
    >
      <AlertIcon className="size-4 text-coral" />
      <span>{messages[issue]}</span>
      <Button variant="icon" emphasis="ghost" size="sm" label="Dismiss this notice" onClick={dismissStorageIssue}>
        <CloseIcon className="size-4" />
      </Button>
    </div>
  )
}

export default StorageNotice
