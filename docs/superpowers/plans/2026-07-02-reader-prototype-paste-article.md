# Reader Prototype Paste Article Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `/reader-prototype` accept a pasted article and display it as a temporary chapter without depending on the formal `/reader` page.

**Architecture:** Reuse the generic clipboard utility for browser clipboard reads. Add reader-prototype selector helpers that convert plain pasted text into the same chapter/paragraph/sentence/token contract used by the existing prototype. Wire the topbar to trigger paste, keep the temporary article in page memory, and fall back to a basic word panel for tokens that are not in the local prototype dictionary.

**Tech Stack:** Vue 3 Composition API, local in-memory state, Node.js built-in test runner, browser Clipboard API.

---

### Task 1: Temporary Chapter Helpers

**Files:**
- Modify: `src/data/readerPrototypeSelectors.js`
- Test: `src/data/readerPrototypeSelectors.test.js`

- [ ] **Step 1: Write failing tests**

Add tests for `createPastedPrototypeChapterContent(text)` and unknown word panel fallback.

- [ ] **Step 2: Run selector tests and verify RED**

Run: `npm.cmd test src/data/readerPrototypeSelectors.test.js`
Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Implement helper**

The helper should:
- trim text
- split paragraphs on blank lines
- split sentences with `splitIntoSentences`
- create stable ids under `pasted-article`
- create clickable word tokens for plain English words while preserving punctuation
- return a chapter-like object with `id`, `bookId`, `number`, `title`, `paragraphs`

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd test src/data/readerPrototypeSelectors.test.js`
Expected: PASS.

### Task 2: Prototype Page Wiring

**Files:**
- Modify: `src/pages/ReaderPrototype.vue`
- Modify: `src/components/reader-prototype/PrototypeTopbar.vue`
- Modify: `src/reader-prototype.css`
- Test: `src/pages/ReaderPrototype.layout.test.js`

- [ ] **Step 1: Write failing layout tests**

Assert the topbar emits `paste-article`, ReaderPrototype imports `readClipboardText`, and the page can hold `pastedChapterContent`.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test src/pages/ReaderPrototype.layout.test.js`
Expected: FAIL until the UI wiring is implemented.

- [ ] **Step 3: Implement UI wiring**

Add a topbar button labeled `粘贴文章`. On successful paste, create a temporary chapter, select it, reset selected word state, and show a status message. On failure, show a concise message for unsupported, empty, or denied clipboard states.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd test src/pages/ReaderPrototype.layout.test.js src/data/readerPrototypeSelectors.test.js src/utils/clipboard.test.js`
Expected: PASS.

### Task 3: Final Verification

- [ ] Run: `npm.cmd test`
- [ ] Run: `npm.cmd run build`
- [ ] Review `git status --short` and report changed files.
