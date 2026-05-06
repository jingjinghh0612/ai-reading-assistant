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
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { getStorageItem, setStorageItem } from '../utils/storage.js'

const STORAGE_KEY = 'ai-reading-article'

const router = useRouter()
const article = ref('')

onMounted(() => {
  article.value = getStorageItem(STORAGE_KEY)
})

function startReading() {
  const content = article.value.trim()

  if (!content) {
    window.alert('Please enter an English article first.')
    return
  }

  const saved = setStorageItem(STORAGE_KEY, content)

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
</script>
