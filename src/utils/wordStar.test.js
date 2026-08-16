import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getWordStarState } from './wordStar.js'

describe('word star state', () => {
  it('shows an empty star before the word is saved', () => {
    assert.deepEqual(getWordStarState(false), {
      icon: '\u2606',
      pressed: false,
    })
  })

  it('shows a filled star after the word is saved', () => {
    assert.deepEqual(getWordStarState(true), {
      icon: '\u2605',
      pressed: true,
    })
  })
})
