<template>
  <div class="reader-prototype">
    <PrototypeTopbar
      :book="currentBook"
      :chapter="currentChapter"
      :show-translation="showTranslation"
      :show-highlight="showHighlight"
      :highlight-colors="prototypeHighlightColors"
      :is-highlight-mode="isHighlightMode"
      :active-highlight-color-id="activeHighlightColorId"
      :is-highlight-clear-mode="isHighlightClearMode"
      :paste-message="pasteArticleMessage"
      :paste-message-type="pasteArticleMessageType"
      @toggle-translation="showTranslation = !showTranslation"
      @toggle-highlight-visibility="showHighlight = !showHighlight"
      @toggle-highlight-mode="toggleHighlightMode"
      @select-highlight-color="selectHighlightColor"
      @select-highlight-clear="selectHighlightClear"
      @paste-article="openPasteEditor"
    />

    <div class="prototype-workspace">
      <PrototypeSidebar
        :books="books"
        :chapters="chapters"
        :active-book-id="activeBookId"
        :active-chapter-id="sidebarActiveChapterId"
        :progress="readingProgress"
        @select-book="selectBook"
        @select-chapter="selectChapter"
        @import-book="openBookImport"
        @delete-book="deleteImportedBook"
      />

      <main class="prototype-reader" aria-label="英语阅读区">
        <PrototypeBookImportPanel
          v-if="isBookImportOpen"
          :title="bookImportTitle"
          :file-name="bookImportFile?.name || ''"
          :message="bookImportMessage"
          :message-type="bookImportMessageType"
          :is-importing="isImportingBook"
          @update:title="bookImportTitle = $event"
          @select-file="selectImportFile"
          @submit="importSelectedBookFile"
          @cancel="closeBookImport"
        />
        <PrototypePasteEditor
          v-else-if="isPasteEditorOpen"
          v-model="pasteDraft"
          :message="pasteArticleMessage"
          :message-type="pasteArticleMessageType"
          @submit="submitPastedArticle"
          @cancel="closePasteEditor"
          @read-clipboard="readClipboardIntoDraft"
        />
        <PrototypeReadingPaper
          v-else-if="currentChapter"
          :chapter="currentChapter"
          :paragraphs="displayParagraphs"
          :show-translation="showTranslation"
          :show-highlight="showHighlight"
          :sentence-highlights="currentChapterHighlights"
          :is-highlight-mode="isHighlightMode"
          :active-highlight-color-id="activeHighlightColorId"
          :selected-word-key="selectedWordKey"
          :selected-sentence-id="selectedSentenceId"
          :selected-paragraph-id="selectedParagraphId"
          @select-word="selectWord"
          @select-sentence="selectPrototypeSentence"
          @retry-translation="retryPrototypeTranslation"
          @retry-sentence-translation="retryPrototypeSentenceTranslation"
          @translate-paragraph="translatePrototypeParagraph"
          @toggle-sentence-highlight="toggleSentenceHighlight"
        />
        <section
          v-else
          class="prototype-empty-book"
          aria-label="空书籍"
        >
          <p>暂无章节</p>
          <h1>{{ currentBook?.title || '未选择书籍' }}</h1>
          <span>这本书还没有可阅读章节，可以导入 PDF/EPUB 或选择书架中的其他书籍。</span>
        </section>
      </main>

      <PrototypeAssistant
        :word="selectedWordEntry"
        :vocabulary="chapterVocabulary"
        :wordbook="mockWordbook"
        :is-added="isSelectedWordAdded"
        :is-word-loading="isWordLoading"
        :loading-word="loadingWord"
        :word-error-message="wordErrorMessage"
        :message="wordbookMessage"
        @select-word="selectWord"
        @add-word="addToMockWordbook"
        @remove-word="removeFromMockWordbook"
        @retry-word="retrySelectedPrototypeWord"
        @show-wordbook="clearSelectedWord"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { requestTranslation } from '../api/translate.js'
import { requestPrototypeWordExplanation } from '../api/prototypeWord.js'
import PrototypeAssistant from '../components/reader-prototype/PrototypeAssistant.vue'
import PrototypeBookImportPanel from '../components/reader-prototype/PrototypeBookImportPanel.vue'
import PrototypePasteEditor from '../components/reader-prototype/PrototypePasteEditor.vue'
import PrototypeReadingPaper from '../components/reader-prototype/PrototypeReadingPaper.vue'
import PrototypeSidebar from '../components/reader-prototype/PrototypeSidebar.vue'
import PrototypeTopbar from '../components/reader-prototype/PrototypeTopbar.vue'
import { prototypeBooks, prototypeChapterContent, prototypeDictionary } from '../data/readerPrototypeData.js'
import {
  createPastedPrototypeChapterContent,
  findPrototypeBook,
  findPrototypeBookChapterContent,
  findPrototypeChapter,
  getDefaultPrototypeHighlights,
  getPrototypeChapterHighlights,
  getPrototypeChapterVocabulary,
  getPrototypeLocalParagraphTranslation,
  getPrototypeLocalSentenceTranslation,
  getPrototypeMockWordbook,
  getPrototypeWordContext,
  getPrototypeChapters,
  getPrototypeParagraphs,
  getPrototypeParagraphSourceText,
  getPrototypeReadingProgress,
  getPrototypeSentenceSourceText,
  getPrototypeTranslationStateKey,
  mapAiWordDetailToWordPanel,
  mapDictionaryEntryToWordPanel,
  removePrototypeSentenceHighlight,
  togglePrototypeSentenceHighlight,
} from '../data/readerPrototypeSelectors.js'
import { readClipboardText } from '../utils/clipboard.js'
import { getCachedTranslation, saveCachedTranslation } from '../utils/translationCache.js'
import { isWordSaved, removeVocabularyWord, saveVocabularyWord } from '../utils/vocabulary.js'
import { normalizeWord } from '../utils/word.js'
import {
  appendImportedPrototypeBook,
  createImportedPrototypeBookFromText,
  getImportedPrototypeChapterContentById,
  loadImportedPrototypeBooks,
  removeImportedPrototypeBook,
} from '../utils/prototypeBookImport.js'
import { getPrototypeBookTitleFromFileName, parsePrototypeBookFile } from '../utils/prototypeFileParser.js'
import '../reader-prototype.css'

const fallbackChapterId = 'chapter-4'
const defaultHighlightColorId = 'yellow'
const prototypeHighlightColors = [
  { id: 'yellow', label: '黄色' },
  { id: 'green', label: '绿色' },
  { id: 'blue', label: '蓝色' },
  { id: 'pink', label: '粉色' },
  { id: 'purple', label: '紫色' },
]

function createInitialPrototypeHighlights() {
  return Object.fromEntries(
    Object.entries(prototypeChapterContent).map(([chapterId, chapterContent]) => [
      chapterId,
      getDefaultPrototypeHighlights(chapterContent, defaultHighlightColorId),
    ]),
  )
}

const activeBookId = ref('quiet-observatory')
const activeChapterId = ref('chapter-4')
const showTranslation = ref(true)
const showHighlight = ref(true)
const isHighlightMode = ref(false)
const activeHighlightColorId = ref(defaultHighlightColorId)
const isHighlightClearMode = ref(false)
const sentenceHighlightsByChapter = ref(createInitialPrototypeHighlights())
const selectedWordKey = ref(null)
const selectedWordContext = ref(null)
const selectedAiWordEntry = ref(null)
const addedWordKeys = ref([])
const wordbookMessage = ref('')
const wordbookMessageType = ref('success')
const vocabularyVersion = ref(0)
const isWordLoading = ref(false)
const loadingWord = ref('')
const wordErrorMessage = ref('')
const importedBooks = ref([])
const pastedChapterContent = ref(null)
const isPastedArticleActive = ref(false)
const isPasteEditorOpen = ref(false)
const pasteDraft = ref('')
const pasteArticleMessage = ref('')
const pasteArticleMessageType = ref('success')
const isBookImportOpen = ref(false)
const bookImportFile = ref(null)
const bookImportTitle = ref('')
const bookImportMessage = ref('')
const bookImportMessageType = ref('success')
const isImportingBook = ref(false)
const translationByParagraphId = ref({})
const translationLoadingByParagraphId = ref({})
const translationErrorByParagraphId = ref({})
const selectedSentenceId = ref('')
const selectedSentenceParagraphId = ref('')
const translationBySentenceId = ref({})
const translationLoadingBySentenceId = ref({})
const translationErrorBySentenceId = ref({})
const translationRequests = Object.create(null)
const wordCache = Object.create(null)
const wordRequests = Object.create(null)
let currentWordRequestId = 0

const books = computed(() => [...importedBooks.value, ...prototypeBooks])

const importedChapterContentById = computed(() => getImportedPrototypeChapterContentById(importedBooks.value))

const chapterContentById = computed(() => ({
  ...prototypeChapterContent,
  ...importedChapterContentById.value,
}))

const currentBook = computed(() => findPrototypeBook(books.value, activeBookId.value))

const chapters = computed(() => getPrototypeChapters(currentBook.value))

const pastedArticleChapter = computed(() => {
  if (!pastedChapterContent.value) {
    return null
  }

  return {
    id: pastedChapterContent.value.id,
    number: pastedChapterContent.value.number,
    title: pastedChapterContent.value.title,
    status: '临时文章',
    sentenceCount: pastedChapterContent.value.paragraphs.reduce(
      (count, paragraph) => count + paragraph.sentences.length,
      0,
    ),
    level: 'Paste',
    progress: 0,
  }
})

const sidebarActiveChapterId = computed(() => {
  return isPastedArticleActive.value ? null : activeChapterId.value
})

const currentChapterContent = computed(() => {
  if (isPastedArticleActive.value && pastedChapterContent.value) {
    return pastedChapterContent.value
  }

  return findPrototypeBookChapterContent(
    chapterContentById.value,
    currentBook.value,
    activeChapterId.value,
    fallbackChapterId,
  )
})

const currentChapter = computed(() => {
  if (isPastedArticleActive.value && pastedArticleChapter.value) {
    return pastedArticleChapter.value
  }

  return findPrototypeChapter(chapters.value, activeChapterId.value, currentChapterContent.value)
})

const paragraphs = computed(() => getPrototypeParagraphs(currentChapterContent.value))

const displayParagraphs = computed(() =>
  paragraphs.value.map((paragraph) => {
    const paragraphStateKey = getPrototypeParagraphStateKey(paragraph)
    const localTranslation = getPrototypeLocalParagraphTranslation(paragraph)

    return {
      ...paragraph,
      translation: localTranslation || translationByParagraphId.value[paragraphStateKey] || '',
      isTranslationLoading: Boolean(translationLoadingByParagraphId.value[paragraphStateKey]),
      translationErrorMessage: translationErrorByParagraphId.value[paragraphStateKey] || '',
      sentences: (paragraph.sentences || []).map((sentence) => {
        const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
        const localSentenceTranslation = getPrototypeLocalSentenceTranslation(sentence)

        return {
          ...sentence,
          translation: localSentenceTranslation || translationBySentenceId.value[sentenceStateKey] || '',
          isTranslationLoading: Boolean(translationLoadingBySentenceId.value[sentenceStateKey]),
          translationErrorMessage: translationErrorBySentenceId.value[sentenceStateKey] || '',
        }
      }),
    }
  }),
)

const currentChapterHighlights = computed(() => {
  return getPrototypeChapterHighlights(sentenceHighlightsByChapter.value, currentChapter.value?.id)
})

const readingProgress = computed(() => getPrototypeReadingProgress(currentBook.value, currentChapter.value))

const chapterVocabulary = computed(() => {
  return getPrototypeChapterVocabulary(currentChapterContent.value, prototypeDictionary, addedWordKeys.value)
})

const mockWordbook = computed(() => {
  return getPrototypeMockWordbook(currentChapterContent.value, prototypeDictionary, addedWordKeys.value)
})

const selectedParagraphId = computed(() => selectedWordContext.value?.paragraphId || null)

const selectedWordEntry = computed(() => {
  if (!selectedWordKey.value) {
    return null
  }

  const localEntry = prototypeDictionary[selectedWordKey.value]

  if (localEntry) {
    return mapDictionaryEntryToWordPanel(prototypeDictionary[selectedWordKey.value], selectedWordContext.value)
  }

  if (selectedAiWordEntry.value) {
    return mapAiWordDetailToWordPanel(selectedAiWordEntry.value, selectedWordContext.value)
  }

  return mapDictionaryEntryToWordPanel(null, selectedWordContext.value)
})

const isSelectedWordAdded = computed(() => {
  vocabularyVersion.value

  if (!selectedWordKey.value || !selectedWordEntry.value) {
    return false
  }

  return addedWordKeys.value.includes(selectedWordKey.value) || isWordSaved(selectedWordEntry.value.word)
})

function hasCachedValue(cache, key) {
  return Object.prototype.hasOwnProperty.call(cache, key)
}

function getErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage
}

function getPrototypeChapterStateId() {
  return currentChapter.value?.id || currentChapterContent.value?.id || 'chapter'
}

function getPrototypeParagraphStateKey(paragraph) {
  return getPrototypeTranslationStateKey(getPrototypeChapterStateId(), paragraph?.id || '', 'paragraph')
}

function getPrototypeSentenceStateKey(sentence, paragraph) {
  return getPrototypeTranslationStateKey(
    getPrototypeChapterStateId(),
    paragraph?.id || selectedSentenceParagraphId.value || '',
    sentence?.id || selectedSentenceId.value || '',
  )
}

function setRecordValue(recordRef, key, value) {
  const nextRecord = { ...recordRef.value }

  if (value) {
    nextRecord[key] = value
  } else {
    delete nextRecord[key]
  }

  recordRef.value = nextRecord
}

function getPrototypeTranslation(sourceText, options = {}) {
  const refresh = Boolean(options.refresh)
  const cacheKey = sourceText.trim()

  if (!cacheKey) {
    return Promise.resolve('')
  }

  if (!refresh) {
    const cachedTranslation = getCachedTranslation(sourceText)

    if (cachedTranslation) {
      return Promise.resolve(cachedTranslation)
    }
  }

  if (refresh) {
    delete translationRequests[cacheKey]
  }

  if (!translationRequests[cacheKey]) {
    translationRequests[cacheKey] = requestTranslation(sourceText)
      .then((data) => {
        saveCachedTranslation(sourceText, data.translation)
        return data.translation
      })
      .finally(() => {
        delete translationRequests[cacheKey]
      })
  }

  return translationRequests[cacheKey]
}

async function loadPrototypeParagraphTranslation(paragraph, options = {}) {
  const paragraphStateKey = getPrototypeParagraphStateKey(paragraph)
  const sourceText = getPrototypeParagraphSourceText(paragraph)

  if (!paragraphStateKey || !sourceText || getPrototypeLocalParagraphTranslation(paragraph)) {
    return
  }

  if (!options.refresh && translationByParagraphId.value[paragraphStateKey]) {
    return
  }

  setRecordValue(translationErrorByParagraphId, paragraphStateKey, '')
  setRecordValue(translationLoadingByParagraphId, paragraphStateKey, true)

  try {
    const translation = await getPrototypeTranslation(sourceText, options)

    if (!translation) {
      throw new Error('没有返回可用译文。')
    }

    setRecordValue(translationByParagraphId, paragraphStateKey, translation)
  } catch (error) {
    setRecordValue(translationErrorByParagraphId, paragraphStateKey, getErrorMessage(error, 'AI 翻译加载失败。'))
  } finally {
    setRecordValue(translationLoadingByParagraphId, paragraphStateKey, false)
  }
}

function retryPrototypeTranslation(paragraphId) {
  const paragraph = paragraphs.value.find((item) => item.id === paragraphId)

  if (!paragraph) {
    return
  }

  const paragraphStateKey = getPrototypeParagraphStateKey(paragraph)
  setRecordValue(translationByParagraphId, paragraphStateKey, '')
  setRecordValue(translationErrorByParagraphId, paragraphStateKey, '')
  loadPrototypeParagraphTranslation(paragraph, { refresh: true })
}

async function loadPrototypeSentenceTranslation(sentence, paragraph, options = {}) {
  const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
  const sourceText = getPrototypeSentenceSourceText(sentence)

  if (!sentenceStateKey || !sourceText || getPrototypeLocalSentenceTranslation(sentence)) {
    return
  }

  if (!options.refresh && translationBySentenceId.value[sentenceStateKey]) {
    return
  }

  setRecordValue(translationErrorBySentenceId, sentenceStateKey, '')
  setRecordValue(translationLoadingBySentenceId, sentenceStateKey, true)

  try {
    const translation = await getPrototypeTranslation(sourceText, options)

    if (!translation) {
      throw new Error('没有返回可用译文。')
    }

    setRecordValue(translationBySentenceId, sentenceStateKey, translation)
  } catch (error) {
    setRecordValue(translationErrorBySentenceId, sentenceStateKey, getErrorMessage(error, 'AI 翻译加载失败。'))
  } finally {
    setRecordValue(translationLoadingBySentenceId, sentenceStateKey, false)
  }
}

function selectPrototypeSentence({ sentence, paragraph }) {
  if (!sentence?.id || !paragraph?.id) {
    return
  }

  selectedSentenceId.value = sentence.id
  selectedSentenceParagraphId.value = paragraph.id
  loadPrototypeSentenceTranslation(sentence, paragraph)
}

function retryPrototypeSentenceTranslation({ sentenceId, paragraphId }) {
  const paragraph = paragraphs.value.find((item) => item.id === paragraphId)
  const sentence = paragraph?.sentences?.find((item) => item.id === sentenceId)

  if (!paragraph || !sentence) {
    return
  }

  selectedSentenceId.value = sentence.id
  selectedSentenceParagraphId.value = paragraph.id
  const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
  setRecordValue(translationBySentenceId, sentenceStateKey, '')
  setRecordValue(translationErrorBySentenceId, sentenceStateKey, '')
  loadPrototypeSentenceTranslation(sentence, paragraph, { refresh: true })
}

function translatePrototypeParagraph(paragraphId) {
  const paragraph = paragraphs.value.find((item) => item.id === paragraphId)

  if (!paragraph) {
    return
  }

  loadPrototypeParagraphTranslation(paragraph)
}

function getAiWordDetail(word) {
  const cacheKey = normalizeWord(word)

  if (!cacheKey) {
    return Promise.resolve(null)
  }

  if (hasCachedValue(wordCache, cacheKey)) {
    return Promise.resolve(wordCache[cacheKey])
  }

  if (!wordRequests[cacheKey]) {
    wordRequests[cacheKey] = requestPrototypeWordExplanation(word)
      .then((detail) => {
        wordCache[cacheKey] = detail
        return detail
      })
      .finally(() => {
        delete wordRequests[cacheKey]
      })
  }

  return wordRequests[cacheKey]
}

function isKnownHighlightColor(colorId) {
  return prototypeHighlightColors.some((color) => color.id === colorId)
}

function toggleHighlightMode() {
  isHighlightMode.value = !isHighlightMode.value

  if (isHighlightMode.value && !isKnownHighlightColor(activeHighlightColorId.value)) {
    activeHighlightColorId.value = defaultHighlightColorId
    isHighlightClearMode.value = false
  }
}

function selectHighlightColor(colorId) {
  if (!isKnownHighlightColor(colorId)) {
    return
  }

  activeHighlightColorId.value = colorId
  isHighlightClearMode.value = false
  isHighlightMode.value = true
}

function selectHighlightClear() {
  isHighlightClearMode.value = true
  isHighlightMode.value = true
}

function setCurrentChapterHighlights(nextChapterHighlights) {
  const chapterId = currentChapter.value?.id

  if (!chapterId) {
    return
  }

  sentenceHighlightsByChapter.value = {
    ...sentenceHighlightsByChapter.value,
    [chapterId]: nextChapterHighlights,
  }
}

function toggleSentenceHighlight(sentenceId) {
  if (!isHighlightMode.value || !sentenceId) {
    return
  }

  const nextChapterHighlights = isHighlightClearMode.value
    ? removePrototypeSentenceHighlight(currentChapterHighlights.value, sentenceId)
    : togglePrototypeSentenceHighlight(currentChapterHighlights.value, sentenceId, activeHighlightColorId.value)

  setCurrentChapterHighlights(nextChapterHighlights)
}

function selectBook(bookId) {
  const nextBook = findPrototypeBook(books.value, bookId)

  if (!nextBook) {
    return
  }

  activeBookId.value = nextBook.id
  activeChapterId.value = nextBook.chapters?.[0]?.id || fallbackChapterId
  isPastedArticleActive.value = false
  isPasteEditorOpen.value = false
  isBookImportOpen.value = false
  pasteDraft.value = ''
  pasteArticleMessage.value = ''
  clearBookImportForm()
  clearSelectedWord()
}

function selectChapter(chapterId) {
  activeChapterId.value = chapterId
  isPastedArticleActive.value = false
  isPasteEditorOpen.value = false
  isBookImportOpen.value = false
  pasteDraft.value = ''
  pasteArticleMessage.value = ''
  clearBookImportForm()
  clearSelectedWord()
}

async function deleteImportedBook(bookId) {
  const deletedBook = importedBooks.value.find((item) => item.id === bookId)

  if (!deletedBook) {
    return
  }

  if (deletedBook.isTemporary) {
    updateAfterImportedBookDeleted(deletedBook, importedBooks.value.filter((item) => item.id !== bookId))
    return
  }

  const result = await removeImportedPrototypeBook(bookId)

  if (!result.deleted) {
    return
  }

  updateAfterImportedBookDeleted(deletedBook, result.books)
}

function updateAfterImportedBookDeleted(deletedBook, nextImportedBooks) {
  importedBooks.value = nextImportedBooks
  removeHighlightsForBook(deletedBook)

  if (activeBookId.value !== deletedBook.id) {
    return
  }

  const nextBook = getFirstReadableBook(nextImportedBooks)

  if (nextBook) {
    activeBookId.value = nextBook.id
    activeChapterId.value = nextBook.chapters?.[0]?.id || fallbackChapterId
  }

  isPastedArticleActive.value = false
  isPasteEditorOpen.value = false
  isBookImportOpen.value = false
  pasteDraft.value = ''
  pasteArticleMessage.value = ''
  clearBookImportForm()
  clearSelectedWord()
}

function getFirstReadableBook(nextImportedBooks) {
  const nextBooks = [...nextImportedBooks, ...prototypeBooks]

  return nextBooks.find((item) => item?.chapters?.length) || nextBooks[0] || null
}

function removeHighlightsForBook(book) {
  const chapterIds = new Set((book?.chapters || []).map((chapter) => chapter.id))

  if (!chapterIds.size) {
    return
  }

  const nextHighlights = { ...sentenceHighlightsByChapter.value }

  for (const chapterId of chapterIds) {
    delete nextHighlights[chapterId]
  }

  sentenceHighlightsByChapter.value = nextHighlights
}

async function loadImportedBooksIntoShelf() {
  importedBooks.value = await loadImportedPrototypeBooks()
}

function activateImportedBook(importedBook, nextImportedBooks) {
  importedBooks.value = nextImportedBooks
  activeBookId.value = importedBook.id
  activeChapterId.value = importedBook.chapters[0]?.id || fallbackChapterId
  isBookImportOpen.value = false
  isPastedArticleActive.value = false
  sentenceHighlightsByChapter.value = {
    ...sentenceHighlightsByChapter.value,
    ...Object.fromEntries(importedBook.chapters.map((chapter) => [chapter.id, {}])),
  }
  clearBookImportForm()
  clearSelectedWord()
}

function activateTemporaryImportedBook(importedBook, existingImportedBooks = []) {
  const temporaryBook = {
    ...importedBook,
    isTemporary: true,
    meta: `${importedBook.meta} · 临时`,
  }
  const nextImportedBooks = [
    temporaryBook,
    ...existingImportedBooks.filter((item) => item.id !== importedBook.id),
  ]

  activateImportedBook(temporaryBook, nextImportedBooks)
  pasteArticleMessage.value = '已临时导入，但无法保存到本地书架；刷新后会丢失。'
  pasteArticleMessageType.value = 'error'
}

async function selectWord(selection) {
  const wordSelection = typeof selection === 'string' ? { wordKey: selection } : selection

  selectedWordKey.value = wordSelection?.wordKey || null
  selectedWordContext.value = getPrototypeWordContext(currentChapterContent.value, wordSelection)
  selectedAiWordEntry.value = null
  wordErrorMessage.value = ''
  wordbookMessage.value = ''

  if (!selectedWordKey.value) {
    return
  }

  if (prototypeDictionary[selectedWordKey.value]) {
    currentWordRequestId += 1
    isWordLoading.value = false
    loadingWord.value = ''
    return
  }

  const requestWord = selectedWordContext.value?.surface || wordSelection?.surface || selectedWordKey.value
  const normalizedRequestWord = normalizeWord(requestWord)

  if (!normalizedRequestWord) {
    return
  }

  const requestId = ++currentWordRequestId

  if (hasCachedValue(wordCache, normalizedRequestWord)) {
    selectedAiWordEntry.value = wordCache[normalizedRequestWord]
    return
  }

  isWordLoading.value = true
  loadingWord.value = requestWord

  try {
    const detail = await getAiWordDetail(requestWord)

    if (requestId !== currentWordRequestId) {
      return
    }

    selectedAiWordEntry.value = detail
  } catch (error) {
    if (requestId !== currentWordRequestId) {
      return
    }

    wordErrorMessage.value = getErrorMessage(error, 'AI 词典加载失败。')
  } finally {
    if (requestId === currentWordRequestId) {
      isWordLoading.value = false
      loadingWord.value = ''
    }
  }
}

function addToMockWordbook() {
  if (!selectedWordKey.value || !selectedWordEntry.value) {
    return
  }

  const result = saveVocabularyWord({
    word: selectedWordEntry.value.word,
    meaning: selectedWordEntry.value.meaning,
    definition: selectedWordEntry.value.explanation,
    partOfSpeech: selectedWordEntry.value.partOfSpeech,
    example: selectedWordEntry.value.example,
    sentence: selectedWordEntry.value.sourceSentence,
    articleTitle: currentChapter.value?.title || currentBook.value?.title || '',
  })

  vocabularyVersion.value += 1

  if (result.error) {
    wordbookMessage.value = result.error
    wordbookMessageType.value = 'error'
    return
  }

  if (!addedWordKeys.value.includes(selectedWordKey.value)) {
    addedWordKeys.value = [...addedWordKeys.value, selectedWordKey.value]
  }

  wordbookMessage.value = result.added ? '已加入生词本' : '已在生词本中'
  wordbookMessageType.value = 'success'
}

function removeFromMockWordbook(wordKey = selectedWordKey.value) {
  if (!wordKey) {
    return
  }

  const wordbookItem = mockWordbook.value.find((item) => item.wordKey === wordKey)
  const removeTarget = wordKey === selectedWordKey.value
    ? selectedWordEntry.value?.word || wordKey
    : wordbookItem?.word || wordKey
  const result = removeVocabularyWord(removeTarget)

  vocabularyVersion.value += 1
  addedWordKeys.value = addedWordKeys.value.filter((item) => item !== wordKey)

  if (result.error) {
    wordbookMessage.value = result.error
    wordbookMessageType.value = 'error'
    return
  }

  wordbookMessage.value = '已从生词本移出'
  wordbookMessageType.value = 'success'
}

function retrySelectedPrototypeWord() {
  if (!selectedWordKey.value || prototypeDictionary[selectedWordKey.value]) {
    return
  }

  const requestWord = selectedWordContext.value?.surface || selectedWordKey.value
  const normalizedRequestWord = normalizeWord(requestWord)

  if (normalizedRequestWord) {
    delete wordCache[normalizedRequestWord]
  }

  selectWord({
    wordKey: selectedWordKey.value,
    surface: selectedWordContext.value?.surface || '',
    sentenceId: selectedWordContext.value?.sentenceId || '',
  })
}

function clearSelectedWord() {
  currentWordRequestId += 1
  selectedWordKey.value = null
  selectedWordContext.value = null
  selectedAiWordEntry.value = null
  isWordLoading.value = false
  loadingWord.value = ''
  wordErrorMessage.value = ''
  wordbookMessage.value = ''
  wordbookMessageType.value = 'success'
}

function openPasteEditor() {
  if (!isPasteEditorOpen.value) {
    pasteDraft.value = ''
  }

  isPasteEditorOpen.value = true
  pasteArticleMessage.value = ''
  pasteArticleMessageType.value = 'success'
  clearSelectedWord()
}

function closePasteEditor() {
  isPasteEditorOpen.value = false
  pasteDraft.value = ''
  pasteArticleMessage.value = ''
  pasteArticleMessageType.value = 'success'
}

function openBookImport() {
  isBookImportOpen.value = true
  isPasteEditorOpen.value = false
  isPastedArticleActive.value = false
  pasteDraft.value = ''
  pasteArticleMessage.value = ''
  bookImportMessage.value = ''
  bookImportMessageType.value = 'success'
  clearSelectedWord()
}

function closeBookImport() {
  isBookImportOpen.value = false
  clearBookImportForm()
}

function selectImportFile(file) {
  bookImportFile.value = file
  bookImportTitle.value = file ? getPrototypeBookTitleFromFileName(file.name) : ''
  bookImportMessage.value = ''
  bookImportMessageType.value = 'success'
}

async function importSelectedBookFile() {
  if (!bookImportFile.value) {
    bookImportMessage.value = '请选择 PDF 或 EPUB 文件'
    bookImportMessageType.value = 'error'
    return
  }

  isImportingBook.value = true
  bookImportMessage.value = ''
  bookImportMessageType.value = 'success'

  try {
    const parsedFile = await parsePrototypeBookFile(bookImportFile.value)

    if (!parsedFile.ok) {
      bookImportMessage.value = getBookImportMessage(parsedFile.reason)
      bookImportMessageType.value = 'error'
      return
    }

    const importedBook = createImportedPrototypeBookFromText({
      title: bookImportTitle.value || parsedFile.title,
      sourceType: parsedFile.sourceType,
      fileName: parsedFile.fileName,
      text: parsedFile.text,
      chapters: parsedFile.chapters,
    })

    if (!importedBook) {
      bookImportMessage.value = getBookImportMessage('empty')
      bookImportMessageType.value = 'error'
      return
    }

    const result = await appendImportedPrototypeBook(importedBook)

    if (!result.ok) {
      activateTemporaryImportedBook(importedBook, result.books)
      return
    }

    activateImportedBook(importedBook, result.books)
  } catch {
    bookImportMessage.value = getBookImportMessage('parse')
    bookImportMessageType.value = 'error'
  } finally {
    isImportingBook.value = false
  }
}

async function readClipboardIntoDraft() {
  const result = await readClipboardText()

  if (!result.ok) {
    pasteArticleMessage.value = getPasteArticleMessage(result.reason)
    pasteArticleMessageType.value = 'error'
    return
  }

  pasteDraft.value = result.text
  pasteArticleMessage.value = '已读取剪贴板内容'
  pasteArticleMessageType.value = 'success'
}

function submitPastedArticle() {
  const pastedChapter = createPastedPrototypeChapterContent(pasteDraft.value)

  if (!pastedChapter) {
    pasteArticleMessage.value = getPasteArticleMessage('empty')
    pasteArticleMessageType.value = 'error'
    return
  }

  pastedChapterContent.value = pastedChapter
  isPastedArticleActive.value = true
  isPasteEditorOpen.value = false
  pasteDraft.value = ''
  sentenceHighlightsByChapter.value = {
    ...sentenceHighlightsByChapter.value,
    [pastedChapter.id]: {},
  }
  clearSelectedWord()
  pasteArticleMessage.value = '已载入粘贴文章'
  pasteArticleMessageType.value = 'success'
}

function clearBookImportForm() {
  bookImportFile.value = null
  bookImportTitle.value = ''
  bookImportMessage.value = ''
  bookImportMessageType.value = 'success'
}

function getPasteArticleMessage(reason) {
  const messages = {
    unsupported: '当前浏览器不支持直接读取剪贴板，请手动粘贴到系统剪贴板后重试。',
    empty: '剪贴板里没有可用的文章内容。',
    denied: '无法读取剪贴板，请允许权限或手动粘贴。',
  }

  return messages[reason] || messages.denied
}

function getBookImportMessage(reason) {
  const messages = {
    unsupported: '仅支持 PDF 或 EPUB 文件',
    empty: '没有解析到可阅读文本',
    storage: '导入成功但无法保存到本地书架',
    parse: '文件解析失败，请换一个 PDF 或 EPUB 文件',
  }

  return messages[reason] || messages.parse
}

loadImportedBooksIntoShelf()

watch(currentChapterContent, () => {
  selectedSentenceId.value = ''
  selectedSentenceParagraphId.value = ''
})
</script>
