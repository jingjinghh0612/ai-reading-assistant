<template>
  <header class="prototype-topbar" aria-label="AI Reading reader prototype">
    <div class="prototype-brand">
      <span class="prototype-brand-mark" aria-hidden="true">AI</span>
      <span>AI Reading</span>
    </div>

    <button class="prototype-book-select" type="button" :title="book.title">
      <span class="book-select-icon" aria-hidden="true">Book</span>
      <span class="book-select-copy">
        <strong>{{ book.title }}</strong>
        <small>Chapter {{ chapter.number }} · {{ chapter.title }}</small>
      </span>
      <span class="book-select-caret" aria-hidden="true">⌄</span>
    </button>

    <nav class="prototype-toolstrip" aria-label="阅读工具栏">
      <div class="toolstrip-shell">
        <div class="toolstrip-group reading-group" aria-label="阅读标记">
          <button
            class="toolstrip-button"
            :class="{ active: showHighlight }"
            type="button"
            :aria-pressed="showHighlight"
            title="显示高亮"
            @click="$emit('toggle-highlight-visibility')"
          >
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 11.5 10.6 3.9 13.1 6.4 5.5 14H3v-2.5Z" />
                <path d="M9.2 5.3 11.7 7.8" />
              </svg>
            </span>
            <span class="tool-label">显示高亮</span>
          </button>

          <button
            class="toolstrip-button"
            :class="{ active: isHighlightMode }"
            type="button"
            :aria-pressed="isHighlightMode"
            title="高亮笔"
            @click="$emit('toggle-highlight-mode')"
          >
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.6 2.7 13.3 5.4 6.4 12.3 3.2 13 3.7 9.7 10.6 2.7Z" />
                <path d="M2.7 13.2h7.6" />
              </svg>
            </span>
            <span class="tool-label">高亮笔</span>
          </button>

          <div class="highlight-color-swatches" aria-label="高亮颜色">
            <button
              v-for="color in highlightColors"
              :key="color.id"
              class="highlight-color-button"
              :class="[`highlight-color-${color.id}`, { active: activeHighlightColorId === color.id && !isHighlightClearMode }]"
              type="button"
              :aria-label="`${color.label}高亮`"
              :aria-pressed="activeHighlightColorId === color.id && !isHighlightClearMode"
              @click="$emit('select-highlight-color', color.id)"
            >
              <span aria-hidden="true"></span>
            </button>
          </div>

          <button
            class="highlight-clear-button"
            :class="{ active: isHighlightClearMode }"
            type="button"
            :aria-pressed="isHighlightClearMode"
            @click="$emit('select-highlight-clear')"
          >
            清除
          </button>
        </div>

        <div class="toolstrip-group translation-group" aria-label="译文">
          <button
            class="toolstrip-button"
            :class="{ active: showTranslation, 'switch-on': showTranslation }"
            type="button"
            :aria-pressed="showTranslation"
            @click="$emit('toggle-translation')"
          >
            <span class="tool-icon" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2.7 4h6.6" />
                <path d="M6 2.7V4" />
                <path d="M4.1 4c.5 1.7 1.5 3 3.1 3.9" />
                <path d="M8.6 4c-.5 1.5-1.5 2.8-3.1 3.8" />
                <path d="m8.4 13.3 2.2-5.8 2.2 5.8" />
                <path d="M9.2 11.3H12" />
              </svg>
            </span>
            <span class="tool-label">{{ showTranslation ? '译文开' : '译文关' }}</span>
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup>
defineProps({
  book: {
    type: Object,
    required: true,
  },
  chapter: {
    type: Object,
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
  highlightColors: {
    type: Array,
    default: () => [],
  },
  isHighlightMode: {
    type: Boolean,
    default: false,
  },
  activeHighlightColorId: {
    type: String,
    default: 'yellow',
  },
  isHighlightClearMode: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  'toggle-translation',
  'toggle-highlight-visibility',
  'toggle-highlight-mode',
  'select-highlight-color',
  'select-highlight-clear',
])
</script>
