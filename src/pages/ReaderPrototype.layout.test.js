import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const readerPrototypeSource = readFileSync(new URL('./ReaderPrototype.vue', import.meta.url), 'utf8')
const readerPrototypeDataUrl = new URL('../data/readerPrototypeData.js', import.meta.url)
const readerPrototypeDataSource = existsSync(readerPrototypeDataUrl)
  ? readFileSync(readerPrototypeDataUrl, 'utf8')
  : ''
const readerPrototypeSelectorsUrl = new URL('../data/readerPrototypeSelectors.js', import.meta.url)
const readerPrototypeSelectorsSource = existsSync(readerPrototypeSelectorsUrl)
  ? readFileSync(readerPrototypeSelectorsUrl, 'utf8')
  : ''
const readingPaperSource = readFileSync(
  new URL('../components/reader-prototype/PrototypeReadingPaper.vue', import.meta.url),
  'utf8',
)
const wordPanelSource = readFileSync(
  new URL('../components/reader-prototype/PrototypeAssistant.vue', import.meta.url),
  'utf8',
)
const topbarSource = readFileSync(
  new URL('../components/reader-prototype/PrototypeTopbar.vue', import.meta.url),
  'utf8',
)
const prototypeStyleSource = readFileSync(new URL('../reader-prototype.css', import.meta.url), 'utf8')

function cssBlock(selector) {
  const start = prototypeStyleSource.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} should exist`)

  const end = prototypeStyleSource.indexOf('\n}', start)
  assert.ok(end > start, `${selector} should have a closing brace`)

  return prototypeStyleSource.slice(start, end + 2)
}

describe('reader prototype word definition panel contract', () => {
  it('uses the right side as a local word definition panel instead of AI chat', () => {
    assert.match(wordPanelSource, /单词释义/)
    assert.match(wordPanelSource, /本章重点词/)
    assert.match(wordPanelSource, /点击词条查看释义/)
    assert.match(wordPanelSource, /加入生词本/)

    assert.doesNotMatch(wordPanelSource, /AI 阅读助手/)
    assert.doesNotMatch(wordPanelSource, /context-switch/)
    assert.doesNotMatch(wordPanelSource, /textarea/)
    assert.doesNotMatch(wordPanelSource, /\$emit\('send'\)/)
  })

  it('loads prototype reading data from a local data module', () => {
    assert.ok(existsSync(readerPrototypeDataUrl), 'reader prototype data module should exist')
    assert.match(
      readerPrototypeSource,
      /import\s*\{\s*prototypeBooks,\s*prototypeChapterContent,\s*prototypeDictionary\s*\}\s*from\s*['"]\.\.\/data\/readerPrototypeData\.js['"]/,
    )
    assert.match(readerPrototypeDataSource, /export const prototypeBooks\s*=/)
    assert.match(readerPrototypeDataSource, /export const prototypeChapterContent\s*=/)
    assert.match(readerPrototypeDataSource, /export const prototypeDictionary\s*=/)
    for (const chapterId of ['chapter-3', 'chapter-4', 'chapter-5', 'chapter-6']) {
      assert.match(readerPrototypeDataSource, new RegExp(`'${chapterId}':\\s*\\{`))
    }

    assert.match(readerPrototypeSource, /selectedWordKey/)
    assert.match(readerPrototypeSource, /selectedWordEntry/)
    assert.match(readerPrototypeSource, /selectWord/)
    assert.match(readerPrototypeSource, /已加入本地模拟生词本/)
    assert.doesNotMatch(readerPrototypeSource, /const books\s*=\s*\[/)
    assert.doesNotMatch(readerPrototypeSource, /const chapters\s*=\s*\[/)
    assert.doesNotMatch(readerPrototypeSource, /const paragraphs\s*=\s*\[/)
    assert.doesNotMatch(readerPrototypeSource, /const mockDictionary\s*=\s*\{/)
    assert.doesNotMatch(readerPrototypeSource, /mockAiMessages/)
    assert.doesNotMatch(readerPrototypeSource, /sendMockQuestion/)
    assert.doesNotMatch(readerPrototypeSource, /localStorage/)
  })

  it('keeps data selection and dictionary mapping in selector helpers', () => {
    assert.ok(existsSync(readerPrototypeSelectorsUrl), 'reader prototype selectors module should exist')
    assert.match(
      readerPrototypeSource,
      /from\s*['"]\.\.\/data\/readerPrototypeSelectors\.js['"]/,
    )

    for (const selectorName of [
      'findPrototypeBook',
      'getPrototypeChapters',
      'findPrototypeChapterContent',
      'findPrototypeChapter',
      'getPrototypeParagraphs',
      'getPrototypeReadingProgress',
      'getPrototypeChapterVocabulary',
      'getPrototypeMockWordbook',
      'mapDictionaryEntryToWordPanel',
    ]) {
      assert.match(readerPrototypeSource, new RegExp(selectorName))
      assert.match(readerPrototypeSelectorsSource, new RegExp(`export function ${selectorName}`))
    }

    assert.doesNotMatch(readerPrototypeSource, /\.find\(\(book\)/)
    assert.doesNotMatch(readerPrototypeSource, /\.find\(\(chapter\)/)
    assert.doesNotMatch(readerPrototypeSource, /\.map\(\(item\) => item\.zh\)/)
    assert.doesNotMatch(readerPrototypeSource, /entry\.meanings/)
    assert.doesNotMatch(readerPrototypeSource, /entry\.examples/)
  })

  it('renders structured sentence tokens instead of matching words from raw strings', () => {
    assert.match(readerPrototypeDataSource, /sentences:\s*\[/)
    assert.match(readerPrototypeDataSource, /tokens:\s*\[/)
    assert.match(readerPrototypeDataSource, /highlighted:\s*true/)

    for (const word of ['plan', 'unusually', 'observatory', 'reveal', 'copy', 'sentence']) {
      assert.match(readerPrototypeDataSource, new RegExp(`wordKey:\\s*'${word}'`))
    }
    assert.match(readerPrototypeDataSource, /surface:\s*'planned'[\s\S]*lemma:\s*'plan'[\s\S]*wordKey:\s*'plan'/)
    assert.match(readerPrototypeDataSource, /surface:\s*'copied'[\s\S]*lemma:\s*'copy'[\s\S]*wordKey:\s*'copy'/)
    assert.doesNotMatch(readerPrototypeDataSource, /wordKey:\s*'planned'/)
    assert.doesNotMatch(readerPrototypeDataSource, /wordKey:\s*'copied'/)
    assert.match(readerPrototypeDataSource, /prototypeDictionary\s*=\s*\{[\s\S]*plan:\s*\{[\s\S]*id:\s*'plan'/)
    assert.match(readerPrototypeDataSource, /prototypeDictionary\s*=\s*\{[\s\S]*copy:\s*\{[\s\S]*id:\s*'copy'/)
    assert.doesNotMatch(readerPrototypeDataSource, /planned:\s*\{[\s\S]*id:\s*'planned'/)
    assert.doesNotMatch(readerPrototypeDataSource, /copied:\s*\{[\s\S]*id:\s*'copied'/)

    assert.match(readingPaperSource, /paragraph\.sentences/)
    assert.match(readingPaperSource, /sentence\.tokens/)
    assert.match(readingPaperSource, /token\.wordKey/)
    assert.match(readingPaperSource, /word-token/)
    assert.match(readingPaperSource, /select-word/)
    assert.match(readingPaperSource, /selectedWordKey/)

    assert.doesNotMatch(readerPrototypeSource, /:clickable-words/)
    assert.doesNotMatch(readerPrototypeSource, /clickableWordKeys/)
    assert.doesNotMatch(readerPrototypeSource, /textBefore/)
    assert.doesNotMatch(readerPrototypeSource, /textAfter/)
    assert.doesNotMatch(readerPrototypeSource, /highlight:/)
    assert.doesNotMatch(readingPaperSource, /clickableWords/)
    assert.doesNotMatch(readingPaperSource, /clickableWordPattern/)
    assert.doesNotMatch(readingPaperSource, /getTextSegments/)
    assert.doesNotMatch(readingPaperSource, /RegExp/)
    assert.doesNotMatch(readingPaperSource, /escapeRegExp/)
  })

  it('passes clicked token context into the local word definition panel', () => {
    assert.match(readingPaperSource, /\$emit\('select-word',\s*\{/)
    assert.match(readingPaperSource, /wordKey:\s*token\.wordKey/)
    assert.match(readingPaperSource, /surface:\s*token\.surface\s*\|\|\s*token\.text/)
    assert.match(readingPaperSource, /sentenceId:\s*token\.sentenceId/)

    assert.match(readerPrototypeSource, /selectedWordContext/)
    assert.match(readerPrototypeSource, /getPrototypeWordContext/)
    assert.match(
      readerPrototypeSource,
      /mapDictionaryEntryToWordPanel\(\s*prototypeDictionary\[selectedWordKey\.value\],\s*selectedWordContext\.value\s*\)/,
    )
    assert.match(wordPanelSource, /word\.sourceTranslation/)
    assert.doesNotMatch(readingPaperSource, /\$emit\('select-word',\s*token\.wordKey\)/)
  })

  it('replaces the active paragraph with the paragraph that contains the selected word', () => {
    assert.match(readerPrototypeSource, /const selectedParagraphId = computed/)
    assert.match(readerPrototypeSource, /selectedWordContext\.value\?\.paragraphId\s*\|\|\s*null/)
    assert.match(readerPrototypeSource, /:selected-paragraph-id="selectedParagraphId"/)

    assert.match(readingPaperSource, /selectedParagraphId/)
    assert.match(readingPaperSource, /paragraph\.id\s*===\s*selectedParagraphId/)
    assert.match(
      readingPaperSource,
      /selectedParagraphId\s*\?\s*paragraph\.id\s*===\s*selectedParagraphId\s*:\s*paragraph\.active/,
    )
    assert.doesNotMatch(readingPaperSource, /:class="\{\s*current:\s*paragraph\.active\s*\}"/)
  })

  it('shows a current chapter vocabulary list before a word is selected', () => {
    assert.match(readerPrototypeSource, /const chapterVocabulary = computed/)
    assert.match(
      readerPrototypeSource,
      /getPrototypeChapterVocabulary\(\s*currentChapterContent\.value,\s*prototypeDictionary,\s*addedWordKeys\.value\s*\)/,
    )
    assert.match(readerPrototypeSource, /:vocabulary="chapterVocabulary"/)

    assert.match(wordPanelSource, /vocabulary/)
    assert.match(wordPanelSource, /chapter-vocabulary-list/)
    assert.match(wordPanelSource, /v-for="item in vocabulary"/)
    assert.match(wordPanelSource, /\$emit\('select-word',\s*item\.selection\)/)
    assert.match(wordPanelSource, /item\.word/)
    assert.match(wordPanelSource, /item\.partOfSpeech/)
    assert.match(wordPanelSource, /item\.meaning/)
    assert.match(wordPanelSource, /item\.count/)
    assert.match(wordPanelSource, /item\.isAdded/)
    assert.match(wordPanelSource, /defineEmits\(\['add-word',\s*'remove-word',\s*'select-word',\s*'show-wordbook'\]\)/)
    assert.match(prototypeStyleSource, /\.chapter-vocabulary-list/)
    assert.match(prototypeStyleSource, /\.chapter-vocabulary-item/)

    assert.doesNotMatch(wordPanelSource, /planned、unusually、observatory、reveal、copied、sentence/)
  })

  it('shows and manages the local mock wordbook without persistence', () => {
    assert.match(readerPrototypeSource, /const mockWordbook = computed/)
    assert.match(
      readerPrototypeSource,
      /getPrototypeMockWordbook\(\s*currentChapterContent\.value,\s*prototypeDictionary,\s*addedWordKeys\.value\s*\)/,
    )
    assert.match(readerPrototypeSource, /:wordbook="mockWordbook"/)
    assert.match(readerPrototypeSource, /@remove-word="removeFromMockWordbook"/)
    assert.match(readerPrototypeSource, /@show-wordbook="clearSelectedWord"/)
    assert.match(readerPrototypeSource, /function removeFromMockWordbook/)
    assert.match(readerPrototypeSource, /function clearSelectedWord/)
    assert.doesNotMatch(readerPrototypeSource, /localStorage/)

    assert.match(wordPanelSource, /wordbook/)
    assert.match(wordPanelSource, /本地生词本/)
    assert.match(wordPanelSource, /本轮还没有加入生词/)
    assert.match(wordPanelSource, /local-wordbook-list/)
    assert.match(wordPanelSource, /v-for="item in wordbook"/)
    assert.match(wordPanelSource, /\$emit\('select-word',\s*item\.selection\)/)
    assert.match(wordPanelSource, /\$emit\('remove-word',\s*item\.wordKey\)/)
    assert.match(wordPanelSource, /查看本地生词本/)
    assert.match(wordPanelSource, /移出生词本/)
    assert.match(wordPanelSource, /defineEmits\(\['add-word',\s*'remove-word',\s*'select-word',\s*'show-wordbook'\]\)/)
    assert.match(prototypeStyleSource, /\.local-wordbook-list/)
    assert.match(prototypeStyleSource, /\.local-wordbook-remove/)
  })

  it('removes decorative reading and dictionary labels from the prototype workspace', () => {
    assert.doesNotMatch(readingPaperSource, /reading-status/)
    assert.doesNotMatch(readingPaperSource, /paragraph-meta/)
    assert.doesNotMatch(readingPaperSource, /learning-tags/)
    assert.doesNotMatch(readingPaperSource, /chapter\.level/)
    assert.doesNotMatch(readingPaperSource, /chapter\.sentenceCount/)
    assert.doesNotMatch(readingPaperSource, /paragraph\.meta/)
    assert.doesNotMatch(readingPaperSource, /paragraph\.tags/)

    assert.doesNotMatch(wordPanelSource, /word-tags/)
    assert.doesNotMatch(wordPanelSource, /word\.tags/)
    assert.doesNotMatch(wordPanelSource, /word\.meanings/)

    assert.doesNotMatch(readerPrototypeSource, /P01|P02|P03/)
    assert.doesNotMatch(readerPrototypeSource, /当前句|难度 B1|2 个生词|长句|收藏段|收束段|复习 1 词/)
    assert.doesNotMatch(readerPrototypeSource, /阅读词汇|高频词|副词/)

    assert.doesNotMatch(prototypeStyleSource, /\.reading-status/)
    assert.doesNotMatch(prototypeStyleSource, /\.paragraph-meta/)
    assert.doesNotMatch(prototypeStyleSource, /\.learning-tags/)
    assert.doesNotMatch(prototypeStyleSource, /\.word-tags/)
  })

  it('does not render the obsolete floating notes bar in the reader prototype', () => {
    assert.doesNotMatch(readerPrototypeSource, /PrototypeFloatingNotes/)
    assert.doesNotMatch(readerPrototypeSource, /addMockNote/)
    assert.doesNotMatch(readerPrototypeSource, /const notes/)
    assert.doesNotMatch(readerPrototypeSource, /nextNoteId/)

    assert.doesNotMatch(prototypeStyleSource, /\.floating-notes/)
    assert.doesNotMatch(prototypeStyleSource, /\.notes-tabs/)
    assert.doesNotMatch(prototypeStyleSource, /\.notes-tab/)
    assert.doesNotMatch(prototypeStyleSource, /\.note-content/)
    assert.doesNotMatch(prototypeStyleSource, /\.notes-list/)
  })

  it('keeps the prototype toolbar focused on reading display controls only', () => {
    assert.match(topbarSource, /toolstrip-shell/)
    assert.match(topbarSource, /toolstrip-group reading-group/)
    assert.match(topbarSource, /toolstrip-group translation-group/)
    assert.match(topbarSource, /tool-icon/)
    assert.match(topbarSource, /<svg/)
    assert.match(topbarSource, /stroke="currentColor"/)
    assert.match(topbarSource, /fill="none"/)
    assert.match(topbarSource, /stroke-width="1\.8"/)
    assert.match(topbarSource, /tool-label/)
    assert.doesNotMatch(topbarSource, /✦/)
    assert.doesNotMatch(topbarSource, /toolstrip-group font-group/)
    assert.doesNotMatch(topbarSource, /生词/)
    assert.doesNotMatch(topbarSource, /A-/)
    assert.doesNotMatch(topbarSource, /A\+/)
    assert.doesNotMatch(topbarSource, /disabled/)
    assert.doesNotMatch(topbarSource, /compact/)
    assert.doesNotMatch(topbarSource, /笔记/)
    assert.doesNotMatch(topbarSource, /toggle-note-panel/)
    assert.doesNotMatch(readerPrototypeSource, /showPrototypeNoteHint/)
    assert.doesNotMatch(readerPrototypeSource, /noteToolTouched/)

    assert.doesNotMatch(topbarSource, /toolstrip-group nav-group/)
    assert.doesNotMatch(topbarSource, /段落导航/)
    assert.doesNotMatch(topbarSource, /上一段/)
    assert.doesNotMatch(topbarSource, /下一段/)
    assert.doesNotMatch(topbarSource, /go-previous-paragraph/)
    assert.doesNotMatch(topbarSource, /go-next-paragraph/)
    assert.doesNotMatch(topbarSource, /canGoPreviousParagraph/)
    assert.doesNotMatch(topbarSource, /canGoNextParagraph/)
    assert.doesNotMatch(readerPrototypeSource, /goToPreviousParagraph/)
    assert.doesNotMatch(readerPrototypeSource, /goToNextParagraph/)
    assert.doesNotMatch(readerPrototypeSource, /activeParagraphId/)
    assert.doesNotMatch(readerPrototypeSource, /displayParagraphs/)
    assert.doesNotMatch(readerPrototypeSource, /activeParagraphIndex/)
    assert.doesNotMatch(readerPrototypeSource, /canGoPreviousParagraph/)
    assert.doesNotMatch(readerPrototypeSource, /canGoNextParagraph/)
  })

  it('removes unused top-right action buttons from the prototype toolbar', () => {
    assert.doesNotMatch(topbarSource, /prototype-actions/)
    assert.doesNotMatch(topbarSource, /prototype-action-button/)
    assert.doesNotMatch(topbarSource, /prototype-avatar/)
    assert.doesNotMatch(topbarSource, /搜索/)
    assert.doesNotMatch(topbarSource, /导入文本/)
    assert.doesNotMatch(topbarSource, /设置/)

    assert.doesNotMatch(prototypeStyleSource, /\.prototype-actions/)
    assert.doesNotMatch(prototypeStyleSource, /\.prototype-action-button/)
    assert.doesNotMatch(prototypeStyleSource, /\.prototype-avatar/)
  })

  it('styles selected word tokens and dictionary details without chat UI emphasis', () => {
    assert.match(prototypeStyleSource, /\.sentence-highlight-yellow\s*\{[\s\S]*rgba\(249, 216, 102/)
    assert.match(prototypeStyleSource, /\.word-token\s*\{[\s\S]*border-bottom/)
    assert.match(prototypeStyleSource, /\.word-token\s*\{[\s\S]*color:\s*inherit/)
    assert.match(prototypeStyleSource, /\.word-token:hover\s*\{[\s\S]*background:\s*rgba\(232, 237, 244, 0\.58\)/)
    assert.match(prototypeStyleSource, /\.word-token\.selected\s*\{[\s\S]*background:\s*var\(--prototype-accent-soft\)/)
    assert.match(prototypeStyleSource, /\.sentence-highlight \.word-token\.selected/)
    assert.match(prototypeStyleSource, /\.word-definition-panel/)
    assert.match(wordPanelSource, /word\.exampleTranslation/)
    assert.match(wordPanelSource, /word\.forms/)
    assert.match(wordPanelSource, /word-example-translation/)
    assert.match(wordPanelSource, /word-form-list/)
    assert.match(prototypeStyleSource, /\.word-detail-list div\s*\{[\s\S]*border-top/)
    assert.match(prototypeStyleSource, /\.word-example-translation\s*\{[\s\S]*color:\s*var\(--prototype-muted\)/)
    assert.match(prototypeStyleSource, /\.word-form-list\s*\{[\s\S]*display:\s*flex/)
    assert.match(prototypeStyleSource, /\.word-form-list span\s*\{[\s\S]*border:\s*1px solid #e1e7f0/)
    assert.match(prototypeStyleSource, /\.wordbook-button/)
    assert.doesNotMatch(cssBlock('.wordbook-message'), /border:/)
    assert.doesNotMatch(cssBlock('.wordbook-message'), /background:/)
    assert.doesNotMatch(prototypeStyleSource, /\.assistant-input-box/)
  })

  it('styles the top toolbar as grouped reader controls with clear states', () => {
    assert.match(prototypeStyleSource, /grid-template-rows:\s*42px 40px/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*overflow-x:\s*auto/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*height:\s*40px/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*padding:\s*0 20px/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*border-bottom:\s*1px solid #dfe5ee/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*background:\s*#f9fafb/)
    assert.match(prototypeStyleSource, /\.toolstrip-shell\s*\{[\s\S]*gap:\s*11px/)
    assert.match(prototypeStyleSource, /\.toolstrip-group\s*\{[\s\S]*gap:\s*3px/)
    assert.match(prototypeStyleSource, /\.toolstrip-group\s*\{[\s\S]*border:\s*1px solid #e5e7eb/)
    assert.match(prototypeStyleSource, /\.toolstrip-group\s*\{[\s\S]*border-radius:\s*10px/)
    assert.match(prototypeStyleSource, /\.toolstrip-group\s*\{[\s\S]*background:\s*#ffffff/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*height:\s*30px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*min-width:\s*48px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*gap:\s*6px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*border:\s*1px solid #d8e0eb/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*border-radius:\s*8px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*color:\s*#475569/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*background:\s*#ffffff/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*font-size:\s*13px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*transition:/)
    assert.match(prototypeStyleSource, /\.tool-icon\s*\{[\s\S]*width:\s*16px/)
    assert.match(prototypeStyleSource, /\.tool-icon svg\s*\{[\s\S]*width:\s*16px/)
    assert.match(prototypeStyleSource, /\.tool-label\s*\{[\s\S]*line-height:\s*1/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\.active,[\s\S]*\.toolstrip-button\.switch-on\s*\{[\s\S]*color:\s*#1d4ed8/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\.active,[\s\S]*\.toolstrip-button\.switch-on\s*\{[\s\S]*background:\s*#edf4ff/)
    assert.match(prototypeStyleSource, /\.reader-prototype \.toolstrip-button:disabled\s*\{[\s\S]*color:\s*#94a3b8/)
    assert.match(prototypeStyleSource, /\.reader-prototype \.toolstrip-button:disabled\s*\{[\s\S]*background:\s*#f8fafc/)
    assert.match(prototypeStyleSource, /\.toolstrip-button:hover:not\(:disabled\)/)
    assert.match(prototypeStyleSource, /\.toolstrip-button:active:not\(:disabled\)/)
    assert.match(prototypeStyleSource, /\.toolstrip-button:focus-visible/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\.active/)
    assert.match(prototypeStyleSource, /\.toolstrip-button:disabled/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\.switch-on/)
  })

  it('wires prototype highlighter state through the page', () => {
    assert.match(readerPrototypeSource, /prototypeHighlightColors/)
    assert.match(readerPrototypeSource, /isHighlightMode/)
    assert.match(readerPrototypeSource, /activeHighlightColorId/)
    assert.match(readerPrototypeSource, /isHighlightClearMode/)
    assert.match(readerPrototypeSource, /sentenceHighlightsByChapter/)
    assert.match(readerPrototypeSource, /currentChapterHighlights/)
    assert.match(readerPrototypeSource, /getDefaultPrototypeHighlights/)
    assert.match(readerPrototypeSource, /getPrototypeChapterHighlights/)
    assert.match(readerPrototypeSource, /togglePrototypeSentenceHighlight/)
    assert.match(readerPrototypeSource, /removePrototypeSentenceHighlight/)
    assert.match(readerPrototypeSource, /:highlight-colors="prototypeHighlightColors"/)
    assert.match(readerPrototypeSource, /:is-highlight-mode="isHighlightMode"/)
    assert.match(readerPrototypeSource, /:active-highlight-color-id="activeHighlightColorId"/)
    assert.match(readerPrototypeSource, /:is-highlight-clear-mode="isHighlightClearMode"/)
    assert.match(readerPrototypeSource, /:sentence-highlights="currentChapterHighlights"/)
    assert.match(readerPrototypeSource, /@toggle-highlight-mode="toggleHighlightMode"/)
    assert.match(readerPrototypeSource, /@select-highlight-color="selectHighlightColor"/)
    assert.match(readerPrototypeSource, /@select-highlight-clear="selectHighlightClear"/)
    assert.match(readerPrototypeSource, /@toggle-sentence-highlight="toggleSentenceHighlight"/)
    assert.doesNotMatch(readerPrototypeSource, /localStorage/)
  })

  it('renders highlighter controls without mixing marking mode and visibility', () => {
    assert.match(topbarSource, /highlightColors/)
    assert.match(topbarSource, /isHighlightMode/)
    assert.match(topbarSource, /activeHighlightColorId/)
    assert.match(topbarSource, /isHighlightClearMode/)
    assert.match(topbarSource, /highlight-color-swatches/)
    assert.match(topbarSource, /highlight-color-button/)
    assert.match(topbarSource, /highlight-clear-button/)
    assert.match(topbarSource, /toggle-highlight-mode/)
    assert.match(topbarSource, /toggle-highlight-visibility/)
    assert.match(topbarSource, /select-highlight-color/)
    assert.match(topbarSource, /select-highlight-clear/)
    assert.match(topbarSource, /aria-pressed/)
  })

  it('lets the reading paper emit sentence highlight changes while word clicks stay isolated', () => {
    assert.match(readingPaperSource, /sentenceHighlights/)
    assert.match(readingPaperSource, /isHighlightMode/)
    assert.match(readingPaperSource, /activeHighlightColorId/)
    assert.match(readingPaperSource, /getSentenceHighlightColor/)
    assert.match(readingPaperSource, /getSentenceHighlightClass/)
    assert.match(readingPaperSource, /toggleSentenceHighlight/)
    assert.match(readingPaperSource, /toggle-sentence-highlight/)
    assert.match(readingPaperSource, /@click="toggleSentenceHighlight\(sentence\.id\)"/)
    assert.match(readingPaperSource, /@keydown\.enter="toggleSentenceHighlight\(sentence\.id\)"/)
    assert.match(readingPaperSource, /@click\.stop="\$emit\('select-word'/)
  })

  it('styles prototype highlighter controls and color variants', () => {
    assert.match(prototypeStyleSource, /\.highlight-color-swatches/)
    assert.match(prototypeStyleSource, /\.highlight-color-button/)
    assert.match(prototypeStyleSource, /\.highlight-clear-button/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-yellow/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-green/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-blue/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-pink/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-purple/)
    assert.match(prototypeStyleSource, /\.sentence-highlight\.is-highlight-mode/)
  })
})
