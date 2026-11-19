<template>
  <div class="reader-workspace" :style="{ '--workspace-font-size': `${readerFontSize}px` }">
    <ReaderWorkspaceTopbar
      :inert="isDictionaryDrawerOpen"
      :book="currentBook"
      :chapter="currentChapter"
      :is-sidebar-open="isSidebarOpen"
      :is-dictionary-open="isDictionaryOpen"
      :is-focus-mode="isFocusMode"
      :font-size="readerFontSize"
      :show-highlight="showHighlight"
      :highlight-colors="highlightColors"
      :is-highlight-mode="isHighlightMode"
      :active-highlight-color-id="activeHighlightColorId"
      :is-highlight-clear-mode="isHighlightClearMode"
      :paste-message="pasteArticleMessage"
      :paste-message-type="pasteArticleMessageType"
      @toggle-sidebar="toggleSidebar"
      @toggle-dictionary="toggleDictionary"
      @toggle-focus="toggleFocusMode"
      @update:font-size="updateReaderFontSize"
      @toggle-highlight-visibility="showHighlight = !showHighlight"
      @toggle-highlight-mode="toggleHighlightMode"
      @select-highlight-color="selectHighlightColor"
      @select-highlight-clear="selectHighlightClear"
      @paste-article="openPasteEditor"
    />

    <div
      class="workspace-layout"
      :class="{ 'has-sidebar': isSidebarOpen, 'has-dictionary': isDictionaryOpen }"
    >
      <ReaderWorkspaceSidebar
        v-if="isSidebarOpen && isReaderReady"
        id="workspace-directory"
        :inert="isDictionaryDrawerOpen"
        :books="books"
        :chapters="readingChapters"
        :active-book-id="activeBookId"
        :active-chapter-id="sidebarActiveChapterId"
        :progress="readingProgress"
        :is-article="isPastedArticleActive"
        :is-temporary="readingContext?.isTemporary"
        @select-book="selectBook"
        @select-chapter="selectChapter"
        @import-book="openBookImport"
        @delete-book="deleteImportedBook"
      />

      <main
        ref="readingArea"
        class="workspace-reading-area"
        :inert="isDictionaryDrawerOpen"
        aria-label="英语阅读区"
        @click="dismissDictionaryFromReadingArea"
      >
        <ReaderWorkspaceBookImportPanel
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
        <ReaderWorkspacePasteEditor
          v-else-if="isPasteEditorOpen"
          v-model="pasteDraft"
          :message="pasteArticleMessage"
          :message-type="pasteArticleMessageType"
          @submit="submitPastedArticle"
          @cancel="closePasteEditor"
          @read-clipboard="readClipboardIntoDraft"
        />
        <ReaderWorkspaceReadingPaper
          v-else-if="isReaderReady && currentChapter"
          :chapter="currentChapter"
          :paragraphs="displayParagraphs"
          :show-highlight="showHighlight"
          :sentence-highlights="currentChapterHighlights"
          :is-highlight-mode="isHighlightMode"
          :active-highlight-color-id="activeHighlightColorId"
          :selected-word-key="selectedWordKey"
          :selected-sentence-id="selectedSentenceId"
          :selected-paragraph-id="selectedParagraphId"
          @select-word="selectWord"
          @select-sentence="selectSentence"
          @close-sentence-translation="clearSentenceSelection"
          @retry-translation="retryParagraphTranslation"
          @retry-sentence-translation="retrySentenceTranslation"
          @translate-paragraph="translateParagraph"
          @toggle-sentence-highlight="handleSentenceHighlightToggle"
        />
        <section
          v-else-if="isReaderReady"
          class="workspace-empty-book"
          aria-label="空书籍"
        >
          <p>暂无章节</p>
          <h1>{{ currentBook?.title || '未选择书籍' }}</h1>
          <span>这本书还没有可阅读章节，可以导入 PDF/EPUB 或选择书架中的其他书籍。</span>
        </section>
      </main>

      <div
        v-if="isDictionaryDrawerOpen"
        class="workspace-dictionary-backdrop"
        aria-hidden="true"
        @click="closeDictionary()"
      ></div>
      <ReaderWorkspaceVocabularyPanel
        v-if="isDictionaryOpen"
        id="workspace-dictionary"
        :is-drawer="isDictionaryDrawerOpen"
        :is-pinned="isDictionaryPinned"
        :word="selectedWordEntry"
        :vocabulary="chapterVocabulary"
        :session-vocabulary="sessionVocabulary"
        :is-added="isSelectedWordAdded"
        :is-word-loading="isWordLoading"
        :loading-word="loadingWord"
        :word-error-message="wordErrorMessage"
        :message="vocabularyMessage"
        @select-word="selectWord"
        @add-word="addSelectedWordToVocabulary"
        @remove-word="removeWordFromVocabulary"
        @retry-word="retrySelectedWordLookup"
        @show-session-vocabulary="clearSelectedWord"
        @toggle-pin="isDictionaryPinned = !isDictionaryPinned"
        @close="closeDictionary()"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { requestWordLookup } from '../api/wordLookup.js'
import ReaderWorkspaceVocabularyPanel from '../components/reader-workspace/ReaderWorkspaceVocabularyPanel.vue'
import ReaderWorkspaceBookImportPanel from '../components/reader-workspace/ReaderWorkspaceBookImportPanel.vue'
import ReaderWorkspacePasteEditor from '../components/reader-workspace/ReaderWorkspacePasteEditor.vue'
import ReaderWorkspaceReadingPaper from '../components/reader-workspace/ReaderWorkspaceReadingPaper.vue'
import ReaderWorkspaceSidebar from '../components/reader-workspace/ReaderWorkspaceSidebar.vue'
import ReaderWorkspaceTopbar from '../components/reader-workspace/ReaderWorkspaceTopbar.vue'
import { useReaderWorkspaceProgress } from '../composables/useReaderWorkspaceProgress.js'
import { useReaderWorkspaceTranslations } from '../composables/useReaderWorkspaceTranslations.js'
import { builtInBooks, builtInChapterContent, builtInDictionary } from '../data/builtInReaderData.js'
import {
  createPastedChapterContent,
  findBook,
  findBookChapterContent,
  findChapter,
  getDefaultHighlights,
  getChapterHighlights,
  getChapterVocabulary,
  getSessionVocabulary,
  getWordContext,
  getChapters,
  getChapterParagraphs,
  getChapterReadingSummary,
  getChapterSentenceIds,
  getReadingProgress,
  mapWordLookupDetailToWordPanel,
  mapDictionaryEntryToWordPanel,
  removeSentenceHighlight,
  toggleSentenceHighlight,
} from '../data/readerWorkspaceSelectors.js'
import { readClipboardText } from '../utils/clipboard.js'
import { getInitialReaderFontSize, saveReaderFontSize } from '../utils/readerFontSize.js'
import { isWordSaved, removeVocabularyWord, saveVocabularyWord } from '../utils/vocabulary.js'
import { normalizeWord } from '../utils/word.js'
import {
  appendImportedBook,
  createImportedBookFromText,
  getImportedChapterContentById,
  loadImportedBooks,
  removeImportedBook,
} from '../utils/bookImport.js'
import { getBookTitleFromFileName, parseBookFile } from '../utils/bookFileParser.js'
import { getRecentReadingBookId } from '../utils/readingResume.js'
import '../reader-workspace.css'

const fallbackChapterId = 'chapter-4'
const defaultHighlightColorId = 'yellow'
const highlightColors = [
  { id: 'yellow', label: '黄色' },
  { id: 'green', label: '绿色' },
  { id: 'blue', label: '蓝色' },
  { id: 'pink', label: '粉色' },
  { id: 'purple', label: '紫色' },
]

function createInitialHighlights() {
  return Object.fromEntries(
    Object.entries(builtInChapterContent).map(([chapterId, chapterContent]) => [
      chapterId,
      getDefaultHighlights(chapterContent, defaultHighlightColorId),
    ]),
  )
}

const activeBookId = ref('quiet-observatory')
const activeChapterId = ref('chapter-4')
const isReaderReady = ref(false)
const readerFontSize = ref(getInitialReaderFontSize())
const wideWorkspace = window.matchMedia('(min-width: 1041px)')
const isWideWorkspace = ref(wideWorkspace.matches)
const readingArea = ref(null)
const sidebarPreference = ref(null)
const isFocusMode = ref(false)
const isDictionaryOpen = ref(false)
const isDictionaryPinned = ref(false)
const isSidebarOpen = computed(() => !isFocusMode.value && (sidebarPreference.value ?? isWideWorkspace.value))
const isDictionaryDrawerOpen = computed(() => isDictionaryOpen.value && !isWideWorkspace.value)
let dictionaryTrigger = null
const showHighlight = ref(true)
const isHighlightMode = ref(false)
const activeHighlightColorId = ref(defaultHighlightColorId)
const isHighlightClearMode = ref(false)
const sentenceHighlightsByChapter = ref(createInitialHighlights())
const selectedWordKey = ref(null)
const selectedWordContext = ref(null)
const selectedWordLookupDetail = ref(null)
const sessionVocabularyWordKeys = ref([])
const vocabularyMessage = ref('')
const vocabularyMessageType = ref('success')
const vocabularyVersion = ref(0)
const isWordLoading = ref(false)
const loadingWord = ref('')
const wordErrorMessage = ref('')
const importedBooks = ref([])
const pastedChapterContent = ref(null)
const pastedArticleVersion = ref(0)
const pastedReadingBookId = computed(() => `pasted-article:${pastedArticleVersion.value}`)
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
const wordCache = Object.create(null)
const wordRequests = Object.create(null)
let currentWordRequestId = 0

const books = computed(() => [...importedBooks.value, ...builtInBooks])

const importedChapterContentById = computed(() => getImportedChapterContentById(importedBooks.value))

const chapterContentById = computed(() => ({
  ...builtInChapterContent,
  ...importedChapterContentById.value,
}))

const currentBook = computed(() => findBook(books.value, activeBookId.value))

const chapters = computed(() => getChapters(currentBook.value))

const pastedArticleChapter = computed(() => {
  if (!pastedChapterContent.value) {
    return null
  }

  return {
    id: pastedChapterContent.value.id,
    number: pastedChapterContent.value.number,
    title: pastedChapterContent.value.title,
    level: 'Paste',
  }
})

const sidebarActiveChapterId = computed(() => {
  return isPastedArticleActive.value ? null : currentChapterContent.value?.id
})

// 粘贴文章优先显示，切回书架后再按当前书籍和章节查找正文。
const currentChapterContent = computed(() => {
  if (isPastedArticleActive.value && pastedChapterContent.value) {
    return pastedChapterContent.value
  }

  return findBookChapterContent(
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

  return currentChapterContent.value
    ? findChapter(chapters.value, currentChapterContent.value.id, currentChapterContent.value)
    : null
})

const paragraphs = computed(() => getChapterParagraphs(currentChapterContent.value))

const {
  clearSentenceSelection,
  clearTranslationState,
  displayParagraphs,
  retrySentenceTranslation,
  retryParagraphTranslation,
  selectSentence,
  selectedSentenceId,
  translateParagraph,
} = useReaderWorkspaceTranslations({
  currentChapter,
  currentChapterContent,
  paragraphs,
  pastedArticleVersion,
  isPastedArticleActive,
  pastedChapterContent,
})

const currentChapterHighlights = computed(() => {
  return getChapterHighlights(sentenceHighlightsByChapter.value, currentChapter.value?.id)
})

const readingContext = computed(() => {
  const chapterId = currentChapterContent.value?.id
  if (!chapterId) {
    return null
  }

  if (isPastedArticleActive.value) {
    return { bookId: pastedReadingBookId.value, chapterId, isTemporary: true }
  }

  const book = currentBook.value
  return {
    bookId: book.id,
    chapterId,
    requiresImportedBook: book.isImported,
    isTemporary: book.isTemporary,
  }
})

const progress = useReaderWorkspaceProgress({
  readingArea,
  readingContext,
  isPaperVisible: computed(() => isReaderReady.value && !isBookImportOpen.value && !isPasteEditorOpen.value),
  isObscured: isDictionaryDrawerOpen,
})

const chapterSentenceIds = computed(() => new Map(chapters.value.map(({ id }) => [
  id,
  getChapterSentenceIds(chapterContentById.value[id]),
])))

const readingChapters = computed(() => chapters.value.map((chapter) => getChapterReadingSummary(
  chapter,
  chapterSentenceIds.value.get(chapter.id),
  progress.getReadSentenceIds(currentBook.value.id, chapter.id),
)))

const readingProgress = computed(() => {
  if (isPastedArticleActive.value) {
    const chapter = pastedArticleChapter.value
    const summary = getChapterReadingSummary(
      chapter,
      getChapterSentenceIds(pastedChapterContent.value),
      progress.getReadSentenceIds(pastedReadingBookId.value, chapter.id),
    )
    return getReadingProgress([summary], chapter.id)
  }
  return getReadingProgress(readingChapters.value, currentChapterContent.value?.id)
})

const chapterVocabulary = computed(() => {
  return getChapterVocabulary(currentChapterContent.value, builtInDictionary, sessionVocabularyWordKeys.value)
})

const sessionVocabulary = computed(() => {
  return getSessionVocabulary(currentChapterContent.value, builtInDictionary, sessionVocabularyWordKeys.value)
})

const selectedParagraphId = computed(() => selectedWordContext.value?.paragraphId || null)

const selectedWordEntry = computed(() => {
  if (!selectedWordKey.value) {
    return null
  }

  const localEntry = builtInDictionary[selectedWordKey.value]

  if (localEntry) {
    return mapDictionaryEntryToWordPanel(builtInDictionary[selectedWordKey.value], selectedWordContext.value)
  }

  if (selectedWordLookupDetail.value) {
    return mapWordLookupDetailToWordPanel(selectedWordLookupDetail.value, selectedWordContext.value)
  }

  return mapDictionaryEntryToWordPanel(null, selectedWordContext.value)
})

const isSelectedWordAdded = computed(() => {
  vocabularyVersion.value

  if (!selectedWordKey.value || !selectedWordEntry.value) {
    return false
  }

  return sessionVocabularyWordKeys.value.includes(selectedWordKey.value) || isWordSaved(selectedWordEntry.value.word)
})

function hasCachedValue(cache, key) {
  return Object.prototype.hasOwnProperty.call(cache, key)
}

function getErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage
}

function getWordLookupDetail(word) {
  const cacheKey = normalizeWord(word)

  if (!cacheKey) {
    return Promise.resolve(null)
  }

  if (hasCachedValue(wordCache, cacheKey)) {
    return Promise.resolve(wordCache[cacheKey])
  }

  if (!wordRequests[cacheKey]) {
    wordRequests[cacheKey] = requestWordLookup(word)
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
  return highlightColors.some((color) => color.id === colorId)
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
  // 每章单独记录句子高亮，切换章节时读取对应记录。
  const chapterId = currentChapter.value?.id

  if (!chapterId) {
    return
  }

  sentenceHighlightsByChapter.value = {
    ...sentenceHighlightsByChapter.value,
    [chapterId]: nextChapterHighlights,
  }
}

function handleSentenceHighlightToggle(sentenceId) {
  if (!isHighlightMode.value || !sentenceId) {
    return
  }

  const nextChapterHighlights = isHighlightClearMode.value
    ? removeSentenceHighlight(currentChapterHighlights.value, sentenceId)
    : toggleSentenceHighlight(currentChapterHighlights.value, sentenceId, activeHighlightColorId.value)

  setCurrentChapterHighlights(nextChapterHighlights)
}

async function preserveReadingPosition(update, preferredAnchor) {
  progress.flushPosition()
  const area = readingArea.value
  let anchor = null
  if (area) {
    const viewport = area.getBoundingClientRect()
    const isVisible = (element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.bottom > viewport.top && bounds.top < viewport.bottom
    }
    anchor = preferredAnchor && area.contains(preferredAnchor) && isVisible(preferredAnchor)
      ? preferredAnchor
      : Array.from(area.querySelectorAll('.sentence-shell')).find(isVisible)
  }
  const top = anchor?.getBoundingClientRect().top

  update()
  await nextTick()
  if (anchor?.isConnected) {
    // 栏宽变化会重新折行，按原文位置补偿滚动距离。
    area.scrollTop += anchor.getBoundingClientRect().top - top
  }
  progress.syncScrollPosition()
}

function updateReaderFontSize(size) {
  preserveReadingPosition(() => { readerFontSize.value = saveReaderFontSize(size) })
}

function toggleSidebar() {
  preserveReadingPosition(() => {
    sidebarPreference.value = !isSidebarOpen.value
    isFocusMode.value = false
  })
}

function toggleFocusMode() {
  preserveReadingPosition(() => {
    isFocusMode.value = !isFocusMode.value
    if (isFocusMode.value) {
      resetDictionary()
    }
  })
}

function focusDictionary() {
  document.getElementById('workspace-dictionary-close')?.focus({ preventScroll: true })
}

async function openDictionary(event) {
  const trigger = event?.currentTarget
  if (trigger && !trigger.closest('#workspace-dictionary')) {
    dictionaryTrigger = trigger
  }
  if (isDictionaryOpen.value) {
    return
  }
  await preserveReadingPosition(() => {
    isDictionaryOpen.value = true
  }, trigger)
  if (event?.detail === 0 && isWideWorkspace.value) {
    focusDictionary()
  }
}

function resetDictionary() {
  isDictionaryOpen.value = false
  isDictionaryPinned.value = false
  dictionaryTrigger = null
  clearSelectedWord()
}

async function closeDictionary(restoreFocus = true) {
  const trigger = dictionaryTrigger
  await preserveReadingPosition(resetDictionary, trigger)
  if (restoreFocus) {
    const focusTarget = trigger?.isConnected ? trigger : document.getElementById('workspace-dictionary-toggle')
    focusTarget?.focus({ preventScroll: true })
  }
}

function toggleDictionary(event) {
  return isDictionaryOpen.value ? closeDictionary() : openDictionary(event)
}

function dismissDictionaryFromReadingArea(event) {
  if (!isDictionaryOpen.value || isDictionaryPinned.value || window.getSelection()?.isCollapsed === false) {
    return
  }
  if (!event.target.closest('.sentence-shell, .sentence-translation-text, .translation-text, button, a, input, textarea')) {
    closeDictionary(false)
  }
}

function updateWorkspaceWidth(event) {
  isWideWorkspace.value = event.matches
}

function handleWorkspaceKeydown(event) {
  if (event.key === 'Escape' && !event.defaultPrevented && isDictionaryOpen.value) {
    event.preventDefault()
    closeDictionary()
  }
}

function selectBook(bookId) {
  const nextBook = findBook(books.value, bookId)

  if (!nextBook) {
    return
  }

  activeBookId.value = nextBook.id
  activeChapterId.value = progress.getResumeChapterId(nextBook) || fallbackChapterId
  isPastedArticleActive.value = false
  isPasteEditorOpen.value = false
  isBookImportOpen.value = false
  pasteDraft.value = ''
  pasteArticleMessage.value = ''
  clearBookImportForm()
  clearSelectedWord()
}

function selectChapter(chapterId) {
  if (!isWideWorkspace.value) {
    sidebarPreference.value = false
  }
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

  const result = await removeImportedBook(bookId)

  if (!result.deleted) {
    return
  }

  updateAfterImportedBookDeleted(deletedBook, result.books)
}

function updateAfterImportedBookDeleted(deletedBook, nextImportedBooks) {
  if (activeBookId.value === deletedBook.id && !isPastedArticleActive.value) {
    progress.stopReading()
  }
  progress.forgetReading(deletedBook.id, deletedBook.chapters.map(({ id }) => id), deletedBook.isTemporary)
  importedBooks.value = nextImportedBooks
  removeHighlightsForBook(deletedBook)

  if (activeBookId.value !== deletedBook.id) {
    return
  }

  const nextBook = getFirstReadableBook(nextImportedBooks)

  if (nextBook) {
    activeBookId.value = nextBook.id
    activeChapterId.value = progress.getResumeChapterId(nextBook) || fallbackChapterId
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
  const nextBooks = [...nextImportedBooks, ...builtInBooks]

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
  const [storedBooks] = await Promise.all([loadImportedBooks(), progress.loadCoverage()])
  importedBooks.value = storedBooks
  const recentBookId = getRecentReadingBookId()
  if (books.value.some(({ id }) => id === recentBookId)) {
    selectBook(recentBookId)
  }
  isReaderReady.value = true
}

function activateImportedBook(importedBook, nextImportedBooks) {
  importedBooks.value = nextImportedBooks
  activeBookId.value = importedBook.id
  activeChapterId.value = progress.getResumeChapterId(importedBook) || fallbackChapterId
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

async function selectWord(selection, event) {
  const wordSelection = typeof selection === 'string' ? { wordKey: selection } : selection

  selectedWordKey.value = wordSelection?.wordKey || null
  selectedWordContext.value = getWordContext(currentChapterContent.value, wordSelection)
  selectedWordLookupDetail.value = null
  wordErrorMessage.value = ''
  vocabularyMessage.value = ''

  if (!selectedWordKey.value) {
    return
  }

  openDictionary(event)
  isWordLoading.value = false
  loadingWord.value = ''

  if (builtInDictionary[selectedWordKey.value]) {
    currentWordRequestId += 1
    return
  }

  const requestWord = selectedWordContext.value?.surface || wordSelection?.surface || selectedWordKey.value
  const normalizedRequestWord = normalizeWord(requestWord)

  if (!normalizedRequestWord) {
    return
  }

  // 连续点击单词时，只有最新一次查询能更新释义面板。
  const requestId = ++currentWordRequestId

  if (hasCachedValue(wordCache, normalizedRequestWord)) {
    selectedWordLookupDetail.value = wordCache[normalizedRequestWord]
    return
  }

  isWordLoading.value = true
  loadingWord.value = requestWord

  try {
    const detail = await getWordLookupDetail(requestWord)

    if (requestId !== currentWordRequestId) {
      return
    }

    selectedWordLookupDetail.value = detail
  } catch (error) {
    if (requestId !== currentWordRequestId) {
      return
    }

    wordErrorMessage.value = getErrorMessage(error, '查词失败。')
  } finally {
    if (requestId === currentWordRequestId) {
      isWordLoading.value = false
      loadingWord.value = ''
    }
  }
}

function addSelectedWordToVocabulary() {
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
    vocabularyMessage.value = result.error
    vocabularyMessageType.value = 'error'
    return
  }

  // 持久化成功后再更新右侧面板的本轮加入记录。
  if (!sessionVocabularyWordKeys.value.includes(selectedWordKey.value)) {
    sessionVocabularyWordKeys.value = [...sessionVocabularyWordKeys.value, selectedWordKey.value]
  }

  vocabularyMessage.value = result.added ? '已加入生词本' : '已在生词本中'
  vocabularyMessageType.value = 'success'
}

function removeWordFromVocabulary(wordKey = selectedWordKey.value) {
  if (!wordKey) {
    return
  }

  const sessionVocabularyItem = sessionVocabulary.value.find((item) => item.wordKey === wordKey)
  const removeTarget = wordKey === selectedWordKey.value
    ? selectedWordEntry.value?.word || wordKey
    : sessionVocabularyItem?.word || wordKey
  const result = removeVocabularyWord(removeTarget)

  vocabularyVersion.value += 1
  sessionVocabularyWordKeys.value = sessionVocabularyWordKeys.value.filter((item) => item !== wordKey)

  if (result.error) {
    vocabularyMessage.value = result.error
    vocabularyMessageType.value = 'error'
    return
  }

  vocabularyMessage.value = '已从生词本移出'
  vocabularyMessageType.value = 'success'
}

function retrySelectedWordLookup() {
  if (!selectedWordKey.value || builtInDictionary[selectedWordKey.value]) {
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
  selectedWordLookupDetail.value = null
  isWordLoading.value = false
  loadingWord.value = ''
  wordErrorMessage.value = ''
  vocabularyMessage.value = ''
  vocabularyMessageType.value = 'success'
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
  if (!isWideWorkspace.value) {
    sidebarPreference.value = false
  }
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
  bookImportTitle.value = file ? getBookTitleFromFileName(file.name) : ''
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
    const parsedFile = await parseBookFile(bookImportFile.value)

    if (!parsedFile.ok) {
      bookImportMessage.value = getBookImportMessage(parsedFile.reason)
      bookImportMessageType.value = 'error'
      return
    }

    const importedBook = createImportedBookFromText({
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

    const result = await appendImportedBook(importedBook)

    if (!result.ok) {
      // 写入失败时仍可在本轮阅读已解析的书籍。
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
  const pastedChapter = createPastedChapterContent(pasteDraft.value)

  if (!pastedChapter) {
    pasteArticleMessage.value = getPasteArticleMessage('empty')
    pasteArticleMessageType.value = 'error'
    return
  }

  if (pastedChapterContent.value) {
    progress.stopReading()
    progress.forgetReading(pastedReadingBookId.value, [pastedChapterContent.value.id], true)
  }
  pastedChapterContent.value = pastedChapter
  isPastedArticleActive.value = true
  pastedArticleVersion.value += 1
  isPasteEditorOpen.value = false
  pasteDraft.value = ''
  sentenceHighlightsByChapter.value = {
    ...sentenceHighlightsByChapter.value,
    [pastedChapter.id]: {},
  }
  clearSentenceSelection()
  clearTranslationState()
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

onMounted(() => {
  wideWorkspace.addEventListener('change', updateWorkspaceWidth)
  window.addEventListener('keydown', handleWorkspaceKeydown)
})

onUnmounted(() => {
  wideWorkspace.removeEventListener('change', updateWorkspaceWidth)
  window.removeEventListener('keydown', handleWorkspaceKeydown)
})

watch(isDictionaryDrawerOpen, (open) => {
  if (open) {
    focusDictionary()
  }
}, { flush: 'post' })

watch(currentChapterContent, () => {
  clearSentenceSelection()
  if (isDictionaryOpen.value && !isDictionaryPinned.value) {
    resetDictionary()
  }
})
</script>
