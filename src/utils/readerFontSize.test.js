import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  MAX_READER_FONT_SIZE,
  MIN_READER_FONT_SIZE,
  READER_FONT_SIZE_STORAGE_KEY,
  adjustReaderFontSize,
  getInitialReaderFontSize,
  saveReaderFontSize,
} from './readerFontSize.js'

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

describe('reader font size utilities', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('restores valid stored sizes and falls back for invalid values', () => {
    assert.equal(getInitialReaderFontSize(), 18)

    localStorage.setItem(READER_FONT_SIZE_STORAGE_KEY, '22')
    assert.equal(getInitialReaderFontSize(), 22)

    localStorage.setItem(READER_FONT_SIZE_STORAGE_KEY, 'large')
    assert.equal(getInitialReaderFontSize(), 18)
  })

  it('persists a clamped font size', () => {
    assert.equal(saveReaderFontSize(99), MAX_READER_FONT_SIZE)
    assert.equal(localStorage.getItem(READER_FONT_SIZE_STORAGE_KEY), String(MAX_READER_FONT_SIZE))

    assert.equal(saveReaderFontSize(1), MIN_READER_FONT_SIZE)
    assert.equal(localStorage.getItem(READER_FONT_SIZE_STORAGE_KEY), String(MIN_READER_FONT_SIZE))
  })

  it('adjusts by two pixels and clamps at the configured bounds', () => {
    assert.equal(adjustReaderFontSize(18, 1), 20)
    assert.equal(adjustReaderFontSize(18, -1), 16)
    assert.equal(adjustReaderFontSize(MAX_READER_FONT_SIZE, 1), MAX_READER_FONT_SIZE)
    assert.equal(adjustReaderFontSize(MIN_READER_FONT_SIZE, -1), MIN_READER_FONT_SIZE)
  })
})
