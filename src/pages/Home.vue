<template>
  <section class="page home-page">
    <div class="page-intro home-hero">
      <p class="eyebrow">{{ t('home.eyebrow') }}</p>
      <h1>{{ t('home.title') }}</h1>
      <p class="page-description">
        {{ t('home.description') }}
      </p>
    </div>

    <div class="card home-card">
      <label class="field-label" for="article-input">{{ t('home.inputLabel') }}</label>
      <textarea
        id="article-input"
        v-model="article"
        class="article-input"
        :placeholder="t('home.placeholder')"
        rows="12"
      />

      <div class="actions">
        <button class="primary-button" @click="startReading">{{ t('home.start') }}</button>
        <RouterLink class="secondary-link" to="/vocabulary">{{ t('home.openVocabulary') }}</RouterLink>
      </div>

      <p class="input-hint">{{ t('home.inputHint') }}</p>
    </div>

    <section v-if="words.length || recentArticles.length" class="today-learning">
      <div class="section-heading">
        <div>
          <h2>{{ t('home.todayTitle') }}</h2>
        </div>
      </div>

      <div class="learning-grid">
        <article class="card learning-card">
          <p class="field-label">{{ t('home.vocabularyReview') }}</p>
          <p class="learning-number">{{ dueWordCount }}</p>
          <p class="learning-copy">
            {{ t('home.dueWords', { count: dueWordCount }) }}
          </p>
          <RouterLink class="secondary-button learning-action" to="/review">{{ t('home.startReview') }}</RouterLink>
        </article>

        <article v-if="latestArticle" class="card learning-card">
          <p class="field-label">{{ t('home.continueReading') }}</p>
          <p class="history-title">{{ latestArticle.title }}</p>
          <p class="history-snippet">{{ latestArticle.snippet }}</p>
          <button class="secondary-button learning-action" @click="continueArticle(latestArticle)">
            {{ t('home.continue') }}
          </button>
        </article>
      </div>
    </section>

    <p v-if="historyErrorMessage" class="translation-error">{{ historyErrorMessage }}</p>

    <section v-if="recentArticles.length" class="recent-reading">
      <div class="section-heading">
        <div>
          <h2>{{ t('home.historyTitle') }}</h2>
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
            <span>{{ getArticleProgressText(item) }}</span>
          </div>

          <div class="history-actions">
            <button class="secondary-button" @click="continueArticle(item)">{{ t('home.continue') }}</button>
            <button class="secondary-button" @click="fillArticle(item)">{{ t('home.fillIn') }}</button>
            <button class="danger-button" @click="deleteArticle(item)">{{ t('home.delete') }}</button>
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
  saveArticleToHistory,
} from '../utils/articleHistory.js'
import { getArticleProgressText, locale, t } from '../utils/locale.js'
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
    window.alert(t('home.emptyAlert'))
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
    return t('common.unknownTime')
  }

  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>
