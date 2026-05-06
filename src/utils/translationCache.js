import { getStorageItem, setStorageItem } from './storage.js'

const STORAGE_KEY = 'ai-reading-translation-cache'
const MAX_CACHE_SIZE = 100

function createCacheKey(text) {
  return text.trim()
}

function readCache() {
  try {
    const cache = JSON.parse(getStorageItem(STORAGE_KEY, '{}'))
    return cache && typeof cache === 'object' && !Array.isArray(cache) ? cache : {}
  } catch {
    return {}
  }
}

function writeCache(cache) {
  const entries = Object.entries(cache)
    .sort((a, b) => new Date(b[1].savedAt).getTime() - new Date(a[1].savedAt).getTime())
    .slice(0, MAX_CACHE_SIZE)

  return setStorageItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)))
}

export function getCachedTranslation(text) {
  const cacheKey = createCacheKey(text)
  const item = readCache()[cacheKey]

  return item?.translation || ''
}

export function saveCachedTranslation(text, translation) {
  if (!text.trim() || !translation.trim()) {
    return false
  }

  const cache = readCache()
  cache[createCacheKey(text)] = {
    translation,
    savedAt: new Date().toISOString(),
  }

  return writeCache(cache)
}
