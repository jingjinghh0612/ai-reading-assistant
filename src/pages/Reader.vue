<template>
  <section class="page reader-page">
    <div class="page-intro">
      <p class="eyebrow">Reader</p>
      <h1>Read with translation, word notes, and summary</h1>
      <p class="page-description">
        Click a sentence to translate it. Click a word to see its meaning and save it to your vocabulary.
      </p>
    </div>

    <div v-if="sentences.length" class="reader-layout">
      <SentenceViewer
        :sentences="sentences"
        :selected-index="selectedIndex"
        :loading-index="loadingIndex"
        :selected-word="selectedWord"
        :loading-word="loadingWord"
        @select="selectSentence"
        @select-word="selectWord"
      />

      <aside class="card selected-panel">
        <p class="field-label">Selected sentence</p>
        <p class="selected-sentence">
          {{ selectedSentence || 'Click a sentence on the left first.' }}
        </p>

        <div class="reader-actions-row">
          <span v-if="sentenceProgressText" class="progress-pill">{{ sentenceProgressText }}</span>
          <RouterLink class="secondary-link review-link" :to="{ path: '/vocabulary', query: { status: 'review' } }">
            Review vocabulary
          </RouterLink>
        </div>

        <div class="translation-block">
          <p class="field-label">Chinese translation</p>

          <p v-if="!selectedSentence" class="translation-placeholder">
            Select a sentence to load its translation.
          </p>

          <p v-else-if="isLoading" class="translation-loading">
            Loading translation...
          </p>

          <div v-else-if="errorMessage" class="translation-error">
            <p>{{ errorMessage }}</p>
            <button class="error-action" @click="retrySelectedSentence">Retry translation</button>
          </div>

          <p v-else-if="translation" class="translation-result">
            {{ translation }}
          </p>

          <p v-else class="translation-placeholder">
            Translation result will appear here.
          </p>
        </div>

        <div class="summary-block">
          <div class="panel-heading">
            <p class="field-label">Article summary</p>
            <button
              class="text-button"
              :disabled="!article || isSummaryLoading"
              @click="loadSummary(Boolean(summary))"
            >
              {{ summaryButtonText }}
            </button>
          </div>

          <p v-if="isSummaryLoading" class="translation-loading">
            Loading summary...
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
            Click Summarize to get a short Chinese summary.
          </p>
        </div>

        <div class="word-block">
          <p class="field-label">Word explanation</p>

          <p v-if="!selectedWord" class="translation-placeholder">
            Click a word in the article to view its meaning.
          </p>

          <p v-else-if="isWordLoading" class="translation-loading">
            Loading word explanation...
          </p>

          <div v-else-if="wordErrorMessage" class="translation-error">
            <p>{{ wordErrorMessage }}</p>
            <button class="error-action" @click="retrySelectedWord">Retry word</button>
          </div>

          <div v-else-if="selectedWordDetail" class="word-detail">
            <div class="word-header">
              <div>
                <p class="word-title">{{ selectedWordDetail.word }}</p>
                <p class="word-part">{{ selectedWordDetail.partOfSpeech }}</p>
              </div>

              <button
                class="small-button"
                :disabled="selectedWordIsSaved"
                @click="addSelectedWordToVocabulary"
              >
                {{ selectedWordIsSaved ? 'Saved' : 'Add' }}
              </button>
            </div>

            <p class="word-definition">{{ selectedWordDetail.meaning }}</p>
            <p class="word-example">{{ selectedWordDetail.example }}</p>
            <p v-if="vocabularyMessage" :class="vocabularyMessageClass">{{ vocabularyMessage }}</p>
          </div>
        </div>
      </aside>
    </div>

    <div v-else class="card empty-state">
      <p>There is no article to read yet.</p>
      <RouterLink class="secondary-link" to="/">Go back home and add an article</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { requestSummary } from '../api/summarize.js'
import { requestTranslation } from '../api/translate.js'
import { requestWordExplanation } from '../api/word.js'
import SentenceViewer from '../components/SentenceViewer.vue'
import { getArticleById, updateArticleProgress } from '../utils/articleHistory.js'
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
const selectedIndex = ref(getInitialSelectedIndex())
const loadingIndex = ref(-1)
const isLoading = ref(false)
const translation = ref('')
const errorMessage = ref('')
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

const sentenceProgressText = computed(() => {
  if (selectedIndex.value < 0 || !sentences.length) {
    return ''
  }

  return `Sentence ${selectedIndex.value + 1} of ${sentences.length}`
})

const selectedWordIsSaved = computed(() => {
  vocabularyVersion.value

  if (!selectedWordDetail.value) {
    return false
  }

  return isWordSaved(selectedWordDetail.value.word)
})

const vocabularyMessageClass = computed(() => ({
  'save-message': true,
  error: vocabularyMessageType.value === 'error',
}))

const summaryButtonText = computed(() => {
  if (isSummaryLoading.value) {
    return 'Loading'
  }

  return summary.value ? 'Refresh' : 'Summarize'
})

function hasCachedValue(cache, key) {
  return Object.prototype.hasOwnProperty.call(cache, key)
}

function getErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage
}

function getInitialSelectedIndex() {
  if (!savedArticle || !sentences.length) {
    return -1
  }

  return Math.min(savedArticle.currentSentenceIndex, sentences.length - 1)
}

function saveReadingProgress(index) {
  if (!routeArticleId) {
    return
  }

  updateArticleProgress(routeArticleId, index)
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
  const cacheKey = sentence?.trim()

  if (!sentence) {
    return
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
  } catch (error) {
    if (requestId !== currentRequestId) {
      return
    }

    errorMessage.value = getErrorMessage(error, 'Failed to load the translation.')
  } finally {
    if (requestId === currentRequestId) {
      isLoading.value = false
      loadingIndex.value = -1
    }
  }
}

async function selectWord({ word, sentenceIndex }) {
  const normalizedWord = normalizeWord(word)

  if (!normalizedWord) {
    return
  }

  selectSentence(sentenceIndex, { keepWord: true })

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

    wordErrorMessage.value = getErrorMessage(error, 'Failed to load the word explanation.')
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

    summaryErrorMessage.value = getErrorMessage(error, 'Failed to load the summary.')
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

  const result = saveVocabularyWord(selectedWordDetail.value)
  vocabularyVersion.value += 1

  if (result.error) {
    vocabularyMessage.value = result.error
    vocabularyMessageType.value = 'error'
    return
  }

  vocabularyMessage.value = result.added ? 'Added to vocabulary.' : 'This word is already saved.'
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
  resetWordState()
  resetTranslationState()
}

if (!sentences.length) {
  clearSelection()
} else {
  resetTranslationState()
}
</script>
