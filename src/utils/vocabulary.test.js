import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  filterVocabularyWords,
  getVocabularyWords,
  saveVocabularyWord,
  toggleVocabularyWordMastered,
} from './vocabulary.js'

function installLocalStorage() {
  const store = new Map()

  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

describe('vocabulary utilities', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('filters saved words by review status and search text', () => {
    saveVocabularyWord({
      word: 'Practice',
      meaning: '练习',
      partOfSpeech: 'noun',
      example: 'Practice helps.',
    })
    saveVocabularyWord({
      word: 'Mastered',
      meaning: '掌握的',
      partOfSpeech: 'adjective',
      example: 'This word is mastered.',
    })
    toggleVocabularyWordMastered('mastered')

    const words = getVocabularyWords()

    assert.deepEqual(
      filterVocabularyWords(words, { status: 'review', query: '练习' }).map((word) => word.normalizedWord),
      ['practice'],
    )
    assert.deepEqual(
      filterVocabularyWords(words, { status: 'mastered', query: '' }).map((word) => word.normalizedWord),
      ['mastered'],
    )
  })
})
