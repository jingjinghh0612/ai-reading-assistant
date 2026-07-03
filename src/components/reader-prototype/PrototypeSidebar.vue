<template>
  <aside class="prototype-sidebar" aria-label="书籍和章节">
    <section class="prototype-panel">
      <div class="panel-heading-row">
        <h2>我的书架</h2>
        <button
          class="sidebar-import-button"
          type="button"
          title="导入书籍"
          @click="$emit('import-book')"
        >
          <span aria-hidden="true">+</span>
          导入
        </button>
      </div>
      <span class="panel-count">{{ books.length }} 本</span>

      <div class="book-list">
        <div
          v-for="book in books"
          :key="book.id"
          class="book-list-row"
          :class="{ imported: book.isImported }"
        >
          <button
            class="book-item"
            :class="{ active: book.id === activeBookId }"
            type="button"
            @click="$emit('select-book', book.id)"
          >
            <span class="book-cover" :class="book.tone" aria-hidden="true">{{ book.initials }}</span>
            <span class="book-item-copy">
              <strong>{{ book.title }}</strong>
              <small>{{ book.meta }}</small>
            </span>
          </button>

          <button
            v-if="book.isImported"
            class="book-delete-button"
            type="button"
            :aria-label="`删除 ${book.title}`"
            title="删除书籍"
            @click.stop="$emit('delete-book', book.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4h6" />
              <path d="M5 7h14" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M7 7l1 13h8l1-13" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <section class="prototype-panel chapter-panel">
      <div class="panel-heading-row">
        <h2>章节</h2>
        <span class="panel-count">{{ chapters.length }} 章</span>
      </div>

      <div class="chapter-list">
        <button
          v-for="chapter in chapters"
          :key="chapter.id"
          class="chapter-card"
          :class="{ active: chapter.id === activeChapterId }"
          type="button"
          :aria-current="chapter.id === activeChapterId ? 'true' : undefined"
          @click="$emit('select-chapter', chapter.id)"
        >
          <span class="chapter-index">{{ chapter.number }}</span>
          <span class="chapter-copy">
            <strong>{{ chapter.title }}</strong>
            <small>{{ chapter.id === activeChapterId ? '当前章节' : chapter.status }} · {{ chapter.sentenceCount }} 句</small>
          </span>
        </button>
      </div>
    </section>

    <section class="prototype-panel progress-panel">
      <div class="panel-heading-row">
        <h2>阅读进度</h2>
        <span class="panel-count">本地</span>
      </div>

      <div class="progress-grid">
        <div class="progress-metric">
          <strong>{{ progress.book }}%</strong>
          <span>本书</span>
        </div>
        <div class="progress-metric">
          <strong>{{ progress.chapter }}%</strong>
          <span>本章</span>
        </div>
      </div>

      <div class="progress-block">
        <div class="progress-label">
          <span>阅读覆盖</span>
          <strong>{{ progress.book }}%</strong>
        </div>
        <div class="progress-track" aria-hidden="true">
          <span :style="{ '--progress': `${progress.book}%` }"></span>
        </div>
      </div>

      <div class="progress-block">
        <div class="progress-label">
          <span>句子精读</span>
          <strong>{{ progress.chapter }}%</strong>
        </div>
        <div class="progress-track chapter" aria-hidden="true">
          <span :style="{ '--progress': `${progress.chapter}%` }"></span>
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup>
defineProps({
  books: {
    type: Array,
    required: true,
  },
  chapters: {
    type: Array,
    required: true,
  },
  activeBookId: {
    type: String,
    required: true,
  },
  activeChapterId: {
    type: String,
    default: null,
  },
  progress: {
    type: Object,
    required: true,
  },
})

defineEmits(['select-book', 'select-chapter', 'import-book', 'delete-book'])
</script>
