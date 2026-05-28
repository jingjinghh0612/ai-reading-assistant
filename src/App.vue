<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink class="brand" to="/">AI English Reading</RouterLink>

      <nav class="nav">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/reader">Reader</RouterLink>
        <RouterLink to="/vocabulary">Vocabulary</RouterLink>
        <RouterLink to="/review">Review</RouterLink>
      </nav>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>
