import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isWordCardDismissKey, shouldDismissWordCardOnPointer } from './wordCardInteraction.js'

describe('word card interaction', () => {
  it('dismisses the floating word card with Escape only', () => {
    assert.equal(isWordCardDismissKey('Escape'), true)
    assert.equal(isWordCardDismissKey('Esc'), true)
    assert.equal(isWordCardDismissKey('ArrowDown'), false)
    assert.equal(isWordCardDismissKey('Enter'), false)
  })

  it('dismisses only outside pointer actions while the card is open', () => {
    assert.equal(shouldDismissWordCardOnPointer({ isOpen: false }), false)
    assert.equal(shouldDismissWordCardOnPointer({ isOpen: true, isInsideCard: true }), false)
    assert.equal(shouldDismissWordCardOnPointer({ isOpen: true, isWordToken: true }), false)
    assert.equal(shouldDismissWordCardOnPointer({ isOpen: true, isReaderControl: true }), false)
    assert.equal(shouldDismissWordCardOnPointer({ isOpen: true }), true)
  })
})
