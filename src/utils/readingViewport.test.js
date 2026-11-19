import assert from 'node:assert/strict'
import { it } from 'node:test'
import { hasEnoughVisibleHeight } from './readingViewport.js'

it('counts half of a sentence or half of the viewport for an oversized sentence', () => {
  const viewport = { top: 100, bottom: 300 }

  assert.equal(hasEnoughVisibleHeight({ top: 60, bottom: 140 }, viewport), true)
  assert.equal(hasEnoughVisibleHeight({ top: 59, bottom: 139 }, viewport), false)
  assert.equal(hasEnoughVisibleHeight({ top: 200, bottom: 700 }, viewport), true)
  assert.equal(hasEnoughVisibleHeight({ top: 201, bottom: 701 }, viewport), false)
  assert.equal(hasEnoughVisibleHeight({ top: 150, bottom: 150 }, viewport), false)
})
