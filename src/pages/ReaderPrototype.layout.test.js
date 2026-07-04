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
const sidebarSource = readFileSync(
  new URL('../components/reader-prototype/PrototypeSidebar.vue', import.meta.url),
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
const pasteEditorUrl = new URL('../components/reader-prototype/PrototypePasteEditor.vue', import.meta.url)
const pasteEditorSource = existsSync(pasteEditorUrl)
  ? readFileSync(pasteEditorUrl, 'utf8')
  : ''
const bookImportPanelUrl = new URL('../components/reader-prototype/PrototypeBookImportPanel.vue', import.meta.url)
const bookImportPanelSource = existsSync(bookImportPanelUrl)
  ? readFileSync(bookImportPanelUrl, 'utf8')
  : ''
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
    assert.match(readerPrototypeSource, /已加入生词本/)
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
      'findPrototypeBookChapterContent',
      'getPrototypeChapters',
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

  it('renders clickable sentence tokens from structured data helpers instead of raw string matching', () => {
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
    assert.match(readingPaperSource, /getPrototypeClickableSentenceTokens/)
    assert.match(readingPaperSource, /getClickableSentenceTokens\(sentence\)/)
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

  it('connects missing prototype translations to the existing AI translation endpoint', () => {
    assert.match(readerPrototypeSource, /import\s*\{\s*requestTranslation\s*\}\s*from\s*['"]\.\.\/api\/translate\.js['"]/)
    assert.match(
      readerPrototypeSource,
      /import\s*\{\s*getCachedTranslation,\s*saveCachedTranslation\s*\}\s*from\s*['"]\.\.\/utils\/translationCache\.js['"]/,
    )
    assert.match(readerPrototypeSource, /getPrototypeLocalParagraphTranslation/)
    assert.match(readerPrototypeSource, /getPrototypeParagraphSourceText/)
    assert.match(readerPrototypeSource, /const displayParagraphs = computed/)
    assert.match(readerPrototypeSource, /translationByParagraphId/)
    assert.match(readerPrototypeSource, /translationLoadingByParagraphId/)
    assert.match(readerPrototypeSource, /translationErrorByParagraphId/)
    assert.match(readerPrototypeSource, /requestTranslation\(sourceText\)/)
    assert.match(readerPrototypeSource, /saveCachedTranslation\(sourceText,\s*data\.translation\)/)
    assert.match(readerPrototypeSource, /watch\(/)
    assert.match(readerPrototypeSource, /:paragraphs="displayParagraphs"/)
    assert.match(readerPrototypeSource, /@retry-translation="retryPrototypeTranslation"/)

    assert.match(readingPaperSource, /paragraph\.isTranslationLoading/)
    assert.match(readingPaperSource, /paragraph\.translationErrorMessage/)
    assert.match(readingPaperSource, /\$emit\('retry-translation',\s*paragraph\.id\)/)
    assert.match(readingPaperSource, /translation-retry-button/)
    assert.match(readingPaperSource, /translate-paragraph-button/)
  })

  it('loads sentence translations on demand and keeps paragraph translation manual', () => {
    assert.match(readerPrototypeSource, /getPrototypeLocalSentenceTranslation/)
    assert.match(readerPrototypeSource, /getPrototypeSentenceSourceText/)
    assert.match(readerPrototypeSource, /getPrototypeTranslationStateKey/)
    assert.match(readerPrototypeSource, /selectedSentenceId/)
    assert.match(readerPrototypeSource, /translationBySentenceId/)
    assert.match(readerPrototypeSource, /translationLoadingBySentenceId/)
    assert.match(readerPrototypeSource, /translationErrorBySentenceId/)
    assert.match(readerPrototypeSource, /loadPrototypeSentenceTranslation/)
    assert.match(readerPrototypeSource, /selectPrototypeSentence/)
    assert.match(readerPrototypeSource, /retryPrototypeSentenceTranslation/)
    assert.match(readerPrototypeSource, /translatePrototypeParagraph/)
    assert.match(readerPrototypeSource, /:selected-sentence-id="selectedSentenceId"/)
    assert.match(readerPrototypeSource, /@select-sentence="selectPrototypeSentence"/)
    assert.match(readerPrototypeSource, /@retry-sentence-translation="retryPrototypeSentenceTranslation"/)
    assert.match(readerPrototypeSource, /@translate-paragraph="translatePrototypeParagraph"/)
    assert.doesNotMatch(readerPrototypeSource, /function loadMissingPrototypeTranslations/)
    assert.doesNotMatch(readerPrototypeSource, /watch\(\[showTranslation,\s*currentChapterContent\]/)
  })

  it('isolates pasted article translations and ignores stale translation responses', () => {
    assert.match(readerPrototypeSource, /pastedArticleVersion/)
    assert.match(readerPrototypeSource, /pastedArticleVersion\.value\s*\+=\s*1/)
    assert.match(
      readerPrototypeSource,
      /isPastedArticleActive\.value[\s\S]*pastedArticleVersion\.value/,
    )
    assert.match(readerPrototypeSource, /function clearPrototypeTranslationState/)
    assert.match(readerPrototypeSource, /translationByParagraphId\.value\s*=\s*\{\}/)
    assert.match(readerPrototypeSource, /translationLoadingByParagraphId\.value\s*=\s*\{\}/)
    assert.match(readerPrototypeSource, /translationErrorByParagraphId\.value\s*=\s*\{\}/)
    assert.match(readerPrototypeSource, /translationBySentenceId\.value\s*=\s*\{\}/)
    assert.match(readerPrototypeSource, /translationLoadingBySentenceId\.value\s*=\s*\{\}/)
    assert.match(readerPrototypeSource, /translationErrorBySentenceId\.value\s*=\s*\{\}/)
    assert.match(readerPrototypeSource, /let translationRequestVersion\s*=\s*0/)
    assert.match(readerPrototypeSource, /translationRequestVersion\s*\+=\s*1/)
    assert.match(readerPrototypeSource, /paragraphRequestVersions/)
    assert.match(readerPrototypeSource, /sentenceRequestVersions/)
    assert.match(readerPrototypeSource, /paragraphRequestVersions\[paragraphStateKey\]\s*=\s*requestVersion/)
    assert.match(readerPrototypeSource, /sentenceRequestVersions\[sentenceStateKey\]\s*=\s*requestVersion/)
    assert.match(readerPrototypeSource, /paragraphRequestVersions\[paragraphStateKey\]\s*!==\s*requestVersion/)
    assert.match(readerPrototypeSource, /sentenceRequestVersions\[sentenceStateKey\]\s*!==\s*requestVersion/)
    assert.match(readerPrototypeSource, /return/)
  })

  it('connects missing prototype dictionary entries to the prototype word lookup endpoint and vocabulary store', () => {
    assert.match(
      readerPrototypeSource,
      /import\s*\{\s*requestPrototypeWordExplanation\s*\}\s*from\s*['"]\.\.\/api\/prototypeWord\.js['"]/,
    )
    assert.match(
      readerPrototypeSource,
      /import\s*\{[\s\S]*isWordSaved[\s\S]*removeVocabularyWord[\s\S]*saveVocabularyWord[\s\S]*\}\s*from\s*['"]\.\.\/utils\/vocabulary\.js['"]/,
    )
    assert.match(readerPrototypeSource, /mapAiWordDetailToWordPanel/)
    assert.match(readerPrototypeSource, /selectedAiWordEntry/)
    assert.match(readerPrototypeSource, /wordCache/)
    assert.match(readerPrototypeSource, /wordRequests/)
    assert.match(readerPrototypeSource, /getAiWordDetail/)
    assert.match(readerPrototypeSource, /requestPrototypeWordExplanation\(word\)/)
    assert.match(readerPrototypeSource, /prototypeDictionary\[selectedWordKey\.value\]/)
    assert.match(readerPrototypeSource, /mapAiWordDetailToWordPanel\(\s*selectedAiWordEntry\.value,\s*selectedWordContext\.value\s*\)/)
    assert.match(readerPrototypeSource, /saveVocabularyWord\(/)
    assert.match(readerPrototypeSource, /removeVocabularyWord\(/)
    assert.match(readerPrototypeSource, /isWordSaved\(/)
    assert.match(readerPrototypeSource, /:is-word-loading="isWordLoading"/)
    assert.match(readerPrototypeSource, /:word-error-message="wordErrorMessage"/)
    assert.match(readerPrototypeSource, /@retry-word="retrySelectedPrototypeWord"/)

    assert.match(wordPanelSource, /isWordLoading/)
    assert.match(wordPanelSource, /wordErrorMessage/)
    assert.match(wordPanelSource, /loadingWord/)
    assert.match(wordPanelSource, /translation-loading/)
    assert.match(wordPanelSource, /translation-error/)
    assert.match(wordPanelSource, /\$emit\('retry-word'\)/)
    assert.match(wordPanelSource, /defineEmits\(\[[\s\S]*'retry-word'[\s\S]*\]\)/)
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
    assert.match(wordPanelSource, /defineEmits\(\[[\s\S]*'add-word'[\s\S]*'remove-word'[\s\S]*'select-word'[\s\S]*'retry-word'[\s\S]*'show-wordbook'[\s\S]*\]\)/)
    assert.match(prototypeStyleSource, /\.chapter-vocabulary-list/)
    assert.match(prototypeStyleSource, /\.chapter-vocabulary-item/)

    assert.doesNotMatch(wordPanelSource, /planned、unusually、observatory、reveal、copied、sentence/)
  })

  it('shows the local wordbook state while saving words through the existing vocabulary store', () => {
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
    assert.match(readerPrototypeSource, /saveVocabularyWord\(/)
    assert.match(readerPrototypeSource, /removeVocabularyWord\(/)
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
    assert.match(wordPanelSource, /defineEmits\(\[[\s\S]*'add-word'[\s\S]*'remove-word'[\s\S]*'select-word'[\s\S]*'retry-word'[\s\S]*'show-wordbook'[\s\S]*\]\)/)
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
    assert.match(topbarSource, /prototype-brand-copy/)
    assert.match(topbarSource, /<strong>Reading<\/strong>/)
    assert.match(topbarSource, /智能精读工作台/)
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
    assert.doesNotMatch(readerPrototypeSource, /displayParagraphs\s*=\s*computed\(\(\)\s*=>\s*activeParagraph/)
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
    assert.match(prototypeStyleSource, /grid-template-rows:\s*52px 42px/)
    assert.match(prototypeStyleSource, /\.prototype-topbar\s*\{[\s\S]*border-bottom:\s*1px solid rgba\(184, 197, 215, 0\.48\)/)
    assert.match(prototypeStyleSource, /\.prototype-topbar\s*\{[\s\S]*backdrop-filter:\s*blur\(22px\) saturate\(150%\)/)
    assert.match(prototypeStyleSource, /\.prototype-brand-copy\s*\{[\s\S]*display:\s*grid/)
    assert.match(prototypeStyleSource, /\.prototype-brand-copy strong\s*\{[\s\S]*font-size:\s*16px/)
    assert.match(prototypeStyleSource, /\.prototype-brand-copy small\s*\{[\s\S]*font-size:\s*10\.5px/)
    assert.match(prototypeStyleSource, /\.prototype-brand-mark\s*\{[\s\S]*border-radius:\s*12px/)
    assert.match(prototypeStyleSource, /\.prototype-book-select\s*\{[\s\S]*border-radius:\s*16px/)
    assert.match(prototypeStyleSource, /\.prototype-book-select\s*\{[\s\S]*box-shadow:\s*0 14px 34px rgba\(31, 45, 71, 0\.08\)/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*overflow-x:\s*auto/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*height:\s*42px/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*padding:\s*0 20px/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*border-bottom:\s*1px solid rgba\(216, 224, 235, 0\.84\)/)
    assert.match(prototypeStyleSource, /\.prototype-toolstrip\s*\{[\s\S]*background:\s*rgba\(247, 250, 253, 0\.78\)/)
    assert.match(prototypeStyleSource, /\.toolstrip-shell\s*\{[\s\S]*gap:\s*12px/)
    assert.match(prototypeStyleSource, /\.toolstrip-group\s*\{[\s\S]*gap:\s*4px/)
    assert.match(prototypeStyleSource, /\.toolstrip-group\s*\{[\s\S]*border:\s*1px solid rgba\(213, 222, 235, 0\.92\)/)
    assert.match(prototypeStyleSource, /\.toolstrip-group\s*\{[\s\S]*border-radius:\s*14px/)
    assert.match(prototypeStyleSource, /\.toolstrip-group\s*\{[\s\S]*background:\s*rgba\(255, 255, 255, 0\.88\)/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*height:\s*32px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*min-width:\s*48px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*gap:\s*6px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*border:\s*1px solid rgba\(216, 224, 235, 0\.92\)/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*border-radius:\s*11px/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*color:\s*#475569/)
    assert.match(prototypeStyleSource, /\.toolstrip-button\s*\{[\s\S]*background:\s*rgba\(255, 255, 255, 0\.82\)/)
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

  it('renders an empty book state instead of falling back to stale chapter content', () => {
    assert.match(readerPrototypeSource, /findPrototypeBookChapterContent/)
    assert.match(
      readerPrototypeSource,
      /findPrototypeBookChapterContent\([\s\S]*chapterContentById\.value,[\s\S]*currentBook\.value,[\s\S]*activeChapterId\.value,[\s\S]*fallbackChapterId,[\s\S]*\)/,
    )
    assert.match(readerPrototypeSource, /v-else-if="currentChapter"/)
    assert.match(readerPrototypeSource, /prototype-empty-book/)
    assert.match(readerPrototypeSource, /getPrototypeChapters\(currentBook\.value\)/)
    assert.match(prototypeStyleSource, /\.prototype-empty-book/)
    assert.doesNotMatch(
      readerPrototypeSource,
      /findPrototypeChapterContent\(\s*chapterContentById\.value,\s*activeChapterId\.value,\s*fallbackChapterId\s*\)/,
    )
    assert.match(topbarSource, /v-if="chapter"/)
    assert.match(topbarSource, /chapter:\s*\{[\s\S]*default:\s*null/)
  })

  it('wires pasted article mode into the prototype reader instead of the formal reader route', () => {
    assert.ok(existsSync(pasteEditorUrl), 'paste editor should render inside the prototype reader area')
    assert.match(readerPrototypeSource, /import\s+PrototypePasteEditor\s+from\s+['"]\.\.\/components\/reader-prototype\/PrototypePasteEditor\.vue['"]/)
    assert.match(readerPrototypeSource, /readClipboardText/)
    assert.match(readerPrototypeSource, /createPastedPrototypeChapterContent/)
    assert.match(readerPrototypeSource, /pastedChapterContent/)
    assert.match(readerPrototypeSource, /isPastedArticleActive/)
    assert.match(readerPrototypeSource, /sidebarActiveChapterId/)
    assert.match(readerPrototypeSource, /:active-chapter-id="sidebarActiveChapterId"/)
    assert.match(readerPrototypeSource, /isPasteEditorOpen/)
    assert.match(readerPrototypeSource, /pasteDraft/)
    assert.match(readerPrototypeSource, /openPasteEditor/)
    assert.match(readerPrototypeSource, /closePasteEditor/)
    assert.match(readerPrototypeSource, /submitPastedArticle/)
    assert.match(readerPrototypeSource, /readClipboardIntoDraft/)
    assert.match(readerPrototypeSource, /<PrototypePasteEditor/)
    assert.match(readerPrototypeSource, /v-else-if="isPasteEditorOpen"/)
    assert.match(readerPrototypeSource, /v-model="pasteDraft"/)
    assert.match(readerPrototypeSource, /@submit="submitPastedArticle"/)
    assert.match(readerPrototypeSource, /@cancel="closePasteEditor"/)
    assert.match(readerPrototypeSource, /@read-clipboard="readClipboardIntoDraft"/)
    assert.match(readerPrototypeSource, /@paste-article="openPasteEditor"/)
    assert.doesNotMatch(readerPrototypeSource, /@paste-article="pastePrototypeArticle"/)
    assert.match(readerPrototypeSource, /const chapters = computed\(\(\) => getPrototypeChapters\(currentBook\.value\)\)/)
    assert.doesNotMatch(readerPrototypeSource, /const baseChapters = getPrototypeChapters/)
    assert.doesNotMatch(readerPrototypeSource, /\.\.\.baseChapters/)
    assert.doesNotMatch(readerPrototypeSource, /activeChapterId\.value\s*=\s*pastedChapter\.id/)
    assert.match(readerPrototypeSource, /isPastedArticleActive\.value\s*=\s*true/)
    assert.match(readerPrototypeSource, /isPastedArticleActive\.value\s*=\s*false/)
    assert.match(readerPrototypeSource, /currentChapterContent = computed/)
    assert.match(readerPrototypeSource, /pastedChapterContent\.value/)
    assert.doesNotMatch(readerPrototypeSource, /router\.push/)
    assert.doesNotMatch(readerPrototypeSource, /path:\s*['"]\/reader['"]/)
    assert.doesNotMatch(readerPrototypeSource, /to=['"]\/reader['"]/)
    assert.doesNotMatch(readerPrototypeSource, /localStorage/)
  })

  it('wires PDF and EPUB file imports into the real prototype bookshelf', () => {
    assert.ok(existsSync(bookImportPanelUrl), 'book import panel should exist')
    assert.match(readerPrototypeSource, /import\s+PrototypeBookImportPanel\s+from\s+['"]\.\.\/components\/reader-prototype\/PrototypeBookImportPanel\.vue['"]/)
    assert.match(readerPrototypeSource, /parsePrototypeBookFile/)
    assert.match(readerPrototypeSource, /createImportedPrototypeBookFromText/)
    assert.match(readerPrototypeSource, /loadImportedPrototypeBooks/)
    assert.match(readerPrototypeSource, /appendImportedPrototypeBook/)
    assert.match(readerPrototypeSource, /removeImportedPrototypeBook/)
    assert.match(readerPrototypeSource, /getImportedPrototypeChapterContentById/)
    assert.match(readerPrototypeSource, /const importedBooks = ref\(\[\]\)/)
    assert.match(readerPrototypeSource, /loadImportedBooksIntoShelf\(\)/)
    assert.match(readerPrototypeSource, /async function loadImportedBooksIntoShelf/)
    assert.match(readerPrototypeSource, /await loadImportedPrototypeBooks\(\)/)
    assert.match(readerPrototypeSource, /const books = computed\(\(\) => \[\.\.\.importedBooks\.value,\s*\.\.\.prototypeBooks\]\)/)
    assert.match(readerPrototypeSource, /:books="books"/)
    assert.match(readerPrototypeSource, /@select-book="selectBook"/)
    assert.match(readerPrototypeSource, /@import-book="openBookImport"/)
    assert.match(readerPrototypeSource, /@delete-book="deleteImportedBook"/)
    assert.match(readerPrototypeSource, /async function deleteImportedBook/)
    assert.match(readerPrototypeSource, /await removeImportedPrototypeBook\(bookId\)/)
    assert.match(readerPrototypeSource, /<PrototypeBookImportPanel/)
    assert.match(readerPrototypeSource, /v-if="isBookImportOpen"/)
    assert.match(readerPrototypeSource, /@select-file="selectImportFile"/)
    assert.match(readerPrototypeSource, /@submit="importSelectedBookFile"/)
    assert.match(readerPrototypeSource, /@cancel="closeBookImport"/)
    assert.match(readerPrototypeSource, /await appendImportedPrototypeBook\(importedBook\)/)
    assert.match(readerPrototypeSource, /activateImportedBook\(importedBook,\s*result\.books\)/)
    assert.match(readerPrototypeSource, /activateTemporaryImportedBook\(importedBook,\s*result\.books\)/)
    assert.match(readerPrototypeSource, /已临时导入，但无法保存到本地书架/)
    assert.match(readerPrototypeSource, /activeBookId\.value\s*=\s*importedBook\.id/)
    assert.match(readerPrototypeSource, /activeChapterId\.value\s*=\s*importedBook\.chapters\[0\]\?\.id/)
    assert.doesNotMatch(readerPrototypeSource, /难度/)
    assert.doesNotMatch(readerPrototypeSource, /备注/)
  })

  it('renders a bookshelf file import action and a PDF EPUB chooser', () => {
    assert.match(sidebarSource, /import-book/)
    assert.match(sidebarSource, /select-book/)
    assert.match(sidebarSource, /delete-book/)
    assert.match(sidebarSource, /@click="\$emit\('select-book',\s*book\.id\)"/)
    assert.match(sidebarSource, /@click="\$emit\('import-book'\)"/)
    assert.match(sidebarSource, /v-if="book\.isImported"/)
    assert.match(sidebarSource, /@click\.stop="\$emit\('delete-book',\s*book\.id\)"/)
    assert.match(sidebarSource, /book-delete-button/)
    assert.match(sidebarSource, /sidebar-import-button/)
    assert.match(bookImportPanelSource, /type="file"/)
    assert.match(bookImportPanelSource, /accept="\.pdf,\.epub,application\/pdf,application\/epub\+zip"/)
    assert.match(bookImportPanelSource, /book-import-title-input/)
    assert.match(bookImportPanelSource, /defineEmits\(\[[\s\S]*'update:title'[\s\S]*'select-file'[\s\S]*'submit'[\s\S]*'cancel'[\s\S]*\]\)/)
    assert.match(prototypeStyleSource, /\.prototype-book-import-panel/)
    assert.match(prototypeStyleSource, /\.sidebar-import-button/)
    assert.match(prototypeStyleSource, /\.book-delete-button/)
    assert.doesNotMatch(bookImportPanelSource, /难度/)
    assert.doesNotMatch(bookImportPanelSource, /备注/)
  })

  it('renders a middle paste editor with textarea actions', () => {
    assert.match(pasteEditorSource, /<textarea/)
    assert.match(pasteEditorSource, /modelValue/)
    assert.match(pasteEditorSource, /paste-editor-textarea/)
    assert.match(pasteEditorSource, /paste-editor-actions/)
    assert.match(pasteEditorSource, /defineEmits\(\[[\s\S]*'update:modelValue'[\s\S]*'submit'[\s\S]*'cancel'[\s\S]*'read-clipboard'[\s\S]*\]\)/)
    assert.match(prototypeStyleSource, /\.prototype-paste-editor/)
    assert.match(prototypeStyleSource, /\.paste-editor-textarea/)
    assert.match(prototypeStyleSource, /\.paste-editor-actions/)
  })

  it('renders a prototype toolbar paste action with page-level feedback', () => {
    assert.match(topbarSource, /pasteMessage/)
    assert.match(topbarSource, /粘贴文章/)
    assert.match(topbarSource, /paste-article/)
    assert.match(topbarSource, /prototype-paste-message/)
    assert.match(topbarSource, /defineEmits\(\[[\s\S]*'paste-article'[\s\S]*\]\)/)
    assert.match(readerPrototypeSource, /:paste-message="pasteArticleMessage"/)
    assert.match(readerPrototypeSource, /:paste-message-type="pasteArticleMessageType"/)
    assert.match(prototypeStyleSource, /\.prototype-paste-message/)
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
    assert.match(readingPaperSource, /@click="handleSentenceClick\(sentence,\s*paragraph\)"/)
    assert.match(readingPaperSource, /toggleSentenceHighlight\(sentence\.id\)/)
    assert.match(readingPaperSource, /@keydown\.enter="handleSentenceClick\(sentence,\s*paragraph\)"/)
    assert.match(readingPaperSource, /@click\.stop="\$emit\('select-word'/)
  })

  it('renders inline sentence translation and manual paragraph translation controls', () => {
    assert.match(readingPaperSource, /selectedSentenceId/)
    assert.match(readingPaperSource, /sentence\.translation/)
    assert.match(readingPaperSource, /sentence\.isTranslationLoading/)
    assert.match(readingPaperSource, /sentence\.translationErrorMessage/)
    assert.match(readingPaperSource, /emit\('select-sentence',\s*\{[\s\S]*sentence[\s\S]*paragraph[\s\S]*\}\)/)
    assert.match(readingPaperSource, /\$emit\('retry-sentence-translation',\s*\{[\s\S]*sentenceId:\s*sentence\.id[\s\S]*paragraphId:\s*paragraph\.id[\s\S]*\}\)/)
    assert.match(readingPaperSource, /\$emit\('translate-paragraph',\s*paragraph\.id\)/)
    assert.match(readingPaperSource, /translate-paragraph-button/)
    assert.match(readingPaperSource, /sentence-translation-text/)
    assert.match(readingPaperSource, /handleSentenceClick\(sentence,\s*paragraph\)/)
    assert.match(readingPaperSource, /@click="handleSentenceClick\(sentence,\s*paragraph\)"/)
    assert.match(readingPaperSource, /@click\.stop="\$emit\('select-word'/)

    assert.match(prototypeStyleSource, /\.sentence-translation-text/)
    assert.match(prototypeStyleSource, /\.translate-paragraph-button/)
  })

  it('lets double click show sentence translation without breaking word clicks', () => {
    assert.match(readingPaperSource, /@dblclick="handleSentenceDoubleClick\(sentence,\s*paragraph\)"/)
    assert.match(readingPaperSource, /@dblclick\.stop="handleWordDoubleClick\(sentence,\s*paragraph\)"/)
    assert.match(readingPaperSource, /function handleSentenceDoubleClick\(sentence,\s*paragraph\)/)
    assert.match(readingPaperSource, /function handleWordDoubleClick\(sentence,\s*paragraph\)/)
    assert.match(readingPaperSource, /function selectSentence\(sentence,\s*paragraph\)/)
    assert.match(readingPaperSource, /emit\('select-sentence',\s*\{[\s\S]*sentence[\s\S]*paragraph[\s\S]*\}\)/)
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
