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
              @click="handleSentenceClick(sentence, paragraph)"
              @dblclick="handleSentenceDoubleClick(sentence, paragraph)"
              @keydown.enter="handleSentenceClick(sentence, paragraph)"
              @keydown.space.prevent="handleSentenceClick(sentence, paragraph)"
            >
              <template
                v-for="token in getClickableSentenceTokens(sentence)"
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
                  @dblclick.stop="handleWordDoubleClick(sentence, paragraph)"
                >
                  {{ token.text }}
                </button>
                <span v-else>{{ token.text }}</span>
              </template>
            </span>
            <span
              v-if="selectedSentenceId === sentence.id"
              class="sentence-translation-text"
            >
              <span v-if="sentence.translation">{{ sentence.translation }}</span>
              <span v-else-if="sentence.isTranslationLoading" class="translation-loading">正在翻译...</span>
              <span v-else-if="sentence.translationErrorMessage" class="translation-error">
                {{ sentence.translationErrorMessage }}
                <button
                  class="translation-retry-button"
                  type="button"
                  @click.stop="$emit('retry-sentence-translation', {
                    sentenceId: sentence.id,
                    paragraphId: paragraph.id,
                  })"
                >
                  重试
                </button>
              </span>
            </span>
          </template>
        </p>
        <div v-if="showTranslation" class="translation-text">
          <span v-if="paragraph.translation">{{ paragraph.translation }}</span>
          <span v-else-if="paragraph.isTranslationLoading" class="translation-loading">正在生成译文...</span>
          <span v-else-if="paragraph.translationErrorMessage" class="translation-error">
            {{ paragraph.translationErrorMessage }}
            <button
              class="translation-retry-button"
              type="button"
              @click="$emit('retry-translation', paragraph.id)"
            >
              重试
            </button>
          </span>
          <button
            v-else
            class="translate-paragraph-button"
            type="button"
            @click="$emit('translate-paragraph', paragraph.id)"
          >
            翻译本段
          </button>
        </div>
      </section>
    </article>
  </section>
</template>

<script setup>
import { getPrototypeClickableSentenceTokens } from '../../data/readerPrototypeSelectors.js'

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
  selectedSentenceId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'select-word',
  'select-sentence',
  'retry-sentence-translation',
  'translate-paragraph',
  'retry-translation',
  'toggle-sentence-highlight',
])

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

function handleSentenceClick(sentence, paragraph) {
  if (props.isHighlightMode) {
    toggleSentenceHighlight(sentence.id)
    return
  }

  selectSentence(sentence, paragraph)
}

function handleSentenceDoubleClick(sentence, paragraph) {
  if (props.isHighlightMode) {
    return
  }

  selectSentence(sentence, paragraph)
}

function handleWordDoubleClick(sentence, paragraph) {
  if (props.isHighlightMode) {
    return
  }

  selectSentence(sentence, paragraph)
}

function selectSentence(sentence, paragraph) {
  emit('select-sentence', {
    sentence,
    paragraph,
  })
}

function toggleSentenceHighlight(sentenceId) {
  if (!props.isHighlightMode) {
    return
  }

  emit('toggle-sentence-highlight', sentenceId)
}

function getClickableSentenceTokens(sentence) {
  return getPrototypeClickableSentenceTokens(sentence)
}
</script>
