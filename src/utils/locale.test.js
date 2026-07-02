import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getInitialLocale,
  initializeLocale,
  setLocale,
  t,
} from './locale.js'

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

describe('locale utilities', () => {
  beforeEach(() => {
    installLocalStorage()
    initializeLocale()
  })

  it('defaults to Chinese and ignores unsupported stored locales', () => {
    assert.equal(DEFAULT_LOCALE, 'zh')
    assert.equal(getInitialLocale(), 'zh')

    localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')

    assert.equal(getInitialLocale(), 'zh')
  })

  it('persists the selected locale and translates copy with params', () => {
    assert.equal(setLocale('en'), 'en')
    assert.equal(localStorage.getItem(LOCALE_STORAGE_KEY), 'en')
    assert.equal(t('home.dueWords', { count: 3 }), '3 words due now')

    assert.equal(setLocale('zh'), 'zh')
    assert.equal(localStorage.getItem(LOCALE_STORAGE_KEY), 'zh')
    assert.equal(t('home.dueWords', { count: 3 }), '3 个单词待复习')
  })
})
