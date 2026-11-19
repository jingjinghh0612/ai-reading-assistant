<template>
  <div class="learning-home" :lang="locale === 'zh' ? 'zh-CN' : 'en'">
    <header class="learning-header">
      <div class="learning-header-inner">
        <div class="learning-brand">
          <span class="learning-brand-mark" aria-hidden="true">AI</span>
          {{ t('app.brand') }}
        </div>
        <button class="learning-language" type="button" :aria-label="t('app.languageLabel')" @click="toggleLocale">
          {{ t('app.languageSwitch') }}
        </button>
      </div>
    </header>

    <main class="learning-main">
      <h1>{{ t('home.welcome') }}</h1>
      <p class="learning-intro">{{ t('home.welcomeDescription') }}</p>

      <div class="learning-entries">
        <section class="learning-entry learning-entry-reading" aria-labelledby="reading-title">
          <div class="learning-entry-copy">
            <h2 id="reading-title">{{ t('home.readingTitle') }}</h2>
            <p>{{ t('home.readingDescription') }}</p>
          </div>
          <div class="learning-book" aria-hidden="true">
            <span></span>
            <span></span>
          </div>
          <RouterLink class="learning-link learning-link-primary" :to="{ name: 'reader' }">
            {{ t('home.start') }} <span aria-hidden="true">→</span>
          </RouterLink>
        </section>

        <section class="learning-entry learning-entry-review" aria-labelledby="review-title">
          <div class="learning-entry-copy">
            <h2 id="review-title">{{ t('home.vocabularyReview') }}</h2>
            <p>{{ t('home.reviewDescription') }}</p>
          </div>
          <p class="learning-review-count">
            <strong>{{ dueWordCount }}</strong>
            {{ t('home.dueWordLabel') }}
          </p>
          <RouterLink class="learning-link" :to="{ name: 'review' }">
            {{ t('home.startReview') }} <span aria-hidden="true">→</span>
          </RouterLink>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { locale, t, toggleLocale } from '../utils/locale.js'
import { getDueVocabularyWords, getVocabularyWords } from '../utils/vocabulary.js'

const dueWordCount = getDueVocabularyWords(getVocabularyWords()).length
</script>

<style scoped>
.learning-home {
  min-height: 100dvh;
  color: var(--theme-ink);
  background: var(--theme-page);
}

.learning-header {
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-raised);
}

.learning-header-inner,
.learning-main {
  width: min(1104px, calc(100% - 64px));
  margin-inline: auto;
}

.learning-header-inner {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.learning-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 750;
}

.learning-brand-mark {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 36px;
  aspect-ratio: 1;
  border-radius: 9px;
  color: var(--theme-on-accent);
  background: var(--theme-accent);
  font-size: 12px;
  font-weight: 800;
}

.learning-language {
  min-height: 44px;
  padding-inline: 12px;
  border: 0;
  border-radius: 9px;
  color: var(--theme-accent-strong);
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 650;
}

.learning-language:hover {
  background: var(--theme-accent-soft);
}

.learning-main {
  padding-block: clamp(44px, 7vw, 96px) 64px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  max-width: 820px;
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.18;
  text-wrap: balance;
}

.learning-intro {
  max-width: 620px;
  margin-top: 16px;
  color: var(--theme-secondary);
  font-size: clamp(1rem, 2vw, 1.125rem);
}

.learning-entries {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  gap: 20px;
  margin-top: 36px;
}

.learning-entry {
  display: grid;
  grid-template-rows: auto minmax(106px, 1fr) auto;
  align-items: start;
  gap: 18px;
  min-width: 0;
  padding: clamp(22px, 3vw, 38px);
  border: 1px solid var(--theme-border);
  border-radius: 14px;
  background: var(--theme-raised);
}

.learning-entry-reading {
  background:
    radial-gradient(circle, color-mix(in srgb, var(--theme-accent) 19%, transparent) 1px, transparent 1.5px) right top / 15px 15px,
    var(--theme-accent-soft);
}

.learning-entry-copy h2 {
  font-size: clamp(1.375rem, 2.5vw, 1.75rem);
  font-weight: 780;
  line-height: 1.25;
}

.learning-entry-copy p {
  margin-top: 8px;
  color: var(--theme-secondary);
}

.learning-book {
  display: flex;
  align-self: center;
  justify-self: end;
  width: min(100%, 230px);
  height: 100px;
  padding-inline: 5px;
  transform: rotate(-5deg);
}

.learning-book span {
  flex: 1;
  border: 1px solid color-mix(in srgb, var(--theme-accent) 48%, var(--theme-border));
  border-radius: 12px 4px 2px 12px;
  background:
    linear-gradient(color-mix(in srgb, var(--theme-accent) 40%, var(--theme-border)), color-mix(in srgb, var(--theme-accent) 40%, var(--theme-border))) 14px 22px / 62% 2px no-repeat,
    linear-gradient(var(--theme-border), var(--theme-border)) 14px 36px / 69% 1px no-repeat,
    linear-gradient(var(--theme-border), var(--theme-border)) 14px 46px / 69% 1px no-repeat,
    linear-gradient(color-mix(in srgb, var(--theme-accent) 27%, var(--theme-raised)), color-mix(in srgb, var(--theme-accent) 27%, var(--theme-raised))) 12px 55px / 57% 9px no-repeat,
    linear-gradient(var(--theme-border), var(--theme-border)) 14px 70px / 52% 1px no-repeat,
    var(--theme-raised);
  box-shadow: 0 5px 0 var(--theme-muted), 0 6px 0 color-mix(in srgb, var(--theme-accent) 48%, var(--theme-border));
  transform: skewY(6deg);
}

.learning-book span + span {
  border-radius: 4px 12px 12px 2px;
  background:
    repeating-linear-gradient(var(--theme-border) 0 1px, transparent 1px 10px) 14px 24px / 72% 48px no-repeat,
    var(--theme-raised);
  transform: skewY(-6deg);
}

.learning-review-count {
  align-self: center;
  color: var(--theme-secondary);
}

.learning-review-count strong {
  display: block;
  margin-bottom: 8px;
  color: var(--theme-accent-strong);
  font-size: clamp(2.75rem, 6vw, 4.5rem);
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.learning-link {
  display: inline-flex;
  justify-self: start;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 46px;
  padding: 8px 16px;
  border: 1px solid var(--theme-border-strong);
  border-radius: 9px;
  color: var(--theme-accent-strong);
  font-weight: 700;
}

.learning-link:hover {
  border-color: var(--theme-accent);
  background: var(--theme-accent-soft);
}

.learning-link-primary {
  border-color: var(--theme-accent);
  color: var(--theme-on-accent);
  background: var(--theme-accent);
}

.learning-link-primary:hover {
  border-color: var(--theme-accent-strong);
  background: var(--theme-accent-strong);
}

.learning-link:focus-visible,
.learning-language:focus-visible {
  outline-color: var(--theme-accent);
}

@media (max-width: 640px) {
  .learning-header-inner,
  .learning-main {
    width: calc(100% - 36px);
  }

  .learning-entries {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-top: 24px;
  }

  .learning-entry-reading {
    grid-template-rows: auto auto;
  }

  .learning-book {
    display: none;
  }

  .learning-entry-review {
    grid-template-rows: auto auto auto;
  }
}
</style>
