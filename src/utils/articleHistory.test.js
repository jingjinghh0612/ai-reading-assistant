import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  ARTICLE_HISTORY_STORAGE_KEY,
  deleteArticleFromHistory,
  getArticleById,
  getArticleHistory,
  getArticleProgressLabel,
  getResumeSentenceIndex,
  saveArticleToHistory,
  updateArticleProgress,
} from './articleHistory.js'

function installLocalStorage() {
  const store = new Map()
  let shouldThrowOnSet = false

  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      if (shouldThrowOnSet) {
        throw new Error('Storage unavailable')
      }

      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    setThrowOnSet(value) {
      shouldThrowOnSet = Boolean(value)
    },
  }
}

describe('article history', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('saves article metadata and restores reading progress', () => {
    const result = saveArticleToHistory('First line title.\nSecond sentence for the reader.')

    assert.equal(result.article.title, 'First line title.')
    assert.equal(result.article.currentSentenceIndex, null)
    assert.equal(result.articles.length, 1)
    assert.equal(getArticleHistory()[0].id, result.article.id)

    const progressResult = updateArticleProgress(result.article.id, 0)

    assert.equal(progressResult.article.currentSentenceIndex, 0)
    assert.equal(getArticleHistory()[0].currentSentenceIndex, 0)
  })

  it('formats zero-based reading progress without treating sentence one as not started', () => {
    assert.equal(getArticleProgressLabel({ currentSentenceIndex: null }), 'Not started')
    assert.equal(getArticleProgressLabel({ currentSentenceIndex: 0 }), 'Sentence 1')
    assert.equal(getArticleProgressLabel({ currentSentenceIndex: 2 }), 'Sentence 3')
  })

  it('restores only valid saved sentence positions', () => {
    assert.equal(getResumeSentenceIndex({ currentSentenceIndex: null }, 3), -1)
    assert.equal(getResumeSentenceIndex({ currentSentenceIndex: 0 }, 3), 0)
    assert.equal(getResumeSentenceIndex({ currentSentenceIndex: 2 }, 3), 2)
    assert.equal(getResumeSentenceIndex({ currentSentenceIndex: 9 }, 3), 2)
    assert.equal(getResumeSentenceIndex({ currentSentenceIndex: 'bad' }, 3), -1)
    assert.equal(getResumeSentenceIndex({ currentSentenceIndex: 0 }, 0), -1)
  })

  it('round-trips saved progress for Home labels and Reader resume positions', () => {
    const saved = saveArticleToHistory('First sentence. Second sentence. Third sentence.')

    assert.equal(getArticleProgressLabel(getArticleById(saved.article.id)), 'Not started')
    assert.equal(getResumeSentenceIndex(getArticleById(saved.article.id), 3), -1)

    updateArticleProgress(saved.article.id, 0)

    assert.equal(getArticleProgressLabel(getArticleById(saved.article.id)), 'Sentence 1')
    assert.equal(getResumeSentenceIndex(getArticleById(saved.article.id), 3), 0)

    updateArticleProgress(saved.article.id, 2)

    assert.equal(getArticleProgressLabel(getArticleById(saved.article.id)), 'Sentence 3')
    assert.equal(getResumeSentenceIndex(getArticleById(saved.article.id), 3), 2)
  })

  it('deduplicates the same article content while keeping saved progress', () => {
    const first = saveArticleToHistory('Repeat article. Still the same content.')
    updateArticleProgress(first.article.id, 1)
    const second = saveArticleToHistory('Repeat article. Still the same content.')

    assert.equal(second.article.id, first.article.id)
    assert.equal(second.article.currentSentenceIndex, 1)
    assert.equal(JSON.parse(localStorage.getItem(ARTICLE_HISTORY_STORAGE_KEY)).length, 1)
  })

  it('deletes the selected article from history', () => {
    const first = saveArticleToHistory('First saved article. Keep the title short.')
    const second = saveArticleToHistory('Second saved article. This one should stay.')

    const result = deleteArticleFromHistory(first.article.id)

    assert.equal(result.deleted, true)
    assert.equal(result.articles.length, 1)
    assert.equal(result.articles[0].id, second.article.id)
    assert.equal(getArticleHistory().length, 1)
    assert.equal(getArticleHistory()[0].id, second.article.id)
  })

  it('leaves history unchanged when deleting a missing article', () => {
    const first = saveArticleToHistory('Article that remains in history.')

    const result = deleteArticleFromHistory('missing-article-id')

    assert.equal(result.deleted, false)
    assert.equal(result.articles.length, 1)
    assert.equal(result.articles[0].id, first.article.id)
    assert.equal(getArticleHistory()[0].id, first.article.id)
  })

  it('returns an error and preserves readable history when delete cannot be saved', () => {
    const first = saveArticleToHistory('First article before storage failure.')
    const second = saveArticleToHistory('Second article before storage failure.')

    localStorage.setThrowOnSet(true)
    const result = deleteArticleFromHistory(first.article.id)

    assert.equal(result.deleted, false)
    assert.equal(result.error, 'Unable to update article history in this browser.')
    assert.equal(result.articles.length, 2)
    assert.equal(getArticleHistory().length, 2)
    assert.deepEqual(
      getArticleHistory().map((article) => article.id).sort(),
      [first.article.id, second.article.id].sort(),
    )
  })
})
