import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const readerSource = readFileSync(new URL('./ReaderLegacy.vue', import.meta.url), 'utf8')
const sentenceViewerSource = readFileSync(new URL('../components/SentenceViewer.vue', import.meta.url), 'utf8')
const styleSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8')

describe('reader immersive layout contract', () => {
  it('keeps sentence navigation below the reading paper instead of inside the assistant panel', () => {
    const paperFooterIndex = readerSource.indexOf('class="reader-paper-footer"')
    const stepperIndex = readerSource.indexOf('class="reader-stepper"')
    const assistantPanelIndex = readerSource.indexOf('class="card ai-panel"')
    const summaryIndex = readerSource.indexOf('class="summary-block"')

    assert.ok(paperFooterIndex >= 0, 'reader paper footer should exist')
    assert.ok(stepperIndex > paperFooterIndex, 'sentence controls should follow the reading paper')
    assert.ok(
      !(stepperIndex > assistantPanelIndex && stepperIndex < summaryIndex),
      'sentence controls should not live in the assistant panel',
    )
  })

  it('uses the right side panel for article-level AI answers instead of sentence translation', () => {
    assert.match(readerSource, /class="card ai-panel"/)
    assert.match(readerSource, /class="ai-panel-title"/)
    assert.match(readerSource, /t\('reader\.aiPanelTitle'\)/)
    assert.match(readerSource, /t\('reader\.contextArticle'\)/)
    assert.doesNotMatch(readerSource, /class="translation-block"/)
    assert.doesNotMatch(readerSource, /t\('reader\.translationTitle'\)/)
  })

  it('declares a centered paper layout with continuous article styling', () => {
    assert.match(styleSource, /\.reader-paper\s*\{[\s\S]*max-width:\s*8[0-6]0px/)
    assert.match(styleSource, /\.sentence-list\s*\{[\s\S]*display:\s*block/)
    assert.match(styleSource, /\.sentence-item\.active\s*\{[\s\S]*box-shadow:\s*inset/)
  })

  it('renders sentence translation as a fixed draggable card inside the sentence viewer', () => {
    assert.match(sentenceViewerSource, /translation-card-floating/)
    assert.match(sentenceViewerSource, /ref="floatingTranslationCardRef"/)
    assert.match(sentenceViewerSource, /@pointerdown="startTranslationCardDrag"/)
    assert.match(sentenceViewerSource, /emit\('retry-translation'\)/)
    assert.match(sentenceViewerSource, /emit\('close-translation-card'\)/)
    assert.match(styleSource, /\.translation-card-floating\s*\{[\s\S]*position:\s*fixed/)
    assert.match(styleSource, /\.translation-card-heading\s*\{[\s\S]*cursor:\s*grab/)
  })

  it('renders the word card as a fixed draggable window', () => {
    assert.match(sentenceViewerSource, /ref="floatingWordCardRef"/)
    assert.match(sentenceViewerSource, /@pointerdown="startWordCardDrag"/)
    assert.match(sentenceViewerSource, /getDraggedWordCardPosition/)
    assert.match(sentenceViewerSource, /displayWordMeaning\(selectedWordDetail\)/)
    assert.match(styleSource, /\.word-card-floating\s*\{[\s\S]*position:\s*fixed/)
    assert.match(styleSource, /\.word-card-heading\s*\{[\s\S]*cursor:\s*grab/)
  })

  it('removes the old halftone paper theme from the global stylesheet', () => {
    assert.doesNotMatch(styleSource, /Halftone paper theme layer/)
    assert.doesNotMatch(styleSource, /\.app-shell::before/)
    assert.doesNotMatch(styleSource, /low-bit paper/)
    assert.doesNotMatch(styleSource, /radial-gradient\(circle at 1px 1px/)
  })

  it('keeps PDF toolbar actions visible but disabled', () => {
    const appSource = readFileSync(new URL('../App.vue', import.meta.url), 'utf8')

    assert.match(appSource, /class="app-toolbar"/)
    assert.match(appSource, /t\('toolbar\.pages'\)/)
    assert.match(appSource, /t\('toolbar\.ask'\)/)
    assert.match(appSource, /t\('toolbar\.uploadPdf'\)/)
    assert.match(appSource, /t\('toolbar\.export'\)/)
    assert.match(appSource, /disabled[\s\S]*t\('toolbar\.uploadPdf'\)/)
    assert.match(appSource, /disabled[\s\S]*t\('toolbar\.export'\)/)
  })
})
