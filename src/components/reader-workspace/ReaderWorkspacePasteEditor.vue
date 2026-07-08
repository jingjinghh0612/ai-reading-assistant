<template>
  <section class="prototype-paste-editor" aria-label="粘贴文章">
    <header class="paste-editor-header">
      <p>Paste Article</p>
      <h1>粘贴文章</h1>
    </header>

    <textarea
      class="paste-editor-textarea"
      :value="modelValue"
      autofocus
      placeholder="在这里粘贴英文文章..."
      @input="$emit('update:modelValue', $event.target.value)"
    ></textarea>

    <p
      v-if="message"
      class="paste-editor-message"
      :class="messageType"
    >
      {{ message }}
    </p>

    <div class="paste-editor-actions">
      <button
        class="paste-editor-button"
        type="button"
        @click="$emit('read-clipboard')"
      >
        读取剪贴板
      </button>
      <button
        class="paste-editor-button"
        type="button"
        @click="$emit('cancel')"
      >
        取消
      </button>
      <button
        class="paste-editor-button primary"
        type="button"
        @click="$emit('submit')"
      >
        载入文章
      </button>
    </div>
  </section>
</template>

<script setup>
defineProps({
  modelValue: {
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
})

defineEmits([
  'update:modelValue',
  'submit',
  'cancel',
  'read-clipboard',
])
</script>
