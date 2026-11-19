import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const readerWorkspaceSource = readFileSync(new URL('./ReaderWorkspace.vue', import.meta.url), 'utf8')
const builtInReaderDataUrl = new URL('../data/builtInReaderData.js', import.meta.url)
const builtInReaderDataSource = existsSync(builtInReaderDataUrl)
  ? readFileSync(builtInReaderDataUrl, 'utf8')
  : ''
const readerWorkspaceSelectorsUrl = new URL('../data/readerWorkspaceSelectors.js', import.meta.url)
const readerWorkspaceSelectorsSource = existsSync(readerWorkspaceSelectorsUrl)
  ? readFileSync(readerWorkspaceSelectorsUrl, 'utf8')
  : ''
const readerWorkspaceTranslationsUrl = new URL('../composables/useReaderWorkspaceTranslations.js', import.meta.url)
const readerWorkspaceTranslationsSource = existsSync(readerWorkspaceTranslationsUrl)
  ? readFileSync(readerWorkspaceTranslationsUrl, 'utf8')
  : ''
const readerWorkspaceComponentNames = [
  'ReaderWorkspaceVocabularyPanel',
  'ReaderWorkspaceBookImportPanel',
  'ReaderWorkspacePasteEditor',
  'ReaderWorkspaceReadingPaper',
  'ReaderWorkspaceSidebar',
  'ReaderWorkspaceTopbar',
]
const readingPaperSource = readFileSync(
  new URL('../components/reader-workspace/ReaderWorkspaceReadingPaper.vue', import.meta.url),
  'utf8',
)
const sidebarSource = readFileSync(
  new URL('../components/reader-workspace/ReaderWorkspaceSidebar.vue', import.meta.url),
  'utf8',
)
const wordPanelSource = readFileSync(
  new URL('../components/reader-workspace/ReaderWorkspaceVocabularyPanel.vue', import.meta.url),
  'utf8',
)
const topbarSource = readFileSync(
  new URL('../components/reader-workspace/ReaderWorkspaceTopbar.vue', import.meta.url),
  'utf8',
)
const appearanceSource = readFileSync(
  new URL('../components/reader-workspace/ReaderWorkspaceAppearance.vue', import.meta.url),
  'utf8',
)
const toolbarButtonSource = readFileSync(
  new URL('../components/reader-workspace/ReaderWorkspaceToolbarButton.vue', import.meta.url),
  'utf8',
)
const pasteEditorUrl = new URL('../components/reader-workspace/ReaderWorkspacePasteEditor.vue', import.meta.url)
const pasteEditorSource = existsSync(pasteEditorUrl)
  ? readFileSync(pasteEditorUrl, 'utf8')
  : ''
const bookImportPanelUrl = new URL('../components/reader-workspace/ReaderWorkspaceBookImportPanel.vue', import.meta.url)
const bookImportPanelSource = existsSync(bookImportPanelUrl)
  ? readFileSync(bookImportPanelUrl, 'utf8')
  : ''
const workspaceStyleSource = readFileSync(new URL('../reader-workspace.css', import.meta.url), 'utf8')

function cssBlock(selector) {
  const start = workspaceStyleSource.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} should exist`)

  const end = workspaceStyleSource.indexOf('\n}', start)
  assert.ok(end > start, `${selector} should have a closing brace`)

  return workspaceStyleSource.slice(start, end + 2)
}

describe('reader workspace word definition panel contract', () => {
  it('loads promoted workspace components from the reader-workspace component directory', () => {
    for (const componentName of readerWorkspaceComponentNames) {
      const componentUrl = new URL(`../components/reader-workspace/${componentName}.vue`, import.meta.url)
      assert.ok(existsSync(componentUrl), `${componentName}.vue should exist`)
      assert.match(
        readerWorkspaceSource,
        new RegExp(`import\\s+${componentName}\\s+from\\s+['"]\\.\\.\\/components\\/reader-workspace\\/${componentName}\\.vue['"]`),
      )
      assert.match(readerWorkspaceSource, new RegExp(`<${componentName}(\\s|>)`))
    }

    assert.match(readerWorkspaceSource, /from\s+['"]\.\.\/components\/reader-workspace\//)
    assert.doesNotMatch(readerWorkspaceSource, /from\s+['"]\.\.\/components\/reader-prototype\//)
    assert.doesNotMatch(
      readerWorkspaceSource,
      /import\s+Prototype(?:Assistant|BookImportPanel|PasteEditor|ReadingPaper|Sidebar|Topbar)\s+from/,
    )
    assert.doesNotMatch(
      readerWorkspaceSource,
      /<Prototype(?:Assistant|BookImportPanel|PasteEditor|ReadingPaper|Sidebar|Topbar)(\s|>)/,
    )
  })

  it('presents the promoted reader workspace without prototype wording in accessibility labels', () => {
    assert.match(topbarSource, /aria-label="AI Reading workspace"/)
    assert.doesNotMatch(topbarSource, /reader prototype/)
  })

  it('uses the right side as a local word definition panel instead of AI chat', () => {
    assert.match(wordPanelSource, />词典<\/h2>/)
    assert.match(wordPanelSource, /本章重点词/)
    assert.match(wordPanelSource, /点击词条查看释义/)
    assert.match(wordPanelSource, /加入生词本/)

    assert.doesNotMatch(wordPanelSource, /AI 阅读助手/)
    assert.doesNotMatch(wordPanelSource, /context-switch/)
    assert.doesNotMatch(wordPanelSource, /textarea/)
    assert.doesNotMatch(wordPanelSource, /\$emit\('send'\)/)
  })

  it('loads reader workspace reading data from a local data module', () => {
    assert.ok(existsSync(builtInReaderDataUrl), 'reader workspace data module should exist')
    assert.match(
      readerWorkspaceSource,
      /import\s*\{\s*builtInBooks,\s*builtInChapterContent,\s*builtInDictionary\s*\}\s*from\s*['"]\.\.\/data\/builtInReaderData\.js['"]/,
    )
    assert.match(builtInReaderDataSource, /export const builtInBooks\s*=/)
    assert.match(builtInReaderDataSource, /export const builtInChapterContent\s*=/)
    assert.match(builtInReaderDataSource, /export const builtInDictionary\s*=/)
    for (const chapterId of ['chapter-3', 'chapter-4', 'chapter-5', 'chapter-6']) {
      assert.match(builtInReaderDataSource, new RegExp(`'${chapterId}':\\s*\\{`))
    }

    assert.match(readerWorkspaceSource, /selectedWordKey/)
    assert.match(readerWorkspaceSource, /selectedWordEntry/)
    assert.match(readerWorkspaceSource, /selectWord/)
    assert.match(readerWorkspaceSource, /已加入生词本/)
    assert.doesNotMatch(readerWorkspaceSource, /const books\s*=\s*\[/)
    assert.doesNotMatch(readerWorkspaceSource, /const chapters\s*=\s*\[/)
    assert.doesNotMatch(readerWorkspaceSource, /const paragraphs\s*=\s*\[/)
    assert.doesNotMatch(readerWorkspaceSource, /const mockDictionary\s*=\s*\{/)
    assert.doesNotMatch(readerWorkspaceSource, /mockAiMessages/)
    assert.doesNotMatch(readerWorkspaceSource, /sendMockQuestion/)
    assert.doesNotMatch(readerWorkspaceSource, /localStorage/)
  })

  it('keeps data selection and dictionary mapping in selector helpers', () => {
    assert.ok(existsSync(readerWorkspaceSelectorsUrl), 'reader workspace selectors module should exist')
    assert.match(
      readerWorkspaceSource,
      /from\s*['"]\.\.\/data\/readerWorkspaceSelectors\.js['"]/,
    )

    for (const selectorName of [
      'findBook',
      'findBookChapterContent',
      'getChapters',
      'findChapter',
      'getChapterParagraphs',
      'getReadingProgress',
      'getChapterVocabulary',
      'getSessionVocabulary',
      'mapDictionaryEntryToWordPanel',
    ]) {
      assert.match(readerWorkspaceSource, new RegExp(selectorName))
      assert.match(readerWorkspaceSelectorsSource, new RegExp(`export function ${selectorName}`))
    }

    assert.doesNotMatch(readerWorkspaceSource, /\.find\(\(book\)/)
    assert.doesNotMatch(readerWorkspaceSource, /\.find\(\(chapter\)/)
    assert.doesNotMatch(readerWorkspaceSource, /\.map\(\(item\) => item\.zh\)/)
    assert.doesNotMatch(readerWorkspaceSource, /entry\.meanings/)
    assert.doesNotMatch(readerWorkspaceSource, /entry\.examples/)
  })

  it('renders clickable sentence tokens from structured data helpers instead of raw string matching', () => {
    assert.match(builtInReaderDataSource, /sentences:\s*\[/)
    assert.match(builtInReaderDataSource, /tokens:\s*\[/)
    assert.match(builtInReaderDataSource, /highlighted:\s*true/)

    for (const word of ['plan', 'unusually', 'observatory', 'reveal', 'copy', 'sentence']) {
      assert.match(builtInReaderDataSource, new RegExp(`wordKey:\\s*'${word}'`))
    }
    assert.match(builtInReaderDataSource, /surface:\s*'planned'[\s\S]*lemma:\s*'plan'[\s\S]*wordKey:\s*'plan'/)
    assert.match(builtInReaderDataSource, /surface:\s*'copied'[\s\S]*lemma:\s*'copy'[\s\S]*wordKey:\s*'copy'/)
    assert.doesNotMatch(builtInReaderDataSource, /wordKey:\s*'planned'/)
    assert.doesNotMatch(builtInReaderDataSource, /wordKey:\s*'copied'/)
    assert.match(builtInReaderDataSource, /builtInDictionary\s*=\s*\{[\s\S]*plan:\s*\{[\s\S]*id:\s*'plan'/)
    assert.match(builtInReaderDataSource, /builtInDictionary\s*=\s*\{[\s\S]*copy:\s*\{[\s\S]*id:\s*'copy'/)
    assert.doesNotMatch(builtInReaderDataSource, /planned:\s*\{[\s\S]*id:\s*'planned'/)
    assert.doesNotMatch(builtInReaderDataSource, /copied:\s*\{[\s\S]*id:\s*'copied'/)

    assert.match(readingPaperSource, /paragraph\.sentences/)
    assert.match(readingPaperSource, /getClickableSentenceTokens/)
    assert.match(readingPaperSource, /getClickableSentenceTokens\(sentence\)/)
    assert.match(readingPaperSource, /token\.wordKey/)
    assert.match(readingPaperSource, /word-token/)
    assert.match(readingPaperSource, /select-word/)
    assert.match(readingPaperSource, /selectedWordKey/)

    assert.doesNotMatch(readerWorkspaceSource, /:clickable-words/)
    assert.doesNotMatch(readerWorkspaceSource, /clickableWordKeys/)
    assert.doesNotMatch(readerWorkspaceSource, /textBefore/)
    assert.doesNotMatch(readerWorkspaceSource, /textAfter/)
    assert.doesNotMatch(readerWorkspaceSource, /highlight:/)
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

    assert.match(readerWorkspaceSource, /selectedWordContext/)
    assert.match(readerWorkspaceSource, /getWordContext/)
    assert.match(
      readerWorkspaceSource,
      /mapDictionaryEntryToWordPanel\(\s*builtInDictionary\[selectedWordKey\.value\],\s*selectedWordContext\.value\s*\)/,
    )
    assert.match(wordPanelSource, /word\.sourceTranslation/)
    assert.doesNotMatch(readingPaperSource, /\$emit\('select-word',\s*token\.wordKey\)/)
  })

  it('connects missing reader workspace translations to the existing AI translation endpoint', () => {
    assert.ok(existsSync(readerWorkspaceTranslationsUrl), 'reader workspace translation composable should exist')
    assert.match(
      readerWorkspaceSource,
      /import\s*\{\s*useReaderWorkspaceTranslations\s*\}\s*from\s*['"]\.\.\/composables\/useReaderWorkspaceTranslations\.js['"]/,
    )
    assert.match(readerWorkspaceTranslationsSource, /import\s*\{\s*requestTranslation\s+as\s+defaultRequestTranslation\s*\}/)
    assert.match(readerWorkspaceTranslationsSource, /getLocalParagraphTranslation/)
    assert.match(readerWorkspaceTranslationsSource, /getParagraphSourceText/)
    assert.match(readerWorkspaceTranslationsSource, /const displayParagraphs = computed/)
    assert.match(readerWorkspaceTranslationsSource, /translationByParagraphId/)
    assert.match(readerWorkspaceTranslationsSource, /translationLoadingByParagraphId/)
    assert.match(readerWorkspaceTranslationsSource, /translationErrorByParagraphId/)
    assert.match(readerWorkspaceTranslationsSource, /requestTranslation\(sourceText,\s*translationType\)/)
    assert.match(readerWorkspaceTranslationsSource, /saveCachedTranslation\(sourceText,\s*data\.translation,\s*translationType\)/)
    assert.match(readerWorkspaceSource, /useReaderWorkspaceTranslations\(\{[\s\S]*currentChapter[\s\S]*paragraphs[\s\S]*pastedChapterContent[\s\S]*\}\)/)
    assert.match(readerWorkspaceSource, /displayParagraphs/)
    assert.match(readerWorkspaceSource, /watch\(/)
    assert.match(readerWorkspaceSource, /:paragraphs="displayParagraphs"/)
    assert.match(readerWorkspaceSource, /@retry-translation="retryParagraphTranslation"/)
    assert.doesNotMatch(readerWorkspaceSource, /from\s+['"]\.\.\/api\/translate\.js['"]/)

    assert.match(readingPaperSource, /paragraph\.isTranslationLoading/)
    assert.match(readingPaperSource, /paragraph\.translationErrorMessage/)
    assert.match(readingPaperSource, /\$emit\('retry-translation',\s*paragraph\.id\)/)
    assert.match(readingPaperSource, /translation-retry-button/)
    assert.match(readingPaperSource, /translate-paragraph-button/)
  })

  it('uses typed content cache for on-demand reader workspace translations', () => {
    assert.match(readerWorkspaceTranslationsSource, /function requestCachedTranslation\(sourceText,\s*translationType,\s*options\s*=\s*\{\}\)/)
    assert.match(readerWorkspaceTranslationsSource, /const requestKey\s*=\s*createTranslationCacheKey\(sourceText,\s*translationType\)/)
    assert.match(readerWorkspaceTranslationsSource, /getCachedTranslation\(sourceText,\s*translationType\)/)
    assert.match(readerWorkspaceTranslationsSource, /saveCachedTranslation\(sourceText,\s*data\.translation,\s*translationType\)/)
    assert.match(readerWorkspaceTranslationsSource, /requestCachedTranslation\(sourceText,\s*'paragraph',\s*options\)/)
    assert.match(readerWorkspaceTranslationsSource, /requestCachedTranslation\(sourceText,\s*'sentence',\s*options\)/)
    assert.match(readerWorkspaceTranslationsSource, /loadSentenceTranslation\(sentence,\s*paragraph\)/)
    assert.match(readerWorkspaceTranslationsSource, /loadParagraphTranslation\(paragraph\)/)
    assert.match(readerWorkspaceTranslationsSource, /loadSentenceTranslation\(sentence,\s*paragraph,\s*\{\s*refresh:\s*true\s*\}\)/)
    assert.match(readerWorkspaceTranslationsSource, /loadParagraphTranslation\(paragraph,\s*\{\s*refresh:\s*true\s*\}\)/)
  })

  it('loads sentence translations on demand and keeps paragraph translation manual', () => {
    assert.match(readerWorkspaceTranslationsSource, /getLocalSentenceTranslation/)
    assert.match(readerWorkspaceTranslationsSource, /getSentenceSourceText/)
    assert.match(readerWorkspaceTranslationsSource, /createTranslationStateKey/)
    assert.match(readerWorkspaceSource, /selectedSentenceId/)
    assert.match(readerWorkspaceTranslationsSource, /translationBySentenceId/)
    assert.match(readerWorkspaceTranslationsSource, /translationLoadingBySentenceId/)
    assert.match(readerWorkspaceTranslationsSource, /translationErrorBySentenceId/)
    assert.match(readerWorkspaceTranslationsSource, /loadSentenceTranslation/)
    assert.match(readerWorkspaceSource, /selectSentence/)
    assert.match(readerWorkspaceSource, /retrySentenceTranslation/)
    assert.match(readerWorkspaceSource, /translateParagraph/)
    assert.match(readerWorkspaceSource, /:selected-sentence-id="selectedSentenceId"/)
    assert.match(readerWorkspaceSource, /@select-sentence="selectSentence"/)
    assert.match(readerWorkspaceSource, /@retry-sentence-translation="retrySentenceTranslation"/)
    assert.match(readerWorkspaceSource, /@translate-paragraph="translateParagraph"/)
    assert.doesNotMatch(readerWorkspaceSource, /function loadMissingTranslations/)
    assert.doesNotMatch(readerWorkspaceSource, /watch\(\[showTranslation,\s*currentChapterContent\]/)
  })

  it('isolates pasted article translations and ignores stale translation responses', () => {
    assert.match(readerWorkspaceSource, /pastedArticleVersion/)
    assert.match(readerWorkspaceSource, /pastedArticleVersion\.value\s*\+=\s*1/)
    assert.match(
      readerWorkspaceSource,
      /isPastedArticleActive\.value[\s\S]*pastedArticleVersion\.value/,
    )
    assert.match(readerWorkspaceTranslationsSource, /function clearTranslationState/)
    assert.match(readerWorkspaceTranslationsSource, /translationByParagraphId\.value\s*=\s*\{\}/)
    assert.match(readerWorkspaceTranslationsSource, /translationLoadingByParagraphId\.value\s*=\s*\{\}/)
    assert.match(readerWorkspaceTranslationsSource, /translationErrorByParagraphId\.value\s*=\s*\{\}/)
    assert.match(readerWorkspaceTranslationsSource, /translationBySentenceId\.value\s*=\s*\{\}/)
    assert.match(readerWorkspaceTranslationsSource, /translationLoadingBySentenceId\.value\s*=\s*\{\}/)
    assert.match(readerWorkspaceTranslationsSource, /translationErrorBySentenceId\.value\s*=\s*\{\}/)
    assert.match(readerWorkspaceTranslationsSource, /let translationRequestVersion\s*=\s*0/)
    assert.match(readerWorkspaceTranslationsSource, /translationRequestVersion\s*\+=\s*1/)
    assert.match(readerWorkspaceTranslationsSource, /paragraphRequestVersions/)
    assert.match(readerWorkspaceTranslationsSource, /sentenceRequestVersions/)
    assert.match(readerWorkspaceTranslationsSource, /paragraphRequestVersions\[paragraphStateKey\]\s*=\s*requestVersion/)
    assert.match(readerWorkspaceTranslationsSource, /sentenceRequestVersions\[sentenceStateKey\]\s*=\s*requestVersion/)
    assert.match(readerWorkspaceTranslationsSource, /paragraphRequestVersions\[paragraphStateKey\]\s*!==\s*requestVersion/)
    assert.match(readerWorkspaceTranslationsSource, /sentenceRequestVersions\[sentenceStateKey\]\s*!==\s*requestVersion/)
    assert.match(readerWorkspaceTranslationsSource, /return/)
  })

  it('connects missing reader workspace dictionary entries to the workspace word lookup endpoint and vocabulary store', () => {
    assert.match(
      readerWorkspaceSource,
      /import\s*\{\s*requestWordLookup\s*\}\s*from\s*['"]\.\.\/api\/wordLookup\.js['"]/,
    )
    assert.match(
      readerWorkspaceSource,
      /import\s*\{[\s\S]*isWordSaved[\s\S]*removeVocabularyWord[\s\S]*saveVocabularyWord[\s\S]*\}\s*from\s*['"]\.\.\/utils\/vocabulary\.js['"]/,
    )
    assert.match(readerWorkspaceSource, /mapWordLookupDetailToWordPanel/)
    assert.match(readerWorkspaceSource, /selectedWordLookupDetail/)
    assert.match(readerWorkspaceSource, /wordCache/)
    assert.match(readerWorkspaceSource, /wordRequests/)
    assert.match(readerWorkspaceSource, /getWordLookupDetail/)
    assert.match(readerWorkspaceSource, /requestWordLookup\(word\)/)
    assert.match(readerWorkspaceSource, /builtInDictionary\[selectedWordKey\.value\]/)
    assert.match(readerWorkspaceSource, /mapWordLookupDetailToWordPanel\(\s*selectedWordLookupDetail\.value,\s*selectedWordContext\.value\s*\)/)
    assert.match(readerWorkspaceSource, /saveVocabularyWord\(/)
    assert.match(readerWorkspaceSource, /removeVocabularyWord\(/)
    assert.match(readerWorkspaceSource, /isWordSaved\(/)
    assert.match(readerWorkspaceSource, /:is-word-loading="isWordLoading"/)
    assert.match(readerWorkspaceSource, /:word-error-message="wordErrorMessage"/)
    assert.match(readerWorkspaceSource, /@retry-word="retrySelectedWordLookup"/)

    assert.match(wordPanelSource, /isWordLoading/)
    assert.match(wordPanelSource, /wordErrorMessage/)
    assert.match(wordPanelSource, /loadingWord/)
    assert.match(wordPanelSource, /translation-loading/)
    assert.match(wordPanelSource, /translation-error/)
    assert.match(wordPanelSource, /\$emit\('retry-word'\)/)
    assert.match(wordPanelSource, /defineEmits\(\[[\s\S]*'retry-word'[\s\S]*\]\)/)
  })

  it('replaces the active paragraph with the paragraph that contains the selected word', () => {
    assert.match(readerWorkspaceSource, /const selectedParagraphId = computed/)
    assert.match(readerWorkspaceSource, /selectedWordContext\.value\?\.paragraphId\s*\|\|\s*null/)
    assert.match(readerWorkspaceSource, /:selected-paragraph-id="selectedParagraphId"/)

    assert.match(readingPaperSource, /selectedParagraphId/)
    assert.match(readingPaperSource, /paragraph\.id\s*===\s*selectedParagraphId/)
    assert.match(
      readingPaperSource,
      /'has-lookup':\s*paragraph\.id\s*===\s*selectedParagraphId/,
    )
    assert.doesNotMatch(readingPaperSource, /:class="\{\s*current:\s*paragraph\.active\s*\}"/)
  })

  it('shows a current chapter vocabulary list before a word is selected', () => {
    assert.match(readerWorkspaceSource, /const chapterVocabulary = computed/)
    assert.match(
      readerWorkspaceSource,
      /getChapterVocabulary\(\s*currentChapterContent\.value,\s*builtInDictionary,\s*sessionVocabularyWordKeys\.value\s*\)/,
    )
    assert.match(readerWorkspaceSource, /:vocabulary="chapterVocabulary"/)

    assert.match(wordPanelSource, /vocabulary/)
    assert.match(wordPanelSource, /chapter-vocabulary-list/)
    assert.match(wordPanelSource, /v-for="item in vocabulary"/)
    assert.match(wordPanelSource, /\$emit\('select-word',\s*item\.selection\)/)
    assert.match(wordPanelSource, /item\.word/)
    assert.match(wordPanelSource, /item\.partOfSpeech/)
    assert.match(wordPanelSource, /item\.meaning/)
    assert.match(wordPanelSource, /item\.count/)
    assert.match(wordPanelSource, /item\.isAdded/)
    assert.match(wordPanelSource, /defineEmits\(\[[\s\S]*'add-word'[\s\S]*'remove-word'[\s\S]*'select-word'[\s\S]*'retry-word'[\s\S]*'show-session-vocabulary'[\s\S]*\]\)/)
    assert.match(workspaceStyleSource, /\.chapter-vocabulary-list/)
    assert.match(workspaceStyleSource, /\.chapter-vocabulary-item/)

    assert.doesNotMatch(wordPanelSource, /planned、unusually、observatory、reveal、copied、sentence/)
  })

  it('shows the session vocabulary while saving words through the existing vocabulary store', () => {
    assert.match(readerWorkspaceSource, /const sessionVocabulary = computed/)
    assert.match(
      readerWorkspaceSource,
      /getSessionVocabulary\(\s*currentChapterContent\.value,\s*builtInDictionary,\s*sessionVocabularyWordKeys\.value\s*\)/,
    )
    assert.match(readerWorkspaceSource, /:session-vocabulary="sessionVocabulary"/)
    assert.match(readerWorkspaceSource, /@remove-word="removeWordFromVocabulary"/)
    assert.match(readerWorkspaceSource, /@show-session-vocabulary="clearSelectedWord"/)
    assert.match(readerWorkspaceSource, /function removeWordFromVocabulary/)
    assert.match(readerWorkspaceSource, /function clearSelectedWord/)
    assert.match(readerWorkspaceSource, /saveVocabularyWord\(/)
    assert.match(readerWorkspaceSource, /removeVocabularyWord\(/)
    assert.doesNotMatch(readerWorkspaceSource, /localStorage/)

    assert.match(wordPanelSource, /sessionVocabulary/)
    assert.match(wordPanelSource, /本地生词本/)
    assert.match(wordPanelSource, /本轮还没有加入生词/)
    assert.match(wordPanelSource, /session-vocabulary-list/)
    assert.match(wordPanelSource, /v-for="item in sessionVocabulary"/)
    assert.match(wordPanelSource, /\$emit\('select-word',\s*item\.selection\)/)
    assert.match(wordPanelSource, /\$emit\('remove-word',\s*item\.wordKey\)/)
    assert.match(wordPanelSource, /查看本地生词本/)
    assert.match(wordPanelSource, /移出生词本/)
    assert.match(wordPanelSource, /defineEmits\(\[[\s\S]*'add-word'[\s\S]*'remove-word'[\s\S]*'select-word'[\s\S]*'retry-word'[\s\S]*'show-session-vocabulary'[\s\S]*\]\)/)
    assert.match(workspaceStyleSource, /\.session-vocabulary-list/)
    assert.match(workspaceStyleSource, /\.session-vocabulary-remove/)
  })

  it('removes decorative reading and dictionary labels from the reader workspace', () => {
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

    assert.doesNotMatch(readerWorkspaceSource, /P01|P02|P03/)
    assert.doesNotMatch(readerWorkspaceSource, /当前句|难度 B1|2 个生词|长句|收藏段|收束段|复习 1 词/)
    assert.doesNotMatch(readerWorkspaceSource, /阅读词汇|高频词|副词/)

    assert.doesNotMatch(workspaceStyleSource, /\.reading-status/)
    assert.doesNotMatch(workspaceStyleSource, /\.paragraph-meta/)
    assert.doesNotMatch(workspaceStyleSource, /\.learning-tags/)
    assert.doesNotMatch(workspaceStyleSource, /\.word-tags/)
  })

  it('does not render the obsolete floating notes bar in the reader workspace', () => {
    assert.doesNotMatch(readerWorkspaceSource, /PrototypeFloatingNotes/)
    assert.doesNotMatch(readerWorkspaceSource, /addMockNote/)
    assert.doesNotMatch(readerWorkspaceSource, /const notes/)
    assert.doesNotMatch(readerWorkspaceSource, /nextNoteId/)

    assert.doesNotMatch(workspaceStyleSource, /\.floating-notes/)
    assert.doesNotMatch(workspaceStyleSource, /\.notes-tabs/)
    assert.doesNotMatch(workspaceStyleSource, /\.notes-tab/)
    assert.doesNotMatch(workspaceStyleSource, /\.note-content/)
    assert.doesNotMatch(workspaceStyleSource, /\.notes-list/)
  })

  it('keeps the reader workspace toolbar focused on reading display controls only', () => {
    assert.match(topbarSource, /toolstrip-shell/)
    assert.match(topbarSource, /<strong>Reading<\/strong>/)
    assert.match(topbarSource, /toolstrip-group reading-group/)
    assert.match(topbarSource, /<ReaderWorkspaceAppearance\s+:font-size="fontSize"/)
    assert.match(appearanceSource, /aria-label="正文字号"/)
    assert.match(appearanceSource, /type="radio"\s+name="app-theme"/)
    assert.match(topbarSource, /:aria-pressed="isFocusMode"/)
    assert.match(topbarSource, /:aria-controls="isSidebarOpen \? 'workspace-directory'/)
    assert.match(topbarSource, /:aria-controls="isDictionaryOpen \? 'workspace-dictionary'/)
    assert.equal((topbarSource.match(/<ReaderWorkspaceToolbarButton\b/g) || []).length, 6)
    assert.match(appearanceSource, /icon="case-sensitive"/)
    assert.match(toolbarButtonSource, /:aria-label="label"/)
    assert.match(toolbarButtonSource, /<svg\s+aria-hidden="true"/)
    assert.match(toolbarButtonSource, /stroke="currentColor"/)
    assert.match(toolbarButtonSource, /:focus-visible\s*\+\s*\.reader-toolbar-tooltip/)
    assert.doesNotMatch(topbarSource, /✦/)
    assert.doesNotMatch(topbarSource, /toolstrip-group font-group/)
    assert.doesNotMatch(topbarSource, /生词/)
    assert.doesNotMatch(topbarSource, /A-/)
    assert.doesNotMatch(topbarSource, /A\+/)
    assert.doesNotMatch(topbarSource, /disabled/)
    assert.doesNotMatch(topbarSource, /compact/)
    assert.doesNotMatch(topbarSource, /笔记/)
    assert.doesNotMatch(topbarSource, /toggle-note-panel/)
    assert.doesNotMatch(readerWorkspaceSource, /showNoteHint/)
    assert.doesNotMatch(readerWorkspaceSource, /noteToolTouched/)

    assert.doesNotMatch(topbarSource, /toolstrip-group nav-group/)
    assert.doesNotMatch(topbarSource, /段落导航/)
    assert.doesNotMatch(topbarSource, /上一段/)
    assert.doesNotMatch(topbarSource, /下一段/)
    assert.doesNotMatch(topbarSource, /go-previous-paragraph/)
    assert.doesNotMatch(topbarSource, /go-next-paragraph/)
    assert.doesNotMatch(topbarSource, /canGoPreviousParagraph/)
    assert.doesNotMatch(topbarSource, /canGoNextParagraph/)
    assert.doesNotMatch(readerWorkspaceSource, /goToPreviousParagraph/)
    assert.doesNotMatch(readerWorkspaceSource, /goToNextParagraph/)
    assert.doesNotMatch(readerWorkspaceSource, /activeParagraphId/)
    assert.doesNotMatch(readerWorkspaceSource, /displayParagraphs\s*=\s*computed\(\(\)\s*=>\s*activeParagraph/)
    assert.doesNotMatch(readerWorkspaceSource, /activeParagraphIndex/)
    assert.doesNotMatch(readerWorkspaceSource, /canGoPreviousParagraph/)
    assert.doesNotMatch(readerWorkspaceSource, /canGoNextParagraph/)
  })

  it('removes unused top-right action buttons from the reader workspace toolbar', () => {
    assert.doesNotMatch(topbarSource, /workspace-actions/)
    assert.doesNotMatch(topbarSource, /workspace-action-button/)
    assert.doesNotMatch(topbarSource, /workspace-avatar/)
    assert.doesNotMatch(topbarSource, /搜索/)
    assert.doesNotMatch(topbarSource, /导入文本/)
    assert.doesNotMatch(topbarSource, /设置/)

    assert.doesNotMatch(workspaceStyleSource, /\.workspace-actions/)
    assert.doesNotMatch(workspaceStyleSource, /\.workspace-action-button/)
    assert.doesNotMatch(workspaceStyleSource, /\.workspace-avatar/)
  })

  it('styles selected word tokens and dictionary details without chat UI emphasis', () => {
    assert.match(workspaceStyleSource, /\.sentence-highlight-yellow\s*\{[\s\S]*rgba\(249, 216, 102/)
    assert.match(workspaceStyleSource, /\.word-token\s*\{[\s\S]*border-bottom/)
    assert.match(workspaceStyleSource, /\.word-token\s*\{[\s\S]*color:\s*inherit/)
    assert.match(workspaceStyleSource, /\.word-token:hover\s*\{[\s\S]*background:\s*var\(--workspace-surface-muted\)/)
    assert.match(workspaceStyleSource, /\.word-token\.selected\s*\{[\s\S]*background:\s*var\(--workspace-accent-soft\)/)
    assert.match(workspaceStyleSource, /\.sentence-highlight \.word-token\.selected/)
    assert.match(workspaceStyleSource, /\.workspace-vocabulary-panel/)
    assert.match(wordPanelSource, /word\.exampleTranslation/)
    assert.match(wordPanelSource, /word\.forms/)
    assert.match(wordPanelSource, /word-example-translation/)
    assert.match(wordPanelSource, /word-form-list/)
    assert.match(workspaceStyleSource, /\.word-detail-list div\s*\{[\s\S]*border-top/)
    assert.match(workspaceStyleSource, /\.word-example-translation\s*\{[\s\S]*color:\s*var\(--workspace-muted\)/)
    assert.match(workspaceStyleSource, /\.word-form-list\s*\{[\s\S]*display:\s*flex/)
    assert.match(workspaceStyleSource, /\.word-form-list span\s*\{[\s\S]*border:\s*1px solid var\(--workspace-border\)/)
    assert.match(workspaceStyleSource, /\.vocabulary-button/)
    assert.doesNotMatch(cssBlock('.vocabulary-message'), /border:/)
    assert.doesNotMatch(cssBlock('.vocabulary-message'), /background:/)
    assert.doesNotMatch(workspaceStyleSource, /\.assistant-input-box/)
  })

  it('keeps the reading column constrained and the dictionary closed by default', () => {
    assert.match(cssBlock('.workspace-reading-paper'), /width:\s*min\(100%, 680px\)/)
    assert.match(cssBlock('.english-text'), /font-size:\s*var\(--workspace-font-size/)
    assert.match(cssBlock('.workspace-layout'), /--dictionary-track:\s*0px/)
    assert.match(cssBlock('.workspace-layout.has-dictionary'), /--dictionary-track:\s*300px/)
    assert.match(workspaceStyleSource, /@media \(width < 1041px\)[\s\S]*\.workspace-vocabulary-panel\s*\{\s*position:\s*fixed/)
    assert.match(wordPanelSource, /aria-modal/)
    assert.match(wordPanelSource, /:aria-pressed="isPinned"/)
    assert.match(readerWorkspaceSource, /const isDictionaryOpen = ref\(false\)/)
    assert.match(readerWorkspaceSource, /isDictionaryPinned\.value = false/)
  })

  it('wires reader workspace highlighter state through the page', () => {
    assert.match(readerWorkspaceSource, /highlightColors/)
    assert.match(readerWorkspaceSource, /isHighlightMode/)
    assert.match(readerWorkspaceSource, /activeHighlightColorId/)
    assert.match(readerWorkspaceSource, /isHighlightClearMode/)
    assert.match(readerWorkspaceSource, /sentenceHighlightsByChapter/)
    assert.match(readerWorkspaceSource, /currentChapterHighlights/)
    assert.match(readerWorkspaceSource, /getDefaultHighlights/)
    assert.match(readerWorkspaceSource, /getChapterHighlights/)
    assert.match(readerWorkspaceSource, /toggleSentenceHighlight/)
    assert.match(readerWorkspaceSource, /removeSentenceHighlight/)
    assert.match(readerWorkspaceSource, /:highlight-colors="highlightColors"/)
    assert.match(readerWorkspaceSource, /:is-highlight-mode="isHighlightMode"/)
    assert.match(readerWorkspaceSource, /:active-highlight-color-id="activeHighlightColorId"/)
    assert.match(readerWorkspaceSource, /:is-highlight-clear-mode="isHighlightClearMode"/)
    assert.match(readerWorkspaceSource, /:sentence-highlights="currentChapterHighlights"/)
    assert.match(readerWorkspaceSource, /@toggle-highlight-mode="toggleHighlightMode"/)
    assert.match(readerWorkspaceSource, /@select-highlight-color="selectHighlightColor"/)
    assert.match(readerWorkspaceSource, /@select-highlight-clear="selectHighlightClear"/)
    assert.match(readerWorkspaceSource, /@toggle-sentence-highlight="handleSentenceHighlightToggle"/)
    assert.doesNotMatch(readerWorkspaceSource, /localStorage/)
  })

  it('renders an empty book state instead of falling back to stale chapter content', () => {
    assert.match(readerWorkspaceSource, /findBookChapterContent/)
    assert.match(
      readerWorkspaceSource,
      /findBookChapterContent\([\s\S]*chapterContentById\.value,[\s\S]*currentBook\.value,[\s\S]*activeChapterId\.value,[\s\S]*fallbackChapterId,[\s\S]*\)/,
    )
    assert.match(readerWorkspaceSource, /v-else-if="isReaderReady && currentChapter"/)
    assert.match(readerWorkspaceSource, /workspace-empty-book/)
    assert.match(readerWorkspaceSource, /getChapters\(currentBook\.value\)/)
    assert.match(workspaceStyleSource, /\.workspace-empty-book/)
    assert.doesNotMatch(
      readerWorkspaceSource,
      /findChapterContent\(\s*chapterContentById\.value,\s*activeChapterId\.value,\s*fallbackChapterId\s*\)/,
    )
    assert.match(topbarSource, /v-if="chapter"/)
    assert.match(topbarSource, /chapter:\s*\{[\s\S]*default:\s*null/)
  })

  it('wires pasted article mode into the reader workspace instead of the legacy reader route', () => {
    assert.ok(existsSync(pasteEditorUrl), 'paste editor should render inside the reader workspace area')
    assert.match(readerWorkspaceSource, /import\s+ReaderWorkspacePasteEditor\s+from\s+['"]\.\.\/components\/reader-workspace\/ReaderWorkspacePasteEditor\.vue['"]/)
    assert.match(readerWorkspaceSource, /readClipboardText/)
    assert.match(readerWorkspaceSource, /createPastedChapterContent/)
    assert.match(readerWorkspaceSource, /pastedChapterContent/)
    assert.match(readerWorkspaceSource, /isPastedArticleActive/)
    assert.match(readerWorkspaceSource, /sidebarActiveChapterId/)
    assert.match(readerWorkspaceSource, /:active-chapter-id="sidebarActiveChapterId"/)
    assert.match(readerWorkspaceSource, /isPasteEditorOpen/)
    assert.match(readerWorkspaceSource, /pasteDraft/)
    assert.match(readerWorkspaceSource, /openPasteEditor/)
    assert.match(readerWorkspaceSource, /closePasteEditor/)
    assert.match(readerWorkspaceSource, /submitPastedArticle/)
    assert.match(readerWorkspaceSource, /readClipboardIntoDraft/)
    assert.match(readerWorkspaceSource, /<ReaderWorkspacePasteEditor/)
    assert.match(readerWorkspaceSource, /v-else-if="isPasteEditorOpen"/)
    assert.match(readerWorkspaceSource, /v-model="pasteDraft"/)
    assert.match(readerWorkspaceSource, /@submit="submitPastedArticle"/)
    assert.match(readerWorkspaceSource, /@cancel="closePasteEditor"/)
    assert.match(readerWorkspaceSource, /@read-clipboard="readClipboardIntoDraft"/)
    assert.match(readerWorkspaceSource, /@paste-article="openPasteEditor"/)
    assert.doesNotMatch(readerWorkspaceSource, /@paste-article="pasteArticle"/)
    assert.match(readerWorkspaceSource, /const chapters = computed\(\(\) => getChapters\(currentBook\.value\)\)/)
    assert.doesNotMatch(readerWorkspaceSource, /const baseChapters = getChapters/)
    assert.doesNotMatch(readerWorkspaceSource, /\.\.\.baseChapters/)
    assert.doesNotMatch(readerWorkspaceSource, /activeChapterId\.value\s*=\s*pastedChapter\.id/)
    assert.match(readerWorkspaceSource, /isPastedArticleActive\.value\s*=\s*true/)
    assert.match(readerWorkspaceSource, /isPastedArticleActive\.value\s*=\s*false/)
    assert.match(readerWorkspaceSource, /currentChapterContent = computed/)
    assert.match(readerWorkspaceSource, /pastedChapterContent\.value/)
    assert.doesNotMatch(readerWorkspaceSource, /router\.push/)
    assert.doesNotMatch(readerWorkspaceSource, /path:\s*['"]\/reader['"]/)
    assert.doesNotMatch(readerWorkspaceSource, /to=['"]\/reader['"]/)
    assert.doesNotMatch(readerWorkspaceSource, /localStorage/)
  })

  it('wires PDF and EPUB file imports into the real reader workspace bookshelf', () => {
    assert.ok(existsSync(bookImportPanelUrl), 'book import panel should exist')
    assert.match(readerWorkspaceSource, /import\s+ReaderWorkspaceBookImportPanel\s+from\s+['"]\.\.\/components\/reader-workspace\/ReaderWorkspaceBookImportPanel\.vue['"]/)
    assert.match(readerWorkspaceSource, /parseBookFile/)
    assert.match(readerWorkspaceSource, /createImportedBookFromText/)
    assert.match(readerWorkspaceSource, /loadImportedBooks/)
    assert.match(readerWorkspaceSource, /appendImportedBook/)
    assert.match(readerWorkspaceSource, /removeImportedBook/)
    assert.match(readerWorkspaceSource, /getImportedChapterContentById/)
    assert.match(readerWorkspaceSource, /const importedBooks = ref\(\[\]\)/)
    assert.match(readerWorkspaceSource, /loadImportedBooksIntoShelf\(\)/)
    assert.match(readerWorkspaceSource, /async function loadImportedBooksIntoShelf/)
    assert.match(readerWorkspaceSource, /await Promise\.all\(\[loadImportedBooks\(\), progress\.loadCoverage\(\)\]\)/)
    assert.match(readerWorkspaceSource, /const books = computed\(\(\) => \[\.\.\.importedBooks\.value,\s*\.\.\.builtInBooks\]\)/)
    assert.match(readerWorkspaceSource, /:books="books"/)
    assert.match(readerWorkspaceSource, /@select-book="selectBook"/)
    assert.match(readerWorkspaceSource, /@import-book="openBookImport"/)
    assert.match(readerWorkspaceSource, /@delete-book="deleteImportedBook"/)
    assert.match(readerWorkspaceSource, /async function deleteImportedBook/)
    assert.match(readerWorkspaceSource, /await removeImportedBook\(bookId\)/)
    assert.match(readerWorkspaceSource, /<ReaderWorkspaceBookImportPanel/)
    assert.match(readerWorkspaceSource, /v-if="isBookImportOpen"/)
    assert.match(readerWorkspaceSource, /@select-file="selectImportFile"/)
    assert.match(readerWorkspaceSource, /@submit="importSelectedBookFile"/)
    assert.match(readerWorkspaceSource, /@cancel="closeBookImport"/)
    assert.match(readerWorkspaceSource, /await appendImportedBook\(importedBook\)/)
    assert.match(readerWorkspaceSource, /activateImportedBook\(importedBook,\s*result\.books\)/)
    assert.match(readerWorkspaceSource, /activateTemporaryImportedBook\(importedBook,\s*result\.books\)/)
    assert.match(readerWorkspaceSource, /已临时导入，但无法保存到本地书架/)
    assert.match(readerWorkspaceSource, /activeBookId\.value\s*=\s*importedBook\.id/)
    assert.match(readerWorkspaceSource, /activeChapterId\.value\s*=\s*progress\.getResumeChapterId\(importedBook\)/)
    assert.doesNotMatch(readerWorkspaceSource, /难度/)
    assert.doesNotMatch(readerWorkspaceSource, /备注/)
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
    assert.match(workspaceStyleSource, /\.workspace-book-import-panel/)
    assert.match(workspaceStyleSource, /\.sidebar-import-button/)
    assert.match(workspaceStyleSource, /\.book-delete-button/)
    assert.doesNotMatch(bookImportPanelSource, /难度/)
    assert.doesNotMatch(bookImportPanelSource, /备注/)
  })

  it('renders a middle paste editor with textarea actions', () => {
    assert.match(pasteEditorSource, /<textarea/)
    assert.match(pasteEditorSource, /modelValue/)
    assert.match(pasteEditorSource, /paste-editor-textarea/)
    assert.match(pasteEditorSource, /paste-editor-actions/)
    assert.match(pasteEditorSource, /defineEmits\(\[[\s\S]*'update:modelValue'[\s\S]*'submit'[\s\S]*'cancel'[\s\S]*'read-clipboard'[\s\S]*\]\)/)
    assert.match(workspaceStyleSource, /\.workspace-paste-editor/)
    assert.match(workspaceStyleSource, /\.paste-editor-textarea/)
    assert.match(workspaceStyleSource, /\.paste-editor-actions/)
  })

  it('renders a reader workspace toolbar paste action with page-level feedback', () => {
    assert.match(topbarSource, /pasteMessage/)
    assert.match(topbarSource, /粘贴文章/)
    assert.match(topbarSource, /paste-article/)
    assert.match(topbarSource, /workspace-paste-message/)
    assert.match(topbarSource, /defineEmits\(\[[\s\S]*'paste-article'[\s\S]*\]\)/)
    assert.match(readerWorkspaceSource, /:paste-message="pasteArticleMessage"/)
    assert.match(readerWorkspaceSource, /:paste-message-type="pasteArticleMessageType"/)
    assert.match(workspaceStyleSource, /\.workspace-paste-message/)
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
    assert.match(readingPaperSource, /@keydown\.enter\.self="handleSentenceClick\(sentence,\s*paragraph\)"/)
    assert.match(readingPaperSource, /@click\.stop="\$emit\('select-word'/)
  })

  it('renders inline sentence translation and manual paragraph translation controls', () => {
    assert.match(readingPaperSource, /selectedSentenceId/)
    assert.match(readingPaperSource, /sentence\.translation/)
    assert.match(readingPaperSource, /sentence\.isTranslationLoading/)
    assert.match(readingPaperSource, /sentence\.translationErrorMessage/)
    assert.match(readingPaperSource, /emit\('select-sentence',\s*\{[\s\S]*sentence[\s\S]*paragraph[\s\S]*\}\)/)
    assert.match(readingPaperSource, /\$emit\('retry-sentence-translation',\s*\{[\s\S]*sentenceId:\s*sentence\.id[\s\S]*paragraphId:\s*paragraph\.id[\s\S]*\}\)/)
    assert.match(readingPaperSource, /emit\('translate-paragraph',\s*paragraph\.id\)/)
    assert.match(readingPaperSource, /translate-paragraph-button/)
    assert.match(readingPaperSource, /sentence-translation-text/)
    assert.match(readingPaperSource, /handleSentenceClick\(sentence,\s*paragraph\)/)
    assert.match(readingPaperSource, /@click="handleSentenceClick\(sentence,\s*paragraph\)"/)
    assert.match(readingPaperSource, /@click\.stop="\$emit\('select-word'/)

    assert.match(workspaceStyleSource, /\.sentence-translation-text/)
    assert.match(workspaceStyleSource, /\.translate-paragraph-button/)
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

  it('styles reader workspace highlighter controls and color variants', () => {
    assert.match(workspaceStyleSource, /\.highlight-color-swatches/)
    assert.match(workspaceStyleSource, /\.highlight-color-button/)
    assert.match(workspaceStyleSource, /\.highlight-clear-button/)
    assert.match(workspaceStyleSource, /\.sentence-highlight-yellow/)
    assert.match(workspaceStyleSource, /\.sentence-highlight-green/)
    assert.match(workspaceStyleSource, /\.sentence-highlight-blue/)
    assert.match(workspaceStyleSource, /\.sentence-highlight-pink/)
    assert.match(workspaceStyleSource, /\.sentence-highlight-purple/)
    assert.match(workspaceStyleSource, /\.sentence-highlight\.is-highlight-mode/)
  })
})
