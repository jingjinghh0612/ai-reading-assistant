<template>
  <section class="page vocabulary-page">
    <div class="page-intro">
      <p class="eyebrow">{{ t('vocabulary.eyebrow') }}</p>
      <h1>{{ t('vocabulary.title') }}</h1>
      <p class="page-description">{{ t('vocabulary.description') }}</p>
    </div>

    <div v-if="words.length" class="card vocabulary-toolbar">
      <div>
        <p class="field-label">{{ t('vocabulary.searchLabel') }}</p>
        <input
          v-model="searchText"
          class="search-input"
          type="search"
          :placeholder="t('vocabulary.searchPlaceholder')"
        />
      </div>

      <div class="filter-group">
        <p class="field-label">{{ t('vocabulary.statusLabel') }}</p>
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
        <span>{{ t('vocabulary.wordsCount', { count: words.length }) }}</span>
        <span>{{ t('vocabulary.dueCount', { count: dueCount }) }}</span>
        <span>{{ t('vocabulary.reviewCount', { count: reviewCount }) }}</span>
        <span>{{ t('vocabulary.masteredCount', { count: masteredCount }) }}</span>
      </div>

      <RouterLink class="secondary-button vocabulary-review-link" to="/review">
        {{ t('vocabulary.reviewDue') }}
      </RouterLink>
      <button class="quiet-danger-button" @click="clearAllWords">{{ t('vocabulary.clearAll') }}</button>
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
              <span v-if="word.mastered" class="mastered-badge">{{ t('vocabulary.mastered') }}</span>
            </div>
            <p v-if="word.partOfSpeech" class="word-part">{{ word.partOfSpeech }}</p>
          </div>

          <div class="word-actions">
            <button class="secondary-button" @click="toggleMastered(word)">
              {{ word.mastered ? t('vocabulary.markReview') : t('vocabulary.markMastered') }}
            </button>
            <button class="quiet-danger-button" @click="deleteWord(word)">{{ t('vocabulary.delete') }}</button>
          </div>
        </div>

        <div class="word-detail-list">
          <section class="word-detail-row">
            <p class="word-detail-label">{{ t('vocabulary.meaningLabel') }}</p>
            <p class="word-definition" :class="{ muted: !word.meaning }">{{ displayMeaning(word) }}</p>
          </section>
          <section class="word-detail-row">
            <p class="word-detail-label">{{ t('vocabulary.definitionLabel') }}</p>
            <p class="word-definition english-definition" :class="{ muted: !word.definition }">
              {{ displayDefinition(word) }}
            </p>
          </section>
          <section class="word-detail-row">
            <p class="word-detail-label">{{ t('vocabulary.sentenceLabel') }}</p>
            <p class="word-example" :class="{ muted: !word.sentence }">{{ displaySentence(word) }}</p>
          </section>
        </div>

        <div class="word-meta-list">
          <p class="word-meta">{{ t('vocabulary.sourceArticle', { title: displayArticleTitle(word) }) }}</p>
          <p class="word-meta">{{ t('vocabulary.addedAt', { time: formatSavedAt(word.createdAt) }) }}</p>
          <p class="word-meta">
          {{ t('vocabulary.nextReview', { time: formatReviewTime(word.nextReviewAt) }) }}
          </p>
        </div>
      </article>
    </div>

    <div v-else-if="words.length" class="card placeholder-card">
      <p>{{ t('vocabulary.noMatches') }}</p>
      <button class="secondary-button" @click="clearFilters">{{ t('vocabulary.clearFilters') }}</button>
    </div>

    <div v-else class="card placeholder-card">
      <p>{{ t('common.noSavedWords') }}</p>
      <RouterLink class="secondary-link" to="/reader">{{ t('common.goReader') }}</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { locale, t } from '../utils/locale.js'
import {
  clearVocabularyWords,
  filterVocabularyWords,
  getDueVocabularyWords,
  getVocabularyWords,
  removeVocabularyWord,
  toggleVocabularyWordMastered,
} from '../utils/vocabulary.js'

const route = useRoute()
const words = ref(getVocabularyWords())
const searchText = ref('')
const errorMessage = ref('')
const statusValues = ['all', 'review', 'mastered']
const statusOptions = computed(() => statusValues.map((value) => ({
  value,
  label: t(`vocabulary.${value}`),
})))
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

const dueCount = computed(() => {
  return getDueVocabularyWords(words.value).length
})

function getInitialStatusFilter(status) {
  return statusValues.includes(status) ? status : 'all'
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

function displayMeaning(word) {
  return word.meaning || t('vocabulary.noMeaning')
}

function displayDefinition(word) {
  return word.definition || t('vocabulary.noDefinition')
}

function displaySentence(word) {
  return word.sentence || t('vocabulary.noSentence')
}

function displayArticleTitle(word) {
  return word.articleTitle || t('vocabulary.noArticle')
}

function clearAllWords() {
  const confirmed = window.confirm(t('vocabulary.clearConfirm'))

  if (!confirmed) {
    return
  }

  updateWords(clearVocabularyWords())
  searchText.value = ''
}

function formatSavedAt(savedAt) {
  const date = new Date(savedAt)

  if (Number.isNaN(date.getTime())) {
    return t('common.unknownTime')
  }

  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatReviewTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return t('common.soon')
  }

  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>
