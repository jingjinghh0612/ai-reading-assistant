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
      @toggle-translation="showTranslation = !showTranslation"
      @toggle-highlight-visibility="showHighlight = !showHighlight"
      @toggle-highlight-mode="toggleHighlightMode"
      @select-highlight-color="selectHighlightColor"
      @select-highlight-clear="selectHighlightClear"
    />

    <div class="prototype-workspace">
      <PrototypeSidebar
        :books="prototypeBooks"
        :chapters="chapters"
        :active-book-id="activeBookId"
        :active-chapter-id="activeChapterId"
        :progress="readingProgress"
        @select-chapter="selectChapter"
      />

      <main class="prototype-reader" aria-label="英语阅读区">
        <PrototypeReadingPaper
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
import PrototypeReadingPaper from '../components/reader-prototype/PrototypeReadingPaper.vue'
import PrototypeSidebar from '../components/reader-prototype/PrototypeSidebar.vue'
import PrototypeTopbar from '../components/reader-prototype/PrototypeTopbar.vue'
import { prototypeBooks, prototypeChapterContent, prototypeDictionary } from '../data/readerPrototypeData.js'
import {
  findPrototypeBook,
  findPrototypeChapter,
  findPrototypeChapterContent,
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

const currentBook = computed(() => findPrototypeBook(prototypeBooks, activeBookId.value))

const chapters = computed(() => getPrototypeChapters(currentBook.value))

const currentChapterContent = computed(() => {
  return findPrototypeChapterContent(prototypeChapterContent, activeChapterId.value, fallbackChapterId)
})

const currentChapter = computed(() => {
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

function selectChapter(chapterId) {
  activeChapterId.value = chapterId
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
</script>
