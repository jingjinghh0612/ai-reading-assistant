import { getStorageItem, setStorageItem } from './storage.js'

export const READER_FONT_SIZE_STORAGE_KEY = 'ai-reading-reader-font-size'
export const DEFAULT_READER_FONT_SIZE = 18
export const MIN_READER_FONT_SIZE = 16
export const MAX_READER_FONT_SIZE = 24
export const READER_FONT_SIZE_STEP = 2

export function normalizeReaderFontSize(value) {
  const numericValue = Number.parseInt(value, 10)

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_READER_FONT_SIZE
  }

  return Math.min(MAX_READER_FONT_SIZE, Math.max(MIN_READER_FONT_SIZE, numericValue))
}

export function getInitialReaderFontSize() {
  return normalizeReaderFontSize(getStorageItem(READER_FONT_SIZE_STORAGE_KEY, String(DEFAULT_READER_FONT_SIZE)))
}

export function saveReaderFontSize(value) {
  const fontSize = normalizeReaderFontSize(value)
  setStorageItem(READER_FONT_SIZE_STORAGE_KEY, String(fontSize))

  return fontSize
}

export function adjustReaderFontSize(currentSize, direction) {
  const stepDirection = direction < 0 ? -1 : 1

  return normalizeReaderFontSize(normalizeReaderFontSize(currentSize) + stepDirection * READER_FONT_SIZE_STEP)
}
