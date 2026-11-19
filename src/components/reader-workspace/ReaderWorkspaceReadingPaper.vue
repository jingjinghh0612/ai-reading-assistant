<template>
  <section class="workspace-reading-paper">
    <header class="paper-workspace-header">
      <div>
        <p>第 {{ chapter.number }} 章</p>
        <h1>{{ chapter.title }}</h1>
      </div>
    </header>

    <article class="learning-article">
      <section
        v-for="paragraph in paragraphs"
        :key="paragraph.id"
        class="paragraph-block"
        :class="{ 'has-lookup': paragraph.id === selectedParagraphId }"
      >
        <p class="english-text" lang="en">
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
              @keydown.enter.self="handleSentenceClick(sentence, paragraph)"
              @keydown.space.self.prevent="handleSentenceClick(sentence, paragraph)"
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
                  }, $event)"
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
              lang="zh-CN"
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
              <button class="translate-paragraph-button" type="button" @click="$emit('close-sentence-translation')">
                收起句译
              </button>
            </span>
          </template>
        </p>
        <button
          class="translate-paragraph-button paragraph-translation-toggle"
          type="button"
          :aria-label="expandedParagraphIds.has(paragraph.id) ? '收起段落译文' : '翻译本段'"
          :title="expandedParagraphIds.has(paragraph.id) ? '收起段落译文' : '翻译本段'"
          :aria-expanded="expandedParagraphIds.has(paragraph.id)"
          :aria-controls="`reader-translation-${paragraph.id}`"
          @click="toggleParagraphTranslation(paragraph)"
        >
          <span class="paragraph-translation-icon" aria-hidden="true"></span>
        </button>
        <div
          v-show="expandedParagraphIds.has(paragraph.id)"
          :id="`reader-translation-${paragraph.id}`"
          class="translation-text"
          lang="zh-CN"
        >
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
        </div>
      </section>
    </article>
  </section>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getClickableSentenceTokens } from '../../data/readerWorkspaceSelectors.js'

const props = defineProps({
  chapter: {
    type: Object,
    required: true,
  },
  paragraphs: {
    type: Array,
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
  'close-sentence-translation',
  'retry-sentence-translation',
  'translate-paragraph',
  'retry-translation',
  'toggle-sentence-highlight',
])

const expandedParagraphIds = ref(new Set())

watch(() => props.chapter, () => expandedParagraphIds.value.clear())

function toggleParagraphTranslation(paragraph) {
  if (expandedParagraphIds.value.delete(paragraph.id)) {
    return
  }
  expandedParagraphIds.value.add(paragraph.id)
  if (!paragraph.translation && !paragraph.isTranslationLoading) {
    emit('translate-paragraph', paragraph.id)
  }
}

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

  if (window.getSelection()?.isCollapsed !== false) {
    selectSentence(sentence, paragraph)
  }
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

</script>
