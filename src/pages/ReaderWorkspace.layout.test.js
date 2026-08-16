import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const readerWorkspaceSource = readFileSync(new URL('./ReaderWorkspace.vue', import.meta.url), 'utf8')
const readerPrototypeWrapperSource = readFileSync(new URL('./ReaderPrototype.vue', import.meta.url), 'utf8')
const readerPrototypeDataUrl = new URL('../data/readerPrototypeData.js', import.meta.url)
const readerPrototypeDataSource = existsSync(readerPrototypeDataUrl)
  ? readFileSync(readerPrototypeDataUrl, 'utf8')
  : ''
const readerPrototypeSelectorsUrl = new URL('../data/readerPrototypeSelectors.js', import.meta.url)
const readerPrototypeSelectorsSource = existsSync(readerPrototypeSelectorsUrl)
  ? readFileSync(readerPrototypeSelectorsUrl, 'utf8')
  : ''
const readerWorkspaceTranslationsUrl = new URL('../composables/useReaderWorkspaceTranslations.js', import.meta.url)
const readerWorkspaceTranslationsSource = existsSync(readerWorkspaceTranslationsUrl)
  ? readFileSync(readerWorkspaceTranslationsUrl, 'utf8')
  : ''
const readerWorkspaceComponentNames = [
  'ReaderWorkspaceAssistant',
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
  new URL('../components/reader-workspace/ReaderWorkspaceAssistant.vue', import.meta.url),
  'utf8',
)
const topbarSource = readFileSync(
  new URL('../components/reader-workspace/ReaderWorkspaceTopbar.vue', import.meta.url),
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
const prototypeStyleSource = readFileSync(new URL('../reader-prototype.css', import.meta.url), 'utf8')

function cssBlock(selector) {
  const start = prototypeStyleSource.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} should exist`)

  const end = prototypeStyleSource.indexOf('\n}', start)
  assert.ok(end > start, `${selector} should have a closing brace`)

  return prototypeStyleSource.slice(start, end + 2)
}

describe('reader prototype compatibility entry', () => {
  it('wraps the promoted reader workspace implementation', () => {
    assert.match(readerPrototypeWrapperSource, /<ReaderWorkspace\s*\/>/)
    assert.match(readerPrototypeWrapperSource, /import\s+ReaderWorkspace\s+from\s+['"]\.\/ReaderWorkspace\.vue['"]/)
    assert.doesNotMatch(readerPrototypeWrapperSource, /ReaderWorkspaceTopbar/)
    assert.doesNotMatch(readerPrototypeWrapperSource, /reader-prototype/)
  })
})

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
    assert.match(wordPanelSource, /单词释义/)
    assert.match(wordPanelSource, /本章重点词/)
    assert.match(wordPanelSource, /点击词条查看释义/)
    assert.match(wordPanelSource, /加入生词本/)

    assert.doesNotMatch(wordPanelSource, /AI 阅读助手/)
    assert.doesNotMatch(wordPanelSource, /context-switch/)
    assert.doesNotMatch(wordPanelSource, /textarea/)
    assert.doesNotMatch(wordPanelSource, /\$emit\('send'\)/)
  })

  it('loads reader workspace reading data from a local data module', () => {
    assert.ok(existsSync(readerPrototypeDataUrl), 'reader workspace data module should exist')
    assert.match(
      readerWorkspaceSource,
      /import\s*\{\s*prototypeBooks,\s*prototypeChapterContent,\s*prototypeDictionary\s*\}\s*from\s*['"]\.\.\/data\/readerPrototypeData\.js['"]/,
    )
    assert.match(readerPrototypeDataSource, /export const prototypeBooks\s*=/)
    assert.match(readerPrototypeDataSource, /export const prototypeChapterContent\s*=/)
    assert.match(readerPrototypeDataSource, /export const prototypeDictionary\s*=/)
    for (const chapterId of ['chapter-3', 'chapter-4', 'chapter-5', 'chapter-6']) {
      assert.match(readerPrototypeDataSource, new RegExp(`'${chapterId}':\\s*\\{`))
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
    assert.ok(existsSync(readerPrototypeSelectorsUrl), 'reader workspace selectors module should exist')
    assert.match(
      readerWorkspaceSource,
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
      assert.match(readerWorkspaceSource, new RegExp(selectorName))
      assert.match(readerPrototypeSelectorsSource, new RegExp(`export function ${selectorName}`))
    }

    assert.doesNotMatch(readerWorkspaceSource, /\.find\(\(book\)/)
    assert.doesNotMatch(readerWorkspaceSource, /\.find\(\(chapter\)/)
    assert.doesNotMatch(readerWorkspaceSource, /\.map\(\(item\) => item\.zh\)/)
    assert.doesNotMatch(readerWorkspaceSource, /entry\.meanings/)
    assert.doesNotMatch(readerWorkspaceSource, /entry\.examples/)
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
    assert.match(readerWorkspaceSource, /getPrototypeWordContext/)
    assert.match(
      readerWorkspaceSource,
      /mapDictionaryEntryToWordPanel\(\s*prototypeDictionary\[selectedWordKey\.value\],\s*selectedWordContext\.value\s*\)/,
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
    assert.match(readerWorkspaceTranslationsSource, /getPrototypeLocalParagraphTranslation/)
    assert.match(readerWorkspaceTranslationsSource, /getPrototypeParagraphSourceText/)
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
    assert.match(readerWorkspaceSource, /@retry-translation="retryPrototypeTranslation"/)
    assert.doesNotMatch(readerWorkspaceSource, /from\s+['"]\.\.\/api\/translate\.js['"]/)

    assert.match(readingPaperSource, /paragraph\.isTranslationLoading/)
    assert.match(readingPaperSource, /paragraph\.translationErrorMessage/)
    assert.match(readingPaperSource, /\$emit\('retry-translation',\s*paragraph\.id\)/)
    assert.match(readingPaperSource, /translation-retry-button/)
    assert.match(readingPaperSource, /translate-paragraph-button/)
  })

  it('uses typed content cache for on-demand reader workspace translations', () => {
    assert.match(readerWorkspaceTranslationsSource, /function getPrototypeTranslation\(sourceText,\s*translationType,\s*options\s*=\s*\{\}\)/)
    assert.match(readerWorkspaceTranslationsSource, /const requestKey\s*=\s*createTranslationCacheKey\(sourceText,\s*translationType\)/)
    assert.match(readerWorkspaceTranslationsSource, /getCachedTranslation\(sourceText,\s*translationType\)/)
    assert.match(readerWorkspaceTranslationsSource, /saveCachedTranslation\(sourceText,\s*data\.translation,\s*translationType\)/)
    assert.match(readerWorkspaceTranslationsSource, /getPrototypeTranslation\(sourceText,\s*'paragraph',\s*options\)/)
    assert.match(readerWorkspaceTranslationsSource, /getPrototypeTranslation\(sourceText,\s*'sentence',\s*options\)/)
    assert.match(readerWorkspaceTranslationsSource, /loadPrototypeSentenceTranslation\(sentence,\s*paragraph\)/)
    assert.match(readerWorkspaceTranslationsSource, /loadPrototypeParagraphTranslation\(paragraph\)/)
    assert.match(readerWorkspaceTranslationsSource, /loadPrototypeSentenceTranslation\(sentence,\s*paragraph,\s*\{\s*refresh:\s*true\s*\}\)/)
    assert.match(readerWorkspaceTranslationsSource, /loadPrototypeParagraphTranslation\(paragraph,\s*\{\s*refresh:\s*true\s*\}\)/)
  })

  it('loads sentence translations on demand and keeps paragraph translation manual', () => {
    assert.match(readerWorkspaceTranslationsSource, /getPrototypeLocalSentenceTranslation/)
    assert.match(readerWorkspaceTranslationsSource, /getPrototypeSentenceSourceText/)
    assert.match(readerWorkspaceTranslationsSource, /getPrototypeTranslationStateKey/)
    assert.match(readerWorkspaceSource, /selectedSentenceId/)
    assert.match(readerWorkspaceTranslationsSource, /translationBySentenceId/)
    assert.match(readerWorkspaceTranslationsSource, /translationLoadingBySentenceId/)
    assert.match(readerWorkspaceTranslationsSource, /translationErrorBySentenceId/)
    assert.match(readerWorkspaceTranslationsSource, /loadPrototypeSentenceTranslation/)
    assert.match(readerWorkspaceSource, /selectPrototypeSentence/)
    assert.match(readerWorkspaceSource, /retryPrototypeSentenceTranslation/)
    assert.match(readerWorkspaceSource, /translatePrototypeParagraph/)
    assert.match(readerWorkspaceSource, /:selected-sentence-id="selectedSentenceId"/)
    assert.match(readerWorkspaceSource, /@select-sentence="selectPrototypeSentence"/)
    assert.match(readerWorkspaceSource, /@retry-sentence-translation="retryPrototypeSentenceTranslation"/)
    assert.match(readerWorkspaceSource, /@translate-paragraph="translatePrototypeParagraph"/)
    assert.doesNotMatch(readerWorkspaceSource, /function loadMissingPrototypeTranslations/)
    assert.doesNotMatch(readerWorkspaceSource, /watch\(\[showTranslation,\s*currentChapterContent\]/)
  })

  it('isolates pasted article translations and ignores stale translation responses', () => {
    assert.match(readerWorkspaceSource, /pastedArticleVersion/)
    assert.match(readerWorkspaceSource, /pastedArticleVersion\.value\s*\+=\s*1/)
    assert.match(
      readerWorkspaceSource,
      /isPastedArticleActive\.value[\s\S]*pastedArticleVersion\.value/,
    )
    assert.match(readerWorkspaceTranslationsSource, /function clearPrototypeTranslationState/)
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
      /import\s*\{\s*requestPrototypeWordExplanation\s*\}\s*from\s*['"]\.\.\/api\/prototypeWord\.js['"]/,
    )
    assert.match(
      readerWorkspaceSource,
      /import\s*\{[\s\S]*isWordSaved[\s\S]*removeVocabularyWord[\s\S]*saveVocabularyWord[\s\S]*\}\s*from\s*['"]\.\.\/utils\/vocabulary\.js['"]/,
    )
    assert.match(readerWorkspaceSource, /mapAiWordDetailToWordPanel/)
    assert.match(readerWorkspaceSource, /selectedAiWordEntry/)
    assert.match(readerWorkspaceSource, /wordCache/)
    assert.match(readerWorkspaceSource, /wordRequests/)
    assert.match(readerWorkspaceSource, /getAiWordDetail/)
    assert.match(readerWorkspaceSource, /requestPrototypeWordExplanation\(word\)/)
    assert.match(readerWorkspaceSource, /prototypeDictionary\[selectedWordKey\.value\]/)
    assert.match(readerWorkspaceSource, /mapAiWordDetailToWordPanel\(\s*selectedAiWordEntry\.value,\s*selectedWordContext\.value\s*\)/)
    assert.match(readerWorkspaceSource, /saveVocabularyWord\(/)
    assert.match(readerWorkspaceSource, /removeVocabularyWord\(/)
    assert.match(readerWorkspaceSource, /isWordSaved\(/)
    assert.match(readerWorkspaceSource, /:is-word-loading="isWordLoading"/)
    assert.match(readerWorkspaceSource, /:word-error-message="wordErrorMessage"/)
    assert.match(readerWorkspaceSource, /@retry-word="retrySelectedPrototypeWord"/)

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
      /selectedParagraphId\s*\?\s*paragraph\.id\s*===\s*selectedParagraphId\s*:\s*paragraph\.active/,
    )
    assert.doesNotMatch(readingPaperSource, /:class="\{\s*current:\s*paragraph\.active\s*\}"/)
  })

  it('shows a current chapter vocabulary list before a word is selected', () => {
    assert.match(readerWorkspaceSource, /const chapterVocabulary = computed/)
    assert.match(
      readerWorkspaceSource,
      /getPrototypeChapterVocabulary\(\s*currentChapterContent\.value,\s*prototypeDictionary,\s*addedWordKeys\.value\s*\)/,
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
    assert.match(wordPanelSource, /defineEmits\(\[[\s\S]*'add-word'[\s\S]*'remove-word'[\s\S]*'select-word'[\s\S]*'retry-word'[\s\S]*'show-wordbook'[\s\S]*\]\)/)
    assert.match(prototypeStyleSource, /\.chapter-vocabulary-list/)
    assert.match(prototypeStyleSource, /\.chapter-vocabulary-item/)

    assert.doesNotMatch(wordPanelSource, /planned、unusually、observatory、reveal、copied、sentence/)
  })

  it('shows the local wordbook state while saving words through the existing vocabulary store', () => {
    assert.match(readerWorkspaceSource, /const mockWordbook = computed/)
    assert.match(
      readerWorkspaceSource,
      /getPrototypeMockWordbook\(\s*currentChapterContent\.value,\s*prototypeDictionary,\s*addedWordKeys\.value\s*\)/,
    )
    assert.match(readerWorkspaceSource, /:wordbook="mockWordbook"/)
    assert.match(readerWorkspaceSource, /@remove-word="removeFromMockWordbook"/)
    assert.match(readerWorkspaceSource, /@show-wordbook="clearSelectedWord"/)
    assert.match(readerWorkspaceSource, /function removeFromMockWordbook/)
    assert.match(readerWorkspaceSource, /function clearSelectedWord/)
    assert.match(readerWorkspaceSource, /saveVocabularyWord\(/)
    assert.match(readerWorkspaceSource, /removeVocabularyWord\(/)
    assert.doesNotMatch(readerWorkspaceSource, /localStorage/)

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

    assert.doesNotMatch(prototypeStyleSource, /\.reading-status/)
    assert.doesNotMatch(prototypeStyleSource, /\.paragraph-meta/)
    assert.doesNotMatch(prototypeStyleSource, /\.learning-tags/)
    assert.doesNotMatch(prototypeStyleSource, /\.word-tags/)
  })

  it('does not render the obsolete floating notes bar in the reader workspace', () => {
    assert.doesNotMatch(readerWorkspaceSource, /PrototypeFloatingNotes/)
    assert.doesNotMatch(readerWorkspaceSource, /addMockNote/)
    assert.doesNotMatch(readerWorkspaceSource, /const notes/)
    assert.doesNotMatch(readerWorkspaceSource, /nextNoteId/)

    assert.doesNotMatch(prototypeStyleSource, /\.floating-notes/)
    assert.doesNotMatch(prototypeStyleSource, /\.notes-tabs/)
    assert.doesNotMatch(prototypeStyleSource, /\.notes-tab/)
    assert.doesNotMatch(prototypeStyleSource, /\.note-content/)
    assert.doesNotMatch(prototypeStyleSource, /\.notes-list/)
  })

  it('keeps the reader workspace toolbar focused on reading display controls only', () => {
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
    assert.doesNotMatch(readerWorkspaceSource, /showPrototypeNoteHint/)
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

  it('wires reader workspace highlighter state through the page', () => {
    assert.match(readerWorkspaceSource, /prototypeHighlightColors/)
    assert.match(readerWorkspaceSource, /isHighlightMode/)
    assert.match(readerWorkspaceSource, /activeHighlightColorId/)
    assert.match(readerWorkspaceSource, /isHighlightClearMode/)
    assert.match(readerWorkspaceSource, /sentenceHighlightsByChapter/)
    assert.match(readerWorkspaceSource, /currentChapterHighlights/)
    assert.match(readerWorkspaceSource, /getDefaultPrototypeHighlights/)
    assert.match(readerWorkspaceSource, /getPrototypeChapterHighlights/)
    assert.match(readerWorkspaceSource, /togglePrototypeSentenceHighlight/)
    assert.match(readerWorkspaceSource, /removePrototypeSentenceHighlight/)
    assert.match(readerWorkspaceSource, /:highlight-colors="prototypeHighlightColors"/)
    assert.match(readerWorkspaceSource, /:is-highlight-mode="isHighlightMode"/)
    assert.match(readerWorkspaceSource, /:active-highlight-color-id="activeHighlightColorId"/)
    assert.match(readerWorkspaceSource, /:is-highlight-clear-mode="isHighlightClearMode"/)
    assert.match(readerWorkspaceSource, /:sentence-highlights="currentChapterHighlights"/)
    assert.match(readerWorkspaceSource, /@toggle-highlight-mode="toggleHighlightMode"/)
    assert.match(readerWorkspaceSource, /@select-highlight-color="selectHighlightColor"/)
    assert.match(readerWorkspaceSource, /@select-highlight-clear="selectHighlightClear"/)
    assert.match(readerWorkspaceSource, /@toggle-sentence-highlight="toggleSentenceHighlight"/)
    assert.doesNotMatch(readerWorkspaceSource, /localStorage/)
  })

  it('renders an empty book state instead of falling back to stale chapter content', () => {
    assert.match(readerWorkspaceSource, /findPrototypeBookChapterContent/)
    assert.match(
      readerWorkspaceSource,
      /findPrototypeBookChapterContent\([\s\S]*chapterContentById\.value,[\s\S]*currentBook\.value,[\s\S]*activeChapterId\.value,[\s\S]*fallbackChapterId,[\s\S]*\)/,
    )
    assert.match(readerWorkspaceSource, /v-else-if="currentChapter"/)
    assert.match(readerWorkspaceSource, /prototype-empty-book/)
    assert.match(readerWorkspaceSource, /getPrototypeChapters\(currentBook\.value\)/)
    assert.match(prototypeStyleSource, /\.prototype-empty-book/)
    assert.doesNotMatch(
      readerWorkspaceSource,
      /findPrototypeChapterContent\(\s*chapterContentById\.value,\s*activeChapterId\.value,\s*fallbackChapterId\s*\)/,
    )
    assert.match(topbarSource, /v-if="chapter"/)
    assert.match(topbarSource, /chapter:\s*\{[\s\S]*default:\s*null/)
  })

  it('wires pasted article mode into the reader workspace instead of the legacy reader route', () => {
    assert.ok(existsSync(pasteEditorUrl), 'paste editor should render inside the reader workspace area')
    assert.match(readerWorkspaceSource, /import\s+ReaderWorkspacePasteEditor\s+from\s+['"]\.\.\/components\/reader-workspace\/ReaderWorkspacePasteEditor\.vue['"]/)
    assert.match(readerWorkspaceSource, /readClipboardText/)
    assert.match(readerWorkspaceSource, /createPastedPrototypeChapterContent/)
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
    assert.doesNotMatch(readerWorkspaceSource, /@paste-article="pastePrototypeArticle"/)
    assert.match(readerWorkspaceSource, /const chapters = computed\(\(\) => getPrototypeChapters\(currentBook\.value\)\)/)
    assert.doesNotMatch(readerWorkspaceSource, /const baseChapters = getPrototypeChapters/)
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
    assert.match(readerWorkspaceSource, /parsePrototypeBookFile/)
    assert.match(readerWorkspaceSource, /createImportedPrototypeBookFromText/)
    assert.match(readerWorkspaceSource, /loadImportedPrototypeBooks/)
    assert.match(readerWorkspaceSource, /appendImportedPrototypeBook/)
    assert.match(readerWorkspaceSource, /removeImportedPrototypeBook/)
    assert.match(readerWorkspaceSource, /getImportedPrototypeChapterContentById/)
    assert.match(readerWorkspaceSource, /const importedBooks = ref\(\[\]\)/)
    assert.match(readerWorkspaceSource, /loadImportedBooksIntoShelf\(\)/)
    assert.match(readerWorkspaceSource, /async function loadImportedBooksIntoShelf/)
    assert.match(readerWorkspaceSource, /await loadImportedPrototypeBooks\(\)/)
    assert.match(readerWorkspaceSource, /const books = computed\(\(\) => \[\.\.\.importedBooks\.value,\s*\.\.\.prototypeBooks\]\)/)
    assert.match(readerWorkspaceSource, /:books="books"/)
    assert.match(readerWorkspaceSource, /@select-book="selectBook"/)
    assert.match(readerWorkspaceSource, /@import-book="openBookImport"/)
    assert.match(readerWorkspaceSource, /@delete-book="deleteImportedBook"/)
    assert.match(readerWorkspaceSource, /async function deleteImportedBook/)
    assert.match(readerWorkspaceSource, /await removeImportedPrototypeBook\(bookId\)/)
    assert.match(readerWorkspaceSource, /<ReaderWorkspaceBookImportPanel/)
    assert.match(readerWorkspaceSource, /v-if="isBookImportOpen"/)
    assert.match(readerWorkspaceSource, /@select-file="selectImportFile"/)
    assert.match(readerWorkspaceSource, /@submit="importSelectedBookFile"/)
    assert.match(readerWorkspaceSource, /@cancel="closeBookImport"/)
    assert.match(readerWorkspaceSource, /await appendImportedPrototypeBook\(importedBook\)/)
    assert.match(readerWorkspaceSource, /activateImportedBook\(importedBook,\s*result\.books\)/)
    assert.match(readerWorkspaceSource, /activateTemporaryImportedBook\(importedBook,\s*result\.books\)/)
    assert.match(readerWorkspaceSource, /已临时导入，但无法保存到本地书架/)
    assert.match(readerWorkspaceSource, /activeBookId\.value\s*=\s*importedBook\.id/)
    assert.match(readerWorkspaceSource, /activeChapterId\.value\s*=\s*importedBook\.chapters\[0\]\?\.id/)
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

  it('renders a reader workspace toolbar paste action with page-level feedback', () => {
    assert.match(topbarSource, /pasteMessage/)
    assert.match(topbarSource, /粘贴文章/)
    assert.match(topbarSource, /paste-article/)
    assert.match(topbarSource, /prototype-paste-message/)
    assert.match(topbarSource, /defineEmits\(\[[\s\S]*'paste-article'[\s\S]*\]\)/)
    assert.match(readerWorkspaceSource, /:paste-message="pasteArticleMessage"/)
    assert.match(readerWorkspaceSource, /:paste-message-type="pasteArticleMessageType"/)
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

  it('styles reader workspace highlighter controls and color variants', () => {
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
