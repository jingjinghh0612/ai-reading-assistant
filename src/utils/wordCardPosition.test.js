import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getDraggedWordCardPosition,
  getFloatingWordCardPosition,
  getFloatingWordCardViewportPosition,
} from './wordCardPosition.js'

describe('floating word card position', () => {
  const containerRect = {
    left: 100,
    top: 200,
    width: 640,
  }

  it('places the card below the selected word inside the reader', () => {
    assert.deepEqual(
      getFloatingWordCardPosition(
        { left: 220, bottom: 360 },
        containerRect,
        { cardWidth: 360, gap: 10, sidePadding: 16 },
      ),
      {
        left: 120,
        top: 170,
      },
    )
  })

  it('keeps the card from overflowing the right side of the article', () => {
    assert.deepEqual(
      getFloatingWordCardPosition(
        { left: 690, bottom: 360 },
        containerRect,
        { cardWidth: 360, gap: 10, sidePadding: 16 },
      ),
      {
        left: 264,
        top: 170,
      },
    )
  })

  it('keeps the card inside the left edge of the article', () => {
    assert.deepEqual(
      getFloatingWordCardPosition(
        { left: 90, bottom: 360 },
        containerRect,
        { cardWidth: 360, gap: 10, sidePadding: 16 },
      ),
      {
        left: 16,
        top: 170,
      },
    )
  })

  it('places a fixed card inside the viewport instead of the reader container', () => {
    assert.deepEqual(
      getFloatingWordCardViewportPosition(
        { left: 730, top: 570, bottom: 594 },
        { width: 800, height: 640 },
        { cardWidth: 320, cardHeight: 260, gap: 10, sidePadding: 16 },
      ),
      {
        left: 464,
        top: 300,
      },
    )
  })

  it('keeps a dragged fixed card inside the viewport', () => {
    assert.deepEqual(
      getDraggedWordCardPosition(
        { clientX: 900, clientY: 20 },
        { x: 40, y: 20 },
        { width: 800, height: 640 },
        { cardWidth: 320, cardHeight: 260, sidePadding: 16 },
      ),
      {
        left: 464,
        top: 16,
      },
    )
  })
})
