// Remembers each account's favorite frames in this browser's localStorage.
import { getCurrentUser } from '../auth.js'
import { readList, writeList } from '../storage.js'

function getFavoritesKey() {
  return `visuallens.favorites.${getCurrentUser().email}`
}

// The favorite frame ids, or an empty list if they're missing or broken
export function loadFavorites() {
  return readList(getFavoritesKey(), (frameId) => typeof frameId === 'string')
}

export function saveFavorites(frameIds) {
  writeList(getFavoritesKey(), frameIds)
}
