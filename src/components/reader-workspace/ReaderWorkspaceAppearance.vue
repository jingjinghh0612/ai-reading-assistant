<template>
  <div class="reader-appearance">
    <ReaderWorkspaceToolbarButton
      class="appearance-trigger"
      label="主题与设置"
      icon="case-sensitive"
      aria-haspopup="dialog"
      aria-controls="reader-appearance-dialog"
      @click="openSettings"
    />

    <dialog
      id="reader-appearance-dialog"
      ref="settings"
      class="reader-appearance-dialog"
      aria-labelledby="reader-appearance-heading"
      @click.self="settings.close()"
      @keydown.esc.stop
    >
      <div class="appearance-content">
        <header class="appearance-heading">
          <h2 id="reader-appearance-heading">主题与设置</h2>
          <button class="appearance-close" type="button" aria-label="关闭主题与设置" autofocus @click="settings.close()">
            ×
          </button>
        </header>

        <div class="appearance-size" role="group" aria-label="正文字号">
          <button type="button" aria-label="缩小字号" :disabled="fontSize <= MIN_READER_FONT_SIZE" @click="$emit('update:font-size', fontSize - 1)">
            <span aria-hidden="true">A</span>
          </button>
          <output>{{ fontSize }} px</output>
          <button type="button" aria-label="放大字号" :disabled="fontSize >= MAX_READER_FONT_SIZE" @click="$emit('update:font-size', fontSize + 1)">
            <span aria-hidden="true">A</span>
          </button>
        </div>

        <fieldset class="appearance-themes">
          <legend>主题</legend>
          <div class="appearance-theme-grid">
            <label v-for="theme in APP_THEMES" :key="theme.id" class="appearance-option">
              <input
                type="radio"
                name="app-theme"
                :value="theme.id"
                :checked="appTheme === theme.id"
                @change="selectAppTheme(theme.id)"
              />
              <span class="appearance-sample" :data-app-theme="theme.id" aria-hidden="true">Aa</span>
              <span class="appearance-label">{{ theme.label }}</span>
            </label>
          </div>
        </fieldset>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ReaderWorkspaceToolbarButton from './ReaderWorkspaceToolbarButton.vue'
import { APP_THEMES, appTheme, selectAppTheme } from '../../utils/appTheme.js'
import { MAX_READER_FONT_SIZE, MIN_READER_FONT_SIZE } from '../../utils/readerFontSize.js'

defineProps({ fontSize: { type: Number, required: true } })
defineEmits(['update:font-size'])

const settings = ref(null)

function openSettings(event) {
  const bounds = event.currentTarget.getBoundingClientRect()
  settings.value.style.setProperty('--appearance-top', `${bounds.bottom + 10}px`)
  settings.value.style.setProperty('--appearance-left', `${bounds.left - 78}px`)
  settings.value.showModal()
}
</script>

<style scoped>
.reader-appearance-dialog {
  position: fixed;
  inset: var(--appearance-top, 62px) auto auto clamp(12px, var(--appearance-left, 12px), calc(100vw - 372px));
  width: min(360px, calc(100vw - 24px));
  max-width: none;
  max-height: calc(100dvh - var(--appearance-top, 62px) - 12px);
  margin: 0;
  padding: 0;
  border: 1px solid var(--workspace-border);
  border-radius: 17px;
  color: var(--workspace-text);
  background: var(--theme-raised);
  box-shadow: 0 16px 48px #17141030;
}

.reader-appearance-dialog::backdrop {
  background: #17141026;
}

.appearance-content {
  padding: 15px 17px 17px;
}

.appearance-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.appearance-heading h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
}

.appearance-close {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  color: var(--workspace-muted);
  background: var(--workspace-surface-muted);
  font-size: 22px;
  line-height: 1;
}

.appearance-size {
  display: grid;
  grid-template-columns: 1fr 84px 1fr;
  align-items: center;
  text-align: center;
  overflow: hidden;
  border: 1px solid var(--workspace-border);
  border-radius: 10px;
  background: var(--workspace-surface-soft);
}

.appearance-size button {
  min-height: 42px;
  border: 0;
  color: var(--workspace-text);
  background: transparent;
  font: 600 17px/1 var(--workspace-serif);
}

.appearance-size button:last-child {
  font-size: 24px;
}

.appearance-size button:hover:not(:disabled),
.appearance-close:hover {
  background: var(--workspace-accent-soft);
}

.appearance-size button:focus-visible {
  outline-offset: -3px;
}

.appearance-size button:disabled {
  opacity: 0.45;
}

.appearance-size output {
  color: var(--workspace-muted);
  font: 600 13px/1 var(--workspace-sans);
  font-variant-numeric: tabular-nums;
}

.appearance-themes {
  min-inline-size: 0;
  margin: 15px 0 0;
  padding: 0;
  border: 0;
}

.appearance-themes legend {
  margin-bottom: 8px;
  padding: 0;
  color: var(--workspace-muted);
  font-size: 12px;
  font-weight: 650;
}

.appearance-theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.appearance-option {
  position: relative;
  display: grid;
  gap: 6px;
  justify-items: stretch;
  text-align: center;
  cursor: pointer;
}

.appearance-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
}

.appearance-sample {
  display: grid;
  place-items: center;
  min-height: 66px;
  border: 1px solid var(--theme-border);
  border-radius: 11px;
  color: var(--theme-ink);
  background: var(--theme-paper);
  font: 30px/1 var(--workspace-serif);
  box-shadow: inset 0 -5px 0 var(--theme-sidebar);
}

.appearance-option input:checked + .appearance-sample {
  border-color: var(--workspace-accent);
  box-shadow: inset 0 0 0 1px var(--workspace-accent);
}

.appearance-option input:focus-visible + .appearance-sample {
  outline: 2px solid var(--workspace-accent);
  outline-offset: 2px;
}

.appearance-label {
  color: var(--workspace-muted);
  font-size: 12px;
}

.appearance-option input:checked ~ .appearance-label {
  color: var(--workspace-accent-strong);
  font-weight: 700;
}

@media (max-width: 760px) {
  .reader-appearance-dialog {
    inset: auto 0 0;
    width: 100%;
    max-height: calc(100dvh - 12px);
    border-radius: 20px 20px 0 0;
  }

  .appearance-content {
    padding: 18px 18px max(24px, env(safe-area-inset-bottom));
  }

  .appearance-size button,
  .appearance-close {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
