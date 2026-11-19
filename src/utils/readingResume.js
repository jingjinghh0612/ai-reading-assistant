import { getStorageItem, removeStorageItem, setStorageItem } from './storage.js'

const resumePrefix = 'ai-reading:reading-resume:v1'
const recentBookKey = `${resumePrefix}:recent-book`

function positionKey(bookId, chapterId = null) {
  return `${resumePrefix}:position:${JSON.stringify([bookId, chapterId])}`
}

export function getRecentReadingBookId() {
  return getStorageItem(recentBookKey)
}

export function getReadingResume(bookId, chapterId) {
  return getStorageItem(positionKey(bookId, chapterId))
}

export function saveReadingResume(bookId, chapterId, sentenceId) {
  if (sentenceId) {
    setStorageItem(positionKey(bookId, chapterId), sentenceId)
  }
  setStorageItem(positionKey(bookId), chapterId)
  setStorageItem(recentBookKey, bookId)
}

export function removeReadingResume(bookId, chapterIds) {
  removeStorageItem(positionKey(bookId))
  for (const chapterId of chapterIds) {
    removeStorageItem(positionKey(bookId, chapterId))
  }
  if (getRecentReadingBookId() === bookId) {
    removeStorageItem(recentBookKey)
  }
}
