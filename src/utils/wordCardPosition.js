const DEFAULT_CARD_WIDTH = 360
const DEFAULT_CARD_HEIGHT = 260
const DEFAULT_GAP = 10
const DEFAULT_SIDE_PADDING = 16

export function getFloatingWordCardPosition(wordRect, containerRect, options = {}) {
  const cardWidth = Number(options.cardWidth) || DEFAULT_CARD_WIDTH
  const gap = Number.isFinite(options.gap) ? options.gap : DEFAULT_GAP
  const sidePadding = Number.isFinite(options.sidePadding) ? options.sidePadding : DEFAULT_SIDE_PADDING

  const preferredLeft = wordRect.left - containerRect.left
  const maxLeft = Math.max(sidePadding, containerRect.width - cardWidth - sidePadding)

  return {
    left: Math.round(clamp(preferredLeft, sidePadding, maxLeft)),
    top: Math.round(wordRect.bottom - containerRect.top + gap),
  }
}

export function getFloatingWordCardViewportPosition(wordRect, viewportRect, options = {}) {
  const cardWidth = Number(options.cardWidth) || DEFAULT_CARD_WIDTH
  const cardHeight = Number(options.cardHeight) || DEFAULT_CARD_HEIGHT
  const gap = Number.isFinite(options.gap) ? options.gap : DEFAULT_GAP
  const sidePadding = Number.isFinite(options.sidePadding) ? options.sidePadding : DEFAULT_SIDE_PADDING
  const maxLeft = Math.max(sidePadding, viewportRect.width - cardWidth - sidePadding)
  const maxTop = Math.max(sidePadding, viewportRect.height - cardHeight - sidePadding)
  const belowTop = wordRect.bottom + gap
  const aboveTop = wordRect.top - cardHeight - gap
  const preferredTop = belowTop + cardHeight + sidePadding <= viewportRect.height ? belowTop : aboveTop

  return {
    left: Math.round(clamp(wordRect.left, sidePadding, maxLeft)),
    top: Math.round(clamp(preferredTop, sidePadding, maxTop)),
  }
}

export function getDraggedWordCardPosition(pointerPosition, dragOffset, viewportRect, options = {}) {
  const cardWidth = Number(options.cardWidth) || DEFAULT_CARD_WIDTH
  const cardHeight = Number(options.cardHeight) || DEFAULT_CARD_HEIGHT
  const sidePadding = Number.isFinite(options.sidePadding) ? options.sidePadding : DEFAULT_SIDE_PADDING
  const maxLeft = Math.max(sidePadding, viewportRect.width - cardWidth - sidePadding)
  const maxTop = Math.max(sidePadding, viewportRect.height - cardHeight - sidePadding)

  return {
    left: Math.round(clamp(pointerPosition.clientX - dragOffset.x, sidePadding, maxLeft)),
    top: Math.round(clamp(pointerPosition.clientY - dragOffset.y, sidePadding, maxTop)),
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
