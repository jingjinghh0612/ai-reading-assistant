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
          :paragraphs="paragraphs"
          :show-translation="showTranslation"
          :show-highlight="showHighlight"
          :sentence-highlights="currentChapterHighlights"
          :is-highlight-mode="isHighlightMode"
          :active-highlight-color-id="activeHighlightColorId"
          :selected-word-key="selectedWordKey"
          :selected-paragraph-id="selectedParagraphId"
          @select-word="selectWord"
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
        :message="wordbookMessage"
        @select-word="selectWord"
        @add-word="addToMockWordbook"
        @remove-word="removeFromMockWordbook"
        @show-wordbook="clearSelectedWord"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
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
  getPrototypeMockWordbook,
  getPrototypeWordContext,
  getPrototypeChapters,
  getPrototypeParagraphs,
  getPrototypeReadingProgress,
  mapDictionaryEntryToWordPanel,
  removePrototypeSentenceHighlight,
  togglePrototypeSentenceHighlight,
} from '../data/readerPrototypeSelectors.js'
import { readClipboardText } from '../utils/clipboard.js'
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
const addedWordKeys = ref([])
const wordbookMessage = ref('')
const importedBooks = ref(loadImportedPrototypeBooks())
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

  return mapDictionaryEntryToWordPanel(prototypeDictionary[selectedWordKey.value], selectedWordContext.value)
})

const isSelectedWordAdded = computed(() => {
  return selectedWordKey.value ? addedWordKeys.value.includes(selectedWordKey.value) : false
})

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

function deleteImportedBook(bookId) {
  const deletedBook = importedBooks.value.find((item) => item.id === bookId)

  if (!deletedBook) {
    return
  }

  const result = removeImportedPrototypeBook(bookId)

  if (!result.deleted) {
    return
  }

  importedBooks.value = result.books
  removeHighlightsForBook(deletedBook)

  if (activeBookId.value !== bookId) {
    return
  }

  const nextBook = getFirstReadableBook(result.books)

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

function selectWord(selection) {
  const wordSelection = typeof selection === 'string' ? { wordKey: selection } : selection

  selectedWordKey.value = wordSelection?.wordKey || null
  selectedWordContext.value = getPrototypeWordContext(currentChapterContent.value, wordSelection)
  wordbookMessage.value = ''
}

function addToMockWordbook() {
  if (!selectedWordKey.value) {
    return
  }

  if (!addedWordKeys.value.includes(selectedWordKey.value)) {
    addedWordKeys.value = [...addedWordKeys.value, selectedWordKey.value]
  }

  wordbookMessage.value = '已加入本地模拟生词本'
}

function removeFromMockWordbook(wordKey = selectedWordKey.value) {
  if (!wordKey) {
    return
  }

  addedWordKeys.value = addedWordKeys.value.filter((item) => item !== wordKey)
  wordbookMessage.value = '已从本地模拟生词本移出'
}

function clearSelectedWord() {
  selectedWordKey.value = null
  selectedWordContext.value = null
  wordbookMessage.value = ''
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

    const result = appendImportedPrototypeBook(importedBook)

    if (!result.ok) {
      bookImportMessage.value = getBookImportMessage('storage')
      bookImportMessageType.value = 'error'
      return
    }

    importedBooks.value = result.books
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
</script>
