import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  filterVocabularyWords,
  getDueVocabularyWords,
  getVocabularyWords,
  recordVocabularyReview,
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
      meaning: '练习；实践',
      partOfSpeech: 'noun',
      example: 'Practice helps.',
    })
    saveVocabularyWord({
      word: 'Mastered',
      meaning: '已掌握的',
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

  it('normalizes legacy saved words as due for review', () => {
    localStorage.setItem(
      'ai-reading-vocabulary',
      JSON.stringify([
        {
          word: 'Legacy',
          meaning: '历史旧数据',
          partOfSpeech: 'noun',
          example: 'Legacy data still works.',
          savedAt: '2026-05-01T00:00:00.000Z',
        },
      ]),
    )

    const words = getVocabularyWords()

    assert.equal(words[0].reviewStage, 0)
    assert.equal(words[0].reviewCount, 0)
    assert.equal(words[0].mistakeCount, 0)
    assert.equal(words[0].lastReviewedAt, '')
    assert.equal(words[0].nextReviewAt, '2026-05-01T00:00:00.000Z')
    assert.deepEqual(
      getDueVocabularyWords(words, new Date('2026-05-02T00:00:00.000Z')).map((word) => word.normalizedWord),
      ['legacy'],
    )
  })

  it('saves vocabulary words with learning context fields', () => {
    const result = saveVocabularyWord({
      word: 'Context',
      meaning: '语境；上下文',
      definition: 'The situation or text around a word that helps explain it.',
      sentence: 'Context helps readers infer the meaning of a new word.',
      articleTitle: 'Reading Strategies',
    })

    const [word] = result.words

    assert.equal(result.added, true)
    assert.equal(word.word, 'Context')
    assert.equal(word.meaning, '语境；上下文')
    assert.equal(word.definition, 'The situation or text around a word that helps explain it.')
    assert.equal(word.sentence, 'Context helps readers infer the meaning of a new word.')
    assert.equal(word.articleTitle, 'Reading Strategies')
    assert.equal(word.status, 'review')
    assert.match(word.createdAt, /^\d{4}-\d{2}-\d{2}T/)
    assert.equal(word.nextReviewAt, word.createdAt)
    assert.equal(word.reviewCount, 0)
  })

  it('migrates legacy examples and hides simulated or unknown placeholders', () => {
    localStorage.setItem(
      'ai-reading-vocabulary',
      JSON.stringify([
        {
          word: 'Mystery',
          meaning: '关于 "Mystery" 的模拟释义',
          partOfSpeech: 'unknown',
          example: 'The mystery sentence came from an older saved card.',
          savedAt: '2026-05-01T00:00:00.000Z',
        },
      ]),
    )

    const [word] = getVocabularyWords()

    assert.equal(word.meaning, '')
    assert.equal(word.partOfSpeech, '')
    assert.equal(word.sentence, 'The mystery sentence came from an older saved card.')
    assert.equal(word.createdAt, '2026-05-01T00:00:00.000Z')
    assert.equal(word.status, 'review')
  })

  it('records remembered reviews with spaced intervals and marks the final stage mastered', () => {
    saveVocabularyWord({
      word: 'Practice',
      meaning: '练习；实践',
      partOfSpeech: 'noun',
      example: 'Practice helps.',
    })

    let result = recordVocabularyReview('practice', 'remembered', new Date('2026-05-10T08:00:00.000Z'))

    assert.equal(result.updated, true)
    assert.equal(result.word.reviewStage, 1)
    assert.equal(result.word.reviewCount, 1)
    assert.equal(result.word.mistakeCount, 0)
    assert.equal(result.word.lastReviewedAt, '2026-05-10T08:00:00.000Z')
    assert.equal(result.word.nextReviewAt, '2026-05-11T08:00:00.000Z')
    assert.equal(result.word.mastered, false)

    result = recordVocabularyReview('practice', 'remembered', new Date('2026-05-11T08:00:00.000Z'))

    assert.equal(result.word.reviewStage, 2)
    assert.equal(result.word.reviewCount, 2)
    assert.equal(result.word.nextReviewAt, '2026-05-14T08:00:00.000Z')
    assert.equal(result.word.mastered, false)

    recordVocabularyReview('practice', 'remembered', new Date('2026-05-14T08:00:00.000Z'))
    result = recordVocabularyReview('practice', 'remembered', new Date('2026-05-21T08:00:00.000Z'))

    assert.equal(result.word.reviewStage, 4)
    assert.equal(result.word.reviewCount, 4)
    assert.equal(result.word.nextReviewAt, '2026-06-04T08:00:00.000Z')
    assert.equal(result.word.mastered, true)
  })

  it('records forgotten reviews by resetting the review stage to tomorrow', () => {
    saveVocabularyWord({
      word: 'Difficult',
      meaning: '困难的；费力的',
      partOfSpeech: 'adjective',
      example: 'This is a difficult word.',
    })
    recordVocabularyReview('difficult', 'remembered', new Date('2026-05-10T08:00:00.000Z'))
    recordVocabularyReview('difficult', 'remembered', new Date('2026-05-11T08:00:00.000Z'))

    const result = recordVocabularyReview('difficult', 'forgot', new Date('2026-05-14T08:00:00.000Z'))

    assert.equal(result.updated, true)
    assert.equal(result.word.reviewStage, 0)
    assert.equal(result.word.reviewCount, 3)
    assert.equal(result.word.mistakeCount, 1)
    assert.equal(result.word.nextReviewAt, '2026-05-15T08:00:00.000Z')
    assert.equal(result.word.mastered, false)
  })

  it('records familiar and mastered review feedback separately', () => {
    saveVocabularyWord({
      word: 'Fluent',
      meaning: '流利的',
      definition: 'Able to speak or write smoothly and easily.',
      sentence: 'She became fluent after reading every day.',
    })

    let result = recordVocabularyReview('fluent', 'familiar', new Date('2026-05-10T08:00:00.000Z'))

    assert.equal(result.updated, true)
    assert.equal(result.word.status, 'review')
    assert.equal(result.word.reviewStage, 1)
    assert.equal(result.word.reviewCount, 1)
    assert.equal(result.word.nextReviewAt, '2026-05-11T08:00:00.000Z')
    assert.equal(result.word.mastered, false)

    result = recordVocabularyReview('fluent', 'mastered', new Date('2026-05-11T08:00:00.000Z'))

    assert.equal(result.updated, true)
    assert.equal(result.word.status, 'mastered')
    assert.equal(result.word.reviewCount, 2)
    assert.equal(result.word.mastered, true)
    assert.equal(result.word.nextReviewAt, '2026-05-25T08:00:00.000Z')
  })
})
