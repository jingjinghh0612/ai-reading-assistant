import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { requestWordExplanation } from './word.js'

describe('word explanation api', () => {
  afterEach(() => {
    delete globalThis.fetch
  })

  it('hides simulated explanations and unknown part of speech from the reader card', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        word: 'Students',
        meaning: '关于 "Students" 的模拟释义',
        partOfSpeech: 'unknown',
        example: 'Try to understand "Students" from the full sentence.',
      }),
    })

    const detail = await requestWordExplanation('Students')

    assert.deepEqual(detail, {
      word: 'Students',
      meaning: '',
      definition: '',
      partOfSpeech: '',
      example: '',
    })
  })
})
