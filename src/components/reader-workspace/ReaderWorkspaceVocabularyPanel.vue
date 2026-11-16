<template>
  <aside class="workspace-vocabulary-panel word-definition-panel" aria-label="单词释义">
    <header class="word-panel-header">
      <div>
        <p>本地词典</p>
        <h2>单词释义</h2>
      </div>
    </header>

    <div class="word-panel-body">
      <section v-if="word" class="word-entry-card">
        <div class="word-entry-hero">
          <div class="word-title-group">
            <h3>{{ word.word }}</h3>
            <span class="word-phonetic">{{ word.phonetic }}</span>
          </div>
          <span class="word-part">{{ word.partOfSpeech }}</span>
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
          <div>
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
        <p>点击词条查看释义，并定位到它在正文中首次出现的段落。</p>

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
defineProps({
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

defineEmits(['add-word', 'remove-word', 'select-word', 'retry-word', 'show-session-vocabulary'])
</script>
