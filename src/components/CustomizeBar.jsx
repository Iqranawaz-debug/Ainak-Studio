import { useEffect, useState } from 'react'
import { frameColors, ORIGINAL_COLOR_ID } from '../frames/colors.js'
import { describeFinish, describeLens, getFrameLook } from '../frames/look.js'
import { findMood, moods } from '../moods.js'
import { readChoice, writeItem } from '../storage.js'
import ColorSwatches from './ColorSwatches.jsx'
import FramePreview from './FramePreview.jsx'
import { FinishSwatches, LensSwatches } from './LookControls.jsx'
import Card from './ui/Card.jsx'
import SegmentedToggle from './ui/SegmentedToggle.jsx'
import Tooltip from './ui/Tooltip.jsx'

const TAB_KEY = 'visuallens.customizeTab'

const tabs = [
  { id: 'color', label: 'Color' },
  { id: 'lens', label: 'Lens' },
  { id: 'finish', label: 'Finish' },
  { id: 'mood', label: 'Mood' },
]

const FINISH_NOTE = 'Finishes are a fixed sheen in 2D. Reflections that move with you are 3D-only.'

function loadTab() {
  return readChoice(TAB_KEY, (saved) => tabs.some((tab) => tab.id === saved)) ?? tabs[0].id
}

// One tab button. Only the active tab is a Tab stop, and the arrow keys move between them.
function TabButton({ tab, isActive, onChoose }) {
  return (
    <button
      type="button"
      role="tab"
      id={`customize-tab-${tab.id}`}
      aria-selected={isActive}
      aria-controls="customize-panel"
      aria-describedby={tab.id === 'finish' ? 'customize-finish-note' : undefined}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onChoose(tab.id)}
      className={`-mb-px cursor-pointer border-b-2 px-2.5 pb-1 text-label font-medium whitespace-nowrap ${
        isActive ? 'border-coral text-ink' : 'border-transparent text-ink/70 hover:border-ink/30 hover:text-ink'
      }`}
    >
      {tab.label}
    </button>
  )
}

// One tidy bar of choices under the video: a live preview of the current frame, then tabs,
// with only the active tab's swatches showing. The active tab is remembered on this device.
function CustomizeBar({ frame, colorId, onChangeColor, savedLook, onChangeLook, moodId, onChooseMood }) {
  const [activeTab, setActiveTab] = useState(loadTab)
  const look = getFrameLook(frame, savedLook)

  useEffect(() => {
    writeItem(TAB_KEY, activeTab)
  }, [activeTab])

  function handleTabKeys(event) {
    const steps = { ArrowRight: 1, ArrowLeft: -1 }
    const step = steps[event.key]
    if (!step) return

    event.preventDefault()
    const index = tabs.findIndex((tab) => tab.id === activeTab)
    const nextIndex = (index + step + tabs.length) % tabs.length
    setActiveTab(tabs[nextIndex].id)
    event.currentTarget.querySelectorAll('[role="tab"]')[nextIndex].focus()
  }

  const colorLabel = colorId === ORIGINAL_COLOR_ID ? 'Original' : frameColors.find((color) => color.id === colorId).label
  // What's chosen in each tab, in words
  const values = { color: colorLabel, lens: describeLens(look), finish: describeFinish(look), mood: findMood(moodId).label }

  return (
    <Card padding="none" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-3 py-2.5">
      <FramePreview frame={frame} colorId={colorId} savedLook={savedLook} className="w-20 sm:row-span-2 sm:w-28" />

      <div className="flex min-w-0 items-end justify-between gap-3 border-b border-ink/10">
        <div role="tablist" aria-label="Customize" onKeyDown={handleTabKeys} className="flex">
          {tabs.map((tab) =>
            tab.id === 'finish' ? (
              <Tooltip key={tab.id} label={FINISH_NOTE} isLong showOnTap>
                <TabButton tab={tab} isActive={activeTab === tab.id} onChoose={setActiveTab} />
              </Tooltip>
            ) : (
              <TabButton key={tab.id} tab={tab} isActive={activeTab === tab.id} onChoose={setActiveTab} />
            ),
          )}
        </div>
        <p className="truncate pb-1 text-caption text-ink/70 max-sm:hidden">{values[activeTab]}</p>
      </div>
      <p id="customize-finish-note" className="sr-only">
        {FINISH_NOTE}
      </p>

      <div
        id="customize-panel"
        role="tabpanel"
        aria-labelledby={`customize-tab-${activeTab}`}
        className="flex min-h-9 min-w-0 items-center max-sm:col-span-2"
      >
        {activeTab === 'color' && (
          <ColorSwatches
            colorId={colorId}
            showOriginal={frame.category === 'Realistic'}
            showColors={!frame.originalOnly}
            onSelect={onChangeColor}
            hideHeading
          />
        )}
        {activeTab === 'lens' && <LensSwatches frame={frame} savedLook={savedLook} onChange={onChangeLook} />}
        {activeTab === 'finish' && <FinishSwatches frame={frame} savedLook={savedLook} onChange={onChangeLook} />}
        {activeTab === 'mood' && <SegmentedToggle label="Mood" options={moods} value={moodId} onChoose={onChooseMood} />}
        {activeTab === 'color' && frame.originalOnly && <p className="ml-2 text-caption text-ink/70">This frame only comes in its original color.</p>}
      </div>
    </Card>
  )
}

export default CustomizeBar
