// The Performance setting: when on, the film grain, face scan and parallax are off.
// It's a choice about this device and not an account, so it's saved once per browser.
import { useSyncExternalStore } from 'react'
import { readChoice, writeItem } from './storage.js'

const PERFORMANCE_KEY = 'visuallens.performance'
// Devices with this many processor cores or fewer start with the setting on
const LOW_END_CORES = 4

const listeners = new Set()

// The saved choice, or else on for low-end devices. Browsers that don't report their cores count as fine.
function loadPerformanceMode() {
  const saved = readChoice(PERFORMANCE_KEY, (value) => value === 'on' || value === 'off')
  if (saved) return saved === 'on'
  return navigator.hardwareConcurrency <= LOW_END_CORES
}

let isOn = loadPerformanceMode()

// index.css reads this to remove the grain
function applyToPage() {
  document.documentElement.dataset.performance = isOn ? 'on' : 'off'
}
applyToPage()

export function setPerformanceMode(nextIsOn) {
  isOn = nextIsOn
  writeItem(PERFORMANCE_KEY, isOn ? 'on' : 'off')
  applyToPage()
  listeners.forEach((listener) => listener())
}

// Whether the setting is on, updating whenever it changes
export function usePerformanceMode() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => isOn,
  )
}
