<template>
  <RouterView v-if="isStandaloneWorkspace" />

  <div v-else class="app-shell">
    <header class="app-header">
      <div class="app-toolbar">
        <RouterLink class="brand" to="/">
          <span class="brand-mark">AI</span>
          <span>{{ t('app.brand') }}</span>
        </RouterLink>

        <div class="toolbar-tools" :aria-label="t('toolbar.toolsLabel')">
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
          <RouterLink to="/reader">{{ t('nav.reader') }}</RouterLink>
          <RouterLink to="/vocabulary">{{ t('nav.vocabulary') }}</RouterLink>
          <RouterLink to="/review">{{ t('nav.review') }}</RouterLink>
        </nav>

        <div class="toolbar-actions">
          <RouterLink class="toolbar-action" to="/reader">{{ t('toolbar.pages') }}</RouterLink>
          <RouterLink class="toolbar-action" to="/reader">{{ t('toolbar.ask') }}</RouterLink>
          <button class="toolbar-action" type="button" disabled :title="t('toolbar.disabledFeature')">
            {{ t('toolbar.uploadPdf') }}
          </button>
          <button class="toolbar-action" type="button" disabled :title="t('toolbar.disabledFeature')">
            {{ t('toolbar.export') }}
          </button>
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
</script>
