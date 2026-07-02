<template>
  <section class="reader-paper-prototype">
    <header class="paper-prototype-header">
      <div>
        <p>Chapter {{ chapter.number }} · {{ chapter.title }}</p>
        <h1>{{ chapter.title }}</h1>
      </div>
    </header>

    <article class="learning-article">
      <section
        v-for="paragraph in paragraphs"
        :key="paragraph.id"
        class="paragraph-block"
        :class="{ current: selectedParagraphId ? paragraph.id === selectedParagraphId : paragraph.active }"
      >
        <p class="english-text">
          <template
            v-for="sentence in paragraph.sentences"
            :key="sentence.id"
          >
            <span
              class="sentence-shell"
              :class="getSentenceHighlightClass(sentence)"
              :role="isHighlightMode ? 'button' : null"
              :tabindex="isHighlightMode ? 0 : null"
              @click="toggleSentenceHighlight(sentence.id)"
              @keydown.enter="toggleSentenceHighlight(sentence.id)"
              @keydown.space.prevent="toggleSentenceHighlight(sentence.id)"
            >
              <template
                v-for="token in sentence.tokens"
                :key="token.id"
              >
                <button
                  v-if="token.wordKey"
                  class="word-token"
                  :class="{ selected: token.wordKey === selectedWordKey }"
                  type="button"
                  @click.stop="$emit('select-word', {
                    wordKey: token.wordKey,
                    surface: token.surface || token.text,
                    sentenceId: token.sentenceId,
                  })"
                >
                  {{ token.text }}
                </button>
                <span v-else>{{ token.text }}</span>
              </template>
            </span>
          </template>
        </p>
        <p v-if="showTranslation" class="translation-text">
          {{ paragraph.translation }}
        </p>
      </section>
    </article>
  </section>
</template>

<script setup>
const props = defineProps({
  chapter: {
    type: Object,
    required: true,
  },
  paragraphs: {
    type: Array,
    required: true,
  },
  showTranslation: {
    type: Boolean,
    required: true,
  },
  showHighlight: {
    type: Boolean,
    required: true,
  },
  sentenceHighlights: {
    type: Object,
    default: () => ({}),
  },
  isHighlightMode: {
    type: Boolean,
    default: false,
  },
  activeHighlightColorId: {
    type: String,
    default: 'yellow',
  },
  selectedWordKey: {
    type: String,
    default: null,
  },
  selectedParagraphId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['select-word', 'toggle-sentence-highlight'])

function getSentenceHighlightColor(sentence) {
  return props.sentenceHighlights[sentence.id] || ''
}

function getSentenceHighlightClass(sentence) {
  const colorId = getSentenceHighlightColor(sentence)

  return {
    'sentence-highlight': props.showHighlight && Boolean(colorId),
    [`sentence-highlight-${colorId}`]: props.showHighlight && Boolean(colorId),
    'is-highlight-mode': props.isHighlightMode,
  }
}

function toggleSentenceHighlight(sentenceId) {
  if (!props.isHighlightMode) {
    return
  }

  emit('toggle-sentence-highlight', sentenceId)
}
</script>
