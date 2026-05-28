export function splitIntoSentences(article) {
  if (!article) {
    return []
  }

  const text = article.replace(/\s+/g, ' ').trim()

  if (!text) {
    return []
  }

  const sentences = []
  let sentenceStart = 0

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (!isSentencePunctuation(character)) {
      continue
    }

    const punctuationEnd = includeTerminalPunctuation(text, index)

    if (character === '.' && !isEllipsis(text, index) && isProtectedPeriod(text, index)) {
      continue
    }

    const sentenceEnd = includeClosingMarks(text, punctuationEnd)
    const nextStart = findNextNonSpace(text, sentenceEnd + 1)

    if (shouldKeepScanning(text, index, punctuationEnd, sentenceEnd, nextStart)) {
      index = sentenceEnd
      continue
    }

    const sentence = text.slice(sentenceStart, sentenceEnd + 1).trim()

    if (sentence) {
      sentences.push(sentence)
    }

    sentenceStart = nextStart
    index = sentenceEnd
  }

  const trailingSentence = text.slice(sentenceStart).trim()

  if (trailingSentence) {
    sentences.push(trailingSentence)
  }

  return sentences
}

const COMMON_ABBREVIATIONS = new Set([
  'capt',
  'col',
  'dr',
  'gen',
  'gov',
  'jr',
  'lt',
  'mr',
  'mrs',
  'ms',
  'mt',
  'prof',
  'rep',
  'sen',
  'sgt',
  'sr',
  'st',
  'vs',
])

const NUMBERED_ABBREVIATIONS = new Set([
  'ch',
  'eq',
  'fig',
  'no',
  'p',
  'pp',
  'sec',
  'vol',
])

const LOWERCASE_CONTINUATION_ABBREVIATIONS = new Set([
  'a.m',
  'e.g',
  'i.e',
  'p.m',
])

function isSentencePunctuation(character) {
  return character === '.' || character === '!' || character === '?'
}

function isLetter(character) {
  return Boolean(character && /[A-Za-z]/.test(character))
}

function isLowercaseLetter(character) {
  return Boolean(character && /[a-z]/.test(character))
}

function isUppercaseLetter(character) {
  return Boolean(character && /[A-Z]/.test(character))
}

function isDigit(character) {
  return Boolean(character && /\d/.test(character))
}

function findNextNonSpace(text, startIndex) {
  let index = startIndex

  while (index < text.length && /\s/.test(text[index])) {
    index += 1
  }

  return index
}

function includeTerminalPunctuation(text, punctuationIndex) {
  let index = punctuationIndex

  while (index + 1 < text.length && isSentencePunctuation(text[index + 1])) {
    index += 1
  }

  return index
}

function includeClosingMarks(text, punctuationIndex) {
  let index = punctuationIndex

  while (index + 1 < text.length && /["')\]\}\u201d\u2019]/.test(text[index + 1])) {
    index += 1
  }

  return index
}

function isEllipsis(text, punctuationIndex) {
  return text.slice(punctuationIndex, punctuationIndex + 3) === '...'
}

function hasClosingMark(punctuationEnd, sentenceEnd) {
  return sentenceEnd > punctuationEnd
}

function shouldKeepScanning(text, punctuationStart, punctuationEnd, sentenceEnd, nextStart) {
  if (nextStart >= text.length) {
    return false
  }

  if (sentenceEnd + 1 === nextStart) {
    return true
  }

  const nextCharacter = text[nextStart]

  if (isEllipsis(text, punctuationStart) && isLowercaseLetter(nextCharacter)) {
    return true
  }

  if (hasClosingMark(punctuationEnd, sentenceEnd) && isLowercaseLetter(nextCharacter)) {
    return true
  }

  return false
}

function getTokenBeforePeriod(text, periodIndex) {
  let start = periodIndex - 1

  while (start >= 0 && /[A-Za-z.]/.test(text[start])) {
    start -= 1
  }

  return text.slice(start + 1, periodIndex).toLowerCase()
}

function isProtectedPeriod(text, periodIndex) {
  const previousCharacter = text[periodIndex - 1]
  const nextCharacter = text[periodIndex + 1]

  if (isDigit(previousCharacter) && isDigit(nextCharacter)) {
    return true
  }

  if (isLetter(previousCharacter) && isLetter(nextCharacter)) {
    return true
  }

  const token = getTokenBeforePeriod(text, periodIndex)
  const nextWordStart = findNextNonSpace(text, periodIndex + 1)

  if (COMMON_ABBREVIATIONS.has(token)) {
    return true
  }

  if (NUMBERED_ABBREVIATIONS.has(token)) {
    return nextWordStart < text.length && isDigit(text[nextWordStart])
  }

  if (LOWERCASE_CONTINUATION_ABBREVIATIONS.has(token)) {
    return nextWordStart < text.length && isLowercaseLetter(text[nextWordStart])
  }

  if (/^[a-z]$/.test(token)) {
    return nextWordStart < text.length && isUppercaseLetter(text[nextWordStart])
  }

  if (/^(?:[a-z]\.)+[a-z]$/.test(token)) {
    return nextWordStart < text.length && isLowercaseLetter(text[nextWordStart])
  }

  return false
}
