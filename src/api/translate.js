import { postJson } from './request.js'

export async function requestTranslation(text) {
  const data = await postJson('/api/translate', { text }, 'Failed to translate the sentence.')

  if (!data.translation) {
    throw new Error('No translation was returned.')
  }

  return data
}
