<template>
  <section class="page review-page">
    <div class="page-intro">
      <p class="eyebrow">{{ t('review.eyebrow') }}</p>
      <h1>{{ t('review.title') }}</h1>
      <p class="page-description">
        {{ t('review.description') }}
      </p>
    </div>

    <p v-if="errorMessage" class="translation-error">{{ errorMessage }}</p>

    <article v-if="currentWord" class="card review-card">
      <div class="review-card-header">
        <div>
          <p class="field-label">{{ t('review.currentWord') }}</p>
          <h2>{{ currentWord.word }}</h2>
          <p v-if="currentWord.partOfSpeech" class="word-part">{{ currentWord.partOfSpeech }}</p>
        </div>
        <span class="progress-pill">{{ progressText }}</span>
      </div>

      <div class="review-answer">
        <p v-if="!answerVisible" class="translation-placeholder">
          {{ t('review.revealPlaceholder') }}
        </p>

        <div v-else class="word-detail">
          <section class="word-detail-row">
            <p class="word-detail-label">{{ t('vocabulary.meaningLabel') }}</p>
            <p class="word-definition" :class="{ muted: !currentWord.meaning }">
              {{ displayMeaning(currentWord) }}
            </p>
          </section>
          <section class="word-detail-row">
            <p class="word-detail-label">{{ t('vocabulary.definitionLabel') }}</p>
            <p class="word-definition english-definition" :class="{ muted: !currentWord.definition }">
              {{ displayDefinition(currentWord) }}
            </p>
          </section>
          <section class="word-detail-row">
            <p class="word-detail-label">{{ t('vocabulary.sentenceLabel') }}</p>
            <p class="word-example" :class="{ muted: !currentWord.sentence }">
              {{ displaySentence(currentWord) }}
            </p>
          </section>
        </div>
      </div>

      <div class="review-actions">
        <button v-if="!answerVisible" class="primary-button" @click="revealAnswer">{{ t('review.reveal') }}</button>
        <template v-else>
          <button class="secondary-button" @click="recordReview('forgot')">{{ t('review.forgot') }}</button>
          <button class="secondary-button" @click="recordReview('familiar')">{{ t('review.familiar') }}</button>
          <button class="primary-button" @click="recordReview('mastered')">{{ t('review.masteredFeedback') }}</button>
        </template>
      </div>
    </article>

    <div v-else-if="words.length" class="card placeholder-card">
      <p>{{ t('review.noDue') }}</p>
      <RouterLink class="secondary-link" to="/vocabulary">{{ t('common.viewVocabulary') }}</RouterLink>
    </div>

    <div v-else class="card placeholder-card">
      <p>{{ t('common.noSavedWords') }}</p>
      <RouterLink class="secondary-link" to="/reader">{{ t('common.goReader') }}</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { t } from '../utils/locale.js'
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
const progressText = computed(() => {
  if (!currentWord.value) {
    return ''
  }

  return t('review.progress', {
    current: sessionReviewed.value + 1,
    total: sessionReviewed.value + dueWords.value.length,
  })
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

function displayMeaning(word) {
  return word.meaning || t('vocabulary.noMeaning')
}

function displayDefinition(word) {
  return word.definition || t('vocabulary.noDefinition')
}

function displaySentence(word) {
  return word.sentence || t('vocabulary.noSentence')
}
</script>
