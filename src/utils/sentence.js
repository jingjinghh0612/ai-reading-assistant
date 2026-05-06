export function splitIntoSentences(article) {
  if (!article) {
    return []
  }

  return article
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || []
}
