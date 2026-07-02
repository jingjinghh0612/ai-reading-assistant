<template>
  <section class="page reader-page" :class="{ 'has-article': sentences.length }">
    <div v-if="sentences.length" class="reader-session-header">
      <div>
        <p class="eyebrow">{{ t('reader.eyebrow') }}</p>
        <h1>{{ readerTitle }}</h1>
      </div>

      <span v-if="sentenceProgressText" class="progress-pill">{{ sentenceProgressText }}</span>
    </div>

    <div v-else class="page-intro">
      <p class="eyebrow">{{ t('reader.eyebrow') }}</p>
      <h1>{{ t('reader.title') }}</h1>
      <p class="page-description">
        {{ t('reader.description') }}
      </p>
    </div>

    <div v-if="sentences.length" class="reader-layout" :style="readerFontSizeStyle">
      <section class="reader-main-column">
        <div class="reader-paper">
          <SentenceViewer
            :sentences="sentences"
            :selected-index="selectedIndex"
            :selected-sentence="selectedSentence"
            :loading-index="loadingIndex"
            :translation="translation"
            :is-translation-loading="isLoading"
            :translation-error-message="errorMessage"
            :show-translation-card="translationCardVisible"
            :selected-word="selectedWord"
            :selected-word-detail="selectedWordDetail"
            :selected-word-is-saved="selectedWordIsSaved"
            :is-word-loading="isWordLoading"
            :loading-word="loadingWord"
            :word-error-message="wordErrorMessage"
            :vocabulary-message="vocabularyMessage"
            :vocabulary-message-type="vocabularyMessageType"
            :font-size="readerFontSize"
            :can-decrease-font-size="canDecreaseReaderFontSize"
            :can-increase-font-size="canIncreaseReaderFontSize"
            @select="selectSentence"
            @select-word="selectWord"
            @retry-translation="retrySelectedSentence"
            @close-translation-card="hideTranslationCard"
            @add-word="addSelectedWordToVocabulary"
            @retry-word="retrySelectedWord"
            @close-word-card="resetWordState"
            @decrease-font-size="decreaseReaderFontSize"
            @increase-font-size="increaseReaderFontSize"
          />

          <div class="reader-paper-footer">
            <div class="reader-progress-track" aria-hidden="true">
              <span :style="readerProgressStyle"></span>
            </div>

            <div class="reader-control-row">
              <div class="reader-stepper">
                <button class="secondary-button" :disabled="!canSelectPrevious" @click="selectPreviousSentence">
                  {{ t('reader.previous') }}
                </button>
                <button class="secondary-button" :disabled="!canSelectNext" @click="selectNextSentence">
                  {{ t('reader.next') }}
                </button>
              </div>

              <RouterLink class="secondary-link review-link" to="/review">
                {{ t('reader.reviewDueWords') }}
              </RouterLink>
            </div>
          </div>
        </div>
      </section>

      <aside class="card ai-panel">
        <div class="ai-panel-header">
          <div>
            <p class="field-label">{{ t('reader.aiPanelEyebrow') }}</p>
            <h2 class="ai-panel-title">{{ t('reader.aiPanelTitle') }}</h2>
          </div>
          <button class="toolbar-icon-button ai-panel-clear" type="button" disabled :title="t('toolbar.disabledFeature')">
            Clear
          </button>
        </div>

        <div class="context-selector" aria-label="AI context">
          <span class="context-label">{{ t('reader.contextLabel') }}</span>
          <span class="context-option active" aria-current="true">{{ t('reader.contextArticle') }}</span>
        </div>

        <div class="summary-block">
          <div class="panel-heading">
            <p class="field-label">{{ t('reader.summaryTitle') }}</p>
            <button
              class="text-button"
              :disabled="!article || isSummaryLoading"
              @click="loadSummary(Boolean(summary))"
            >
              {{ summaryButtonText }}
            </button>
          </div>

          <p v-if="isSummaryLoading" class="translation-loading">
            {{ t('reader.loadingSummary') }}
          </p>

          <p v-else-if="summaryErrorMessage" class="translation-error">
            {{ summaryErrorMessage }}
          </p>

          <div v-else-if="summary" class="summary-result">
            <p>{{ summary }}</p>
            <div v-if="summaryKeywords.length" class="keyword-list">
              <span v-for="keyword in summaryKeywords" :key="keyword" class="keyword-chip">
                {{ keyword }}
              </span>
            </div>
          </div>

          <p v-else class="translation-placeholder">
            {{ t('reader.summaryPlaceholder') }}
          </p>
        </div>

      </aside>
    </div>

    <div v-else class="card empty-state">
      <p>{{ t('common.emptyArticle') }}</p>
      <RouterLink class="secondary-link" to="/">{{ t('common.goHome') }}</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { requestSummary } from '../api/summarize.js'
import { requestTranslation } from '../api/translate.js'
import { requestWordExplanation } from '../api/word.js'
import SentenceViewer from '../components/SentenceViewer.vue'
import { getArticleById, getResumeSentenceIndex, updateArticleProgress } from '../utils/articleHistory.js'
import { t } from '../utils/locale.js'
import {
  getAdjacentSentenceIndex,
  getNextSentenceIndexForPrefetch,
  getReaderProgressPercent,
} from '../utils/readerNavigation.js'
import {
  MAX_READER_FONT_SIZE,
  MIN_READER_FONT_SIZE,
  adjustReaderFontSize,
  getInitialReaderFontSize,
  saveReaderFontSize,
} from '../utils/readerFontSize.js'
import { splitIntoSentences } from '../utils/sentence.js'
import { getStorageItem } from '../utils/storage.js'
import { getCachedTranslation, saveCachedTranslation } from '../utils/translationCache.js'
import { isWordSaved, saveVocabularyWord } from '../utils/vocabulary.js'
import { normalizeWord } from '../utils/word.js'

const STORAGE_KEY = 'ai-reading-article'

const route = useRoute()
const routeArticleId = typeof route.query.articleId === 'string' ? route.query.articleId : ''
const savedArticle = routeArticleId ? getArticleById(routeArticleId) : null
const routeArticle = typeof route.query.text === 'string' ? route.query.text : ''
const article = savedArticle?.content || routeArticle || getStorageItem(STORAGE_KEY)
const sentences = splitIntoSentences(article)
const resumeSentenceIndex = getResumeSentenceIndex(savedArticle, sentences.length)
const selectedIndex = ref(sentences.length ? Math.max(resumeSentenceIndex, 0) : -1)
const readerFontSize = ref(getInitialReaderFontSize())
const loadingIndex = ref(-1)
const isLoading = ref(false)
const translation = ref('')
const errorMessage = ref('')
const translationCardVisible = ref(false)
const translationCache = Object.create(null)
const translationRequests = Object.create(null)
let currentRequestId = 0
const summary = ref('')
const summaryKeywords = ref([])
const isSummaryLoading = ref(false)
const summaryErrorMessage = ref('')
const summaryCache = Object.create(null)
const summaryRequests = Object.create(null)
let currentSummaryRequestId = 0
const selectedWord = ref('')
const selectedWordDetail = ref(null)
const isWordLoading = ref(false)
const loadingWord = ref('')
const wordErrorMessage = ref('')
const vocabularyMessage = ref('')
const vocabularyMessageType = ref('success')
const vocabularyVersion = ref(0)
const wordCache = Object.create(null)
const wordRequests = Object.create(null)
let currentWordRequestId = 0

// These caches only live while Reader.vue is open.
// They keep repeated clicks from calling the AI endpoint again.
const selectedSentence = computed(() => {
  if (selectedIndex.value < 0) {
    return ''
  }

  return sentences[selectedIndex.value] || ''
})

const readerTitle = computed(() => savedArticle?.title || createReaderTitle(article))

const sentenceProgressText = computed(() => {
  if (selectedIndex.value < 0 || !sentences.length) {
    return ''
  }

  return t('reader.progress', {
    current: selectedIndex.value + 1,
    total: sentences.length,
  })
})

const canSelectPrevious = computed(() => selectedIndex.value > 0)
const canSelectNext = computed(() => selectedIndex.value >= 0 && selectedIndex.value < sentences.length - 1)
const canDecreaseReaderFontSize = computed(() => readerFontSize.value > MIN_READER_FONT_SIZE)
const canIncreaseReaderFontSize = computed(() => readerFontSize.value < MAX_READER_FONT_SIZE)
const readerFontSizeStyle = computed(() => ({
  '--reader-content-font-size': `${readerFontSize.value}px`,
}))
const readerProgressPercent = computed(() => getReaderProgressPercent(selectedIndex.value, sentences.length))
const readerProgressStyle = computed(() => ({
  '--reader-progress': `${readerProgressPercent.value}%`,
}))

const selectedWordIsSaved = computed(() => {
  vocabularyVersion.value

  if (!selectedWordDetail.value) {
    return false
  }

  return isWordSaved(selectedWordDetail.value.word)
})

const summaryButtonText = computed(() => {
  if (isSummaryLoading.value) {
    return t('common.loading')
  }

  return summary.value ? t('reader.refresh') : t('reader.summarize')
})

function hasCachedValue(cache, key) {
  return Object.prototype.hasOwnProperty.call(cache, key)
}

function getErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage
}

function createReaderTitle(text) {
  const compactTitle = String(text || '').replace(/\s+/g, ' ').trim()

  if (!compactTitle) {
    return t('reader.title')
  }

  return compactTitle.length > 86 ? `${compactTitle.slice(0, 83).trim()}...` : compactTitle
}

function saveReadingProgress(index) {
  if (!routeArticleId) {
    return
  }

  updateArticleProgress(routeArticleId, index)
}

function setReaderFontSize(nextFontSize) {
  readerFontSize.value = saveReaderFontSize(nextFontSize)
}

function decreaseReaderFontSize() {
  setReaderFontSize(adjustReaderFontSize(readerFontSize.value, -1))
}

function increaseReaderFontSize() {
  setReaderFontSize(adjustReaderFontSize(readerFontSize.value, 1))
}

function getTranslation(sentence) {
  const cacheKey = sentence.trim()

  if (hasCachedValue(translationCache, cacheKey)) {
    return Promise.resolve(translationCache[cacheKey])
  }

  const cachedTranslation = getCachedTranslation(sentence)

  if (cachedTranslation) {
    translationCache[cacheKey] = cachedTranslation
    return Promise.resolve(cachedTranslation)
  }

  if (!translationRequests[cacheKey]) {
    translationRequests[cacheKey] = requestTranslation(sentence)
      .then((data) => {
        translationCache[cacheKey] = data.translation
        saveCachedTranslation(sentence, data.translation)
        return data.translation
      })
      .finally(() => {
        delete translationRequests[cacheKey]
      })
  }

  return translationRequests[cacheKey]
}

function prefetchNextTranslation(index) {
  const nextIndex = getNextSentenceIndexForPrefetch(index, sentences.length)
  const nextSentence = sentences[nextIndex]

  if (!nextSentence) {
    return
  }

  getTranslation(nextSentence).catch(() => {})
}

function getWordDetail(word) {
  const cacheKey = normalizeWord(word)

  if (hasCachedValue(wordCache, cacheKey)) {
    return Promise.resolve(wordCache[cacheKey])
  }

  if (!wordRequests[cacheKey]) {
    wordRequests[cacheKey] = requestWordExplanation(word)
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

function getSummary(text, options = {}) {
  const cacheKey = text.trim()
  const shouldRefresh = Boolean(options.refresh)

  if (!shouldRefresh && hasCachedValue(summaryCache, cacheKey)) {
    return Promise.resolve(summaryCache[cacheKey])
  }

  if (!summaryRequests[cacheKey]) {
    summaryRequests[cacheKey] = requestSummary(text)
      .then((data) => {
        summaryCache[cacheKey] = {
          summary: data.summary || '',
          keywords: Array.isArray(data.keywords) ? data.keywords : [],
        }

        return summaryCache[cacheKey]
      })
      .finally(() => {
        delete summaryRequests[cacheKey]
      })
  }

  return summaryRequests[cacheKey]
}

async function selectSentence(index, options = {}) {
  const sentence = sentences[index]
  const shouldKeepWord = Boolean(options.keepWord)
  const shouldShowTranslationCard = options.showTranslationCard !== false
  const cacheKey = sentence?.trim()

  if (!sentence) {
    return
  }

  if (shouldShowTranslationCard) {
    translationCardVisible.value = true
  }

  if (!shouldKeepWord) {
    resetWordState()
  }

  if (index === loadingIndex.value) {
    return
  }

  selectedIndex.value = index
  saveReadingProgress(index)

  const cachedTranslation = translationCache[cacheKey] || getCachedTranslation(sentence)

  if (cachedTranslation) {
    translationCache[cacheKey] = cachedTranslation
    translation.value = cachedTranslation
    errorMessage.value = ''
    isLoading.value = false
    loadingIndex.value = -1
    prefetchNextTranslation(index)
    return
  }

  const requestId = ++currentRequestId

  translation.value = ''
  errorMessage.value = ''
  isLoading.value = true
  loadingIndex.value = index

  try {
    const translatedText = await getTranslation(sentence)

    if (requestId !== currentRequestId) {
      return
    }

    translation.value = translatedText
    prefetchNextTranslation(index)
  } catch (error) {
    if (requestId !== currentRequestId) {
      return
    }

    errorMessage.value = getErrorMessage(error, t('reader.failedTranslation'))
  } finally {
    if (requestId === currentRequestId) {
      isLoading.value = false
      loadingIndex.value = -1
    }
  }
}

function selectAdjacentSentence(direction) {
  const nextIndex = getAdjacentSentenceIndex(selectedIndex.value, sentences.length, direction)

  if (nextIndex < 0 || nextIndex === selectedIndex.value) {
    return
  }

  selectSentence(nextIndex)
}

function selectPreviousSentence() {
  if (!canSelectPrevious.value) {
    return
  }

  selectAdjacentSentence(-1)
}

function selectNextSentence() {
  if (!canSelectNext.value) {
    return
  }

  selectAdjacentSentence(1)
}

async function selectWord({ word, sentenceIndex }) {
  const normalizedWord = normalizeWord(word)

  if (!normalizedWord) {
    return
  }

  selectSentence(sentenceIndex, { keepWord: true, showTranslationCard: false })

  if (normalizedWord === normalizeWord(selectedWord.value) && isWordLoading.value) {
    return
  }

  selectedWord.value = word
  vocabularyMessage.value = ''
  vocabularyMessageType.value = 'success'

  if (hasCachedValue(wordCache, normalizedWord)) {
    selectedWordDetail.value = wordCache[normalizedWord]
    wordErrorMessage.value = ''
    isWordLoading.value = false
    loadingWord.value = ''
    return
  }

  const requestId = ++currentWordRequestId

  selectedWordDetail.value = null
  wordErrorMessage.value = ''
  isWordLoading.value = true
  loadingWord.value = normalizedWord

  try {
    const detail = await getWordDetail(word)

    if (requestId !== currentWordRequestId) {
      return
    }

    wordCache[normalizedWord] = detail
    selectedWordDetail.value = detail
  } catch (error) {
    if (requestId !== currentWordRequestId) {
      return
    }

    wordErrorMessage.value = getErrorMessage(error, t('reader.failedWord'))
  } finally {
    if (requestId === currentWordRequestId) {
      isWordLoading.value = false
      loadingWord.value = ''
    }
  }
}

async function loadSummary(refresh = false) {
  if (!article || isSummaryLoading.value) {
    return
  }

  const cacheKey = article.trim()

  if (!refresh && hasCachedValue(summaryCache, cacheKey)) {
    summary.value = summaryCache[cacheKey].summary
    summaryKeywords.value = summaryCache[cacheKey].keywords
    summaryErrorMessage.value = ''
    return
  }

  const requestId = ++currentSummaryRequestId

  summary.value = ''
  summaryKeywords.value = []
  summaryErrorMessage.value = ''
  isSummaryLoading.value = true

  try {
    const data = await getSummary(article, { refresh })

    if (requestId !== currentSummaryRequestId) {
      return
    }

    summary.value = data.summary
    summaryKeywords.value = data.keywords
  } catch (error) {
    if (requestId !== currentSummaryRequestId) {
      return
    }

    summaryErrorMessage.value = getErrorMessage(error, t('reader.failedSummary'))
  } finally {
    if (requestId === currentSummaryRequestId) {
      isSummaryLoading.value = false
    }
  }
}

function addSelectedWordToVocabulary() {
  if (!selectedWordDetail.value) {
    return
  }

  const result = saveVocabularyWord({
    ...selectedWordDetail.value,
    sentence: selectedSentence.value,
    articleTitle: readerTitle.value,
  })
  vocabularyVersion.value += 1

  if (result.error) {
    vocabularyMessage.value = result.error
    vocabularyMessageType.value = 'error'
    return
  }

  vocabularyMessage.value = result.added ? t('reader.addedMessage') : t('reader.alreadySavedMessage')
  vocabularyMessageType.value = 'success'
}

function retrySelectedSentence() {
  const sentence = selectedSentence.value.trim()

  if (!sentence || selectedIndex.value < 0) {
    return
  }

  delete translationCache[sentence]
  selectSentence(selectedIndex.value, { keepWord: true })
}

function retrySelectedWord() {
  const word = selectedWord.value
  const normalizedWord = normalizeWord(word)

  if (!word || !normalizedWord || selectedIndex.value < 0) {
    return
  }

  delete wordCache[normalizedWord]
  selectWord({ word, sentenceIndex: selectedIndex.value })
}

function resetTranslationState() {
  translation.value = ''
  errorMessage.value = ''
  isLoading.value = false
  loadingIndex.value = -1
}

function hideTranslationCard() {
  translationCardVisible.value = false
}

function resetWordState() {
  currentWordRequestId += 1
  selectedWord.value = ''
  selectedWordDetail.value = null
  isWordLoading.value = false
  loadingWord.value = ''
  wordErrorMessage.value = ''
  vocabularyMessage.value = ''
  vocabularyMessageType.value = 'success'
}

function clearSelection() {
  currentRequestId += 1
  selectedIndex.value = -1
  translationCardVisible.value = false
  resetWordState()
  resetTranslationState()
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()

  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

function handleReaderKeydown(event) {
  if (!sentences.length || event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) {
    return
  }

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown') {
    event.preventDefault()
    selectAdjacentSentence(1)
    return
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp') {
    event.preventDefault()
    selectAdjacentSentence(-1)
  }
}

if (!sentences.length) {
  clearSelection()
} else {
  selectSentence(selectedIndex.value, { keepWord: true })
}

onMounted(() => {
  window.addEventListener('keydown', handleReaderKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleReaderKeydown)
})
</script>
