export function getWordStarState(isSaved) {
  return {
    icon: isSaved ? '\u2605' : '\u2606',
    pressed: Boolean(isSaved),
  }
}
