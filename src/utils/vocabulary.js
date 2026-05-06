import { normalizeWord } from './word.js'
import { getStorageItem, setStorageItem } from './storage.js'

const STORAGE_KEY = 'ai-reading-vocabulary'
const STORAGE_ERROR = 'Unable to update vocabulary in this browser.'

function normalizeVocabularyItem(item) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const normalizedWord = normalizeWord(item.normalizedWord || item.word || '')

  if (!normalizedWord) {
    return null
  }

  return {
    id: item.id || `${normalizedWord}-${Date.now()}`,
    word: item.word || normalizedWord,
    normalizedWord,
    meaning: item.meaning || item.definition || '',
    partOfSpeech: item.partOfSpeech || 'unknown',
    example: item.example || '',
    savedAt: item.savedAt || new Date().toISOString(),
    mastered: Boolean(item.mastered),
  }
}

function sortBySavedAtDesc(words) {
  return [...words].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
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

  const newWord = {
    id: `${normalizedWord}-${Date.now()}`,
    word: wordInfo.word,
    normalizedWord,
    meaning: wordInfo.meaning || wordInfo.definition || '',
    partOfSpeech: wordInfo.partOfSpeech,
    example: wordInfo.example,
    savedAt: new Date().toISOString(),
    mastered: false,
  }

  const nextWords = [newWord, ...words]
  const saved = setStorageItem(STORAGE_KEY, JSON.stringify(nextWords))

  if (!saved) {
    return {
      added: false,
      words,
      error: STORAGE_ERROR,
    }
  }

  return {
    added: true,
    words: nextWords,
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
