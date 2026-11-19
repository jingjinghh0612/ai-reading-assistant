<template>
  <header class="workspace-topbar" aria-label="AI Reading workspace">
    <RouterLink class="workspace-brand" :to="{ name: 'home' }" aria-label="AI Reading，返回首页" title="返回首页">
      <strong>Reading</strong>
    </RouterLink>

    <div class="workspace-book-context" :title="book.title">
      <strong>{{ book.title }}</strong>
      <span v-if="chapter">第 {{ chapter.number }} 章</span>
    </div>

    <nav class="workspace-toolstrip" aria-label="阅读工具栏">
      <div class="toolstrip-shell">
        <div class="toolstrip-group workspace-view-controls" aria-label="阅读布局">
          <ReaderWorkspaceToolbarButton
            label="目录"
            icon="panel-left"
            :aria-expanded="isSidebarOpen"
            :aria-controls="isSidebarOpen ? 'workspace-directory' : undefined"
            @click="$emit('toggle-sidebar')"
          />
          <ReaderWorkspaceToolbarButton
            id="workspace-dictionary-toggle"
            label="词典"
            icon="book-open-text"
            :aria-expanded="isDictionaryOpen"
            :aria-controls="isDictionaryOpen ? 'workspace-dictionary' : undefined"
            @click="$emit('toggle-dictionary', $event)"
          />
          <ReaderWorkspaceAppearance :font-size="fontSize" @update:font-size="$emit('update:font-size', $event)" />
          <ReaderWorkspaceToolbarButton
            label="专注模式"
            icon="focus"
            :aria-pressed="isFocusMode"
            @click="$emit('toggle-focus')"
          />
        </div>
        <div class="toolstrip-group reading-group" aria-label="阅读标记">
          <ReaderWorkspaceToolbarButton
            label="显示高亮"
            :icon="showHighlight ? 'eye' : 'eye-off'"
            :aria-pressed="showHighlight"
            @click="$emit('toggle-highlight-visibility')"
          />

          <ReaderWorkspaceToolbarButton
            label="高亮笔"
            icon="highlighter"
            :aria-pressed="isHighlightMode"
            @click="$emit('toggle-highlight-mode')"
          />

          <div v-if="isHighlightMode" class="highlight-color-swatches" aria-label="高亮颜色">
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
            v-if="isHighlightMode"
            class="highlight-clear-button"
            :class="{ active: isHighlightClearMode }"
            type="button"
            :aria-pressed="isHighlightClearMode"
            @click="$emit('select-highlight-clear')"
          >
            清除
          </button>
        </div>

        <div class="toolstrip-group import-group" aria-label="文章导入">
          <ReaderWorkspaceToolbarButton
            label="粘贴文章"
            icon="clipboard-paste"
            @click="$emit('paste-article')"
          />
        </div>

        <p
          v-if="pasteMessage"
          class="workspace-paste-message"
          :class="pasteMessageType"
        >
          {{ pasteMessage }}
        </p>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import ReaderWorkspaceAppearance from './ReaderWorkspaceAppearance.vue'
import ReaderWorkspaceToolbarButton from './ReaderWorkspaceToolbarButton.vue'

defineProps({
  book: {
    type: Object,
    required: true,
  },
  chapter: {
    type: Object,
    default: null,
  },
  isSidebarOpen: Boolean,
  isDictionaryOpen: Boolean,
  isFocusMode: Boolean,
  fontSize: { type: Number, required: true },
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
  pasteMessage: {
    type: String,
    default: '',
  },
  pasteMessageType: {
    type: String,
    default: 'success',
  },
})

defineEmits([
  'toggle-sidebar',
  'toggle-dictionary',
  'toggle-focus',
  'update:font-size',
  'toggle-highlight-visibility',
  'toggle-highlight-mode',
  'select-highlight-color',
  'select-highlight-clear',
  'paste-article',
])
</script>
