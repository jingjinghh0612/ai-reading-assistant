<template>
  <section class="card sentence-viewer">
    <div class="sentence-viewer-header">
      <div>
        <p class="field-label">English article</p>
        <p class="sentence-tip">Click a sentence for translation, or click a word for explanation.</p>
      </div>
    </div>

    <div class="sentence-list">
      <article
        v-for="(sentence, index) in sentences"
        :key="index"
        class="sentence-item"
        :class="{ active: index === selectedIndex }"
        role="button"
        tabindex="0"
        @click="$emit('select', index)"
        @keydown.enter="$emit('select', index)"
        @keydown.space.prevent="$emit('select', index)"
      >
        <span class="sentence-number">{{ index + 1 }}</span>
        <span class="sentence-content">
          <template
            v-for="(token, tokenIndex) in getSentenceTokens(sentence)"
            :key="`${index}-${tokenIndex}`"
          >
            <button
              v-if="isWordToken(token)"
              class="word-token"
              :class="{ active: isSelectedWord(token), loading: isLoadingWord(token) }"
              :disabled="isLoadingWord(token)"
              @click.stop="$emit('select-word', { word: token, sentenceIndex: index })"
            >
              {{ token }}
            </button>
            <span v-else>{{ token }}</span>
          </template>
        </span>
        <span v-if="index === loadingIndex" class="sentence-status">Translating...</span>
      </article>
    </div>
  </section>
</template>

<script setup>
import { normalizeWord, splitSentenceIntoTokens } from '../utils/word.js'

const props = defineProps({
  sentences: {
    type: Array,
    default: () => [],
  },
  selectedIndex: {
    type: Number,
    default: -1,
  },
  loadingIndex: {
    type: Number,
    default: -1,
  },
  selectedWord: {
    type: String,
    default: '',
  },
  loadingWord: {
    type: String,
    default: '',
  },
})

defineEmits(['select', 'select-word'])

function getSentenceTokens(sentence) {
  return splitSentenceIntoTokens(sentence)
}

function isWordToken(token) {
  return Boolean(normalizeWord(token))
}

function isSelectedWord(token) {
  return normalizeWord(token) === normalizeWord(props.selectedWord)
}

function isLoadingWord(token) {
  return normalizeWord(token) === normalizeWord(props.loadingWord)
}
</script>
