<template>
  <aside
    class="workspace-vocabulary-panel"
    :role="isDrawer ? 'dialog' : undefined"
    :aria-modal="isDrawer ? 'true' : undefined"
    aria-labelledby="workspace-dictionary-title"
    @keydown.tab="cycleDrawerFocus"
  >
    <header class="word-panel-header">
      <h2 id="workspace-dictionary-title">词典</h2>
      <div class="word-panel-controls">
        <button
          v-if="!isDrawer"
          class="word-panel-control"
          type="button"
          :aria-pressed="isPinned"
          @click="$emit('toggle-pin')"
        >
          保持展开
        </button>
        <button
          id="workspace-dictionary-close"
          class="word-panel-control"
          type="button"
          aria-label="关闭词典"
          @click="$emit('close')"
        >
          关闭
        </button>
      </div>
    </header>

    <div ref="panelBody" class="word-panel-body">
      <section v-if="word" class="word-entry-card">
        <div class="word-entry-hero">
          <div class="word-title-group">
            <h3>{{ word.word }}</h3>
            <span v-if="word.phonetic" class="word-phonetic">{{ word.phonetic }}</span>
          </div>
          <span v-if="word.partOfSpeech" class="word-part">{{ word.partOfSpeech }}</span>
        </div>

        <p class="word-meaning">{{ word.meaning }}</p>
        <p v-if="word.explanation" class="word-explanation">{{ word.explanation }}</p>

        <p v-if="isWordLoading" class="translation-loading">
          正在查询释义<span v-if="loadingWord">：{{ loadingWord }}</span>
        </p>
        <div v-else-if="wordErrorMessage" class="translation-error">
          <p>{{ wordErrorMessage }}</p>
          <button class="translation-retry-button" type="button" @click="$emit('retry-word')">
            重试
          </button>
        </div>

        <dl class="word-detail-list">
          <div v-if="word.example">
            <dt>例句</dt>
            <dd>
              <p class="word-example-text">{{ word.example }}</p>
              <p v-if="word.exampleTranslation" class="word-example-translation">
                {{ word.exampleTranslation }}
              </p>
            </dd>
          </div>
          <div v-if="word.forms?.length">
            <dt>词形</dt>
            <dd class="word-form-list">
              <span v-for="form in word.forms" :key="form">{{ form }}</span>
            </dd>
          </div>
          <div>
            <dt>原文句子</dt>
            <dd>
              <p>{{ word.sourceSentence }}</p>
              <p v-if="word.sourceTranslation" class="word-source-translation">
                {{ word.sourceTranslation }}
              </p>
            </dd>
          </div>
        </dl>

        <button
          class="vocabulary-button"
          :class="{ added: isAdded }"
          type="button"
          @click="$emit(isAdded ? 'remove-word' : 'add-word')"
        >
          {{ isAdded ? '移出生词本' : '加入生词本' }}
        </button>

        <button
          class="session-vocabulary-link-button"
          type="button"
          @click="$emit('show-session-vocabulary')"
        >
          查看本地生词本
        </button>

        <p v-if="message" class="vocabulary-message">{{ message }}</p>
      </section>

      <section v-else class="word-panel-empty">
        <div class="chapter-vocabulary-heading">
          <strong>本章重点词</strong>
          <span>{{ vocabulary.length }} 个</span>
        </div>
        <p>点击词条查看释义。</p>

        <div class="chapter-vocabulary-list">
          <button
            v-for="item in vocabulary"
            :key="item.wordKey"
            class="chapter-vocabulary-item"
            type="button"
            @click="$emit('select-word', item.selection)"
          >
            <span class="chapter-vocabulary-main">
              <strong>{{ item.word }}</strong>
              <small>{{ item.partOfSpeech }} · {{ item.meaning }}</small>
            </span>
            <span class="chapter-vocabulary-meta">
              <span v-if="item.isAdded">已加入</span>
              <span>{{ item.count }} 次</span>
            </span>
          </button>
        </div>

        <section class="session-vocabulary-panel">
          <div class="session-vocabulary-heading">
            <strong>本地生词本</strong>
            <span>{{ sessionVocabulary.length }} 个</span>
          </div>
          <p v-if="!sessionVocabulary.length" class="session-vocabulary-empty">本轮还没有加入生词</p>

          <div v-else class="session-vocabulary-list">
            <div
              v-for="item in sessionVocabulary"
              :key="item.wordKey"
              class="session-vocabulary-item"
            >
              <button
                class="session-vocabulary-select"
                type="button"
                @click="$emit('select-word', item.selection)"
              >
                <span>
                  <strong>{{ item.word }}</strong>
                  <small>{{ item.partOfSpeech }} · {{ item.meaning }}</small>
                </span>
              </button>
              <button
                class="session-vocabulary-remove"
                type="button"
                @click.stop="$emit('remove-word', item.wordKey)"
              >
                移出
              </button>
            </div>
          </div>
        </section>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isDrawer: Boolean,
  isPinned: Boolean,
  word: {
    type: Object,
    default: null,
  },
  vocabulary: {
    type: Array,
    default: () => [],
  },
  sessionVocabulary: {
    type: Array,
    default: () => [],
  },
  isAdded: {
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
  message: {
    type: String,
    default: '',
  },
})

defineEmits(['add-word', 'remove-word', 'select-word', 'retry-word', 'show-session-vocabulary', 'toggle-pin', 'close'])

const panelBody = ref(null)

watch(() => props.word?.word, () => {
  if (panelBody.value) {
    panelBody.value.scrollTop = 0
  }
}, { flush: 'post' })

function cycleDrawerFocus(event) {
  if (!props.isDrawer) {
    return
  }

  const buttons = event.currentTarget.querySelectorAll('button:not([disabled])')
  const firstButton = buttons[0]
  const lastButton = buttons[buttons.length - 1]
  const boundary = event.shiftKey ? firstButton : lastButton
  if (event.target === boundary) {
    event.preventDefault()
    const nextButton = event.shiftKey ? lastButton : firstButton
    nextButton.focus()
  }
}
</script>
