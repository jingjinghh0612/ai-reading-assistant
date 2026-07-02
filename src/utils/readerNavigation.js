export function getAdjacentSentenceIndex(currentIndex, sentenceCount, direction) {
  if (!Number.isInteger(sentenceCount) || sentenceCount <= 0) {
    return -1
  }

  if (!Number.isInteger(currentIndex) || currentIndex < 0) {
    return 0
  }

  const nextIndex = currentIndex + Math.sign(direction)

  return clampIndex(nextIndex, sentenceCount)
}

export function getReaderProgressPercent(selectedIndex, sentenceCount) {
  if (!Number.isInteger(sentenceCount) || sentenceCount <= 0 || !Number.isInteger(selectedIndex)) {
    return 0
  }

  return Math.round(((clampIndex(selectedIndex, sentenceCount) + 1) / sentenceCount) * 100)
}

export function getNextSentenceIndexForPrefetch(currentIndex, sentenceCount) {
  if (
    !Number.isInteger(currentIndex) ||
    !Number.isInteger(sentenceCount) ||
    currentIndex < 0 ||
    currentIndex >= sentenceCount ||
    sentenceCount <= 0
  ) {
    return -1
  }

  const nextIndex = currentIndex + 1

  return nextIndex < sentenceCount ? nextIndex : -1
}

function clampIndex(index, sentenceCount) {
  return Math.min(Math.max(index, 0), sentenceCount - 1)
}
