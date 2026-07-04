import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lookupLocalWordDefinition } from './localDictionaryService.js'

describe('local dictionary service', () => {
  it('returns a local definition for an exact word match', () => {
    assert.deepEqual(lookupLocalWordDefinition('reader'), {
      word: 'reader',
      meaning: '读者',
      definition: 'A person who reads.',
      partOfSpeech: 'noun',
      example: 'A careful reader notices repeated patterns.',
      phonetic: '/riːdər/',
    })
  })

  it('returns the same local definition for a known inflected form', () => {
    assert.deepEqual(lookupLocalWordDefinition('Readers'), {
      word: 'Readers',
      meaning: '读者',
      definition: 'A person who reads.',
      partOfSpeech: 'noun',
      example: 'A careful reader notices repeated patterns.',
      phonetic: '/riːdər/',
    })
  })

  it('returns a local definition for each', () => {
    assert.deepEqual(lookupLocalWordDefinition('each'), {
      word: 'each',
      meaning: '\u6bcf\u4e2a\uff1b\u5404\u81ea',
      definition: 'Every one of two or more people or things, considered separately.',
      partOfSpeech: 'determiner / pronoun',
      example: 'Each sentence felt unusually clear.',
      phonetic: '/i\u02d0t\u0283/',
    })
  })

  it('returns local definitions for common reading words', () => {
    assert.equal(lookupLocalWordDefinition('the')?.meaning, '\u8fd9\u4e2a\uff1b\u90a3\u4e2a')
    assert.equal(lookupLocalWordDefinition('make')?.meaning, '\u5236\u9020\uff1b\u4f7f\u5f97')
    assert.equal(lookupLocalWordDefinition('made')?.word, 'made')
    assert.equal(lookupLocalWordDefinition('clear')?.meaning, '\u6e05\u695a\u7684\uff1b\u660e\u4eae\u7684')
    assert.equal(lookupLocalWordDefinition('stories')?.word, 'stories')
  })

  it('uses generated dictionary entries when curated entries are missing', () => {
    const detail = lookupLocalWordDefinition('about')

    assert.equal(detail?.word, 'about')
    assert.match(detail?.meaning || '', /\u5173\u4e8e|\u6709\u5173/)
    assert.equal(detail?.partOfSpeech, 'prep / adv')
  })
})
