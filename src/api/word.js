import { postJson } from './request.js'

export async function requestWordExplanation(word) {
  const data = await postJson('/api/word-explain', { word }, 'Failed to load the word explanation.')

  if (!data.meaning) {
    throw new Error('No word explanation was returned.')
  }

  return {
    word: data.word || word,
    meaning: data.meaning,
    partOfSpeech: data.partOfSpeech || 'unknown',
    example: data.example || '',
  }
}
