import { postJson } from './request.js'

export async function requestPrototypeWordExplanation(word) {
  const data = await postJson(
    '/api/prototype-word-explain',
    { word },
    'Failed to load the prototype word explanation.',
  )

  return {
    word: data.word || word,
    meaning: normalizeWordDetailText(data.meaning),
    definition: normalizeWordDetailText(data.definition),
    partOfSpeech: normalizePartOfSpeech(data.partOfSpeech),
    example: normalizeExample(data.example),
    phonetic: normalizeWordDetailText(data.phonetic),
    source: normalizeWordDetailText(data.source),
  }
}

function normalizeWordDetailText(value) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text || text.toLowerCase() === 'unknown' || text.includes('妯℃嫙閲婁箟')) {
    return ''
  }

  return text
}

function normalizePartOfSpeech(value) {
  const text = typeof value === 'string' ? value.trim() : ''

  return text.toLowerCase() === 'unknown' ? '' : text
}

function normalizeExample(value) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text || /^try to understand\b/i.test(text)) {
    return ''
  }

  return text
}
