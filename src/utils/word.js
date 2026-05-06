export function normalizeWord(word) {
  return word
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
    .trim()
}

export function splitSentenceIntoTokens(sentence) {
  return sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+/g) || []
}
