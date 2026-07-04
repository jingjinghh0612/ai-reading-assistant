# Prototype Sentence And Paragraph Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add sentence-level translation below clicked sentences and manual paragraph translation in the `/reader-prototype` page.

**Architecture:** Keep the existing `POST /api/translate` backend and frontend `requestTranslation(text)` API. Add small selector helpers for sentence text and local translations, then let `ReaderPrototype.vue` own translation state while `PrototypeReadingPaper.vue` stays a presentational component.

**Tech Stack:** Vue 3 Composition API, existing Node test runner, existing Gemini-backed `/api/translate`, existing `translationCache` utility.

---

## File Structure

- Modify `src/data/readerPrototypeSelectors.js`: add sentence source/local translation helpers and a reusable translation state key helper.
- Modify `src/data/readerPrototypeSelectors.test.js`: add focused selector tests for sentence translation helpers and state key behavior.
- Modify `src/components/reader-prototype/PrototypeReadingPaper.vue`: render selected sentence translation inline, emit sentence and paragraph translation events, keep word clicks isolated.
- Modify `src/pages/ReaderPrototype.vue`: add sentence translation state, manual paragraph translation behavior, and remove paragraph auto-prefetch watcher.
- Modify `src/pages/ReaderPrototype.layout.test.js`: update source-contract tests for sentence translation and manual paragraph translation.
- Modify `src/reader-prototype.css`: style selected sentence translation and paragraph translation actions.

## Task 1: Selector Helpers

**Files:**
- Modify: `src/data/readerPrototypeSelectors.test.js`
- Modify: `src/data/readerPrototypeSelectors.js`

- [ ] **Step 1: Write failing selector tests**

Append these assertions inside `describe('reader prototype selectors', () => { ... })` in `src/data/readerPrototypeSelectors.test.js`, near the existing paragraph translation test:

```js
  it('prepares sentence text and local translations for inline sentence translation', () => {
    assert.equal(typeof selectors.getPrototypeSentenceSourceText, 'function')
    assert.equal(typeof selectors.getPrototypeLocalSentenceTranslation, 'function')
    assert.equal(typeof selectors.getPrototypeTranslationStateKey, 'function')

    assert.equal(
      selectors.getPrototypeSentenceSourceText({
        text: '  The room became quiet.  ',
      }),
      'The room became quiet.',
    )
    assert.equal(selectors.getPrototypeSentenceSourceText(null), '')
    assert.equal(
      selectors.getPrototypeLocalSentenceTranslation({
        translation: ' 房间安静下来。 ',
      }),
      '房间安静下来。',
    )
    assert.equal(
      selectors.getPrototypeLocalSentenceTranslation({
        translation: '暂无译文',
      }),
      '',
    )
    assert.equal(
      selectors.getPrototypeTranslationStateKey('chapter-4', 'p1', 'p1-s2'),
      'chapter-4:p1:p1-s2',
    )
    assert.equal(
      selectors.getPrototypeTranslationStateKey('', 'p1', 'p1-s2'),
      'chapter:p1:p1-s2',
    )
  })
```

- [ ] **Step 2: Run selector tests and verify failure**

Run:

```bash
npm.cmd test -- src/data/readerPrototypeSelectors.test.js
```

Expected: FAIL because `getPrototypeSentenceSourceText`, `getPrototypeLocalSentenceTranslation`, and `getPrototypeTranslationStateKey` are not exported yet.

- [ ] **Step 3: Implement selector helpers**

In `src/data/readerPrototypeSelectors.js`, add these exports after `getPrototypeLocalParagraphTranslation`:

```js
export function getPrototypeSentenceSourceText(sentence) {
  return normalizePrototypeText(sentence?.text)
}

export function getPrototypeLocalSentenceTranslation(sentence) {
  const sentenceTranslation = normalizePrototypeText(sentence?.translation)

  return sentenceTranslation && !isPrototypeTranslationPlaceholder(sentenceTranslation) ? sentenceTranslation : ''
}

export function getPrototypeTranslationStateKey(chapterId, paragraphId, itemId) {
  return `${chapterId || 'chapter'}:${paragraphId || 'paragraph'}:${itemId || ''}`
}
```

- [ ] **Step 4: Run selector tests and verify pass**

Run:

```bash
npm.cmd test -- src/data/readerPrototypeSelectors.test.js
```

Expected: PASS for `reader prototype selectors`.

- [ ] **Step 5: Commit selector helpers**

```bash
git add src/data/readerPrototypeSelectors.js src/data/readerPrototypeSelectors.test.js
git commit -m "feat: add prototype sentence translation selectors"
```

## Task 2: Reading Paper Contract And Markup

**Files:**
- Modify: `src/pages/ReaderPrototype.layout.test.js`
- Modify: `src/components/reader-prototype/PrototypeReadingPaper.vue`
- Modify: `src/reader-prototype.css`

- [ ] **Step 1: Write failing component contract tests**

In `src/pages/ReaderPrototype.layout.test.js`, add this test near `lets the reading paper emit sentence highlight changes while word clicks stay isolated`:

```js
  it('renders inline sentence translation and manual paragraph translation controls', () => {
    assert.match(readingPaperSource, /selectedSentenceId/)
    assert.match(readingPaperSource, /sentence\.translation/)
    assert.match(readingPaperSource, /sentence\.isTranslationLoading/)
    assert.match(readingPaperSource, /sentence\.translationErrorMessage/)
    assert.match(readingPaperSource, /\$emit\('select-sentence',\s*\{[\s\S]*sentence[\s\S]*paragraph[\s\S]*\}\)/)
    assert.match(readingPaperSource, /\$emit\('retry-sentence-translation',\s*\{[\s\S]*sentenceId:\s*sentence\.id[\s\S]*paragraphId:\s*paragraph\.id[\s\S]*\}\)/)
    assert.match(readingPaperSource, /\$emit\('translate-paragraph',\s*paragraph\.id\)/)
    assert.match(readingPaperSource, /translate-paragraph-button/)
    assert.match(readingPaperSource, /sentence-translation-text/)
    assert.match(readingPaperSource, /handleSentenceClick\(sentence,\s*paragraph\)/)
    assert.match(readingPaperSource, /@click="handleSentenceClick\(sentence,\s*paragraph\)"/)
    assert.match(readingPaperSource, /@click\.stop="\$emit\('select-word'/)

    assert.match(prototypeStyleSource, /\.sentence-translation-text/)
    assert.match(prototypeStyleSource, /\.translate-paragraph-button/)
  })
```

Update the existing highlighter contract assertion from:

```js
assert.match(readingPaperSource, /@click="toggleSentenceHighlight\(sentence\.id\)"/)
```

to:

```js
assert.match(readingPaperSource, /@click="handleSentenceClick\(sentence,\s*paragraph\)"/)
assert.match(readingPaperSource, /toggleSentenceHighlight\(sentence\.id\)/)
```

- [ ] **Step 2: Run layout tests and verify failure**

Run:

```bash
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: FAIL because inline sentence translation markup and events do not exist yet.

- [ ] **Step 3: Update `PrototypeReadingPaper.vue` props and emits**

In `src/components/reader-prototype/PrototypeReadingPaper.vue`, add these props:

```js
  selectedSentenceId: {
    type: String,
    default: '',
  },
```

Change emits to:

```js
const emit = defineEmits([
  'select-word',
  'select-sentence',
  'retry-sentence-translation',
  'translate-paragraph',
  'retry-translation',
  'toggle-sentence-highlight',
])
```

Add this function before `toggleSentenceHighlight`:

```js
function handleSentenceClick(sentence, paragraph) {
  if (props.isHighlightMode) {
    toggleSentenceHighlight(sentence.id)
    return
  }

  emit('select-sentence', {
    sentence,
    paragraph,
  })
}
```

- [ ] **Step 4: Update sentence click markup**

In `PrototypeReadingPaper.vue`, replace sentence shell events:

```vue
@click="toggleSentenceHighlight(sentence.id)"
@keydown.enter="toggleSentenceHighlight(sentence.id)"
@keydown.space.prevent="toggleSentenceHighlight(sentence.id)"
```

with:

```vue
@click="handleSentenceClick(sentence, paragraph)"
@keydown.enter="handleSentenceClick(sentence, paragraph)"
@keydown.space.prevent="handleSentenceClick(sentence, paragraph)"
```

After the `</span>` for each `sentence-shell`, add the inline translation block inside the sentence `v-for` template:

```vue
            <span
              v-if="selectedSentenceId === sentence.id"
              class="sentence-translation-text"
            >
              <span v-if="sentence.translation">{{ sentence.translation }}</span>
              <span v-else-if="sentence.isTranslationLoading" class="translation-loading">正在翻译...</span>
              <span v-else-if="sentence.translationErrorMessage" class="translation-error">
                {{ sentence.translationErrorMessage }}
                <button
                  class="translation-retry-button"
                  type="button"
                  @click.stop="$emit('retry-sentence-translation', {
                    sentenceId: sentence.id,
                    paragraphId: paragraph.id,
                  })"
                >
                  重试
                </button>
              </span>
            </span>
```

- [ ] **Step 5: Update paragraph translation markup**

In `PrototypeReadingPaper.vue`, change the paragraph translation area to show a manual button when no translation exists:

```vue
        <div v-if="showTranslation" class="translation-text">
          <span v-if="paragraph.translation">{{ paragraph.translation }}</span>
          <span v-else-if="paragraph.isTranslationLoading" class="translation-loading">正在翻译...</span>
          <span v-else-if="paragraph.translationErrorMessage" class="translation-error">
            {{ paragraph.translationErrorMessage }}
            <button
              class="translation-retry-button"
              type="button"
              @click="$emit('retry-translation', paragraph.id)"
            >
              重试
            </button>
          </span>
          <button
            v-else
            class="translate-paragraph-button"
            type="button"
            @click="$emit('translate-paragraph', paragraph.id)"
          >
            翻译本段
          </button>
        </div>
```

- [ ] **Step 6: Add styles**

In `src/reader-prototype.css`, add near `.translation-text`:

```css
.sentence-translation-text {
  display: block;
  margin: 8px 0 10px;
  padding: 9px 12px;
  border-left: 3px solid #93c5fd;
  border-radius: 8px;
  background: #f1f7ff;
  color: #475569;
  font-family: var(--prototype-sans);
  font-size: 15px;
  line-height: 1.7;
}

.translate-paragraph-button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #2563eb;
  cursor: pointer;
  font: inherit;
  padding: 6px 11px;
}

.translate-paragraph-button:hover {
  border-color: #93c5fd;
  background: #f8fbff;
}
```

- [ ] **Step 7: Run layout tests and verify pass**

Run:

```bash
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: PASS for `reader prototype word definition panel contract`.

- [ ] **Step 8: Commit reading paper markup**

```bash
git add src/pages/ReaderPrototype.layout.test.js src/components/reader-prototype/PrototypeReadingPaper.vue src/reader-prototype.css
git commit -m "feat: render prototype sentence translations inline"
```

## Task 3: Page Translation State And Manual Paragraph Trigger

**Files:**
- Modify: `src/pages/ReaderPrototype.layout.test.js`
- Modify: `src/pages/ReaderPrototype.vue`

- [ ] **Step 1: Write failing page contract tests**

In `src/pages/ReaderPrototype.layout.test.js`, add this test after the existing translation endpoint test:

```js
  it('loads sentence translations on demand and keeps paragraph translation manual', () => {
    assert.match(readerPrototypeSource, /getPrototypeLocalSentenceTranslation/)
    assert.match(readerPrototypeSource, /getPrototypeSentenceSourceText/)
    assert.match(readerPrototypeSource, /getPrototypeTranslationStateKey/)
    assert.match(readerPrototypeSource, /selectedSentenceId/)
    assert.match(readerPrototypeSource, /translationBySentenceId/)
    assert.match(readerPrototypeSource, /translationLoadingBySentenceId/)
    assert.match(readerPrototypeSource, /translationErrorBySentenceId/)
    assert.match(readerPrototypeSource, /loadPrototypeSentenceTranslation/)
    assert.match(readerPrototypeSource, /selectPrototypeSentence/)
    assert.match(readerPrototypeSource, /retryPrototypeSentenceTranslation/)
    assert.match(readerPrototypeSource, /translatePrototypeParagraph/)
    assert.match(readerPrototypeSource, /:selected-sentence-id="selectedSentenceId"/)
    assert.match(readerPrototypeSource, /@select-sentence="selectPrototypeSentence"/)
    assert.match(readerPrototypeSource, /@retry-sentence-translation="retryPrototypeSentenceTranslation"/)
    assert.match(readerPrototypeSource, /@translate-paragraph="translatePrototypeParagraph"/)
    assert.doesNotMatch(readerPrototypeSource, /function loadMissingPrototypeTranslations/)
    assert.doesNotMatch(readerPrototypeSource, /watch\(\[showTranslation,\s*currentChapterContent\]/)
  })
```

- [ ] **Step 2: Run layout tests and verify failure**

Run:

```bash
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: FAIL because sentence translation state and manual paragraph trigger are not wired yet, and paragraph auto-prefetch still exists.

- [ ] **Step 3: Update imports and state in `ReaderPrototype.vue`**

Add these imports from `../data/readerPrototypeSelectors.js`:

```js
  getPrototypeLocalSentenceTranslation,
  getPrototypeSentenceSourceText,
  getPrototypeTranslationStateKey,
```

Add state near existing paragraph translation refs:

```js
const selectedSentenceId = ref('')
const selectedSentenceParagraphId = ref('')
const translationBySentenceId = ref({})
const translationLoadingBySentenceId = ref({})
const translationErrorBySentenceId = ref({})
```

- [ ] **Step 4: Replace paragraph state key helper**

Replace `getPrototypeParagraphStateKey` with:

```js
function getPrototypeChapterStateId() {
  return currentChapter.value?.id || currentChapterContent.value?.id || 'chapter'
}

function getPrototypeParagraphStateKey(paragraph) {
  return getPrototypeTranslationStateKey(getPrototypeChapterStateId(), paragraph?.id || '', 'paragraph')
}

function getPrototypeSentenceStateKey(sentence, paragraph) {
  return getPrototypeTranslationStateKey(
    getPrototypeChapterStateId(),
    paragraph?.id || selectedSentenceParagraphId.value || '',
    sentence?.id || selectedSentenceId.value || '',
  )
}
```

- [ ] **Step 5: Add sentence data to `displayParagraphs`**

In `displayParagraphs`, map each sentence with translation state:

```js
const displayParagraphs = computed(() =>
  paragraphs.value.map((paragraph) => {
    const paragraphStateKey = getPrototypeParagraphStateKey(paragraph)
    const localTranslation = getPrototypeLocalParagraphTranslation(paragraph)

    return {
      ...paragraph,
      translation: localTranslation || translationByParagraphId.value[paragraphStateKey] || '',
      isTranslationLoading: Boolean(translationLoadingByParagraphId.value[paragraphStateKey]),
      translationErrorMessage: translationErrorByParagraphId.value[paragraphStateKey] || '',
      sentences: (paragraph.sentences || []).map((sentence) => {
        const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
        const localSentenceTranslation = getPrototypeLocalSentenceTranslation(sentence)

        return {
          ...sentence,
          translation: localSentenceTranslation || translationBySentenceId.value[sentenceStateKey] || '',
          isTranslationLoading: Boolean(translationLoadingBySentenceId.value[sentenceStateKey]),
          translationErrorMessage: translationErrorBySentenceId.value[sentenceStateKey] || '',
        }
      }),
    }
  }),
)
```

- [ ] **Step 6: Add sentence translation functions**

Add these functions near `loadPrototypeParagraphTranslation`:

```js
async function loadPrototypeSentenceTranslation(sentence, paragraph, options = {}) {
  const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
  const sourceText = getPrototypeSentenceSourceText(sentence)

  if (!sentenceStateKey || !sourceText || getPrototypeLocalSentenceTranslation(sentence)) {
    return
  }

  if (!options.refresh && translationBySentenceId.value[sentenceStateKey]) {
    return
  }

  setRecordValue(translationErrorBySentenceId, sentenceStateKey, '')
  setRecordValue(translationLoadingBySentenceId, sentenceStateKey, true)

  try {
    const translation = await getPrototypeTranslation(sourceText, options)

    if (!translation) {
      throw new Error('没有返回可用译文。')
    }

    setRecordValue(translationBySentenceId, sentenceStateKey, translation)
  } catch (error) {
    setRecordValue(translationErrorBySentenceId, sentenceStateKey, getErrorMessage(error, 'AI 翻译加载失败。'))
  } finally {
    setRecordValue(translationLoadingBySentenceId, sentenceStateKey, false)
  }
}

function selectPrototypeSentence({ sentence, paragraph }) {
  if (!sentence?.id || !paragraph?.id) {
    return
  }

  selectedSentenceId.value = sentence.id
  selectedSentenceParagraphId.value = paragraph.id
  loadPrototypeSentenceTranslation(sentence, paragraph)
}

function retryPrototypeSentenceTranslation({ sentenceId, paragraphId }) {
  const paragraph = paragraphs.value.find((item) => item.id === paragraphId)
  const sentence = paragraph?.sentences?.find((item) => item.id === sentenceId)

  if (!paragraph || !sentence) {
    return
  }

  selectedSentenceId.value = sentence.id
  selectedSentenceParagraphId.value = paragraph.id
  const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
  setRecordValue(translationBySentenceId, sentenceStateKey, '')
  setRecordValue(translationErrorBySentenceId, sentenceStateKey, '')
  loadPrototypeSentenceTranslation(sentence, paragraph, { refresh: true })
}
```

- [ ] **Step 7: Replace paragraph auto-prefetch with manual trigger**

Delete `loadMissingPrototypeTranslations()` and the bottom watcher:

```js
watch([showTranslation, currentChapterContent], () => {
  loadMissingPrototypeTranslations()
}, { immediate: true })
```

Add manual paragraph trigger:

```js
function translatePrototypeParagraph(paragraphId) {
  const paragraph = paragraphs.value.find((item) => item.id === paragraphId)

  if (!paragraph) {
    return
  }

  loadPrototypeParagraphTranslation(paragraph)
}
```

Keep `retryPrototypeTranslation(paragraphId)` as the paragraph retry path.

- [ ] **Step 8: Wire props and events in template**

Update the `<PrototypeReadingPaper />` usage:

```vue
          :selected-sentence-id="selectedSentenceId"
          @select-sentence="selectPrototypeSentence"
          @retry-sentence-translation="retryPrototypeSentenceTranslation"
          @translate-paragraph="translatePrototypeParagraph"
```

Keep existing:

```vue
          @select-word="selectWord"
          @retry-translation="retryPrototypeTranslation"
          @toggle-sentence-highlight="toggleSentenceHighlight"
```

- [ ] **Step 9: Clear selected sentence on chapter/book content changes**

In the existing watchers around book/chapter changes, or near other reset logic, add:

```js
watch(currentChapterContent, () => {
  selectedSentenceId.value = ''
  selectedSentenceParagraphId.value = ''
})
```

If there is already a `watch(currentChapterContent, ...)`, merge these two assignments into it instead of adding a duplicate watcher.

- [ ] **Step 10: Run page contract tests and verify pass**

Run:

```bash
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: PASS for page contract tests.

- [ ] **Step 11: Commit page translation state**

```bash
git add src/pages/ReaderPrototype.vue src/pages/ReaderPrototype.layout.test.js
git commit -m "feat: load prototype translations on demand"
```

## Task 4: Full Verification And Browser Smoke Test

**Files:**
- No planned source edits unless verification finds a regression.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm.cmd test
```

Expected: PASS with zero failing tests.

- [ ] **Step 2: Run production build**

Run:

```bash
npm.cmd run build
```

Expected: PASS and Vite emits `dist/` assets.

- [ ] **Step 3: Start or reuse local servers**

If servers are not running, start them:

```bash
npm.cmd run dev
```

and, in a separate terminal if the backend is not already running:

```bash
npm.cmd run server
```

Expected:

- Frontend available at `http://127.0.0.1:5173/reader-prototype`
- Backend available at `http://127.0.0.1:3001`

- [ ] **Step 4: Browser smoke test**

Open `http://127.0.0.1:5173/reader-prototype` and verify:

- Click a sentence, and a translation block appears directly below that sentence.
- Click a different sentence, and the translation block moves to the new sentence.
- Click a word token, and only the right word panel changes; the word click does not trigger sentence translation.
- Turn on the paragraph translation area and confirm missing paragraphs show `翻译本段` instead of auto-loading.
- Click `翻译本段`, and the paragraph translation appears at the bottom of that paragraph.

- [ ] **Step 5: Commit verification-only fixes if needed**

If Step 1-4 uncover a small bug, fix only that bug, rerun the failed verification, and commit:

```bash
git add src/pages/ReaderPrototype.vue src/components/reader-prototype/PrototypeReadingPaper.vue src/reader-prototype.css src/data/readerPrototypeSelectors.js src/pages/ReaderPrototype.layout.test.js src/data/readerPrototypeSelectors.test.js
git commit -m "fix: polish prototype translation interactions"
```

If no fixes are needed, do not create an empty commit.

