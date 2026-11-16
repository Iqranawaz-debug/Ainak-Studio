import { trackingLabels } from '../faceGuide.js'
import { modeOptions, views } from '../splitView.js'
import TipsPopover from './TipsPopover.jsx'
import Button from './ui/Button.jsx'
import Chip from './ui/Chip.jsx'
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, CompareIcon, FlipIcon, FullscreenIcon, ImageIcon, RestartIcon } from './ui/Icons.jsx'
import SegmentedToggle from './ui/SegmentedToggle.jsx'

const viewOptions = views.map((view) => ({
  ...view,
  // Phones leave out the icon, so that the view switch and status fit on one row
  icon: view.id === 'compare' ? <CompareIcon className="size-4 max-sm:hidden" /> : null,
}))

// Where the picture comes from. Narrower videos show only the icons, to keep the toolbar on one row.
const sourceOptions = [
  {
    id: 'live',
    title: 'Live camera',
    icon: <CameraIcon className="size-4" />,
    label: <span className="@max-4xl:sr-only">Live camera</span>,
  },
  {
    id: 'photo',
    title: 'Photo',
    icon: <ImageIcon className="size-4" />,
    label: <span className="@max-4xl:sr-only">Photo</span>,
  },
]

// The dot on each tracking status. Each also differs in its word, so color is never the only signal.
const trackingDots = {
  tracking: 'bg-coral motion-safe:animate-pulse',
  searching: 'bg-amber motion-safe:animate-pulse',
  lost: 'bg-ink',
}

// What each side of the divider shows. In Compare these also choose which side a new frame goes on.
function SideLabels({ view, leftName, rightName, compareSide, onChooseSide }) {
  if (view === 'beforeAfter') {
    return (
      <>
        <Chip className="absolute bottom-4 left-4 whitespace-nowrap">Before</Chip>
        <Chip className="absolute right-4 bottom-4 whitespace-nowrap">After: {leftName}</Chip>
      </>
    )
  }

  const sideButton = (side, name, position) => (
    <Chip
      selected={compareSide === side}
      aria-label={`Change the ${side} frame, now ${name}`}
      onClick={() => onChooseSide(side)}
      className={`absolute bottom-4 ${position}`}
    >
      {name}
    </Chip>
  )
  return (
    <>
      {sideButton('left', leftName, 'left-4')}
      {sideButton('right', rightName, 'right-4')}
    </>
  )
}

// The controls in the top-right corner of the video or photo. Those that only suit the live camera are
// only passed in for it, and flip only when this device has another camera to flip to.
export function VideoToolbar({ source, onChooseSource, mode, onChooseMode, onRestart, onFlip, onToggleFullscreen, isFullscreen }) {
  return (
    <div role="group" aria-label="Camera" className="ml-auto flex items-center gap-1.5">
      <SegmentedToggle label="Live camera or photo" options={sourceOptions} value={source} onChoose={onChooseSource} />
      <SegmentedToggle label="2D or 3D" options={modeOptions} value={mode} onChoose={onChooseMode} />
      {onFlip && (
        <Button variant="icon" label="Flip camera" onClick={onFlip}>
          <FlipIcon />
        </Button>
      )}
      {onRestart && (
        <Button variant="icon" label="Restart camera" onClick={onRestart}>
          <RestartIcon />
        </Button>
      )}
      {onToggleFullscreen && (
        <Button variant="icon" label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onToggleFullscreen}>
          <FullscreenIcon />
        </Button>
      )}
    </div>
  )
}

// The controls over the video. They stay on the video so that they also work in fullscreen.
// While it's loading only the toolbar shows, so that restart and the way out of fullscreen stay in reach.
function VideoControls({
  isLoading,
  tracking,
  contextMessage,
  view,
  onChooseView,
  countdown,
  onCapture,
  leftName,
  rightName,
  compareSide,
  onChooseSide,
  isFullscreen,
  steppedName,
  onStepFrame,
  toolbar,
}) {
  return (
    <>
      {/* Reads out the context message. It's always on the page, as screen readers only watch what was already there. */}
      <p role="status" className="sr-only">
        {contextMessage}
      </p>

      {/* A narrow video has the view above the toolbar. A wider one has them on one row. */}
      <div className="absolute inset-x-4 top-4 z-20 flex flex-wrap items-start justify-between gap-2">
        {!isLoading && <SegmentedToggle label="View" options={viewOptions} value={view} onChoose={onChooseView} />}
        <VideoToolbar {...toolbar} isFullscreen={isFullscreen} />
      </div>

      {/* On phones this sits at the bottom, as the toolbar fills the row beneath the view. Otherwise it's under the view. */}
      {!isLoading && (
        <div className={`pointer-events-none absolute left-4 z-20 @md:top-[3.75rem] @md:bottom-auto ${view === 'single' ? 'bottom-4' : 'bottom-14'}`}>
          <Chip dot={trackingDots[tracking]} className="inline-flex">
            <span aria-live="polite">{trackingLabels[tracking]}</span>
          </Chip>
        </div>
      )}

      {!isLoading && <TipsPopover className={`absolute right-4 z-30 ${view === 'single' ? 'bottom-4' : 'bottom-14'}`} />}

      {/* One message at a time, and only when there's something to do. It moves up a row where there's room for it. */}
      {!isLoading && contextMessage && (
        <Chip
          aria-hidden="true"
          className="pointer-events-none absolute top-[6.5rem] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap @2xl:top-[3.75rem]"
        >
          {contextMessage}
        </Chip>
      )}

      {!isLoading && view !== 'single' && (
        <div className="z-20">
          <SideLabels view={view} leftName={leftName} rightName={rightName} compareSide={compareSide} onChooseSide={onChooseSide} />
        </div>
      )}

      {!isLoading && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
          {isFullscreen && (
            <Chip size="none" className="px-1">
              <Button variant="icon" emphasis="ghost" size="sm" label="Previous frame" onClick={() => onStepFrame(-1)}>
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span aria-live="polite" className="min-w-28 text-center whitespace-nowrap">{steppedName}</span>
              <Button variant="icon" emphasis="ghost" size="sm" label="Next frame" onClick={() => onStepFrame(1)}>
                <ChevronRightIcon className="size-4" />
              </Button>
            </Chip>
          )}
          {/* Starts the countdown, and cancels it if pressed again */}
          <Button
            variant="icon"
            emphasis="primary"
            size="lg"
            label={countdown === null ? 'Capture a photo' : 'Cancel the countdown'}
            onClick={onCapture}
            className="border-2 border-ivory shadow-card"
          >
            {countdown === null ? <CameraIcon className="size-6" /> : <CloseIcon className="size-6" />}
          </Button>
        </div>
      )}
    </>
  )
}

export default VideoControls
