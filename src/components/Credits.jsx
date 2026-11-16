import { useState } from 'react'
import Button from './ui/Button.jsx'
import Modal from './ui/Modal.jsx'
import Skeleton from './ui/Skeleton.jsx'

const LICENSES_URL = `${import.meta.env.BASE_URL}frames/licenses.md`

// Read licenses.md, where each file has a "## file.png" heading followed by "- Key: value" lines.
// Credits always comes from this file, so the log and the page can't disagree.
function parseLicenses(markdown) {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [file, ...lines] = section.trim().split('\n')
      const fields = Object.fromEntries(
        lines
          .filter((line) => line.startsWith('- '))
          .map((line) => {
            const split = line.indexOf(': ')
            return [line.slice(2, split), line.slice(split + 2).trim()]
          }),
      )
      return { file, ...fields }
    })
}

// One frame's credit: its name and author, then links to its source and license.
// The links drop onto their own line on narrow screens, which keeps the list short and readable.
function CreditLine({ entry }) {
  const sourceSite = new URL(entry.Source).hostname.replace(/^www\./, '')
  // Leaves out the long part in brackets, for example "(Public Domain Dedication)"
  const licenseName = entry.License.split(' (')[0]

  return (
    <li className="py-1.5 sm:flex sm:justify-between sm:gap-4">
      <span>
        <span className="font-medium">{entry.Name}</span> by {entry.Author}
      </span>
      <span className="block whitespace-nowrap sm:inline">
        <a href={entry.Source} target="_blank" rel="noreferrer" className="underline">
          {sourceSite}
        </a>
        {' · '}
        <a href={entry['License URL']} target="_blank" rel="noreferrer" className="underline">
          {licenseName}
        </a>
      </span>
    </li>
  )
}

// A list of credits, with a thin line between each one
function CreditList({ entries }) {
  return (
    <ul className="mt-1 divide-y divide-ink/10">
      {entries.map((entry) => (
        <CreditLine key={entry.file} entry={entry} />
      ))}
    </ul>
  )
}

// A small link that opens the list of image credits
function Credits() {
  const [isOpen, setIsOpen] = useState(false)
  const [entries, setEntries] = useState(null)
  const [failed, setFailed] = useState(false)

  async function handleOpen() {
    setIsOpen(true)
    if (entries) return

    try {
      const response = await fetch(LICENSES_URL)
      if (!response.ok) throw new Error('Could not load licenses.md')
      setEntries(parseLicenses(await response.text()))
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }

  const required = entries?.filter((entry) => entry['Attribution required'] === 'Yes') ?? []
  const optional = entries?.filter((entry) => entry['Attribution required'] !== 'Yes') ?? []

  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleOpen} className="!py-0.5 text-caption text-ink underline">
        Credits
      </Button>

      {isOpen && (
        <Modal title="Credits" onClose={() => setIsOpen(false)}>
          <div className="text-left text-caption sm:text-label">
            {failed && <p className="mt-3">The credits could not be loaded. Please try again.</p>}

            {/* A soft placeholder while the list loads */}
            {!failed && !entries && (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}

            {entries && (
              <>
                {required.length > 0 ? (
                  <>
                    <h3 className="mt-3 font-semibold">Attribution required</h3>
                    <CreditList entries={required} />
                  </>
                ) : (
                  <p className="mt-2">None of these images require attribution.</p>
                )}

                {optional.length > 0 && (
                  <>
                    <h3 className="mt-3 font-semibold">{required.length > 0 ? 'Also used, with thanks' : 'Used with thanks'}</h3>
                    <CreditList entries={optional} />
                  </>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

export default Credits
