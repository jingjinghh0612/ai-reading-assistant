<template>
  <section class="prototype-book-import-panel" aria-label="导入书籍">
    <header class="book-import-header">
      <p>Import Book</p>
      <h1>导入书籍</h1>
    </header>

    <label class="book-import-file-picker">
      <input
        class="book-import-file-input"
        type="file"
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        @change="$emit('select-file', $event.target.files?.[0] || null)"
      />
      <span class="book-import-file-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 2.5v7.2" />
          <path d="m5.1 6.6 2.9 3.1 2.9-3.1" />
          <path d="M3.1 12.8h9.8" />
        </svg>
      </span>
      <span class="book-import-file-copy">
        <strong>{{ fileName || '选择 PDF / EPUB 文件' }}</strong>
        <small>PDF / EPUB</small>
      </span>
    </label>

    <label class="book-import-title-field">
      <span>书名</span>
      <input
        class="book-import-title-input"
        type="text"
        :value="title"
        @input="$emit('update:title', $event.target.value)"
      />
    </label>

    <p
      v-if="message"
      class="book-import-message"
      :class="messageType"
    >
      {{ message }}
    </p>

    <div class="book-import-actions">
      <button
        class="book-import-button"
        type="button"
        :disabled="isImporting"
        @click="$emit('cancel')"
      >
        取消
      </button>
      <button
        class="book-import-button primary"
        type="button"
        :disabled="isImporting"
        @click="$emit('submit')"
      >
        {{ isImporting ? '导入中' : '导入到书架' }}
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '',
  },
  fileName: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  messageType: {
    type: String,
    default: 'success',
  },
  isImporting: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  'update:title',
  'select-file',
  'submit',
  'cancel',
])
</script>
