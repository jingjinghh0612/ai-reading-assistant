<template>
  <section ref="viewerRef" class="sentence-viewer">
    <div class="sentence-viewer-header">
      <div>
        <p class="field-label">{{ t('sentenceViewer.title') }}</p>
        <p class="sentence-tip">{{ t('sentenceViewer.tip') }}</p>
      </div>

      <div class="font-size-controls" role="group" :aria-label="t('sentenceViewer.fontSizeLabel')">
        <button
          class="reader-font-button"
          type="button"
          :disabled="!canDecreaseFontSize"
          :title="t('sentenceViewer.decreaseFontSize')"
          :aria-label="t('sentenceViewer.decreaseFontSize')"
          @click="$emit('decrease-font-size')"
        >
          A-
        </button>
        <span class="font-size-value">{{ fontSize }}px</span>
        <button
          class="reader-font-button"
          type="button"
          :disabled="!canIncreaseFontSize"
          :title="t('sentenceViewer.increaseFontSize')"
          :aria-label="t('sentenceViewer.increaseFontSize')"
          @click="$emit('increase-font-size')"
        >
          A+
        </button>
      </div>
    </div>

    <div class="sentence-list">
      <article
        v-for="(sentence, index) in sentences"
        :key="index"
        :ref="(element) => setSentenceItemRef(element, index)"
        class="sentence-item"
        :class="{ active: index === selectedIndex }"
        :data-translate-label="t('sentenceViewer.clickToTranslate')"
        role="button"
        tabindex="0"
        @click="selectSentence(index, $event)"
        @keydown.enter="selectSentence(index, $event)"
        @keydown.space.prevent="selectSentence(index, $event)"
      >
        <div class="sentence-main">
          <span class="sentence-number">{{ index + 1 }}</span>
          <span class="sentence-content">
            <template
              v-for="(token, tokenIndex) in getSentenceTokens(sentence)"
              :key="`${index}-${tokenIndex}`"
            >
              <button
                v-if="isWordToken(token)"
                class="word-token"
                :class="{ active: isSelectedWord(token, index), loading: isLoadingWord(token, index) }"
                :disabled="isLoadingWord(token, index)"
                @click.stop="selectWord(token, index, $event)"
              >
                {{ token }}
              </button>
              <span v-else>{{ token }}</span>
            </template>
          </span>
          <span v-if="index === loadingIndex" class="sentence-status">{{ t('sentenceViewer.translating') }}</span>
        </div>

      </article>
    </div>

    <div
      v-if="shouldShowTranslationCard"
      ref="floatingTranslationCardRef"
      class="translation-card-floating"
      :class="{ dragging: isTranslationCardDragging }"
      :style="floatingTranslationCardStyle"
      tabindex="-1"
      @click.stop
      @keydown.stop="handleTranslationCardKeydown"
    >
      <div class="translation-card-heading" @pointerdown="startTranslationCardDrag">
        <div>
          <p class="field-label">{{ t('reader.translationCardTitle') }}</p>
          <p v-if="selectedSentence" class="translation-card-source">{{ selectedSentence }}</p>
        </div>

        <button
          class="word-card-close"
          type="button"
          :aria-label="t('reader.closeTranslationCard')"
          :title="t('reader.closeTranslationCard')"
          @click.stop="closeTranslationCard"
        >
          <span aria-hidden="true">x</span>
        </button>
      </div>

      <p v-if="isTranslationLoading" class="translation-loading">
        {{ t('reader.loadingTranslation') }}
      </p>

      <div v-else-if="translationErrorMessage" class="translation-error">
        <p>{{ translationErrorMessage }}</p>
        <button class="error-action" type="button" @click.stop="emit('retry-translation')">
          {{ t('reader.retryTranslation') }}
        </button>
      </div>

      <p v-else-if="translation" class="translation-result">
        {{ translation }}
      </p>

      <p v-else class="translation-placeholder">
        {{ t('reader.translationFallback') }}
      </p>
    </div>

    <div
      v-if="shouldShowFloatingWordCard"
      ref="floatingWordCardRef"
      class="word-card-floating"
      :class="{ saved: selectedWordIsSaved, dragging: isWordCardDragging }"
      :style="floatingWordCardStyle"
      tabindex="-1"
      @click.stop
      @keydown.stop="handleWordCardKeydown"
    >
      <div class="word-card-heading" @pointerdown="startWordCardDrag">
        <div>
          <p class="field-label">{{ t('reader.wordTitle') }}</p>
          <p class="word-title">{{ selectedWord }}</p>
          <p v-if="selectedWordDetail?.partOfSpeech" class="word-part">
            {{ selectedWordDetail.partOfSpeech }}
          </p>
        </div>

        <div class="word-card-actions">
          <button
            v-if="selectedWordDetail"
            class="word-star-button"
            type="button"
            :aria-label="selectedWordIsSaved ? t('reader.starredWord') : t('reader.starWord')"
            :title="selectedWordIsSaved ? t('reader.starredWord') : t('reader.starWord')"
            :aria-pressed="wordStarState.pressed"
            :disabled="selectedWordIsSaved"
            @click.stop="$emit('add-word')"
          >
            <span aria-hidden="true">{{ wordStarState.icon }}</span>
          </button>
          <button
            class="word-card-close"
            type="button"
            :aria-label="t('reader.closeWordCard')"
            :title="t('reader.closeWordCard')"
            @click.stop="closeWordCard"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
      </div>

      <p v-if="isWordLoading" class="translation-loading">
        {{ t('reader.loadingWord') }}
      </p>

      <div v-else-if="wordErrorMessage" class="translation-error">
        <p>{{ wordErrorMessage }}</p>
        <button class="error-action" type="button" @click.stop="$emit('retry-word')">
          {{ t('reader.retryWord') }}
        </button>
      </div>

      <div v-else-if="selectedWordDetail" class="word-card-body">
        <p class="word-definition" :class="{ muted: !selectedWordDetail.meaning }">
          {{ displayWordMeaning(selectedWordDetail) }}
        </p>
        <p v-if="selectedWordDetail.definition" class="word-definition english-definition">
          {{ selectedWordDetail.definition }}
        </p>
        <p v-if="selectedWordDetail.example" class="word-example">{{ selectedWordDetail.example }}</p>
        <p
          v-if="vocabularyMessage"
          class="save-message"
          :class="{ error: vocabularyMessageType === 'error' }"
        >
          {{ vocabularyMessage }}
        </p>
      </div>

      <p v-else class="translation-placeholder">
        {{ t('reader.wordPlaceholder') }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t } from '../utils/locale.js'
import { isWordCardDismissKey, shouldDismissWordCardOnPointer } from '../utils/wordCardInteraction.js'
import {
  getDraggedWordCardPosition,
  getFloatingWordCardViewportPosition,
} from '../utils/wordCardPosition.js'
import { getWordStarState } from '../utils/wordStar.js'
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
  selectedSentence: {
    type: String,
    default: '',
  },
  loadingIndex: {
    type: Number,
    default: -1,
  },
  translation: {
    type: String,
    default: '',
  },
  isTranslationLoading: {
    type: Boolean,
    default: false,
  },
  translationErrorMessage: {
    type: String,
    default: '',
  },
  showTranslationCard: {
    type: Boolean,
    default: false,
  },
  selectedWord: {
    type: String,
    default: '',
  },
  selectedWordDetail: {
    type: Object,
    default: null,
  },
  selectedWordIsSaved: {
    type: Boolean,
    default: false,
  },
  isWordLoading: {
    type: Boolean,
    default: false,
  },
  loadingWord: {
    type: String,
    default: '',
  },
  wordErrorMessage: {
    type: String,
    default: '',
  },
  vocabularyMessage: {
    type: String,
    default: '',
  },
  vocabularyMessageType: {
    type: String,
    default: 'success',
  },
  fontSize: {
    type: Number,
    default: 18,
  },
  canDecreaseFontSize: {
    type: Boolean,
    default: true,
  },
  canIncreaseFontSize: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits([
  'select',
  'select-word',
  'retry-translation',
  'close-translation-card',
  'add-word',
  'retry-word',
  'close-word-card',
  'decrease-font-size',
  'increase-font-size',
])

const viewerRef = ref(null)
const sentenceItemRefs = ref([])
const floatingTranslationCardRef = ref(null)
const floatingWordCardRef = ref(null)
const floatingTranslationCardPosition = ref(null)
const floatingWordCardPosition = ref(null)
const translationCardDrag = ref(null)
const wordCardDrag = ref(null)
const wordStarState = computed(() => getWordStarState(props.selectedWordIsSaved))
const isTranslationCardDragging = computed(() => Boolean(translationCardDrag.value))
const isWordCardDragging = computed(() => Boolean(wordCardDrag.value))
const shouldShowTranslationCard = computed(
  () => Boolean(props.showTranslationCard) && props.selectedIndex >= 0 && Boolean(floatingTranslationCardPosition.value),
)
const shouldShowFloatingWordCard = computed(
  () => Boolean(normalizeWord(props.selectedWord)) && Boolean(floatingWordCardPosition.value),
)
const floatingTranslationCardStyle = computed(() => {
  if (!floatingTranslationCardPosition.value) {
    return {}
  }

  return {
    left: `${floatingTranslationCardPosition.value.left}px`,
    top: `${floatingTranslationCardPosition.value.top}px`,
  }
})
const floatingWordCardStyle = computed(() => {
  if (!floatingWordCardPosition.value) {
    return {}
  }

  return {
    left: `${floatingWordCardPosition.value.left}px`,
    top: `${floatingWordCardPosition.value.top}px`,
  }
})

watch(
  () => props.selectedIndex,
  async (index, previousIndex) => {
    if (!Number.isInteger(index) || index < 0 || index === previousIndex) {
      return
    }

    await nextTick()
    sentenceItemRefs.value[index]?.scrollIntoView({
      block: 'center',
      behavior: shouldReduceMotion() ? 'auto' : 'smooth',
    })

    if (props.showTranslationCard) {
      positionTranslationCardForIndex(index)
    }
  },
)

watch(
  () => props.showTranslationCard,
  (shouldShow) => {
    if (!shouldShow) {
      floatingTranslationCardPosition.value = null
      stopTranslationCardDrag()
      return
    }

    positionTranslationCardForIndex(props.selectedIndex)
  },
)

watch(
  () => props.selectedWord,
  (word) => {
    if (!normalizeWord(word)) {
      floatingWordCardPosition.value = null
    }
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)

  if (props.showTranslationCard) {
    positionTranslationCardForIndex(props.selectedIndex)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  stopTranslationCardDrag()
  stopWordCardDrag()
})

function setSentenceItemRef(element, index) {
  if (element) {
    sentenceItemRefs.value[index] = element
  }
}

function getSentenceTokens(sentence) {
  return splitSentenceIntoTokens(sentence)
}

function isWordToken(token) {
  return Boolean(normalizeWord(token))
}

function isSelectedWord(token, sentenceIndex) {
  return sentenceIndex === props.selectedIndex && normalizeWord(token) === normalizeWord(props.selectedWord)
}

function isLoadingWord(token, sentenceIndex) {
  return sentenceIndex === props.selectedIndex && normalizeWord(token) === normalizeWord(props.loadingWord)
}

function selectSentence(index, event) {
  positionTranslationCardFromElement(event.currentTarget)
  emit('select', index)
}

async function positionTranslationCardForIndex(index) {
  if (!Number.isInteger(index) || index < 0) {
    return
  }

  await nextTick()
  positionTranslationCardFromElement(sentenceItemRefs.value[index])
}

function positionTranslationCardFromElement(element) {
  if (!element) {
    return
  }

  const sentenceRect = element.getBoundingClientRect()
  const cardWidth = getTranslationCardWidth()

  stopTranslationCardDrag()
  floatingTranslationCardPosition.value = getFloatingWordCardViewportPosition(sentenceRect, getViewportRect(), {
    cardWidth,
    cardHeight: getEstimatedTranslationCardHeight(),
    gap: 12,
    sidePadding: 16,
  })
}

function closeTranslationCard() {
  stopTranslationCardDrag()
  floatingTranslationCardPosition.value = null
  emit('close-translation-card')
}

function selectWord(token, sentenceIndex, event) {
  const tokenElement = event.currentTarget

  if (tokenElement) {
    const wordRect = tokenElement.getBoundingClientRect()
    const cardWidth = getWordCardWidth()

    stopWordCardDrag()
    floatingWordCardPosition.value = getFloatingWordCardViewportPosition(wordRect, getViewportRect(), {
      cardWidth,
      cardHeight: getEstimatedWordCardHeight(),
      gap: 10,
      sidePadding: 16,
    })
  }

  emit('select-word', { word: token, sentenceIndex })
}

function startTranslationCardDrag(event) {
  if (event.button !== undefined && event.button !== 0) {
    return
  }

  const target = event.target

  if (target instanceof Element && target.closest('button, a, input, textarea, select')) {
    return
  }

  const cardElement = floatingTranslationCardRef.value

  if (!cardElement || !floatingTranslationCardPosition.value) {
    return
  }

  const cardRect = cardElement.getBoundingClientRect()

  translationCardDrag.value = {
    pointerId: event.pointerId,
    offset: {
      x: event.clientX - cardRect.left,
      y: event.clientY - cardRect.top,
    },
    cardWidth: cardRect.width,
    cardHeight: cardRect.height,
  }

  cardElement.setPointerCapture?.(event.pointerId)
  document.addEventListener('pointermove', handleTranslationCardDrag)
  document.addEventListener('pointerup', stopTranslationCardDrag)
  document.addEventListener('pointercancel', stopTranslationCardDrag)
  event.preventDefault()
}

function handleTranslationCardDrag(event) {
  if (!translationCardDrag.value || event.pointerId !== translationCardDrag.value.pointerId) {
    return
  }

  floatingTranslationCardPosition.value = getDraggedWordCardPosition(
    event,
    translationCardDrag.value.offset,
    getViewportRect(),
    {
      cardWidth: translationCardDrag.value.cardWidth,
      cardHeight: translationCardDrag.value.cardHeight,
      sidePadding: 16,
    },
  )
}

function stopTranslationCardDrag(event) {
  if (event && translationCardDrag.value && event.pointerId !== translationCardDrag.value.pointerId) {
    return
  }

  if (event && floatingTranslationCardRef.value) {
    floatingTranslationCardRef.value.releasePointerCapture?.(event.pointerId)
  }

  translationCardDrag.value = null
  document.removeEventListener('pointermove', handleTranslationCardDrag)
  document.removeEventListener('pointerup', stopTranslationCardDrag)
  document.removeEventListener('pointercancel', stopTranslationCardDrag)
}

function closeWordCard() {
  stopWordCardDrag()
  floatingWordCardPosition.value = null
  emit('close-word-card')
}

function startWordCardDrag(event) {
  if (event.button !== undefined && event.button !== 0) {
    return
  }

  const target = event.target

  if (target instanceof Element && target.closest('button, a, input, textarea, select')) {
    return
  }

  const cardElement = floatingWordCardRef.value

  if (!cardElement || !floatingWordCardPosition.value) {
    return
  }

  const cardRect = cardElement.getBoundingClientRect()

  wordCardDrag.value = {
    pointerId: event.pointerId,
    offset: {
      x: event.clientX - cardRect.left,
      y: event.clientY - cardRect.top,
    },
    cardWidth: cardRect.width,
    cardHeight: cardRect.height,
  }

  cardElement.setPointerCapture?.(event.pointerId)
  document.addEventListener('pointermove', handleWordCardDrag)
  document.addEventListener('pointerup', stopWordCardDrag)
  document.addEventListener('pointercancel', stopWordCardDrag)
  event.preventDefault()
}

function handleWordCardDrag(event) {
  if (!wordCardDrag.value || event.pointerId !== wordCardDrag.value.pointerId) {
    return
  }

  floatingWordCardPosition.value = getDraggedWordCardPosition(
    event,
    wordCardDrag.value.offset,
    getViewportRect(),
    {
      cardWidth: wordCardDrag.value.cardWidth,
      cardHeight: wordCardDrag.value.cardHeight,
      sidePadding: 16,
    },
  )
}

function stopWordCardDrag(event) {
  if (event && wordCardDrag.value && event.pointerId !== wordCardDrag.value.pointerId) {
    return
  }

  if (event && floatingWordCardRef.value) {
    floatingWordCardRef.value.releasePointerCapture?.(event.pointerId)
  }

  wordCardDrag.value = null
  document.removeEventListener('pointermove', handleWordCardDrag)
  document.removeEventListener('pointerup', stopWordCardDrag)
  document.removeEventListener('pointercancel', stopWordCardDrag)
}

function handleDocumentPointerDown(event) {
  const target = event.target
  const isElementTarget = target instanceof Element
  const shouldDismiss = shouldDismissWordCardOnPointer({
    isOpen: shouldShowFloatingWordCard.value,
    isInsideCard: isElementTarget && Boolean(target.closest('.word-card-floating')),
    isWordToken: isElementTarget && Boolean(target.closest('.word-token')),
    isReaderControl: isElementTarget && Boolean(target.closest('.reader-paper-footer, .ai-panel, .translation-card-floating')),
  })

  if (shouldDismiss) {
    closeWordCard()
  }
}

function handleWordCardKeydown(event) {
  if (!isWordCardDismissKey(event.key)) {
    return
  }

  event.preventDefault()
  closeWordCard()
}

function handleTranslationCardKeydown(event) {
  if (!isWordCardDismissKey(event.key)) {
    return
  }

  event.preventDefault()
  closeTranslationCard()
}

function shouldReduceMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function displayWordMeaning(wordDetail) {
  return wordDetail?.meaning || t('vocabulary.noMeaning')
}

function getViewportRect() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function getWordCardWidth() {
  return Math.min(360, Math.max(0, window.innerWidth - 32))
}

function getEstimatedWordCardHeight() {
  return Math.min(320, Math.max(220, window.innerHeight - 32))
}

function getTranslationCardWidth() {
  return Math.min(420, Math.max(0, window.innerWidth - 32))
}

function getEstimatedTranslationCardHeight() {
  return Math.min(280, Math.max(180, window.innerHeight - 32))
}
</script>
