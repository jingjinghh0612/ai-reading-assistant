import { normalizeWord } from './word.js'
import { getStorageItem, setStorageItem } from './storage.js'

const STORAGE_KEY = 'ai-reading-vocabulary'
const STORAGE_ERROR = 'Unable to update vocabulary in this browser.'
const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14]

function normalizeDate(value, fallbackValue = new Date().toISOString()) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallbackValue
  }

  return date.toISOString()
}

function normalizeReviewStage(value) {
  const stage = Number(value)

  if (!Number.isInteger(stage) || stage < 0) {
    return 0
  }

  return Math.min(stage, REVIEW_INTERVAL_DAYS.length)
}

function normalizeCount(value) {
  const count = Number(value)
  return Number.isInteger(count) && count > 0 ? count : 0
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate.toISOString()
}

function normalizeVocabularyItem(item) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const normalizedWord = normalizeWord(item.normalizedWord || item.word || '')

  if (!normalizedWord) {
    return null
  }

  const savedAt = normalizeDate(item.savedAt)
  const reviewStage = normalizeReviewStage(item.reviewStage)

  return {
    id: item.id || `${normalizedWord}-${Date.now()}`,
    word: item.word || normalizedWord,
    normalizedWord,
    meaning: item.meaning || item.definition || '',
    partOfSpeech: item.partOfSpeech || 'unknown',
    example: item.example || '',
    savedAt,
    mastered: Boolean(item.mastered),
    reviewStage,
    reviewCount: normalizeCount(item.reviewCount),
    mistakeCount: normalizeCount(item.mistakeCount),
    lastReviewedAt: item.lastReviewedAt ? normalizeDate(item.lastReviewedAt, '') : '',
    nextReviewAt: normalizeDate(item.nextReviewAt || savedAt, savedAt),
  }
}

function sortBySavedAtDesc(words) {
  return [...words].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
}

function sortByNextReviewAtAsc(words) {
  return [...words].sort((a, b) => {
    const reviewTimeDifference = new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()

    if (reviewTimeDifference !== 0) {
      return reviewTimeDifference
    }

    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  })
}

function writeVocabularyWords(words) {
  const saved = setStorageItem(STORAGE_KEY, JSON.stringify(words))

  return {
    saved,
    words: saved ? words : getVocabularyWords(),
  }
}

export function getVocabularyWords() {
  try {
    const saved = JSON.parse(getStorageItem(STORAGE_KEY, '[]'))

    if (!Array.isArray(saved)) {
      return []
    }

    const uniqueWords = new Map()

    saved
      .map(normalizeVocabularyItem)
      .filter(Boolean)
      .forEach((item) => {
        if (!uniqueWords.has(item.normalizedWord)) {
          uniqueWords.set(item.normalizedWord, item)
        }
      })

    return sortBySavedAtDesc(Array.from(uniqueWords.values()))
  } catch {
    return []
  }
}

export function saveVocabularyWord(wordInfo) {
  const normalizedWord = normalizeWord(wordInfo.word || '')

  if (!normalizedWord) {
    return {
      added: false,
      words: getVocabularyWords(),
    }
  }

  const words = getVocabularyWords()
  const exists = words.some((item) => item.normalizedWord === normalizedWord)

  if (exists) {
    return {
      added: false,
      words,
    }
  }

  const savedAt = new Date().toISOString()
  const newWord = {
    id: `${normalizedWord}-${Date.now()}`,
    word: wordInfo.word,
    normalizedWord,
    meaning: wordInfo.meaning || wordInfo.definition || '',
    partOfSpeech: wordInfo.partOfSpeech,
    example: wordInfo.example,
    savedAt,
    mastered: false,
    reviewStage: 0,
    reviewCount: 0,
    mistakeCount: 0,
    lastReviewedAt: '',
    nextReviewAt: savedAt,
  }

  const nextWords = [newWord, ...words]
  const result = writeVocabularyWords(nextWords)

  if (!result.saved) {
    return {
      added: false,
      words,
      error: STORAGE_ERROR,
    }
  }

  return {
    added: true,
    words: result.words,
  }
}

export function removeVocabularyWord(normalizedWord) {
  const target = normalizeWord(normalizedWord || '')
  const words = getVocabularyWords()
  const nextWords = words.filter((item) => item.normalizedWord !== target)
  const saved = setStorageItem(STORAGE_KEY, JSON.stringify(nextWords))

  if (!saved) {
    return {
      removed: false,
      words,
      error: STORAGE_ERROR,
    }
  }

  return {
    removed: true,
    words: nextWords,
  }
}

export function toggleVocabularyWordMastered(normalizedWord) {
  const target = normalizeWord(normalizedWord || '')
  const words = getVocabularyWords()
  const nextWords = words.map((item) => {
    if (item.normalizedWord !== target) {
      return item
    }

    return {
      ...item,
      mastered: !item.mastered,
    }
  })

  const saved = setStorageItem(STORAGE_KEY, JSON.stringify(nextWords))

  if (!saved) {
    return {
      updated: false,
      words,
      error: STORAGE_ERROR,
    }
  }

  return {
    updated: true,
    words: nextWords,
  }
}

export function clearVocabularyWords() {
  const saved = setStorageItem(STORAGE_KEY, '[]')

  if (!saved) {
    return {
      cleared: false,
      words: getVocabularyWords(),
      error: STORAGE_ERROR,
    }
  }

  return {
    cleared: true,
    words: [],
  }
}

export function isWordSaved(word) {
  const normalizedWord = normalizeWord(word || '')
  return getVocabularyWords().some((item) => item.normalizedWord === normalizedWord)
}

export function getDueVocabularyWords(words, now = new Date()) {
  const nowDate = new Date(now)
  const nowTime = Number.isNaN(nowDate.getTime()) ? Date.now() : nowDate.getTime()

  return sortByNextReviewAtAsc(
    words
      .map(normalizeVocabularyItem)
      .filter(Boolean)
      .filter((item) => !item.mastered && new Date(item.nextReviewAt).getTime() <= nowTime),
  )
}

export function recordVocabularyReview(normalizedWord, outcome, now = new Date()) {
  const target = normalizeWord(normalizedWord || '')
  const words = getVocabularyWords()

  if (!target || !['remembered', 'forgot'].includes(outcome)) {
    return {
      updated: false,
      word: null,
      words,
    }
  }

  let updatedWord = null
  const reviewedAt = normalizeDate(now)
  const nextWords = words.map((item) => {
    if (item.normalizedWord !== target) {
      return item
    }

    const forgot = outcome === 'forgot'
    const intervalDays = forgot
      ? REVIEW_INTERVAL_DAYS[0]
      : REVIEW_INTERVAL_DAYS[Math.min(item.reviewStage, REVIEW_INTERVAL_DAYS.length - 1)]
    const nextReviewStage = forgot ? 0 : Math.min(item.reviewStage + 1, REVIEW_INTERVAL_DAYS.length)

    updatedWord = {
      ...item,
      mastered: forgot ? false : nextReviewStage >= REVIEW_INTERVAL_DAYS.length,
      reviewStage: nextReviewStage,
      reviewCount: item.reviewCount + 1,
      mistakeCount: item.mistakeCount + (forgot ? 1 : 0),
      lastReviewedAt: reviewedAt,
      nextReviewAt: addDays(reviewedAt, intervalDays),
    }

    return updatedWord
  })

  if (!updatedWord) {
    return {
      updated: false,
      word: null,
      words,
    }
  }

  const result = writeVocabularyWords(nextWords)

  if (!result.saved) {
    return {
      updated: false,
      word: updatedWord,
      words: result.words,
      error: STORAGE_ERROR,
    }
  }

  return {
    updated: true,
    word: updatedWord,
    words: result.words,
  }
}

export function filterVocabularyWords(words, options = {}) {
  const keyword = String(options.query || '').trim().toLowerCase()
  const status = options.status || 'all'

  return words.filter((item) => {
    const matchesStatus =
      status === 'all' ||
      (status === 'review' && !item.mastered) ||
      (status === 'mastered' && item.mastered)

    if (!matchesStatus) {
      return false
    }

    if (!keyword) {
      return true
    }

    return (
      item.word.toLowerCase().includes(keyword) ||
      item.normalizedWord.includes(keyword) ||
      item.meaning.toLowerCase().includes(keyword) ||
      item.partOfSpeech.toLowerCase().includes(keyword)
    )
  })
}
