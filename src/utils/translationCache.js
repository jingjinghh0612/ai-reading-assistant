import { getStorageItem, setStorageItem } from './storage.js'

const STORAGE_KEY = 'ai-reading-translation-cache'
const MAX_CACHE_SIZE = 100

function normalizeTranslationSource(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function hashTranslationSource(text) {
  let hash = 2166136261

  for (const character of normalizeTranslationSource(text)) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619) >>> 0
  }

  return hash.toString(36)
}

export function createTranslationCacheKey(text, type = 'translation') {
  const normalizedType = String(type || 'translation').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'translation'

  return `${normalizedType}:${hashTranslationSource(text)}`
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

export function getCachedTranslation(text, type) {
  const cache = readCache()
  const cacheKey = createTranslationCacheKey(text, type)
  const item = cache[cacheKey] || cache[normalizeTranslationSource(text)]

  return item?.translation || ''
}

export function saveCachedTranslation(text, translation, type) {
  if (!normalizeTranslationSource(text) || !translation.trim()) {
    return false
  }

  const cache = readCache()
  cache[createTranslationCacheKey(text, type)] = {
    translation,
    savedAt: new Date().toISOString(),
  }

  return writeCache(cache)
}
