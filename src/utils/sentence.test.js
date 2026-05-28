import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { splitIntoSentences } from './sentence.js'

describe('splitIntoSentences', () => {
  it('keeps common abbreviations, decimals, and closing quotes with the sentence', () => {
    const article = 'Dr. Smith arrived at 3.14 p.m. He said, "Hello!" U.S. readers agreed.'

    assert.deepEqual(splitIntoSentences(article), [
      'Dr. Smith arrived at 3.14 p.m.',
      'He said, "Hello!"',
      'U.S. readers agreed.',
    ])
  })

  it('keeps initials, numbered abbreviations, and figure references together', () => {
    const article = 'J. K. Rowling met Prof. Jones. No. 5 is alive. Fig. 2 shows it. C. S. Lewis agreed.'

    assert.deepEqual(splitIntoSentences(article), [
      'J. K. Rowling met Prof. Jones.',
      'No. 5 is alive.',
      'Fig. 2 shows it.',
      'C. S. Lewis agreed.',
    ])
  })

  it('keeps word-internal periods and domain names inside the sentence', () => {
    const article = 'Visit example.com. This is e.g. a test. Done.'

    assert.deepEqual(splitIntoSentences(article), [
      'Visit example.com.',
      'This is e.g. a test.',
      'Done.',
    ])
  })

  it('uses quote attribution and ellipsis context when finding boundaries', () => {
    const article = 'He said, "Are you coming?" She nodded. "Are you coming?" she asked. Wait... what happened? Then he left. Wait... Then he left.'

    assert.deepEqual(splitIntoSentences(article), [
      'He said, "Are you coming?"',
      'She nodded.',
      '"Are you coming?" she asked.',
      'Wait... what happened?',
      'Then he left.',
      'Wait...',
      'Then he left.',
    ])
  })
})
