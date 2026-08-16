import { postJson } from './request.js'

export async function requestTranslation(text, type = 'sentence') {
  const data = await postJson('/api/translate', { text, type }, 'Failed to translate the sentence.')

  if (!data.translation) {
    throw new Error('No translation was returned.')
  }

  return data
}
