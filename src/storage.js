// Every read and write of localStorage goes through here, so that storage being full, blocked or
// holding broken data can never stop the app. What can't be saved is kept in memory until the tab
// closes, and a small notice says so (see StorageNotice).
import { useSyncExternalStore } from 'react'

const memory = new Map()
const listeners = new Set()

// The most serious problem so far, as the notice only shows one
const ISSUE_RANK = { broken: 1, full: 2, blocked: 3 }
let issue = null
let isDismissed = false

function report(nextIssue) {
  if (issue && ISSUE_RANK[issue] >= ISSUE_RANK[nextIssue]) return
  issue = nextIssue
  isDismissed = false
  listeners.forEach((listener) => listener())
}

function reportFailedWrite(error) {
  report(error?.name === 'QuotaExceededError' ? 'full' : 'blocked')
}

// The saved text, or null if there is none
export function readItem(key) {
  if (memory.has(key)) return memory.get(key)
  try {
    return localStorage.getItem(key)
  } catch {
    report('blocked')
    return null
  }
}

// Save some text. If it can't be saved, it still lasts until the tab closes.
export function writeItem(key, value) {
  try {
    localStorage.setItem(key, value)
    memory.delete(key)
  } catch (error) {
    memory.set(key, value)
    reportFailedWrite(error)
  }
}

export function removeItem(key) {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    report('blocked')
  }
}

// A saved choice, or null if there is none or it isn't one of the allowed values
export function readChoice(key, isAllowed) {
  const saved = readItem(key)
  if (saved === null) return null
  if (isAllowed(saved)) return saved
  report('broken')
  return null
}

// A saved list. Anything that isn't a list becomes an empty one, and bad entries are left out.
export function readList(key, isValidEntry) {
  const saved = readItem(key)
  if (saved === null) return []
  try {
    const list = JSON.parse(saved)
    const entries = Array.isArray(list) ? list.filter(isValidEntry) : []
    if (!Array.isArray(list) || entries.length !== list.length) report('broken')
    return entries
  } catch {
    report('broken')
    return []
  }
}

export function writeList(key, list) {
  writeItem(key, JSON.stringify(list))
}

// For things promised to be kept, such as photos: returns false if it couldn't really be saved,
// rather than keeping it in memory and being gone after the tab closes.
export function writeListForKeeps(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export function dismissStorageIssue() {
  isDismissed = true
  listeners.forEach((listener) => listener())
}

// The current problem ('blocked', 'full' or 'broken'), or null if there's nothing to show
export function useStorageIssue() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => (isDismissed ? null : issue),
  )
}
