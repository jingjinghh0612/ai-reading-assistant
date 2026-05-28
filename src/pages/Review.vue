<template>
  <section class="page review-page">
    <div class="page-intro">
      <p class="eyebrow">Review</p>
      <h1>Practice the words due today</h1>
      <p class="page-description">
        Check the word first, reveal the meaning, then mark whether you remembered it.
      </p>
    </div>

    <div v-if="words.length" class="review-summary-grid">
      <div class="card review-stat">
        <span>{{ dueWords.length }}</span>
        <p>Due now</p>
      </div>
      <div class="card review-stat">
        <span>{{ sessionReviewed }}</span>
        <p>Reviewed this session</p>
      </div>
      <div class="card review-stat">
        <span>{{ masteredCount }}</span>
        <p>Mastered</p>
      </div>
    </div>

    <p v-if="errorMessage" class="translation-error">{{ errorMessage }}</p>

    <article v-if="currentWord" class="card review-card">
      <div class="review-card-header">
        <div>
          <p class="field-label">Current word</p>
          <h2>{{ currentWord.word }}</h2>
          <p class="word-part">{{ currentWord.partOfSpeech }}</p>
        </div>
        <span class="progress-pill">{{ progressText }}</span>
      </div>

      <div class="review-answer">
        <p v-if="!answerVisible" class="translation-placeholder">
          Reveal the meaning when you are ready.
        </p>

        <div v-else class="word-detail">
          <p class="word-definition">{{ currentWord.meaning }}</p>
          <p class="word-example">{{ currentWord.example }}</p>
          <p class="word-meta">Next step: {{ getStageLabel(currentWord.reviewStage) }}</p>
        </div>
      </div>

      <div class="review-actions">
        <button v-if="!answerVisible" class="primary-button" @click="revealAnswer">Reveal Meaning</button>
        <template v-else>
          <button class="secondary-button" @click="recordReview('forgot')">Forgot</button>
          <button class="primary-button" @click="recordReview('remembered')">Remembered</button>
        </template>
      </div>
    </article>

    <div v-else-if="words.length" class="card placeholder-card">
      <p>No words are due right now.</p>
      <RouterLink class="secondary-link" to="/vocabulary">View all vocabulary</RouterLink>
    </div>

    <div v-else class="card placeholder-card">
      <p>No saved words yet.</p>
      <RouterLink class="secondary-link" to="/reader">Go to Reader</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  getDueVocabularyWords,
  getVocabularyWords,
  recordVocabularyReview,
} from '../utils/vocabulary.js'

const words = ref(getVocabularyWords())
const answerVisible = ref(false)
const sessionReviewed = ref(0)
const errorMessage = ref('')

const dueWords = computed(() => getDueVocabularyWords(words.value))
const currentWord = computed(() => dueWords.value[0] || null)
const masteredCount = computed(() => words.value.filter((word) => word.mastered).length)
const progressText = computed(() => {
  if (!currentWord.value) {
    return ''
  }

  return `${sessionReviewed.value + 1} of ${sessionReviewed.value + dueWords.value.length}`
})

function revealAnswer() {
  answerVisible.value = true
  errorMessage.value = ''
}

function recordReview(outcome) {
  if (!currentWord.value) {
    return
  }

  const result = recordVocabularyReview(currentWord.value.normalizedWord, outcome)

  words.value = result.words
  errorMessage.value = result.error || ''

  if (result.updated) {
    sessionReviewed.value += 1
    answerVisible.value = false
  }
}

function getStageLabel(stage) {
  if (stage <= 0) {
    return 'review again tomorrow'
  }

  if (stage === 1) {
    return 'next review in 3 days'
  }

  if (stage === 2) {
    return 'next review in 7 days'
  }

  return 'final review before mastery'
}
</script>
