import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  createTranslationCacheKey,
  getCachedTranslation,
  saveCachedTranslation,
} from './translationCache.js'

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

describe('translation cache utilities', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('uses content hash keys with sentence and paragraph namespaces', () => {
    const text = 'The quiet room made each sentence feel clear.'
    const sentenceKey = createTranslationCacheKey(text, 'sentence')
    const paragraphKey = createTranslationCacheKey(text, 'paragraph')

    assert.match(sentenceKey, /^sentence:[a-z0-9]+$/)
    assert.match(paragraphKey, /^paragraph:[a-z0-9]+$/)
    assert.notEqual(sentenceKey, paragraphKey)
    assert.equal(sentenceKey.includes(text), false)
  })

  it('keeps sentence and paragraph translations separate for the same source text', () => {
    const text = 'One reusable source.'

    assert.equal(saveCachedTranslation(text, '句子译文', 'sentence'), true)
    assert.equal(saveCachedTranslation(text, '段落译文', 'paragraph'), true)

    assert.equal(getCachedTranslation(text, 'sentence'), '句子译文')
    assert.equal(getCachedTranslation(text, 'paragraph'), '段落译文')
  })
})
