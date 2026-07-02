# Reader Font Size Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent `A-` and `A+` controls that change only the Reader page's article text size.

**Architecture:** Keep numeric bounds, persistence, and stepping in a focused `src/utils/readerFontSize.js` utility. `Reader.vue` owns the reactive font size state, applies it with a CSS custom property, and passes control props/events to `SentenceViewer.vue`.

**Tech Stack:** Vue 3 `<script setup>`, CSS custom properties, browser `localStorage`, Node test runner.

---

## File Structure

- Create `src/utils/readerFontSize.js` for storage key, bounds, normalization, persistence, and step helpers.
- Create `src/utils/readerFontSize.test.js` for utility tests.
- Modify `src/pages/Reader.vue` to initialize, persist, and apply the reading font size.
- Modify `src/components/SentenceViewer.vue` to render the header controls and emit increase/decrease events.
- Modify `src/style.css` to style the compact control and use the reading font-size variable.
- Modify `src/utils/locale.js` to add bilingual labels for the controls.

### Task 1: Utility Tests

**Files:**
- Create: `src/utils/readerFontSize.test.js`
- Create later: `src/utils/readerFontSize.js`

- [ ] **Step 1: Write the failing utility test**

```js
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  MAX_READER_FONT_SIZE,
  MIN_READER_FONT_SIZE,
  READER_FONT_SIZE_STORAGE_KEY,
  adjustReaderFontSize,
  getInitialReaderFontSize,
  saveReaderFontSize,
} from './readerFontSize.js'

function installLocalStorage() {
  const store = new Map()

  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

describe('reader font size utilities', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('restores valid stored sizes and falls back for invalid values', () => {
    assert.equal(getInitialReaderFontSize(), 18)

    localStorage.setItem(READER_FONT_SIZE_STORAGE_KEY, '22')
    assert.equal(getInitialReaderFontSize(), 22)

    localStorage.setItem(READER_FONT_SIZE_STORAGE_KEY, 'large')
    assert.equal(getInitialReaderFontSize(), 18)
  })

  it('persists a clamped font size', () => {
    assert.equal(saveReaderFontSize(99), MAX_READER_FONT_SIZE)
    assert.equal(localStorage.getItem(READER_FONT_SIZE_STORAGE_KEY), String(MAX_READER_FONT_SIZE))

    assert.equal(saveReaderFontSize(1), MIN_READER_FONT_SIZE)
    assert.equal(localStorage.getItem(READER_FONT_SIZE_STORAGE_KEY), String(MIN_READER_FONT_SIZE))
  })

  it('adjusts by two pixels and clamps at the configured bounds', () => {
    assert.equal(adjustReaderFontSize(18, 1), 20)
    assert.equal(adjustReaderFontSize(18, -1), 16)
    assert.equal(adjustReaderFontSize(MAX_READER_FONT_SIZE, 1), MAX_READER_FONT_SIZE)
    assert.equal(adjustReaderFontSize(MIN_READER_FONT_SIZE, -1), MIN_READER_FONT_SIZE)
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/utils/readerFontSize.test.js`

Expected: FAIL because `src/utils/readerFontSize.js` does not exist.

### Task 2: Utility Implementation

**Files:**
- Create: `src/utils/readerFontSize.js`
- Test: `src/utils/readerFontSize.test.js`

- [ ] **Step 1: Add the minimal utility**

```js
import { getStorageItem, setStorageItem } from './storage.js'

export const READER_FONT_SIZE_STORAGE_KEY = 'ai-reading-reader-font-size'
export const DEFAULT_READER_FONT_SIZE = 18
export const MIN_READER_FONT_SIZE = 16
export const MAX_READER_FONT_SIZE = 24
export const READER_FONT_SIZE_STEP = 2

export function normalizeReaderFontSize(value) {
  const numericValue = Number.parseInt(value, 10)

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_READER_FONT_SIZE
  }

  return Math.min(MAX_READER_FONT_SIZE, Math.max(MIN_READER_FONT_SIZE, numericValue))
}

export function getInitialReaderFontSize() {
  return normalizeReaderFontSize(getStorageItem(READER_FONT_SIZE_STORAGE_KEY, String(DEFAULT_READER_FONT_SIZE)))
}

export function saveReaderFontSize(value) {
  const fontSize = normalizeReaderFontSize(value)
  setStorageItem(READER_FONT_SIZE_STORAGE_KEY, String(fontSize))

  return fontSize
}

export function adjustReaderFontSize(currentSize, direction) {
  const stepDirection = direction < 0 ? -1 : 1

  return normalizeReaderFontSize(normalizeReaderFontSize(currentSize) + stepDirection * READER_FONT_SIZE_STEP)
}
```

- [ ] **Step 2: Run the focused test and verify it passes**

Run: `npm test -- src/utils/readerFontSize.test.js`

Expected: PASS.

### Task 3: Reader Component Wiring

**Files:**
- Modify: `src/pages/Reader.vue`
- Modify: `src/components/SentenceViewer.vue`
- Modify: `src/utils/locale.js`
- Modify: `src/style.css`

- [ ] **Step 1: Wire state in `Reader.vue`**

Add imports for the reader font-size utility, add a `readerFontSize` ref, computed style and bounds, and handlers that call `saveReaderFontSize(adjustReaderFontSize(...))`.

- [ ] **Step 2: Add controls to `SentenceViewer.vue`**

Add props for `fontSize`, `canDecreaseFontSize`, and `canIncreaseFontSize`; add emits for `decrease-font-size` and `increase-font-size`; render `A-`, current size, and `A+` in the existing header.

- [ ] **Step 3: Add labels and styles**

Add localized control labels under `sentenceViewer`. Add CSS for `.font-size-controls`, `.reader-font-button`, and `.font-size-value`. Replace fixed `.sentence-content` and `.selected-sentence` font sizes with `var(--reader-content-font-size)`.

- [ ] **Step 4: Run all tests and build**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: build completes successfully.

### Task 4: Browser Verification

**Files:**
- No source changes expected.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite serves the app on a local URL.

- [ ] **Step 2: Verify visually**

Open the Reader page with article text. Confirm `A-` and `A+` change only the reading text, buttons disable at the bounds, the selected sentence follows the same size, and mobile layout does not overlap.
