import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const vocabularySource = readFileSync(new URL('./Vocabulary.vue', import.meta.url), 'utf8')
const reviewSource = readFileSync(new URL('./Review.vue', import.meta.url), 'utf8')
const readerSource = readFileSync(new URL('./Reader.vue', import.meta.url), 'utf8')
const styleSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8')

describe('vocabulary and review learning flow contract', () => {
  it('saves article context with selected words from the reader', () => {
    assert.match(readerSource, /sentence:\s*selectedSentence\.value/)
    assert.match(readerSource, /articleTitle:\s*readerTitle\.value/)
  })

  it('shows saved word learning details in the vocabulary card', () => {
    assert.match(vocabularySource, /displayMeaning\(word\)/)
    assert.match(vocabularySource, /displayDefinition\(word\)/)
    assert.match(vocabularySource, /displaySentence\(word\)/)
    assert.match(vocabularySource, /displayArticleTitle\(word\)/)
    assert.match(vocabularySource, /formatReviewTime\(word\.nextReviewAt\)/)
  })

  it('uses three feedback actions after revealing a review answer', () => {
    assert.match(reviewSource, /recordReview\('forgot'\)/)
    assert.match(reviewSource, /recordReview\('familiar'\)/)
    assert.match(reviewSource, /recordReview\('mastered'\)/)
    assert.match(reviewSource, /displayMeaning\(currentWord\)/)
    assert.match(reviewSource, /displayDefinition\(currentWord\)/)
    assert.match(reviewSource, /displaySentence\(currentWord\)/)
  })

  it('keeps destructive vocabulary actions visually quiet by default', () => {
    assert.match(vocabularySource, /class="quiet-danger-button"/)
    assert.match(styleSource, /\.quiet-danger-button\s*\{[\s\S]*background:\s*transparent/)
  })
})
