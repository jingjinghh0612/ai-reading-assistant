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
            <span>{{ getProgressLabel(item) }}</span>
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
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { deleteArticleFromHistory, getArticleHistory, saveArticleToHistory } from '../utils/articleHistory.js'
import { getStorageItem, setStorageItem } from '../utils/storage.js'

const STORAGE_KEY = 'ai-reading-article'

const router = useRouter()
const article = ref('')
const recentArticles = ref([])
const historyErrorMessage = ref('')

onMounted(() => {
  article.value = getStorageItem(STORAGE_KEY)
  refreshArticleHistory()
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

function getProgressLabel(item) {
  if (!item.currentSentenceIndex) {
    return 'Not started'
  }

  return `Sentence ${item.currentSentenceIndex + 1}`
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
