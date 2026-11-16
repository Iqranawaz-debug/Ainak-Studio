import { useEffect, useState } from 'react'
import { catalogFilters, frameCatalog } from '../frames/catalog.js'
import { loadFavorites, saveFavorites } from '../frames/favorites.js'
import { frameCategories, frames } from '../frames/index.js'
import FrameDetailsDrawer from './FrameDetailsDrawer.jsx'
import FramePreview from './FramePreview.jsx'
import Button from './ui/Button.jsx'
import Card from './ui/Card.jsx'
import Chip from './ui/Chip.jsx'
import { CheckIcon, FilterIcon, HeartIcon, SearchIcon } from './ui/Icons.jsx'
import Input from './ui/Input.jsx'
import { useToast } from './ui/Toast.jsx'
import Tooltip from './ui/Tooltip.jsx'

// The filter that shows everything, and the one that shows only favorites
const ALL_FILTER = 'All'
const FAVORITES_FILTER = 'Favorites'

// Everything a frame can be found by: its name, its group, and its tags
function getFrameSearchTerms(frame) {
  const group = frameCategories.find((category) => category.id === frame.category).label
  return [frame.name, group, ...frameCatalog[frame.id].tags]
}

function matchesFilter(frame, filter, favorites) {
  if (filter === FAVORITES_FILTER) return favorites.includes(frame.id)
  return filter === ALL_FILTER || getFrameSearchTerms(frame).slice(1).includes(filter)
}

function matchesSearch(frame, search) {
  const wanted = search.trim().toLowerCase()
  return getFrameSearchTerms(frame).some((term) => term.toLowerCase().includes(wanted))
}

// Which side of Compare this frame is on, if either
function getCompareTag(frameId, leftFrameId, rightFrameId) {
  if (frameId === leftFrameId && frameId === rightFrameId) return 'Both'
  if (frameId === leftFrameId) return 'Left'
  if (frameId === rightFrameId) return 'Right'
  return null
}

// One frame in the collection: tap the main part to try it on, heart it, or open its details
function FrameCard({ frame, enterIndex, colorId, savedLook, selected, compareTag, recommended, isFavorite, onSelect, onToggleFavorite, onShowDetails }) {
  // In Compare, the frame on the right side has its own border color
  const isRightOnly = compareTag === 'Right'
  const isChosen = selected || isRightOnly
  const border = `border-2 ${isRightOnly ? 'border-amber' : selected ? 'border-coral' : 'border-ink/15'}`

  return (
    // The border is always 2px wide, so selecting a card doesn't shift the layout
    <Card padding="sm" border={border} className="ui-enter relative flex min-w-0 flex-col" style={{ '--enter-index': enterIndex }}>
      {/* Sits on the top edge of the card, so it appears without moving anything */}
      {recommended && (
        <Chip tone="coral" className="absolute -top-3 left-1/2 z-[1] -translate-x-1/2 !py-0 whitespace-nowrap">
          Recommended
        </Chip>
      )}
      <button
        type="button"
        aria-pressed={isChosen}
        onClick={onSelect}
        className="relative cursor-pointer rounded-control text-left transition-transform duration-100 active:scale-[0.98] motion-reduce:active:scale-100"
      >
        {/* A slightly shallower tile than elsewhere, to fit more frames in the panel */}
        <FramePreview frame={frame} colorId={colorId} savedLook={savedLook} tileShape="aspect-[3/1]" />
        {isChosen && (
          <span className={`absolute top-1 left-1 flex size-5 items-center justify-center rounded-pill text-ink ${isRightOnly ? 'bg-amber' : 'bg-coral'}`}>
            <CheckIcon className="size-3.5" />
          </span>
        )}
        <span className="mt-1.5 block truncate text-label font-medium">{frame.name}</span>
      </button>
      {/* Small cards below desktop give the category its own line, so that it's never cut off */}
      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1 lg:flex-nowrap">
        <span className="min-w-0 flex-1 text-caption text-ink/70 max-lg:basis-full">
          {frameCatalog[frame.id].style}
          {compareTag && <span className="font-medium text-ink"> · {compareTag}</span>}
        </span>
        <Button variant="ghost" size="sm" aria-label={`Details for ${frame.name}`} onClick={onShowDetails} className="!px-1.5 text-caption underline lg:!py-1">
          Details
        </Button>
        <Button
          variant="icon"
          emphasis="ghost"
          size="sm"
          label={isFavorite ? `Remove ${frame.name} from favorites` : `Add ${frame.name} to favorites`}
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
          className={isFavorite ? 'text-coral' : ''}
        >
          <HeartIcon filled={isFavorite} />
        </Button>
      </div>
    </Card>
  )
}

// The estimated face shape in one line, with "Why?" opening the full explanation and the disclaimer
//   waitingMessage: what to say while there's no face shape, if not the usual
function FaceShapeSummary({ faceShape, waitingMessage }) {
  const [isOpen, setIsOpen] = useState(false)
  // Names the frames too, as the badges can be scrolled out of view
  const names = faceShape?.recommended.map((id) => frames.find((frame) => frame.id === id).name)
  const recommendedNames = names && `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

  return (
    <Card as="section" padding="none" aria-live="polite" data-tour="face-shape" className="shrink-0 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {faceShape ? (
            <>
              <h2 className="text-label font-semibold">Your face shape: {faceShape.label}</h2>
              <p className="text-caption text-ink/70">Frames that may suit you are marked Recommended.</p>
            </>
          ) : (
            <p className="text-label font-medium">{waitingMessage ?? 'Hold still and face the camera...'}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={isOpen}
          aria-controls="face-shape-why"
          onClick={() => setIsOpen(!isOpen)}
          className="shrink-0 !px-2 !py-1 underline"
        >
          Why?
        </Button>
      </div>
      {isOpen && (
        <div id="face-shape-why" className="mt-1.5 border-t border-ink/10 pt-1.5">
          {faceShape && (
            <>
              <p className="text-label">{faceShape.reason}</p>
              <p className="mt-1 text-label font-medium">Try {recommendedNames}</p>
            </>
          )}
          <p className="mt-1 text-caption text-ink/70">This is a general style guide, not a measurement.</p>
        </div>
      )}
    </Card>
  )
}

// A friendly message and a way back, for when there are no frames to show
function EmptyState({ icon, title, children, onShowAll }) {
  return (
    <Card className="mt-3 text-center">
      {icon && <span className="mb-1 flex justify-center text-ink/70">{icon}</span>}
      <p className="text-label font-medium">{title}</p>
      {children && <p className="mt-1 text-caption text-ink/70">{children}</p>}
      <Button size="sm" onClick={onShowAll} className="mt-2">
        Show all frames
      </Button>
    </Card>
  )
}

// Choose a frame. On desktop this fills the column's height and stays in view: the summary, search and filters
// are pinned at the top, and only the frames scroll. Below desktop it's simply part of the page.
// compare says which frames are in Compare and which side picking a card changes, or is null otherwise.
function CollectionPanel({ selection, savedLook, faceShape, waitingMessage, compare, onPickFrame, onChange }) {
  const { frameId, colorId } = selection
  const showToast = useToast()
  const [filter, setFilter] = useState(ALL_FILTER)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState(loadFavorites)
  // The frame whose details drawer is open, if any
  const [detailsFrame, setDetailsFrame] = useState(null)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const shownFrames = frames.filter((frame) => matchesFilter(frame, filter, favorites) && matchesSearch(frame, search))
  const hasNoFavorites = filter === FAVORITES_FILTER && favorites.length === 0

  function clearFilters() {
    setFilter(ALL_FILTER)
    setSearch('')
  }

  function toggleFavorite(frame) {
    if (favorites.includes(frame.id)) {
      setFavorites(favorites.filter((id) => id !== frame.id))
      showToast(`Removed ${frame.name} from favorites`)
    } else {
      setFavorites([...favorites, frame.id])
      showToast(`${frame.name} saved to favorites on this device`)
    }
  }

  return (
    <aside className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:h-(--layout-studio-height) lg:min-h-[28rem] lg:self-start">
      <FaceShapeSummary faceShape={faceShape} waitingMessage={waitingMessage} />

      <div className="shrink-0">
        {/* The title, search and count share a line, leaving more of the panel for the frames */}
        <div className="flex items-center gap-2.5">
          <h2 className="text-title font-semibold">Collection</h2>
          <Input
            label="Search frames by name or category"
            hideLabel
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search frames"
            icon={<SearchIcon className="size-4" />}
            className="min-w-0 flex-1 [&_input]:!py-1.5"
          />
          <p aria-live="polite" className="text-caption whitespace-nowrap text-ink/70">
            {shownFrames.length} of {frames.length}
          </p>
        </div>

        {compare && <p className="mt-1 text-caption font-medium">Picking a frame for the {compare.side} side</p>}

        <div role="group" aria-label="Filter by category" className="mt-1.5 flex flex-wrap items-center gap-1 p-0.5">
          <FilterIcon className="mr-0.5 size-4 text-ink/70" />
          <Chip selected={filter === ALL_FILTER} onClick={() => setFilter(ALL_FILTER)} className="lg:!px-1.5">
            {ALL_FILTER}
          </Chip>
          {/* Only a heart, to keep the filters on as few rows as possible */}
          <Tooltip label={FAVORITES_FILTER}>
            <Chip selected={filter === FAVORITES_FILTER} aria-label={FAVORITES_FILTER} onClick={() => setFilter(FAVORITES_FILTER)} className="!px-1.5">
              <HeartIcon className="size-4" filled={filter === FAVORITES_FILTER} />
            </Chip>
          </Tooltip>
          {catalogFilters.map((option) => (
            <Chip key={option} selected={filter === option} onClick={() => setFilter(option)} className="lg:!px-1.5">
              {option}
            </Chip>
          ))}
        </div>
      </div>

      {/* The only part that scrolls, on desktop */}
      <div data-tour="frames" className="min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
        {hasNoFavorites && (
          <EmptyState icon={<HeartIcon />} title="No favorites yet" onShowAll={clearFilters}>
            Tap the heart on any frame to keep it here. Favorites are saved on this device.
          </EmptyState>
        )}
        {shownFrames.length === 0 && !hasNoFavorites && <EmptyState title="No frames match that." onShowAll={clearFilters} />}

        {/* The padding leaves room for the badges and focus rings, which would otherwise be clipped */}
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-3.5 px-1 pt-3.5 pb-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2">
          {shownFrames.map((frame, index) => (
            <FrameCard
              key={frame.id}
              frame={frame}
              enterIndex={index}
              colorId={colorId}
              savedLook={savedLook}
              selected={frame.id === frameId}
              compareTag={compare && getCompareTag(frame.id, frameId, compare.rightFrameId)}
              recommended={faceShape?.recommended.includes(frame.id)}
              isFavorite={favorites.includes(frame.id)}
              onSelect={() => onPickFrame(frame.id)}
              onToggleFavorite={() => toggleFavorite(frame)}
              onShowDetails={() => setDetailsFrame(frame)}
            />
          ))}
        </div>
      </div>

      {detailsFrame && (
        <FrameDetailsDrawer
          frame={detailsFrame}
          selection={selection}
          savedLook={savedLook}
          recommended={faceShape?.recommended.includes(detailsFrame.id)}
          onChange={onChange}
          onClose={() => setDetailsFrame(null)}
        />
      )}
    </aside>
  )
}

export default CollectionPanel
