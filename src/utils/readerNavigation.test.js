import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getAdjacentSentenceIndex,
  getNextSentenceIndexForPrefetch,
  getReaderProgressPercent,
} from './readerNavigation.js'

describe('reader navigation utilities', () => {
  it('moves between sentences without leaving the article bounds', () => {
    assert.equal(getAdjacentSentenceIndex(2, 5, 1), 3)
    assert.equal(getAdjacentSentenceIndex(2, 5, -1), 1)
    assert.equal(getAdjacentSentenceIndex(4, 5, 1), 4)
    assert.equal(getAdjacentSentenceIndex(0, 5, -1), 0)
  })

  it('starts keyboard navigation at the first sentence when nothing is selected', () => {
    assert.equal(getAdjacentSentenceIndex(-1, 5, 1), 0)
    assert.equal(getAdjacentSentenceIndex(Number.NaN, 5, 1), 0)
  })

  it('returns no selection and no progress for empty articles', () => {
    assert.equal(getAdjacentSentenceIndex(0, 0, 1), -1)
    assert.equal(getReaderProgressPercent(0, 0), 0)
  })

  it('calculates selected sentence progress as a percentage', () => {
    assert.equal(getReaderProgressPercent(0, 4), 25)
    assert.equal(getReaderProgressPercent(1, 4), 50)
    assert.equal(getReaderProgressPercent(3, 4), 100)
  })

  it('returns the next sentence index for background translation prefetching', () => {
    assert.equal(getNextSentenceIndexForPrefetch(0, 4), 1)
    assert.equal(getNextSentenceIndexForPrefetch(2, 4), 3)
    assert.equal(getNextSentenceIndexForPrefetch(3, 4), -1)
    assert.equal(getNextSentenceIndexForPrefetch(-1, 4), -1)
    assert.equal(getNextSentenceIndexForPrefetch(0, 0), -1)
  })
})
