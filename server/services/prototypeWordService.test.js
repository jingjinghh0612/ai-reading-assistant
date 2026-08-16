import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lookupPrototypeWord } from './prototypeWordService.js'

describe('prototype word lookup service', () => {
  it('uses a local dictionary result before external dictionary and AI', async () => {
    let externalCallCount = 0
    let aiCallCount = 0

    const detail = await lookupPrototypeWord('readers', {
      cache: new Map(),
      localLookup: () => ({
        word: 'readers',
        meaning: '读者',
        definition: 'People who read.',
        partOfSpeech: 'noun',
        example: 'Curious readers notice patterns.',
        phonetic: '/riːdərz/',
      }),
      externalLookup: async () => {
        externalCallCount += 1
        return {
          word: 'readers',
          meaning: '外部读者',
        }
      },
      aiLookup: async () => {
        aiCallCount += 1
        return {
          word: 'readers',
          meaning: 'AI 读者',
        }
      },
    })

    assert.equal(externalCallCount, 0)
    assert.equal(aiCallCount, 0)
    assert.deepEqual(detail, {
      word: 'readers',
      meaning: '读者',
      definition: 'People who read.',
      partOfSpeech: 'noun',
      example: 'Curious readers notice patterns.',
      phonetic: '/riːdərz/',
      source: 'local-dictionary',
    })
  })

  it('uses an external dictionary result before calling AI', async () => {
    let aiCallCount = 0

    const detail = await lookupPrototypeWord('readers', {
      cache: new Map(),
      localLookup: () => null,
      externalLookup: async () => ({
        word: 'readers',
        meaning: '读者',
        definition: 'People who read.',
        partOfSpeech: 'noun',
        example: 'Curious readers notice patterns.',
      }),
      aiLookup: async () => {
        aiCallCount += 1
        return {
          word: 'readers',
          meaning: 'AI 读者',
        }
      },
    })

    assert.equal(aiCallCount, 0)
    assert.deepEqual(detail, {
      word: 'readers',
      meaning: '读者',
      definition: 'People who read.',
      partOfSpeech: 'noun',
      example: 'Curious readers notice patterns.',
      phonetic: '',
      source: 'external-dictionary',
    })
  })

  it('falls back to AI when the external dictionary has no translation', async () => {
    let aiCallCount = 0

    const detail = await lookupPrototypeWord('observatory', {
      cache: new Map(),
      localLookup: () => null,
      externalLookup: async () => ({
        word: 'observatory',
        definition: 'A room or building housing an astronomical telescope.',
        partOfSpeech: 'noun',
      }),
      aiLookup: async () => {
        aiCallCount += 1
        return {
          word: 'observatory',
          meaning: '天文台',
          definition: 'A place used for watching stars and planets.',
          partOfSpeech: 'noun',
          example: 'The old observatory stood on the hill.',
        }
      },
    })

    assert.equal(aiCallCount, 1)
    assert.deepEqual(detail, {
      word: 'observatory',
      meaning: '天文台',
      definition: 'A place used for watching stars and planets.',
      partOfSpeech: 'noun',
      example: 'The old observatory stood on the hill.',
      phonetic: '',
      source: 'ai',
    })
  })

  it('returns an empty fallback detail when every lookup source fails', async () => {
    const detail = await lookupPrototypeWord('each', {
      cache: new Map(),
      localLookup: () => null,
      externalLookup: async () => {
        throw new Error('network unavailable')
      },
      aiLookup: async () => {
        throw new Error('ai unavailable')
      },
    })

    assert.deepEqual(detail, {
      word: 'each',
      meaning: '',
      definition: '',
      partOfSpeech: '',
      example: '',
      phonetic: '',
      source: 'fallback',
    })
  })

  it('skips external dictionary lookup when disabled', async () => {
    let externalCallCount = 0
    let aiCallCount = 0

    const detail = await lookupPrototypeWord('rareword', {
      cache: new Map(),
      pendingRequests: new Map(),
      enableExternalDictionary: false,
      localLookup: () => null,
      externalLookup: async () => {
        externalCallCount += 1
        return {
          word: 'rareword',
          meaning: '\u5916\u90e8\u91ca\u4e49',
        }
      },
      aiLookup: async () => {
        aiCallCount += 1
        return {
          word: 'rareword',
          meaning: 'AI \u91ca\u4e49',
        }
      },
    })

    assert.equal(externalCallCount, 0)
    assert.equal(aiCallCount, 1)
    assert.equal(detail.source, 'ai')
    assert.equal(detail.meaning, 'AI \u91ca\u4e49')
  })
})
