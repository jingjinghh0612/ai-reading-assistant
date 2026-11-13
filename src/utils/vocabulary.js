import { normalizeWord } from './word.js'
import { getStorageItem, setStorageItem } from './storage.js'

const STORAGE_KEY = 'ai-reading-vocabulary'
const STORAGE_ERROR = 'Unable to update vocabulary in this browser.'
const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14]
const REVIEW_STATUS = 'review'
const MASTERED_STATUS = 'mastered'
const VALID_REVIEW_OUTCOMES = ['forgot', 'familiar', 'mastered', 'remembered']

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function hasChineseText(value) {
  return /[\u3400-\u9fff]/.test(value)
}

function normalizeMeaning(value) {
  const text = normalizeText(value)

  if (!text || text.toLowerCase() === 'unknown' || text.includes('模拟释义')) {
    return ''
  }

  return text
}

function normalizeDefinition(value) {
  const text = normalizeText(value)

  if (!text || text.toLowerCase() === 'unknown' || text.includes('模拟释义')) {
    return ''
  }

  return text
}

function normalizePartOfSpeech(value) {
  const text = normalizeText(value)

  return text.toLowerCase() === 'unknown' ? '' : text
}

function normalizeStatus(value, mastered) {
  const status = normalizeText(value).toLowerCase()

  if (status === MASTERED_STATUS) {
    return MASTERED_STATUS
  }

  if (status === REVIEW_STATUS || status === 'learning') {
    return REVIEW_STATUS
  }

  return mastered ? MASTERED_STATUS : REVIEW_STATUS
}

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

  const createdAt = normalizeDate(item.createdAt || item.savedAt)
  const savedAt = normalizeDate(item.savedAt || item.createdAt, createdAt)
  const reviewStage = normalizeReviewStage(item.reviewStage)
  const rawMeaning = normalizeText(item.meaning)
  const rawDefinition = normalizeText(item.definition)
  const legacyDefinitionIsMeaning = !rawMeaning && hasChineseText(rawDefinition)
  const status = normalizeStatus(item.status, Boolean(item.mastered))
  const sentence = normalizeText(item.sentence || item.example)

  return {
    id: item.id || `${normalizedWord}-${Date.now()}`,
    word: normalizeText(item.word) || normalizedWord,
    normalizedWord,
    meaning: normalizeMeaning(rawMeaning || (legacyDefinitionIsMeaning ? rawDefinition : '')),
    definition: normalizeDefinition(legacyDefinitionIsMeaning ? '' : rawDefinition),
    sentence,
    articleTitle: normalizeText(item.articleTitle || item.sourceTitle),
    status,
    createdAt,
    partOfSpeech: normalizePartOfSpeech(item.partOfSpeech),
    example: normalizeText(item.example || item.sentence),
    savedAt,
    mastered: status === MASTERED_STATUS,
    reviewStage,
    reviewCount: normalizeCount(item.reviewCount),
    mistakeCount: normalizeCount(item.mistakeCount),
    lastReviewedAt: item.lastReviewedAt ? normalizeDate(item.lastReviewedAt, '') : '',
    nextReviewAt: normalizeDate(item.nextReviewAt || savedAt, savedAt),
  }
}

function sortBySavedAtDesc(words) {
  return [...words].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function sortByNextReviewAtAsc(words) {
  return [...words].sort((a, b) => {
    const reviewTimeDifference = new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()

    if (reviewTimeDifference !== 0) {
      return reviewTimeDifference
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

  const createdAt = new Date().toISOString()
  const sentence = normalizeText(wordInfo.sentence || wordInfo.example)
  const newWord = {
    id: `${normalizedWord}-${Date.now()}`,
    word: normalizeText(wordInfo.word) || normalizedWord,
    normalizedWord,
    meaning: normalizeMeaning(wordInfo.meaning),
    definition: normalizeDefinition(wordInfo.definition),
    sentence,
    articleTitle: normalizeText(wordInfo.articleTitle),
    status: REVIEW_STATUS,
    createdAt,
    partOfSpeech: normalizePartOfSpeech(wordInfo.partOfSpeech),
    example: normalizeText(wordInfo.example || sentence),
    savedAt: createdAt,
    mastered: false,
    reviewStage: 0,
    reviewCount: 0,
    mistakeCount: 0,
    lastReviewedAt: '',
    nextReviewAt: createdAt,
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
      status: item.mastered ? REVIEW_STATUS : MASTERED_STATUS,
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

  if (!target || !VALID_REVIEW_OUTCOMES.includes(outcome)) {
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
    const mastered = outcome === 'mastered'
    const familiar = outcome === 'familiar'
    // 按本次结果和当前阶段计算间隔，再决定下次复习时所处的阶段。
    const intervalDays = forgot || mastered
      ? REVIEW_INTERVAL_DAYS[forgot ? 0 : REVIEW_INTERVAL_DAYS.length - 1]
      : REVIEW_INTERVAL_DAYS[Math.min(item.reviewStage, REVIEW_INTERVAL_DAYS.length - 1)]
    const nextReviewStage = getNextReviewStage(item.reviewStage, outcome)
    const nextMastered = mastered || (outcome === 'remembered' && nextReviewStage >= REVIEW_INTERVAL_DAYS.length)
    const nextStatus = nextMastered ? MASTERED_STATUS : REVIEW_STATUS

    updatedWord = {
      ...item,
      status: nextStatus,
      mastered: nextMastered,
      reviewStage: nextReviewStage,
      reviewCount: item.reviewCount + 1,
      mistakeCount: item.mistakeCount + (forgot ? 1 : 0),
      lastReviewedAt: reviewedAt,
      nextReviewAt: addDays(reviewedAt, intervalDays),
    }

    if (familiar) {
      updatedWord.mastered = false
      updatedWord.status = REVIEW_STATUS
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

function getNextReviewStage(reviewStage, outcome) {
  if (outcome === 'forgot') {
    return 0
  }

  if (outcome === 'mastered') {
    return REVIEW_INTERVAL_DAYS.length
  }

  if (outcome === 'familiar') {
    return Math.min(reviewStage + 1, REVIEW_INTERVAL_DAYS.length - 1)
  }

  return Math.min(reviewStage + 1, REVIEW_INTERVAL_DAYS.length)
}

export function filterVocabularyWords(words, options = {}) {
  const keyword = String(options.query || '').trim().toLowerCase()
  const status = options.status || 'all'

  return words.filter((item) => {
    const itemStatus = item.status || (item.mastered ? MASTERED_STATUS : REVIEW_STATUS)
    const matchesStatus =
      status === 'all' ||
      (status === REVIEW_STATUS && itemStatus !== MASTERED_STATUS) ||
      (status === MASTERED_STATUS && itemStatus === MASTERED_STATUS)

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
      item.definition.toLowerCase().includes(keyword) ||
      item.sentence.toLowerCase().includes(keyword) ||
      item.articleTitle.toLowerCase().includes(keyword) ||
      item.partOfSpeech.toLowerCase().includes(keyword)
    )
  })
}
