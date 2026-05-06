import { postJson } from './request.js'

export async function requestSummary(text) {
  const data = await postJson('/api/summarize', { text }, 'Failed to summarize the paragraph.')

  if (!data.summary) {
    throw new Error('No summary was returned.')
  }

  return {
    summary: data.summary,
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
  }
}
