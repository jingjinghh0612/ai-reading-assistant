import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { requestTranslation } from './translate.js'

const originalFetch = globalThis.fetch

describe('translate api client', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('posts translation type with the text payload', async () => {
    const calls = []

    globalThis.fetch = async (url, options = {}) => {
      calls.push({
        url,
        body: JSON.parse(options.body || '{}'),
      })

      return {
        ok: true,
        json: async () => ({ translation: '译文' }),
      }
    }

    const result = await requestTranslation('First sentence.', 'paragraph')

    assert.equal(result.translation, '译文')
    assert.deepEqual(calls, [
      {
        url: '/api/translate',
        body: {
          text: 'First sentence.',
          type: 'paragraph',
        },
      },
    ])
  })
})
