# Reader Prototype Highlighter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/reader-prototype` 上实现句子级、可选颜色、页面内存态的手动高亮原型功能。

**Architecture:** 高亮状态由 `ReaderPrototype.vue` 持有，纯数据切换逻辑放进 `readerPrototypeSelectors.js`。`PrototypeTopbar.vue` 只展示高亮笔、显示开关、颜色和清除控件并发出事件；`PrototypeReadingPaper.vue` 只渲染句子高亮并发出句子点击事件。

**Tech Stack:** Vue 3 Composition API, plain CSS, Node built-in test runner, existing Vite build.

---

## Scope Check

这是一个单一原型页子系统，不需要拆分多个计划。本计划只触碰 `/reader-prototype` 相关页面、组件、选择器、样式和测试，不修改正式 `/reader`、API、存储、生词本、翻译、总结或服务端逻辑。

## File Structure

- Modify: `src/data/readerPrototypeSelectors.js`
  - 增加高亮默认状态提取、当前章节高亮读取、切换高亮、清除高亮的纯函数。
- Modify: `src/data/readerPrototypeSelectors.test.js`
  - 用 Node test 覆盖高亮 helper 的数据行为。
- Modify: `src/pages/ReaderPrototype.vue`
  - 持有高亮笔模式、当前颜色、清除模式、按章节保存的高亮状态。
  - 把高亮状态传给 topbar 和 reading paper。
- Modify: `src/components/reader-prototype/PrototypeTopbar.vue`
  - 增加高亮笔按钮、显示高亮按钮、颜色圆点、清除按钮。
- Modify: `src/components/reader-prototype/PrototypeReadingPaper.vue`
  - 根据句子 id 和颜色映射渲染高亮样式。
  - 高亮笔模式下点击句子触发高亮切换。
  - 保留单词按钮 `@click.stop`。
- Modify: `src/reader-prototype.css`
  - 增加高亮工具条、颜色圆点、清除模式、彩色 marker 的样式。
- Modify: `src/pages/ReaderPrototype.layout.test.js`
  - 增加静态契约测试，确认状态接线、topbar 控件、reading paper 事件和样式存在。

---

### Task 1: Add Highlighter Selector Tests

**Files:**
- Modify: `src/data/readerPrototypeSelectors.test.js`

- [ ] **Step 1: Add failing selector tests**

Append this `describe` block inside the existing top-level `describe('reader prototype selectors', () => {` block, after the current final `it('derives the current chapter vocabulary from structured word tokens', () => {` test and before the final closing `})`:

```js
  describe('sentence highlight helpers', () => {
    it('derives default sentence highlights from highlighted prototype data', () => {
      assert.equal(typeof selectors.getDefaultPrototypeHighlights, 'function')

      assert.deepEqual(selectors.getDefaultPrototypeHighlights(prototypeChapterContent['chapter-4']), {
        'p1-s2': 'yellow',
      })
      assert.deepEqual(selectors.getDefaultPrototypeHighlights(prototypeChapterContent['chapter-5']), {
        'chapter-5-p1-s2': 'yellow',
      })
      assert.deepEqual(
        selectors.getDefaultPrototypeHighlights(
          {
            paragraphs: [
              {
                id: 'p1',
                sentences: [
                  { id: 's1', highlighted: true },
                  { id: 's2', highlighted: false },
                  { id: '', highlighted: true },
                ],
              },
            ],
          },
          'blue',
        ),
        { s1: 'blue' },
      )
      assert.deepEqual(selectors.getDefaultPrototypeHighlights(null), {})
    })

    it('returns a copied highlight map for the requested chapter', () => {
      assert.equal(typeof selectors.getPrototypeChapterHighlights, 'function')

      const highlightsByChapter = {
        'chapter-4': {
          'p1-s2': 'yellow',
        },
      }
      const chapterHighlights = selectors.getPrototypeChapterHighlights(highlightsByChapter, 'chapter-4')

      assert.deepEqual(chapterHighlights, { 'p1-s2': 'yellow' })
      assert.notEqual(chapterHighlights, highlightsByChapter['chapter-4'])
      assert.deepEqual(selectors.getPrototypeChapterHighlights(highlightsByChapter, 'missing-chapter'), {})
      assert.deepEqual(selectors.getPrototypeChapterHighlights(null, 'chapter-4'), {})
    })

    it('applies, updates, and toggles sentence highlights by color', () => {
      assert.equal(typeof selectors.togglePrototypeSentenceHighlight, 'function')

      const originalHighlights = {
        'p1-s2': 'yellow',
      }

      assert.deepEqual(
        selectors.togglePrototypeSentenceHighlight(originalHighlights, 'p2-s1', 'blue'),
        {
          'p1-s2': 'yellow',
          'p2-s1': 'blue',
        },
      )
      assert.deepEqual(
        selectors.togglePrototypeSentenceHighlight(originalHighlights, 'p1-s2', 'green'),
        {
          'p1-s2': 'green',
        },
      )
      assert.deepEqual(selectors.togglePrototypeSentenceHighlight(originalHighlights, 'p1-s2', 'yellow'), {})
      assert.deepEqual(selectors.togglePrototypeSentenceHighlight(originalHighlights, '', 'yellow'), originalHighlights)
      assert.deepEqual(selectors.togglePrototypeSentenceHighlight(originalHighlights, 'p2-s1', ''), originalHighlights)
      assert.deepEqual(originalHighlights, { 'p1-s2': 'yellow' })
    })

    it('removes one sentence highlight without mutating the original map', () => {
      assert.equal(typeof selectors.removePrototypeSentenceHighlight, 'function')

      const originalHighlights = {
        'p1-s2': 'yellow',
        'p2-s1': 'blue',
      }

      assert.deepEqual(selectors.removePrototypeSentenceHighlight(originalHighlights, 'p1-s2'), {
        'p2-s1': 'blue',
      })
      assert.deepEqual(selectors.removePrototypeSentenceHighlight(originalHighlights, 'missing-sentence'), originalHighlights)
      assert.deepEqual(selectors.removePrototypeSentenceHighlight(null, 'p1-s2'), {})
      assert.deepEqual(originalHighlights, {
        'p1-s2': 'yellow',
        'p2-s1': 'blue',
      })
    })
  })
```

- [ ] **Step 2: Run selector tests and verify failure**

Run:

```powershell
npm.cmd test -- src/data/readerPrototypeSelectors.test.js
```

Expected: FAIL with an assertion like `Expected values to be strictly equal: actual 'undefined', expected 'function'` for `selectors.getDefaultPrototypeHighlights`.

- [ ] **Step 3: Commit is not allowed yet**

Do not commit after this task. The failing test must be paired with the implementation in Task 2.

---

### Task 2: Implement Highlighter Selector Helpers

**Files:**
- Modify: `src/data/readerPrototypeSelectors.js`
- Test: `src/data/readerPrototypeSelectors.test.js`

- [ ] **Step 1: Add pure helper functions**

Append these exports to `src/data/readerPrototypeSelectors.js`, after `mapDictionaryEntryToWordPanel`:

```js
export function getDefaultPrototypeHighlights(chapterContent, defaultColorId = 'yellow') {
  const highlights = {}

  for (const paragraph of chapterContent?.paragraphs || []) {
    for (const sentence of paragraph.sentences || []) {
      if (sentence?.highlighted && sentence.id) {
        highlights[sentence.id] = defaultColorId
      }
    }
  }

  return highlights
}

export function getPrototypeChapterHighlights(highlightsByChapter, chapterId) {
  return {
    ...(highlightsByChapter?.[chapterId] || {}),
  }
}

export function togglePrototypeSentenceHighlight(chapterHighlights, sentenceId, activeColorId) {
  const nextHighlights = {
    ...(chapterHighlights || {}),
  }

  if (!sentenceId || !activeColorId) {
    return nextHighlights
  }

  if (nextHighlights[sentenceId] === activeColorId) {
    delete nextHighlights[sentenceId]
    return nextHighlights
  }

  nextHighlights[sentenceId] = activeColorId
  return nextHighlights
}

export function removePrototypeSentenceHighlight(chapterHighlights, sentenceId) {
  const nextHighlights = {
    ...(chapterHighlights || {}),
  }

  if (sentenceId) {
    delete nextHighlights[sentenceId]
  }

  return nextHighlights
}
```

- [ ] **Step 2: Run selector tests and verify pass**

Run:

```powershell
npm.cmd test -- src/data/readerPrototypeSelectors.test.js
```

Expected: PASS. The output should include `# pass` and no failed tests for `readerPrototypeSelectors.test.js`.

- [ ] **Step 3: Commit selector tests and helpers**

Run:

```powershell
git add src/data/readerPrototypeSelectors.js src/data/readerPrototypeSelectors.test.js
git diff --cached --name-only
git commit -m "feat: add prototype highlight selectors"
```

Expected staged files:

```text
src/data/readerPrototypeSelectors.js
src/data/readerPrototypeSelectors.test.js
```

---

### Task 3: Add Prototype Highlighter Contract Tests

**Files:**
- Modify: `src/pages/ReaderPrototype.layout.test.js`

- [ ] **Step 1: Add failing contract tests**

In the existing `it('styles selected word tokens and dictionary details without chat UI emphasis', () => {` test, replace this assertion:

```js
    assert.match(prototypeStyleSource, /\.sentence-highlight\s*\{[\s\S]*rgba\(249, 216, 102/)
```

with:

```js
    assert.match(prototypeStyleSource, /\.sentence-highlight-yellow\s*\{[\s\S]*rgba\(249, 216, 102/)
```

Append these tests inside the existing `describe('reader prototype word definition panel contract', () => {` block, after the current `it('styles the top toolbar as grouped reader controls with clear states', () => {` test and before the final closing `})`:

```js
  it('wires prototype highlighter state through the page', () => {
    assert.match(readerPrototypeSource, /prototypeHighlightColors/)
    assert.match(readerPrototypeSource, /isHighlightMode/)
    assert.match(readerPrototypeSource, /activeHighlightColorId/)
    assert.match(readerPrototypeSource, /isHighlightClearMode/)
    assert.match(readerPrototypeSource, /sentenceHighlightsByChapter/)
    assert.match(readerPrototypeSource, /currentChapterHighlights/)
    assert.match(readerPrototypeSource, /getDefaultPrototypeHighlights/)
    assert.match(readerPrototypeSource, /getPrototypeChapterHighlights/)
    assert.match(readerPrototypeSource, /togglePrototypeSentenceHighlight/)
    assert.match(readerPrototypeSource, /removePrototypeSentenceHighlight/)
    assert.match(readerPrototypeSource, /:highlight-colors="prototypeHighlightColors"/)
    assert.match(readerPrototypeSource, /:is-highlight-mode="isHighlightMode"/)
    assert.match(readerPrototypeSource, /:active-highlight-color-id="activeHighlightColorId"/)
    assert.match(readerPrototypeSource, /:is-highlight-clear-mode="isHighlightClearMode"/)
    assert.match(readerPrototypeSource, /:sentence-highlights="currentChapterHighlights"/)
    assert.match(readerPrototypeSource, /@toggle-highlight-mode="toggleHighlightMode"/)
    assert.match(readerPrototypeSource, /@select-highlight-color="selectHighlightColor"/)
    assert.match(readerPrototypeSource, /@select-highlight-clear="selectHighlightClear"/)
    assert.match(readerPrototypeSource, /@toggle-sentence-highlight="toggleSentenceHighlight"/)
    assert.doesNotMatch(readerPrototypeSource, /localStorage/)
  })

  it('renders highlighter controls without mixing marking mode and visibility', () => {
    assert.match(topbarSource, /highlightColors/)
    assert.match(topbarSource, /isHighlightMode/)
    assert.match(topbarSource, /activeHighlightColorId/)
    assert.match(topbarSource, /isHighlightClearMode/)
    assert.match(topbarSource, /highlight-color-swatches/)
    assert.match(topbarSource, /highlight-color-button/)
    assert.match(topbarSource, /highlight-clear-button/)
    assert.match(topbarSource, /toggle-highlight-mode/)
    assert.match(topbarSource, /toggle-highlight-visibility/)
    assert.match(topbarSource, /select-highlight-color/)
    assert.match(topbarSource, /select-highlight-clear/)
    assert.match(topbarSource, /aria-pressed/)
  })

  it('lets the reading paper emit sentence highlight changes while word clicks stay isolated', () => {
    assert.match(readingPaperSource, /sentenceHighlights/)
    assert.match(readingPaperSource, /isHighlightMode/)
    assert.match(readingPaperSource, /activeHighlightColorId/)
    assert.match(readingPaperSource, /getSentenceHighlightColor/)
    assert.match(readingPaperSource, /getSentenceHighlightClass/)
    assert.match(readingPaperSource, /toggleSentenceHighlight/)
    assert.match(readingPaperSource, /toggle-sentence-highlight/)
    assert.match(readingPaperSource, /@click="toggleSentenceHighlight\(sentence\.id\)"/)
    assert.match(readingPaperSource, /@keydown\.enter="toggleSentenceHighlight\(sentence\.id\)"/)
    assert.match(readingPaperSource, /@click\.stop="\$emit\('select-word'/)
  })

  it('styles prototype highlighter controls and color variants', () => {
    assert.match(prototypeStyleSource, /\.highlight-color-swatches/)
    assert.match(prototypeStyleSource, /\.highlight-color-button/)
    assert.match(prototypeStyleSource, /\.highlight-clear-button/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-yellow/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-green/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-blue/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-pink/)
    assert.match(prototypeStyleSource, /\.sentence-highlight-purple/)
    assert.match(prototypeStyleSource, /\.sentence-highlight\.is-highlight-mode/)
  })
```

- [ ] **Step 2: Run contract test and verify failure**

Run:

```powershell
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: FAIL on the first new test because `prototypeHighlightColors` is not in `ReaderPrototype.vue`.

- [ ] **Step 3: Commit is not allowed yet**

Do not commit after this task. The failing contract tests must be paired with implementation tasks 4 through 7.

---

### Task 4: Wire Highlighter State In `ReaderPrototype.vue`

**Files:**
- Modify: `src/pages/ReaderPrototype.vue`
- Test: `src/pages/ReaderPrototype.layout.test.js`

- [ ] **Step 1: Update selector imports**

Modify the import from `../data/readerPrototypeSelectors.js` so it includes the four new helpers:

```js
import {
  findPrototypeBook,
  findPrototypeChapter,
  findPrototypeChapterContent,
  getDefaultPrototypeHighlights,
  getPrototypeChapterHighlights,
  getPrototypeChapterVocabulary,
  getPrototypeWordContext,
  getPrototypeChapters,
  getPrototypeParagraphs,
  getPrototypeReadingProgress,
  mapDictionaryEntryToWordPanel,
  removePrototypeSentenceHighlight,
  togglePrototypeSentenceHighlight,
} from '../data/readerPrototypeSelectors.js'
```

- [ ] **Step 2: Add color configuration and initial state builder**

Add this code after `const fallbackChapterId = 'chapter-4'`:

```js
const defaultHighlightColorId = 'yellow'
const prototypeHighlightColors = [
  { id: 'yellow', label: '黄色' },
  { id: 'green', label: '绿色' },
  { id: 'blue', label: '蓝色' },
  { id: 'pink', label: '粉色' },
  { id: 'purple', label: '紫色' },
]

function createInitialPrototypeHighlights() {
  return Object.fromEntries(
    Object.entries(prototypeChapterContent).map(([chapterId, chapterContent]) => [
      chapterId,
      getDefaultPrototypeHighlights(chapterContent, defaultHighlightColorId),
    ]),
  )
}
```

- [ ] **Step 3: Add highlighter refs**

Add these refs after `const showHighlight = ref(true)`:

```js
const isHighlightMode = ref(false)
const activeHighlightColorId = ref(defaultHighlightColorId)
const isHighlightClearMode = ref(false)
const sentenceHighlightsByChapter = ref(createInitialPrototypeHighlights())
```

- [ ] **Step 4: Add current chapter highlight computed value**

Add this computed value after `const paragraphs = computed(() => getPrototypeParagraphs(currentChapterContent.value))`:

```js
const currentChapterHighlights = computed(() => {
  return getPrototypeChapterHighlights(sentenceHighlightsByChapter.value, currentChapter.value?.id)
})
```

- [ ] **Step 5: Pass highlighter props and events**

Update the `PrototypeTopbar` usage to this shape:

```vue
    <PrototypeTopbar
      :book="currentBook"
      :chapter="currentChapter"
      :show-translation="showTranslation"
      :show-highlight="showHighlight"
      :highlight-colors="prototypeHighlightColors"
      :is-highlight-mode="isHighlightMode"
      :active-highlight-color-id="activeHighlightColorId"
      :is-highlight-clear-mode="isHighlightClearMode"
      @toggle-translation="showTranslation = !showTranslation"
      @toggle-highlight-visibility="showHighlight = !showHighlight"
      @toggle-highlight-mode="toggleHighlightMode"
      @select-highlight-color="selectHighlightColor"
      @select-highlight-clear="selectHighlightClear"
    />
```

Update the `PrototypeReadingPaper` usage to include these props and event:

```vue
          :sentence-highlights="currentChapterHighlights"
          :is-highlight-mode="isHighlightMode"
          :active-highlight-color-id="activeHighlightColorId"
          @toggle-sentence-highlight="toggleSentenceHighlight"
```

The final `PrototypeReadingPaper` prop block must still include existing `:selected-word-key`, `:selected-paragraph-id`, and `@select-word`.

- [ ] **Step 6: Add highlighter methods**

Add these functions before the existing `function selectChapter(chapterId) {` declaration:

```js
function isKnownHighlightColor(colorId) {
  return prototypeHighlightColors.some((color) => color.id === colorId)
}

function toggleHighlightMode() {
  isHighlightMode.value = !isHighlightMode.value

  if (isHighlightMode.value && !isKnownHighlightColor(activeHighlightColorId.value)) {
    activeHighlightColorId.value = defaultHighlightColorId
    isHighlightClearMode.value = false
  }
}

function selectHighlightColor(colorId) {
  if (!isKnownHighlightColor(colorId)) {
    return
  }

  activeHighlightColorId.value = colorId
  isHighlightClearMode.value = false
  isHighlightMode.value = true
}

function selectHighlightClear() {
  isHighlightClearMode.value = true
  isHighlightMode.value = true
}

function setCurrentChapterHighlights(nextChapterHighlights) {
  const chapterId = currentChapter.value?.id

  if (!chapterId) {
    return
  }

  sentenceHighlightsByChapter.value = {
    ...sentenceHighlightsByChapter.value,
    [chapterId]: nextChapterHighlights,
  }
}

function toggleSentenceHighlight(sentenceId) {
  if (!isHighlightMode.value || !sentenceId) {
    return
  }

  const nextChapterHighlights = isHighlightClearMode.value
    ? removePrototypeSentenceHighlight(currentChapterHighlights.value, sentenceId)
    : togglePrototypeSentenceHighlight(currentChapterHighlights.value, sentenceId, activeHighlightColorId.value)

  setCurrentChapterHighlights(nextChapterHighlights)
}
```

- [ ] **Step 7: Run contract test and confirm remaining failures**

Run:

```powershell
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: FAIL. The `ReaderPrototype.vue` assertions should pass, and failures should now point to missing topbar, reading paper, or CSS strings.

- [ ] **Step 8: Do not commit yet**

Do not commit until tasks 5 through 7 complete and the contract test passes.

---

### Task 5: Implement `PrototypeTopbar.vue` Controls

**Files:**
- Modify: `src/components/reader-prototype/PrototypeTopbar.vue`
- Test: `src/pages/ReaderPrototype.layout.test.js`

- [ ] **Step 1: Replace the reading group controls**

Replace the current `<div class="toolstrip-group reading-group" aria-label="闃呰鎿嶄綔">` block with:

```vue
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
```

- [ ] **Step 2: Add topbar props**

In `defineProps`, add these prop definitions after `showHighlight`:

```js
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
```

- [ ] **Step 3: Update emitted event names**

Replace the `defineEmits` list with:

```js
defineEmits([
  'toggle-translation',
  'toggle-highlight-visibility',
  'toggle-highlight-mode',
  'select-highlight-color',
  'select-highlight-clear',
])
```

- [ ] **Step 4: Run contract test and confirm remaining failures**

Run:

```powershell
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: FAIL. Topbar assertions should pass; failures should now point to missing reading paper or CSS strings.

- [ ] **Step 5: Do not commit yet**

Do not commit until reading paper and CSS are implemented and contract tests pass.

---

### Task 6: Implement Sentence Highlight Events In `PrototypeReadingPaper.vue`

**Files:**
- Modify: `src/components/reader-prototype/PrototypeReadingPaper.vue`
- Test: `src/pages/ReaderPrototype.layout.test.js`

- [ ] **Step 1: Replace sentence wrapper markup**

Replace the current sentence wrapper:

```vue
            <span
              :class="{ 'sentence-highlight': sentence.highlighted && showHighlight }"
            >
```

with:

```vue
            <span
              class="sentence-shell"
              :class="getSentenceHighlightClass(sentence)"
              :role="isHighlightMode ? 'button' : null"
              :tabindex="isHighlightMode ? 0 : null"
              @click="toggleSentenceHighlight(sentence.id)"
              @keydown.enter="toggleSentenceHighlight(sentence.id)"
              @keydown.space.prevent="toggleSentenceHighlight(sentence.id)"
            >
```

- [ ] **Step 2: Bind word click with `.stop`**

Replace the word button click binding with the `.stop` modifier:

```vue
                  @click.stop="$emit('select-word', {
                    wordKey: token.wordKey,
                    surface: token.surface || token.text,
                    sentenceId: token.sentenceId,
                  })"
```

- [ ] **Step 3: Add props and emits**

Replace the anonymous `defineProps({` call with:

```js
const props = defineProps({
```

Keep the existing prop definitions, then add these prop definitions after `showHighlight`:

```js
  sentenceHighlights: {
    type: Object,
    default: () => ({}),
  },
  isHighlightMode: {
    type: Boolean,
    default: false,
  },
  activeHighlightColorId: {
    type: String,
    default: 'yellow',
  },
```

Replace `defineEmits(['select-word'])` with:

```js
const emit = defineEmits(['select-word', 'toggle-sentence-highlight'])
```

- [ ] **Step 4: Add helper functions**

Add these functions below the emits declaration:

```js
function getSentenceHighlightColor(sentence) {
  return props.sentenceHighlights[sentence.id] || ''
}

function getSentenceHighlightClass(sentence) {
  const colorId = getSentenceHighlightColor(sentence)

  return {
    'sentence-highlight': props.showHighlight && Boolean(colorId),
    [`sentence-highlight-${colorId}`]: props.showHighlight && Boolean(colorId),
    'is-highlight-mode': props.isHighlightMode,
  }
}

function toggleSentenceHighlight(sentenceId) {
  if (!props.isHighlightMode) {
    return
  }

  emit('toggle-sentence-highlight', sentenceId)
}
```

- [ ] **Step 5: Run contract test and confirm remaining failures**

Run:

```powershell
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: FAIL. Reader page, topbar, and reading paper assertions should pass; failures should now point to missing CSS strings.

- [ ] **Step 6: Do not commit yet**

Do not commit until CSS is implemented and tests pass.

---

### Task 7: Add Highlighter Styles

**Files:**
- Modify: `src/reader-prototype.css`
- Test: `src/pages/ReaderPrototype.layout.test.js`

- [ ] **Step 1: Add topbar color control styles**

Add these styles after the existing `.toolstrip-button.compact` block:

```css
.highlight-color-swatches {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 2px;
}

.highlight-color-button {
  width: 26px;
  min-width: 26px;
  height: 26px;
  border: 1px solid #d8e0eb;
  border-radius: 999px;
  padding: 3px;
  background: #ffffff;
  cursor: pointer;
}

.highlight-color-button span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.highlight-color-button.active {
  border-color: #1d4ed8;
  box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.16);
}

.highlight-color-yellow span {
  background: #f9d866;
}

.highlight-color-green span {
  background: #b9f3d0;
}

.highlight-color-blue span {
  background: #bfdbfe;
}

.highlight-color-pink span {
  background: #fbcfe8;
}

.highlight-color-purple span {
  background: #ddd6fe;
}

.highlight-clear-button {
  height: 26px;
  border: 1px solid #d8e0eb;
  border-radius: 999px;
  padding: 0 9px;
  color: #647084;
  background: #ffffff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 720;
}

.highlight-clear-button.active {
  border-color: #bdd0f7;
  color: #1d4ed8;
  background: #edf4ff;
}
```

- [ ] **Step 2: Replace the base highlight style**

Replace the existing `.sentence-highlight` CSS rule with:

```css
.sentence-shell {
  border-radius: 4px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.sentence-shell.is-highlight-mode {
  cursor: crosshair;
}

.sentence-highlight {
  padding: 0 2px 2px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0) 48%, var(--sentence-highlight-line) 48%),
    var(--sentence-highlight-fill);
  box-shadow: inset 0 -1px 0 var(--sentence-highlight-edge);
}

.sentence-highlight-yellow {
  --sentence-highlight-line: rgba(249, 216, 102, 0.68);
  --sentence-highlight-fill: rgba(255, 244, 196, 0.28);
  --sentence-highlight-edge: rgba(202, 133, 4, 0.18);
}

.sentence-highlight-green {
  --sentence-highlight-line: rgba(185, 243, 208, 0.74);
  --sentence-highlight-fill: rgba(220, 252, 231, 0.32);
  --sentence-highlight-edge: rgba(29, 139, 99, 0.18);
}

.sentence-highlight-blue {
  --sentence-highlight-line: rgba(191, 219, 254, 0.78);
  --sentence-highlight-fill: rgba(219, 234, 254, 0.34);
  --sentence-highlight-edge: rgba(36, 89, 214, 0.16);
}

.sentence-highlight-pink {
  --sentence-highlight-line: rgba(251, 207, 232, 0.78);
  --sentence-highlight-fill: rgba(252, 231, 243, 0.34);
  --sentence-highlight-edge: rgba(190, 24, 93, 0.14);
}

.sentence-highlight-purple {
  --sentence-highlight-line: rgba(221, 214, 254, 0.78);
  --sentence-highlight-fill: rgba(237, 233, 254, 0.34);
  --sentence-highlight-edge: rgba(109, 40, 217, 0.14);
}
```

- [ ] **Step 3: Run contract test and verify pass**

Run:

```powershell
npm.cmd test -- src/pages/ReaderPrototype.layout.test.js
```

Expected: PASS for `ReaderPrototype.layout.test.js`.

- [ ] **Step 4: Run selector tests again**

Run:

```powershell
npm.cmd test -- src/data/readerPrototypeSelectors.test.js
```

Expected: PASS for `readerPrototypeSelectors.test.js`.

- [ ] **Step 5: Commit page wiring and styles**

Run:

```powershell
git add src/pages/ReaderPrototype.vue src/components/reader-prototype/PrototypeTopbar.vue src/components/reader-prototype/PrototypeReadingPaper.vue src/reader-prototype.css src/pages/ReaderPrototype.layout.test.js
git diff --cached --name-only
git commit -m "feat: add prototype sentence highlighter"
```

Expected staged files:

```text
src/components/reader-prototype/PrototypeReadingPaper.vue
src/components/reader-prototype/PrototypeTopbar.vue
src/pages/ReaderPrototype.layout.test.js
src/pages/ReaderPrototype.vue
src/reader-prototype.css
```

---

### Task 8: Full Automated Verification

**Files:**
- No code changes.

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm.cmd test
```

Expected: PASS. There should be no failing Node test files.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS. Vite should finish with a generated `dist` output summary and no build errors.

- [ ] **Step 3: Stop on verification failure**

If Step 1 or Step 2 fails, stop this plan run and report the exact failing command plus the first failing test or build error. Do not create a catch-all verification commit from this task; return to the task that introduced the failing behavior and add a focused fix there.

---

### Task 9: Manual Browser Verification

**Files:**
- No code changes.

- [ ] **Step 1: Start the dev server**

Run:

```powershell
npm.cmd run dev
```

Expected: Vite prints a local URL such as `http://localhost:5173/`.

- [ ] **Step 2: Open the prototype route**

Open:

```text
http://localhost:5173/reader-prototype
```

Expected: The standalone reader prototype loads with top toolbar, sidebar, reading paper, and right word panel.

- [ ] **Step 3: Verify default highlight state**

Check the reading paper.

Expected:
- The existing default highlighted sentence is visible in yellow.
- The `显示高亮` button can hide it.
- Clicking `显示高亮` again restores it.

- [ ] **Step 4: Verify color application**

Turn on `高亮笔`, choose each color, and click different sentences.

Expected:
- Yellow, green, blue, pink, and purple marker treatments appear on clicked sentences.
- Text remains readable.

- [ ] **Step 5: Verify color update and removal**

Click a highlighted sentence with another selected color, then click it again with the same selected color.

Expected:
- First click changes the sentence to the new color.
- Second click removes the highlight.

- [ ] **Step 6: Verify clear mode**

Click `清除`, then click a highlighted sentence.

Expected: The sentence highlight disappears.

- [ ] **Step 7: Verify word interactions**

With `高亮笔` still active, click a word token such as `planned` or `sentence`.

Expected:
- The right word definition panel updates.
- The clicked sentence highlight does not change from this word click.

- [ ] **Step 8: Verify chapter memory and refresh reset**

Switch to another chapter, apply a highlight, return to the original chapter, then refresh the browser.

Expected:
- Before refresh, highlights for visited chapters remain in memory.
- After refresh, custom session highlights are gone and default prototype highlights return.

- [ ] **Step 9: Stop the dev server**

Return to the terminal running Vite and press `Ctrl+C`.

Expected: The Vite process stops and returns to the PowerShell prompt.

---

### Task 10: Final Git Check

**Files:**
- No code changes.

- [ ] **Step 1: Inspect local status**

Run:

```powershell
git status --short
```

Expected:
- Feature commits are present.
- No staged files remain.
- Existing unrelated dirty files may still appear; do not revert or include them.

- [ ] **Step 2: Summarize completed commits**

Run:

```powershell
git log -3 --oneline
```

Expected: The recent log includes the highlighter design commits and the new implementation commits from this plan.

- [ ] **Step 3: Report verification results**

Final response must include:

```text
Implemented prototype-only sentence highlighter on /reader-prototype.
Verified with npm.cmd test and npm.cmd run build.
Manual checks completed for colors, clear mode, word clicks, chapter memory, and refresh reset.
```

If any verification command was not run, state which command was skipped and why.
