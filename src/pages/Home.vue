<template>
  <section class="page home-page">
    <div class="page-intro home-hero">
      <p class="eyebrow">AI Reading Coach</p>
      <h1>Paste an English article. Read it sentence by sentence.</h1>
      <p class="page-description">
        Built for English beginners: translate sentences, explain words, and save useful vocabulary while you read.
      </p>
    </div>

    <div class="card home-card">
      <label class="field-label" for="article-input">English article</label>
      <textarea
        id="article-input"
        v-model="article"
        class="article-input"
        placeholder="Please paste your English article here."
        rows="12"
      />

      <div class="actions">
        <button class="primary-button" @click="startReading">Start Reading</button>
        <RouterLink class="secondary-link" to="/vocabulary">Open Vocabulary</RouterLink>
      </div>

      <p class="input-hint">Tip: paste a short paragraph first, then click any sentence or word on the reader page.</p>
    </div>

    <section v-if="words.length || recentArticles.length" class="today-learning">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Today</p>
          <h2>Learning dashboard</h2>
        </div>
      </div>

      <div class="learning-grid">
        <article class="card learning-card">
          <p class="field-label">Vocabulary review</p>
          <p class="learning-number">{{ dueWordCount }}</p>
          <p class="learning-copy">
            {{ dueWordCount === 1 ? 'word is due now.' : 'words are due now.' }}
          </p>
          <RouterLink class="secondary-button learning-action" to="/review">Start Review</RouterLink>
        </article>

        <article v-if="latestArticle" class="card learning-card">
          <p class="field-label">Continue reading</p>
          <p class="history-title">{{ latestArticle.title }}</p>
          <p class="history-snippet">{{ latestArticle.snippet }}</p>
          <button class="secondary-button learning-action" @click="continueArticle(latestArticle)">Continue</button>
        </article>
      </div>
    </section>

    <p v-if="historyErrorMessage" class="translation-error">{{ historyErrorMessage }}</p>

    <section v-if="recentArticles.length" class="recent-reading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">History</p>
          <h2>Recent reading</h2>
        </div>
      </div>

      <div class="history-list">
        <article v-for="item in recentArticles" :key="item.id" class="card history-card">
          <div>
            <p class="history-title">{{ item.title }}</p>
            <p class="history-snippet">{{ item.snippet }}</p>
          </div>

          <div class="history-meta">
            <span>{{ formatHistoryTime(item.updatedAt) }}</span>
            <span>{{ getArticleProgressLabel(item) }}</span>
          </div>

          <div class="history-actions">
            <button class="secondary-button" @click="continueArticle(item)">Continue</button>
            <button class="secondary-button" @click="fillArticle(item)">Fill in</button>
            <button class="danger-button" @click="deleteArticle(item)">Delete</button>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import {
  deleteArticleFromHistory,
  getArticleHistory,
  getArticleProgressLabel,
  saveArticleToHistory,
} from '../utils/articleHistory.js'
import { getStorageItem, setStorageItem } from '../utils/storage.js'
import { getDueVocabularyWords, getVocabularyWords } from '../utils/vocabulary.js'

const STORAGE_KEY = 'ai-reading-article'

const router = useRouter()
const article = ref('')
const recentArticles = ref([])
const words = ref([])
const historyErrorMessage = ref('')

const dueVocabularyWords = computed(() => getDueVocabularyWords(words.value))
const dueWordCount = computed(() => dueVocabularyWords.value.length)
const latestArticle = computed(() => recentArticles.value[0] || null)

onMounted(() => {
  article.value = getStorageItem(STORAGE_KEY)
  refreshArticleHistory()
  refreshVocabularyStats()
})

function startReading() {
  const content = article.value.trim()

  if (!content) {
    window.alert('Please enter an English article first.')
    return
  }

  const saved = setStorageItem(STORAGE_KEY, content)
  const historyResult = saveArticleToHistory(content)

  historyErrorMessage.value = historyResult.error || ''

  if (historyResult.article) {
    refreshArticleHistory()
    router.push({
      path: '/reader',
      query: {
        articleId: historyResult.article.id,
      },
    })
    return
  }

  if (saved) {
    router.push('/reader')
    return
  }

  router.push({
    path: '/reader',
    query: {
      text: content,
    },
  })
}

function refreshArticleHistory() {
  recentArticles.value = getArticleHistory().slice(0, 6)
}

function refreshVocabularyStats() {
  words.value = getVocabularyWords()
}

function continueArticle(item) {
  setStorageItem(STORAGE_KEY, item.content)
  router.push({
    path: '/reader',
    query: {
      articleId: item.id,
    },
  })
}

function fillArticle(item) {
  article.value = item.content
  historyErrorMessage.value = ''
}

function deleteArticle(item) {
  const result = deleteArticleFromHistory(item.id)

  historyErrorMessage.value = result.error || ''
  recentArticles.value = result.articles.slice(0, 6)
}

function formatHistoryTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>
