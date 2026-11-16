// Keeps the downloaded face model in the browser's Cache Storage, so a second visit doesn't download it.
// Browsers without it, or with no room, simply download it each time.
const CACHE_NAME = 'visuallens-models-v1'

async function openCache() {
  try {
    return await caches.open(CACHE_NAME)
  } catch {
    return null
  }
}

// The model's bytes, from the cache if it's there and otherwise from the network
export async function loadModelBytes(url, signal) {
  const cache = await openCache()
  const cached = await cache?.match(url)
  if (cached) return new Uint8Array(await cached.arrayBuffer())

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`The model download failed with status ${response.status}`)
  // Not being able to keep a copy is no reason to stop
  await cache?.put(url, response.clone()).catch(() => {})
  return new Uint8Array(await response.arrayBuffer())
}

// Forget the saved copy, in case it's damaged, so that the next try downloads a fresh one
export async function forgetCachedModel(url) {
  const cache = await openCache()
  await cache?.delete(url)
}
