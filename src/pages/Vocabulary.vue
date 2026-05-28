<template>
  <section class="page vocabulary-page">
    <div class="page-intro">
      <p class="eyebrow">Vocabulary</p>
      <h1>Your saved words</h1>
      <p class="page-description">Review the words you saved while reading. Data is stored locally in your browser.</p>
    </div>

    <div v-if="words.length" class="card vocabulary-toolbar">
      <div>
        <p class="field-label">Search words</p>
        <input
          v-model="searchText"
          class="search-input"
          type="search"
          placeholder="Search by word or meaning..."
        />
      </div>

      <div class="filter-group">
        <p class="field-label">Review status</p>
        <div class="segmented-control">
          <button
            v-for="option in statusOptions"
            :key="option.value"
            class="filter-button"
            :class="{ active: statusFilter === option.value }"
            @click="setStatusFilter(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="vocabulary-summary">
        <span>{{ words.length }} words</span>
        <span>{{ reviewCount }} review</span>
        <span>{{ masteredCount }} mastered</span>
      </div>

      <button class="danger-button" @click="clearAllWords">Clear All</button>
    </div>

    <p v-if="errorMessage" class="translation-error">{{ errorMessage }}</p>

    <div v-if="filteredWords.length" class="vocabulary-list">
      <article
        v-for="word in filteredWords"
        :key="word.id"
        class="card vocabulary-card"
        :class="{ mastered: word.mastered }"
      >
        <div class="word-header">
          <div>
            <div class="word-title-row">
              <p class="word-title">{{ word.word }}</p>
              <span v-if="word.mastered" class="mastered-badge">Mastered</span>
            </div>
            <p class="word-part">{{ word.partOfSpeech }}</p>
          </div>

          <div class="word-actions">
            <button class="secondary-button" @click="toggleMastered(word)">
              {{ word.mastered ? 'Mark Review' : 'Mark Mastered' }}
            </button>
            <button class="danger-button" @click="deleteWord(word)">Delete</button>
          </div>
        </div>

        <p class="word-definition">{{ word.meaning }}</p>
        <p class="word-example">{{ word.example }}</p>
        <p class="word-meta">Added at {{ formatSavedAt(word.savedAt) }}</p>
      </article>
    </div>

    <div v-else-if="words.length" class="card placeholder-card">
      <p>No words match your filters.</p>
      <button class="secondary-button" @click="clearFilters">Clear Filters</button>
    </div>

    <div v-else class="card placeholder-card">
      <p>No saved words yet.</p>
      <RouterLink class="secondary-link" to="/reader">Go to Reader</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  clearVocabularyWords,
  filterVocabularyWords,
  getVocabularyWords,
  removeVocabularyWord,
  toggleVocabularyWordMastered,
} from '../utils/vocabulary.js'

const route = useRoute()
const words = ref(getVocabularyWords())
const searchText = ref('')
const errorMessage = ref('')
const statusOptions = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'review',
    label: 'Review',
  },
  {
    value: 'mastered',
    label: 'Mastered',
  },
]
const statusFilter = ref(getInitialStatusFilter(route.query.status))

const filteredWords = computed(() => {
  return filterVocabularyWords(words.value, {
    query: searchText.value,
    status: statusFilter.value,
  })
})

const reviewCount = computed(() => {
  return words.value.filter((word) => !word.mastered).length
})

const masteredCount = computed(() => {
  return words.value.filter((word) => word.mastered).length
})

function getInitialStatusFilter(status) {
  return statusOptions.some((option) => option.value === status) ? status : 'all'
}

function updateWords(result) {
  words.value = result.words
  errorMessage.value = result.error || ''
}

function setStatusFilter(status) {
  statusFilter.value = getInitialStatusFilter(status)
}

function clearFilters() {
  searchText.value = ''
  statusFilter.value = 'all'
}

function deleteWord(word) {
  updateWords(removeVocabularyWord(word.normalizedWord))
}

function toggleMastered(word) {
  updateWords(toggleVocabularyWordMastered(word.normalizedWord))
}

function clearAllWords() {
  const confirmed = window.confirm('Clear all saved vocabulary words? This cannot be undone.')

  if (!confirmed) {
    return
  }

  updateWords(clearVocabularyWords())
  searchText.value = ''
}

function formatSavedAt(savedAt) {
  const date = new Date(savedAt)

  if (Number.isNaN(date.getTime())) {
    return 'unknown time'
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>
