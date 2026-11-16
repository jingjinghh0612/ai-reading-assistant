<template>
  <RouterView v-if="isStandaloneWorkspace" />

  <div v-else class="app-shell">
    <header class="app-header">
      <div class="app-toolbar" :class="{ 'compact-toolbar': usesCompactToolbar }">
        <RouterLink class="brand" to="/">
          <span class="brand-mark">AI</span>
          <span>{{ t('app.brand') }}</span>
        </RouterLink>

        <div v-if="!usesCompactToolbar" class="toolbar-tools" :aria-label="t('toolbar.toolsLabel')">
          <button class="toolbar-icon-button" type="button" disabled :title="t('toolbar.undo')">
            <span aria-hidden="true">Undo</span>
          </button>
          <button class="toolbar-icon-button" type="button" disabled :title="t('toolbar.redo')">
            <span aria-hidden="true">Redo</span>
          </button>
          <RouterLink class="toolbar-icon-button active" to="/reader" :title="t('toolbar.select')">
            <span aria-hidden="true">Select</span>
          </RouterLink>
          <button class="toolbar-icon-button" type="button" disabled :title="t('toolbar.text')">
            <span aria-hidden="true">Text</span>
          </button>
          <button class="toolbar-icon-button" type="button" disabled :title="t('toolbar.pen')">
            <span aria-hidden="true">Pen</span>
          </button>
        </div>

        <nav class="nav" :aria-label="t('app.navLabel')">
          <RouterLink to="/">{{ t('nav.home') }}</RouterLink>
          <RouterLink v-if="!usesCompactToolbar" to="/reader">{{ t('nav.reader') }}</RouterLink>
          <RouterLink v-if="!isVocabularyPage" to="/vocabulary">{{ t('nav.vocabulary') }}</RouterLink>
          <RouterLink v-if="!isReviewPage" to="/review">{{ t('nav.review') }}</RouterLink>
        </nav>

        <div class="toolbar-actions">
          <template v-if="!usesCompactToolbar">
            <RouterLink class="toolbar-action" to="/reader">{{ t('toolbar.pages') }}</RouterLink>
            <RouterLink class="toolbar-action" to="/reader">{{ t('toolbar.ask') }}</RouterLink>
            <button class="toolbar-action" type="button" disabled :title="t('toolbar.disabledFeature')">
              {{ t('toolbar.uploadPdf') }}
            </button>
            <button class="toolbar-action" type="button" disabled :title="t('toolbar.disabledFeature')">
              {{ t('toolbar.export') }}
            </button>
          </template>
          <button class="language-toggle" type="button" :title="t('app.languageLabel')" @click="toggleLocale">
            {{ t('app.languageSwitch') }}
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { t, toggleLocale } from './utils/locale.js'

const route = useRoute()
const isStandaloneWorkspace = computed(() => route.meta?.standalone === true)
const isReviewPage = computed(() => route.name === 'review')
const isVocabularyPage = computed(() => route.name === 'vocabulary')
const usesCompactToolbar = computed(() => isReviewPage.value || isVocabularyPage.value)
</script>

<style scoped>
.compact-toolbar {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
}

.compact-toolbar .toolbar-actions {
  grid-column: 3;
  justify-self: end;
  padding-bottom: 0;
  overflow: visible;
}

@media (max-width: 480px) {
  .compact-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .compact-toolbar .nav {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .compact-toolbar .toolbar-actions {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
