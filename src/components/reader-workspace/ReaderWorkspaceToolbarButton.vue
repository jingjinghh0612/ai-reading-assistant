<template>
  <span
    class="reader-toolbar-control"
    :data-tooltip-dismissed="tooltipDismissed"
    @pointerleave="tooltipDismissed = false"
    @keydown.esc="tooltipDismissed = true"
  >
    <button
      v-bind="$attrs"
      class="toolstrip-button reader-toolbar-button"
      type="button"
      :aria-label="label"
      @blur="tooltipDismissed = false"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <use :href="`${toolbarIcons}#${icon}`" />
      </svg>
    </button>
    <span class="reader-toolbar-tooltip" aria-hidden="true">{{ label }}</span>
  </span>
</template>

<script setup>
import { ref } from 'vue'
import toolbarIcons from '../../assets/reader-toolbar-icons.svg?no-inline'

defineOptions({ inheritAttrs: false })
defineProps({
  label: { type: String, required: true },
  icon: { type: String, required: true },
})

const tooltipDismissed = ref(false)
</script>

<style scoped>
.reader-toolbar-control {
  position: relative;
  display: inline-flex;
}

.reader-toolbar-button {
  width: 36px;
  min-height: 34px;
  padding: 0;
}

.reader-toolbar-button svg {
  display: block;
  width: 19px;
  height: 19px;
}

.reader-toolbar-tooltip {
  position: absolute;
  z-index: 5;
  inset-block-start: 100%;
  inset-inline-start: 50%;
  visibility: hidden;
  transform: translateX(-50%);
  padding: 5px 8px;
  border: 1px solid var(--workspace-border);
  border-radius: 6px;
  color: var(--workspace-text);
  background: var(--theme-raised);
  box-shadow: var(--workspace-shadow);
  font: 600 12px/1.4 var(--workspace-sans);
  white-space: nowrap;
}

.reader-toolbar-control[data-tooltip-dismissed="false"] .reader-toolbar-button:focus-visible + .reader-toolbar-tooltip {
  visibility: visible;
}

.import-group .reader-toolbar-tooltip {
  inset-inline: auto 0;
  transform: none;
}

@media (hover: hover) {
  .reader-toolbar-control[data-tooltip-dismissed="false"]:hover .reader-toolbar-tooltip {
    visibility: visible;
  }
}

@media (pointer: coarse) {
  .reader-toolbar-button {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
