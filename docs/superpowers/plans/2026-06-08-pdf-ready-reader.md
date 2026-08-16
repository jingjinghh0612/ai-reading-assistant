# PDF-ready Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing `/reader` page into a PDF-ready reading workspace with real PDF upload/rendering, comfortable document reading, floating selected-text explanations, and a site-consistent floating AI Q&A panel.

**Architecture:** Keep `Reader.vue` as the orchestration layer and add focused PDF, Q&A, and overlay modules around it. Use PDF.js for browser-side PDF rendering and text extraction, reuse the existing translate/word/summarize APIs, and add a small backend ask endpoint for document Q&A.

**Tech Stack:** Vue 3, Vite, Vue Router, plain CSS, Node.js `node:test`, Express, Gemini service wrapper, `pdfjs-dist`.

---

## References

- Design spec: `docs/superpowers/specs/2026-06-08-pdf-ready-reader-design.md`
- Current page: `src/pages/Reader.vue`
- Current floating cards: `src/components/SentenceViewer.vue`
- Current global UI styles: `src/style.css`
- PDF library source: https://github.com/mozilla/pdf.js
- PDF.js npm package: https://www.npmjs.com/package/pdfjs-dist

## File Structure

- Modify: `package.json` and `package-lock.json`
  - Add `pdfjs-dist`.
- Create: `src/utils/pdfSession.js`
  - Pure PDF session state: page bounds, zoom bounds, context mode, text cache, panel visibility.
- Create: `src/utils/pdfSession.test.js`
  - Node tests for PDF session transitions.
- Create: `src/utils/pdfDocument.js`
  - PDF.js wrapper for loading documents, rendering pages, extracting page text, and caching extracted text.
- Create: `src/utils/pdfDocument.test.js`
  - Unit tests for extraction normalization and text cache behavior using fake PDF page objects.
- Create: `src/utils/readerOverlayPosition.js`
  - Pure geometry helper for placing floating selected-text cards while avoiding viewport overflow and the AI panel.
- Create: `src/utils/readerOverlayPosition.test.js`
  - Node tests for overlay placement.
- Create: `src/api/ask.js`
  - Frontend API wrapper for document Q&A.
- Create: `src/api/ask.test.js`
  - Node tests for response validation and payload shape.
- Modify: `server/services/prompts.js`
  - Add Q&A prompt creation.
- Modify: `server/services/aiService.js`
  - Add `answerQuestion`.
- Modify: `server/index.js`
  - Add `POST /api/ask`.
- Create: `server/services/askService.test.js`
  - Tests for prompt content and mock fallback behavior.
- Create: `src/components/PdfPageCanvas.vue`
  - Render the current PDF page to canvas.
- Create: `src/components/PdfTextLayer.vue`
  - Render selectable text spans over the PDF page and emit selected text plus bounds.
- Create: `src/components/FloatingExplanationCard.vue`
  - Shared floating card for selected PDF text translation or word explanation.
- Create: `src/components/AiQuestionPanel.vue`
  - Site-consistent floating AI Q&A panel.
- Create: `src/components/PdfWorkspace.vue`
  - Document workspace that composes canvas, text layer, floating explanation, and AI panel.
- Modify: `src/pages/Reader.vue`
  - Add PDF mode, upload flow, PDF state, Q&A handlers, and preserve current text article fallback.
- Modify: `src/App.vue`
  - Wire Upload PDF and Q&A toolbar actions to Reader through browser events.
- Modify: `src/utils/locale.js`
  - Add labels for PDF upload, page controls, Q&A, errors, and panel actions.
- Modify: `src/style.css`
  - Add PDF workspace, floating AI panel, text layer, and mobile styles using existing tokens.
- Modify: `src/pages/Reader.layout.test.js`
  - Replace outdated disabled-upload expectations with the new PDF-ready layout contract.

---

### Task 1: Add PDF Dependency And Session State

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/utils/pdfSession.test.js`
- Create: `src/utils/pdfSession.js`

- [ ] **Step 1: Install PDF.js dependency**

Run:

```powershell
npm.cmd install pdfjs-dist
```

Expected:

```text
package.json includes "pdfjs-dist"
package-lock.json is updated
```

If this fails with a network or registry error, rerun with sandbox escalation because dependency installation needs network access.

- [ ] **Step 2: Write failing PDF session tests**

Create `src/utils/pdfSession.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_PDF_CONTEXT_MODE,
  DEFAULT_PDF_ZOOM,
  MAX_PDF_ZOOM,
  MIN_PDF_ZOOM,
  createPdfSession,
  getPdfContextText,
  setPdfContextMode,
  setPdfPage,
  setPdfPanelOpen,
  setPdfPageText,
  setPdfZoom,
} from './pdfSession.js'

describe('pdf session state', () => {
  it('creates a bounded default PDF session', () => {
    const session = createPdfSession({
      fileName: 'paper.pdf',
      pageCount: 8,
    })

    assert.equal(session.fileName, 'paper.pdf')
    assert.equal(session.pageCount, 8)
    assert.equal(session.currentPage, 1)
    assert.equal(session.zoom, DEFAULT_PDF_ZOOM)
    assert.equal(session.contextMode, DEFAULT_PDF_CONTEXT_MODE)
    assert.equal(session.isAiPanelOpen, true)
    assert.deepEqual(session.pageTextByPage, {})
  })

  it('normalizes invalid page counts and clamps page navigation', () => {
    const session = createPdfSession({
      fileName: 'paper.pdf',
      pageCount: 0,
    })

    assert.equal(session.pageCount, 1)
    assert.equal(setPdfPage(session, 5).currentPage, 1)
    assert.equal(setPdfPage({ ...session, pageCount: 4 }, 0).currentPage, 1)
    assert.equal(setPdfPage({ ...session, pageCount: 4 }, 3).currentPage, 3)
  })

  it('clamps zoom inside readable bounds', () => {
    const session = createPdfSession({
      fileName: 'paper.pdf',
      pageCount: 2,
    })

    assert.equal(setPdfZoom(session, 0.1).zoom, MIN_PDF_ZOOM)
    assert.equal(setPdfZoom(session, 5).zoom, MAX_PDF_ZOOM)
    assert.equal(setPdfZoom(session, 1.35).zoom, 1.35)
  })

  it('stores text per page and resolves current page context', () => {
    const session = setPdfPageText(
      setPdfPage(
        createPdfSession({
          fileName: 'paper.pdf',
          pageCount: 3,
        }),
        2,
      ),
      2,
      'Page two text',
    )

    assert.equal(getPdfContextText(session), 'Page two text')
  })

  it('resolves full document context in page order', () => {
    let session = createPdfSession({
      fileName: 'paper.pdf',
      pageCount: 3,
    })

    session = setPdfContextMode(session, 'document')
    session = setPdfPageText(session, 3, 'Page three')
    session = setPdfPageText(session, 1, 'Page one')
    session = setPdfPageText(session, 2, 'Page two')

    assert.equal(getPdfContextText(session), 'Page one\n\nPage two\n\nPage three')
  })

  it('toggles the floating AI panel state', () => {
    const session = createPdfSession({
      fileName: 'paper.pdf',
      pageCount: 1,
    })

    assert.equal(setPdfPanelOpen(session, false).isAiPanelOpen, false)
    assert.equal(setPdfPanelOpen(session, true).isAiPanelOpen, true)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```powershell
npm.cmd test -- src/utils/pdfSession.test.js
```

Expected:

```text
FAIL
Cannot find module './pdfSession.js'
```

- [ ] **Step 4: Implement PDF session utility**

Create `src/utils/pdfSession.js`:

```js
export const MIN_PDF_ZOOM = 0.85
export const MAX_PDF_ZOOM = 2.2
export const DEFAULT_PDF_ZOOM = 1.18
export const DEFAULT_PDF_CONTEXT_MODE = 'page'
export const PDF_CONTEXT_MODES = ['page', 'document']

function normalizePositiveInteger(value, fallbackValue) {
  return Number.isInteger(value) && value > 0 ? value : fallbackValue
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

function normalizeContextMode(value) {
  return PDF_CONTEXT_MODES.includes(value) ? value : DEFAULT_PDF_CONTEXT_MODE
}

export function createPdfSession({ fileName, pageCount }) {
  return {
    fileName: String(fileName || 'Untitled PDF'),
    pageCount: normalizePositiveInteger(pageCount, 1),
    currentPage: 1,
    zoom: DEFAULT_PDF_ZOOM,
    contextMode: DEFAULT_PDF_CONTEXT_MODE,
    isAiPanelOpen: true,
    pageTextByPage: {},
  }
}

export function setPdfPage(session, pageNumber) {
  const nextPage = clampNumber(Math.trunc(Number(pageNumber)), 1, session.pageCount)

  return {
    ...session,
    currentPage: nextPage,
  }
}

export function setPdfZoom(session, zoom) {
  const nextZoom = Number(clampNumber(Number(zoom), MIN_PDF_ZOOM, MAX_PDF_ZOOM).toFixed(2))

  return {
    ...session,
    zoom: nextZoom,
  }
}

export function setPdfContextMode(session, contextMode) {
  return {
    ...session,
    contextMode: normalizeContextMode(contextMode),
  }
}

export function setPdfPanelOpen(session, isOpen) {
  return {
    ...session,
    isAiPanelOpen: Boolean(isOpen),
  }
}

export function setPdfPageText(session, pageNumber, text) {
  const normalizedPage = clampNumber(Math.trunc(Number(pageNumber)), 1, session.pageCount)
  const normalizedText = String(text || '').trim()

  return {
    ...session,
    pageTextByPage: {
      ...session.pageTextByPage,
      [normalizedPage]: normalizedText,
    },
  }
}

export function getPdfContextText(session) {
  if (session.contextMode === 'document') {
    return Array.from({ length: session.pageCount }, (_, index) => index + 1)
      .map((pageNumber) => session.pageTextByPage[pageNumber] || '')
      .filter(Boolean)
      .join('\n\n')
  }

  return session.pageTextByPage[session.currentPage] || ''
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
npm.cmd test -- src/utils/pdfSession.test.js
```

Expected:

```text
PASS
```

- [ ] **Step 6: Commit task**

Run:

```powershell
git add package.json package-lock.json src/utils/pdfSession.js src/utils/pdfSession.test.js
git commit -m "feat: add pdf reader session state"
```

---

### Task 2: Add PDF Loading, Rendering, And Text Extraction Wrapper

**Files:**
- Create: `src/utils/pdfDocument.test.js`
- Create: `src/utils/pdfDocument.js`

- [ ] **Step 1: Write failing tests for extraction and caching**

Create `src/utils/pdfDocument.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createPageTextCache,
  extractTextFromPdfPage,
  getCachedPageText,
  normalizePdfTextItems,
  setCachedPageText,
} from './pdfDocument.js'

describe('pdf document helpers', () => {
  it('normalizes PDF text items into readable text', () => {
    const text = normalizePdfTextItems([
      { str: 'Knowledge' },
      { str: ' ' },
      { str: 'distillation' },
      { str: '' },
      { str: 'works.' },
    ])

    assert.equal(text, 'Knowledge distillation works.')
  })

  it('extracts text from a fake PDF page', async () => {
    const fakePage = {
      getTextContent: async () => ({
        items: [{ str: 'Page' }, { str: ' ' }, { str: 'one' }],
      }),
    }

    assert.equal(await extractTextFromPdfPage(fakePage), 'Page one')
  })

  it('stores page text in a plain cache object', () => {
    const cache = createPageTextCache()

    setCachedPageText(cache, 2, 'Second page')

    assert.equal(getCachedPageText(cache, 2), 'Second page')
    assert.equal(getCachedPageText(cache, 3), '')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd test -- src/utils/pdfDocument.test.js
```

Expected:

```text
FAIL
Cannot find module './pdfDocument.js'
```

- [ ] **Step 3: Implement PDF document wrapper**

Create `src/utils/pdfDocument.js`:

```js
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export function createPageTextCache() {
  return Object.create(null)
}

export function normalizePdfTextItems(items) {
  return items
    .map((item) => (typeof item?.str === 'string' ? item.str : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function loadPdfDocumentFromArrayBuffer(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
  })

  return loadingTask.promise
}

export async function renderPdfPageToCanvas(page, canvas, zoom) {
  const viewport = page.getViewport({
    scale: zoom,
  })
  const deviceScale = window.devicePixelRatio || 1
  const context = canvas.getContext('2d')

  canvas.width = Math.floor(viewport.width * deviceScale)
  canvas.height = Math.floor(viewport.height * deviceScale)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0)

  await page.render({
    canvasContext: context,
    viewport,
  }).promise

  return {
    width: viewport.width,
    height: viewport.height,
  }
}

export async function extractTextFromPdfPage(page) {
  const textContent = await page.getTextContent()

  return normalizePdfTextItems(textContent.items || [])
}

export function getCachedPageText(cache, pageNumber) {
  return cache[pageNumber] || ''
}

export function setCachedPageText(cache, pageNumber, text) {
  cache[pageNumber] = String(text || '').trim()
}
```

- [ ] **Step 4: Run focused test**

Run:

```powershell
npm.cmd test -- src/utils/pdfDocument.test.js
```

Expected:

```text
PASS
```

- [ ] **Step 5: Commit task**

Run:

```powershell
git add src/utils/pdfDocument.js src/utils/pdfDocument.test.js
git commit -m "feat: add pdf document helpers"
```

---

### Task 3: Add Overlay Placement Utility

**Files:**
- Create: `src/utils/readerOverlayPosition.test.js`
- Create: `src/utils/readerOverlayPosition.js`

- [ ] **Step 1: Write failing overlay placement tests**

Create `src/utils/readerOverlayPosition.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getReaderOverlayPosition } from './readerOverlayPosition.js'

describe('reader overlay placement', () => {
  it('places a card below the selection when there is space', () => {
    const position = getReaderOverlayPosition({
      anchorRect: { left: 200, right: 260, top: 120, bottom: 140 },
      viewportRect: { width: 1000, height: 700 },
      cardSize: { width: 320, height: 180 },
      blockedRect: null,
      gap: 10,
      sidePadding: 16,
    })

    assert.deepEqual(position, {
      left: 200,
      top: 150,
    })
  })

  it('keeps the card inside the right edge', () => {
    const position = getReaderOverlayPosition({
      anchorRect: { left: 900, right: 940, top: 100, bottom: 120 },
      viewportRect: { width: 1000, height: 700 },
      cardSize: { width: 320, height: 180 },
      blockedRect: null,
      gap: 10,
      sidePadding: 16,
    })

    assert.equal(position.left, 664)
    assert.equal(position.top, 130)
  })

  it('moves left of the AI panel when the preferred position overlaps it', () => {
    const position = getReaderOverlayPosition({
      anchorRect: { left: 660, right: 710, top: 120, bottom: 140 },
      viewportRect: { width: 1000, height: 700 },
      cardSize: { width: 260, height: 160 },
      blockedRect: { left: 620, right: 980, top: 20, bottom: 620 },
      gap: 10,
      sidePadding: 16,
    })

    assert.equal(position.left, 350)
    assert.equal(position.top, 150)
  })

  it('moves above the selection near the bottom edge', () => {
    const position = getReaderOverlayPosition({
      anchorRect: { left: 240, right: 300, top: 640, bottom: 660 },
      viewportRect: { width: 1000, height: 700 },
      cardSize: { width: 320, height: 180 },
      blockedRect: null,
      gap: 10,
      sidePadding: 16,
    })

    assert.equal(position.left, 240)
    assert.equal(position.top, 450)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm.cmd test -- src/utils/readerOverlayPosition.test.js
```

Expected:

```text
FAIL
Cannot find module './readerOverlayPosition.js'
```

- [ ] **Step 3: Implement overlay helper**

Create `src/utils/readerOverlayPosition.js`:

```js
function overlaps(first, second) {
  if (!second) {
    return false
  }

  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function createRect(left, top, cardSize) {
  return {
    left,
    top,
    right: left + cardSize.width,
    bottom: top + cardSize.height,
  }
}

export function getReaderOverlayPosition({
  anchorRect,
  viewportRect,
  cardSize,
  blockedRect = null,
  gap = 10,
  sidePadding = 16,
}) {
  const maxLeft = viewportRect.width - cardSize.width - sidePadding
  const maxTop = viewportRect.height - cardSize.height - sidePadding
  let left = clamp(anchorRect.left, sidePadding, maxLeft)
  let top = anchorRect.bottom + gap
  let candidate = createRect(left, top, cardSize)

  if (overlaps(candidate, blockedRect)) {
    left = clamp(blockedRect.left - cardSize.width - gap, sidePadding, maxLeft)
    candidate = createRect(left, top, cardSize)
  }

  if (candidate.bottom > viewportRect.height - sidePadding) {
    top = anchorRect.top - cardSize.height - gap
  }

  return {
    left: clamp(left, sidePadding, maxLeft),
    top: clamp(top, sidePadding, maxTop),
  }
}
```

- [ ] **Step 4: Run focused test**

Run:

```powershell
npm.cmd test -- src/utils/readerOverlayPosition.test.js
```

Expected:

```text
PASS
```

- [ ] **Step 5: Commit task**

Run:

```powershell
git add src/utils/readerOverlayPosition.js src/utils/readerOverlayPosition.test.js
git commit -m "feat: add reader overlay placement"
```

---

### Task 4: Add Document Q&A Backend And Frontend API

**Files:**
- Create: `src/api/ask.test.js`
- Create: `src/api/ask.js`
- Modify: `server/services/prompts.js`
- Modify: `server/services/aiService.js`
- Modify: `server/index.js`
- Create: `server/services/askService.test.js`

- [ ] **Step 1: Write frontend API test**

Create `src/api/ask.test.js`:

```js
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { requestAnswer } from './ask.js'

describe('ask api', () => {
  afterEach(() => {
    delete globalThis.fetch
  })

  it('posts question, context text, and context mode', async () => {
    let payload

    globalThis.fetch = async (url, options) => {
      payload = JSON.parse(options.body)

      return {
        ok: true,
        json: async () => ({
          answer: 'This is the answer.',
        }),
      }
    }

    const answer = await requestAnswer({
      question: 'What is the paper about?',
      contextText: 'Paper context',
      contextMode: 'page',
    })

    assert.equal(answer.answer, 'This is the answer.')
    assert.deepEqual(payload, {
      question: 'What is the paper about?',
      contextText: 'Paper context',
      contextMode: 'page',
    })
  })

  it('rejects empty answers', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        answer: '',
      }),
    })

    await assert.rejects(
      () =>
        requestAnswer({
          question: 'What is the paper about?',
          contextText: 'Paper context',
          contextMode: 'page',
        }),
      /No answer was returned/,
    )
  })
})
```

- [ ] **Step 2: Add frontend API wrapper**

Create `src/api/ask.js`:

```js
import { postJson } from './request.js'

export async function requestAnswer({ question, contextText, contextMode }) {
  const data = await postJson(
    '/api/ask',
    {
      question,
      contextText,
      contextMode,
    },
    'Failed to answer the question.',
  )

  if (!data.answer) {
    throw new Error('No answer was returned.')
  }

  return {
    answer: data.answer,
  }
}
```

- [ ] **Step 3: Run frontend API test**

Run:

```powershell
npm.cmd test -- src/api/ask.test.js
```

Expected:

```text
PASS
```

- [ ] **Step 4: Add backend ask prompt**

Modify `server/services/prompts.js` by appending:

```js
export function createAskPrompt({ question, contextText, contextMode }) {
  return `
Answer the user's question using only the provided document context.
Return Simplified Chinese only. Do not include markdown.

Rules:
- If the context is insufficient, say that the current document context does not contain enough information.
- Be concise but specific.
- Mention whether the answer is based on the current page or the full document.

Context mode:
${contextMode === 'document' ? 'Full document' : 'Current page'}

Question:
${question}

Document context:
${contextText}
`
}
```

- [ ] **Step 5: Add backend answer service**

Modify `server/services/aiService.js`:

```js
import {
  createAskPrompt,
  createSummarizePrompt,
  createTranslatePrompt,
  createWordExplainPrompt,
} from './prompts.js'
```

Append before `normalizeKeywords`:

```js
function mockAnswerQuestion({ question, contextMode }) {
  const scope = contextMode === 'document' ? '全文' : '当前页'

  return `模拟回答（${scope}）：这个问题与文档中的核心论点有关。你问的是“${question}”，可以结合当前上下文继续追问。`
}

export async function answerQuestion({ question, contextText, contextMode }) {
  if (!hasGeminiConfig()) {
    return useMockWithoutApiKey(() => mockAnswerQuestion({ question, contextMode }), 350)
  }

  const prompt = createAskPrompt({
    question,
    contextText,
    contextMode,
  })
  const answer = cleanTextResponse(await callGemini(prompt))

  if (!answer) {
    throw new Error('AI returned an empty answer. Please try again.')
  }

  return answer
}
```

- [ ] **Step 6: Add Express route**

Modify `server/index.js` import:

```js
import { answerQuestion, explainWord, summarizeText, translateSentence } from './services/aiService.js'
```

Add before `app.get(/.*/, ...)`:

```js
app.post('/api/ask', async (request, response) => {
  const question = request.body?.question?.trim()
  const contextText = request.body?.contextText?.trim()
  const contextMode = request.body?.contextMode === 'document' ? 'document' : 'page'

  if (!question) {
    response.status(400).json({
      message: 'Question is required.',
    })
    return
  }

  if (!contextText) {
    response.status(400).json({
      message: 'Document context is required.',
    })
    return
  }

  try {
    const answer = await answerQuestion({
      question,
      contextText,
      contextMode,
    })

    response.json({
      answer,
    })
  } catch (error) {
    sendApiError(response, error, 'Question answering failed.')
  }
})
```

- [ ] **Step 7: Add backend prompt/service test**

Create `server/services/askService.test.js`:

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { answerQuestion } from './aiService.js'
import { createAskPrompt } from './prompts.js'

describe('ask prompt and service', () => {
  it('includes question, context, and scope in the prompt', () => {
    const prompt = createAskPrompt({
      question: 'What is new?',
      contextText: 'The paper studies pre-training distillation.',
      contextMode: 'document',
    })

    assert.match(prompt, /What is new/)
    assert.match(prompt, /pre-training distillation/)
    assert.match(prompt, /Full document/)
  })

  it('returns a mock answer when no Gemini key is configured', async () => {
    const previousKey = process.env.GEMINI_API_KEY
    delete process.env.GEMINI_API_KEY

    const answer = await answerQuestion({
      question: 'What is new?',
      contextText: 'The paper studies pre-training distillation.',
      contextMode: 'page',
    })

    process.env.GEMINI_API_KEY = previousKey

    assert.match(answer, /模拟回答/)
    assert.match(answer, /当前页/)
  })
})
```

- [ ] **Step 8: Run backend and frontend API tests**

Run:

```powershell
npm.cmd test -- src/api/ask.test.js server/services/askService.test.js
```

Expected:

```text
PASS
```

- [ ] **Step 9: Commit task**

Run:

```powershell
git add src/api/ask.js src/api/ask.test.js server/index.js server/services/aiService.js server/services/prompts.js server/services/askService.test.js
git commit -m "feat: add document question answering api"
```

---

### Task 5: Create PDF Reader Components

**Files:**
- Create: `src/components/PdfPageCanvas.vue`
- Create: `src/components/PdfTextLayer.vue`
- Create: `src/components/FloatingExplanationCard.vue`
- Create: `src/components/AiQuestionPanel.vue`
- Create: `src/components/PdfWorkspace.vue`

- [ ] **Step 1: Create `PdfPageCanvas.vue`**

Create `src/components/PdfPageCanvas.vue`:

```vue
<template>
  <div class="pdf-page-shell" :style="pageShellStyle">
    <canvas ref="canvasRef" class="pdf-page-canvas" />
    <slot />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { renderPdfPageToCanvas } from '../utils/pdfDocument.js'

const props = defineProps({
  page: {
    type: Object,
    default: null,
  },
  zoom: {
    type: Number,
    default: 1.18,
  },
})

const emit = defineEmits(['rendered', 'error'])

const canvasRef = ref(null)
const renderedSize = ref({
  width: 0,
  height: 0,
})

const pageShellStyle = computed(() => ({
  '--pdf-page-width': renderedSize.value.width ? `${renderedSize.value.width}px` : 'auto',
  '--pdf-page-height': renderedSize.value.height ? `${renderedSize.value.height}px` : 'auto',
}))

watch(
  () => [props.page, props.zoom],
  () => {
    renderCurrentPage()
  },
)

onMounted(() => {
  renderCurrentPage()
})

async function renderCurrentPage() {
  if (!props.page || !canvasRef.value) {
    return
  }

  await nextTick()

  try {
    renderedSize.value = await renderPdfPageToCanvas(props.page, canvasRef.value, props.zoom)
    emit('rendered', renderedSize.value)
  } catch (error) {
    emit('error', error)
  }
}
</script>
```

- [ ] **Step 2: Create `PdfTextLayer.vue`**

Create `src/components/PdfTextLayer.vue`:

```vue
<template>
  <div ref="layerRef" class="pdf-text-layer" @mouseup="emitSelection" @keyup="emitSelection">
    <span
      v-for="(item, index) in textItems"
      :key="index"
      class="pdf-text-item"
      :style="getTextItemStyle(item)"
    >
      {{ item.str }}
    </span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  page: {
    type: Object,
    default: null,
  },
  viewportSize: {
    type: Object,
    default: () => ({
      width: 0,
      height: 0,
    }),
  },
})

const emit = defineEmits(['select-text', 'error'])

const layerRef = ref(null)
const rawTextItems = ref([])

const textItems = computed(() =>
  rawTextItems.value.filter((item) => typeof item.str === 'string' && item.str.trim()),
)

watch(
  () => props.page,
  () => {
    loadTextItems()
  },
  { immediate: true },
)

async function loadTextItems() {
  rawTextItems.value = []

  if (!props.page) {
    return
  }

  try {
    const textContent = await props.page.getTextContent()
    rawTextItems.value = textContent.items || []
  } catch (error) {
    emit('error', error)
  }
}

function getTextItemStyle(item) {
  const transform = Array.isArray(item.transform) ? item.transform : [1, 0, 0, 1, 0, 0]
  const fontSize = Math.max(8, Math.abs(transform[3] || transform[0] || 10))

  return {
    left: `${transform[4] || 0}px`,
    top: `${props.viewportSize.height - (transform[5] || 0)}px`,
    fontSize: `${fontSize}px`,
  }
}

function emitSelection() {
  const selection = window.getSelection?.()
  const text = selection?.toString?.().trim()

  if (!text || !layerRef.value || !selection.rangeCount) {
    return
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect()

  emit('select-text', {
    text,
    rect: {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    },
  })
}
</script>
```

- [ ] **Step 3: Create `FloatingExplanationCard.vue`**

Create `src/components/FloatingExplanationCard.vue`:

```vue
<template>
  <div v-if="isOpen" class="floating-explanation-card" :style="cardStyle" tabindex="-1" @keydown.esc="$emit('close')">
    <div class="floating-card-heading">
      <div>
        <p class="field-label">{{ title }}</p>
        <p class="floating-card-source">{{ sourceText }}</p>
      </div>
      <button class="word-card-close" type="button" :aria-label="closeLabel" :title="closeLabel" @click="$emit('close')">
        <span aria-hidden="true">x</span>
      </button>
    </div>

    <p v-if="isLoading" class="translation-loading">{{ loadingLabel }}</p>

    <div v-else-if="errorMessage" class="translation-error">
      <p>{{ errorMessage }}</p>
      <button class="error-action" type="button" @click="$emit('retry')">{{ retryLabel }}</button>
    </div>

    <p v-else-if="result" class="translation-result">{{ result }}</p>

    <p v-else class="translation-placeholder">{{ placeholder }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  position: {
    type: Object,
    default: null,
  },
  title: {
    type: String,
    default: '',
  },
  sourceText: {
    type: String,
    default: '',
  },
  result: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  loadingLabel: {
    type: String,
    default: '',
  },
  retryLabel: {
    type: String,
    default: '',
  },
  closeLabel: {
    type: String,
    default: '',
  },
})

defineEmits(['close', 'retry'])

const cardStyle = computed(() => {
  if (!props.position) {
    return {}
  }

  return {
    left: `${props.position.left}px`,
    top: `${props.position.top}px`,
  }
})
</script>
```

- [ ] **Step 4: Create `AiQuestionPanel.vue`**

Create `src/components/AiQuestionPanel.vue`:

```vue
<template>
  <aside v-if="isOpen" ref="panelRef" class="pdf-ai-panel">
    <div class="pdf-ai-panel-header">
      <div>
        <p class="field-label">{{ eyebrow }}</p>
        <h2 class="pdf-ai-panel-title">{{ title }}</h2>
      </div>
      <button class="toolbar-icon-button" type="button" :aria-label="closeLabel" :title="closeLabel" @click="$emit('close')">
        -
      </button>
    </div>

    <div class="pdf-ai-context-row">
      <span>{{ contextLabel }}</span>
      <div class="segmented-control">
        <button
          v-for="option in contextOptions"
          :key="option.value"
          class="filter-button"
          :class="{ active: contextMode === option.value }"
          type="button"
          @click="$emit('update:contextMode', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="pdf-ai-answer-list">
      <article v-for="item in answers" :key="item.id" class="pdf-ai-answer-item">
        <p class="pdf-ai-question">{{ item.question }}</p>
        <p class="pdf-ai-answer">{{ item.answer }}</p>
      </article>
    </div>

    <p v-if="isLoading" class="translation-loading pdf-ai-state">{{ loadingLabel }}</p>
    <p v-else-if="errorMessage" class="translation-error pdf-ai-state">{{ errorMessage }}</p>
    <p v-else-if="!answers.length" class="translation-placeholder pdf-ai-state">{{ emptyLabel }}</p>

    <form class="pdf-ai-ask-box" @submit.prevent="submitQuestion">
      <input v-model="draftQuestion" class="pdf-ai-input" type="text" :placeholder="askPlaceholder" />
      <button class="primary-button pdf-ai-submit" type="submit" :disabled="!draftQuestion.trim() || isLoading">
        {{ askButtonLabel }}
      </button>
    </form>
  </aside>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
  contextMode: {
    type: String,
    default: 'page',
  },
  contextOptions: {
    type: Array,
    default: () => [],
  },
  answers: {
    type: Array,
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
  eyebrow: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  contextLabel: {
    type: String,
    default: '',
  },
  askPlaceholder: {
    type: String,
    default: '',
  },
  askButtonLabel: {
    type: String,
    default: '',
  },
  closeLabel: {
    type: String,
    default: '',
  },
  loadingLabel: {
    type: String,
    default: '',
  },
  emptyLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['ask', 'close', 'update:contextMode'])
const draftQuestion = ref('')

function submitQuestion() {
  const question = draftQuestion.value.trim()

  if (!question) {
    return
  }

  emit('ask', question)
  draftQuestion.value = ''
}
</script>
```

- [ ] **Step 5: Create `PdfWorkspace.vue`**

Create `src/components/PdfWorkspace.vue`:

```vue
<template>
  <section class="pdf-workspace">
    <div class="pdf-document-stage">
      <PdfPageCanvas :page="page" :zoom="zoom" @rendered="$emit('rendered', $event)" @error="$emit('render-error', $event)">
        <PdfTextLayer
          :page="page"
          :viewport-size="viewportSize"
          @select-text="$emit('select-text', $event)"
          @error="$emit('text-error', $event)"
        />
      </PdfPageCanvas>
    </div>

    <FloatingExplanationCard
      :is-open="Boolean(explanationPosition)"
      :position="explanationPosition"
      :title="explanationTitle"
      :source-text="selectedText"
      :result="explanation"
      :is-loading="isExplanationLoading"
      :error-message="explanationErrorMessage"
      :placeholder="explanationPlaceholder"
      :loading-label="explanationLoadingLabel"
      :retry-label="retryLabel"
      :close-label="closeExplanationLabel"
      @close="$emit('close-explanation')"
      @retry="$emit('retry-explanation')"
    />

    <AiQuestionPanel
      :is-open="isAiPanelOpen"
      :context-mode="contextMode"
      :context-options="contextOptions"
      :answers="answers"
      :is-loading="isAnswerLoading"
      :error-message="answerErrorMessage"
      :eyebrow="aiEyebrow"
      :title="aiTitle"
      :context-label="contextLabel"
      :ask-placeholder="askPlaceholder"
      :ask-button-label="askButtonLabel"
      :close-label="closeAiLabel"
      :loading-label="answerLoadingLabel"
      :empty-label="emptyAnswerLabel"
      @ask="$emit('ask', $event)"
      @close="$emit('close-ai')"
      @update:context-mode="$emit('update:contextMode', $event)"
    />
  </section>
</template>

<script setup>
import AiQuestionPanel from './AiQuestionPanel.vue'
import FloatingExplanationCard from './FloatingExplanationCard.vue'
import PdfPageCanvas from './PdfPageCanvas.vue'
import PdfTextLayer from './PdfTextLayer.vue'

defineProps({
  page: {
    type: Object,
    default: null,
  },
  zoom: {
    type: Number,
    default: 1.18,
  },
  viewportSize: {
    type: Object,
    default: () => ({
      width: 0,
      height: 0,
    }),
  },
  explanationPosition: {
    type: Object,
    default: null,
  },
  selectedText: {
    type: String,
    default: '',
  },
  explanation: {
    type: String,
    default: '',
  },
  isExplanationLoading: {
    type: Boolean,
    default: false,
  },
  explanationErrorMessage: {
    type: String,
    default: '',
  },
  isAiPanelOpen: {
    type: Boolean,
    default: true,
  },
  contextMode: {
    type: String,
    default: 'page',
  },
  contextOptions: {
    type: Array,
    default: () => [],
  },
  answers: {
    type: Array,
    default: () => [],
  },
  isAnswerLoading: {
    type: Boolean,
    default: false,
  },
  answerErrorMessage: {
    type: String,
    default: '',
  },
  explanationTitle: {
    type: String,
    default: '',
  },
  explanationPlaceholder: {
    type: String,
    default: '',
  },
  explanationLoadingLabel: {
    type: String,
    default: '',
  },
  retryLabel: {
    type: String,
    default: '',
  },
  closeExplanationLabel: {
    type: String,
    default: '',
  },
  aiEyebrow: {
    type: String,
    default: '',
  },
  aiTitle: {
    type: String,
    default: '',
  },
  contextLabel: {
    type: String,
    default: '',
  },
  askPlaceholder: {
    type: String,
    default: '',
  },
  askButtonLabel: {
    type: String,
    default: '',
  },
  closeAiLabel: {
    type: String,
    default: '',
  },
  answerLoadingLabel: {
    type: String,
    default: '',
  },
  emptyAnswerLabel: {
    type: String,
    default: '',
  },
})

defineEmits([
  'ask',
  'close-ai',
  'close-explanation',
  'render-error',
  'rendered',
  'retry-explanation',
  'select-text',
  'text-error',
  'update:contextMode',
])
</script>
```

- [ ] **Step 6: Commit task**

Run:

```powershell
git add src/components/PdfPageCanvas.vue src/components/PdfTextLayer.vue src/components/FloatingExplanationCard.vue src/components/AiQuestionPanel.vue src/components/PdfWorkspace.vue
git commit -m "feat: add pdf reader workspace components"
```

---

### Task 6: Integrate PDF Mode Into Reader And Toolbar

**Files:**
- Modify: `src/pages/Reader.vue`
- Modify: `src/App.vue`
- Modify: `src/utils/locale.js`
- Modify: `src/pages/Reader.layout.test.js`

- [ ] **Step 1: Update layout contract test**

Modify `src/pages/Reader.layout.test.js` by replacing the disabled upload test with:

```js
  it('supports PDF-ready toolbar actions and workspace components', () => {
    const appSource = readFileSync(new URL('../App.vue', import.meta.url), 'utf8')

    assert.match(appSource, /class="app-toolbar"/)
    assert.match(appSource, /t\('toolbar\.pages'\)/)
    assert.match(appSource, /t\('toolbar\.ask'\)/)
    assert.match(appSource, /t\('toolbar\.uploadPdf'\)/)
    assert.match(appSource, /t\('toolbar\.export'\)/)
    assert.match(appSource, /dispatchEvent\(new CustomEvent\('reader:upload-pdf'\)/)
    assert.match(readerSource, /PdfWorkspace/)
    assert.match(readerSource, /loadPdfDocumentFromArrayBuffer/)
    assert.match(readerSource, /requestAnswer/)
  })
```

- [ ] **Step 2: Run layout test and verify it fails**

Run:

```powershell
npm.cmd test -- src/pages/Reader.layout.test.js
```

Expected:

```text
FAIL
Reader.vue does not yet reference PdfWorkspace
```

- [ ] **Step 3: Wire toolbar browser events in `App.vue`**

Replace the Upload PDF button with:

```vue
          <button class="toolbar-action" type="button" @click="requestPdfUpload">
            {{ t('toolbar.uploadPdf') }}
          </button>
```

Replace the Q&A toolbar link with:

```vue
          <button class="toolbar-action" type="button" @click="toggleReaderAi">
            {{ t('toolbar.ask') }}
          </button>
```

Add functions in `<script setup>`:

```js
function requestPdfUpload() {
  window.dispatchEvent(new CustomEvent('reader:upload-pdf'))
}

function toggleReaderAi() {
  window.dispatchEvent(new CustomEvent('reader:toggle-ai'))
}
```

- [ ] **Step 4: Add Reader imports and state**

In `src/pages/Reader.vue`, add imports:

```js
import PdfWorkspace from '../components/PdfWorkspace.vue'
import { requestAnswer } from '../api/ask.js'
import {
  extractTextFromPdfPage,
  loadPdfDocumentFromArrayBuffer,
  createPageTextCache,
  getCachedPageText,
  setCachedPageText,
} from '../utils/pdfDocument.js'
import {
  createPdfSession,
  getPdfContextText,
  setPdfContextMode,
  setPdfPage,
  setPdfPageText,
  setPdfPanelOpen,
  setPdfZoom,
} from '../utils/pdfSession.js'
import { getReaderOverlayPosition } from '../utils/readerOverlayPosition.js'
```

Add state near existing refs:

```js
const pdfInputRef = ref(null)
const pdfDocument = ref(null)
const pdfPage = ref(null)
const pdfSession = ref(null)
const pdfPageViewportSize = ref({ width: 0, height: 0 })
const pdfTextCache = createPageTextCache()
const pdfErrorMessage = ref('')
const selectedPdfText = ref('')
const selectedPdfTextRect = ref(null)
const pdfExplanation = ref('')
const isPdfExplanationLoading = ref(false)
const pdfExplanationErrorMessage = ref('')
const aiAnswers = ref([])
const isAnswerLoading = ref(false)
const answerErrorMessage = ref('')
const readerMode = computed(() => (pdfSession.value ? 'pdf' : 'text'))
```

- [ ] **Step 5: Add PDF upload and Q&A functions**

Add these functions in `Reader.vue`:

```js
function openPdfPicker() {
  pdfInputRef.value?.click()
}

async function handlePdfFileChange(event) {
  const file = event.target.files?.[0]

  if (!file) {
    return
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    pdfErrorMessage.value = t('reader.pdfInvalidFile')
    return
  }

  pdfErrorMessage.value = ''

  try {
    const arrayBuffer = await file.arrayBuffer()
    const document = await loadPdfDocumentFromArrayBuffer(arrayBuffer)

    pdfDocument.value = document
    pdfSession.value = createPdfSession({
      fileName: file.name,
      pageCount: document.numPages,
    })
    aiAnswers.value = []
    await loadPdfPage(1)
  } catch (error) {
    pdfErrorMessage.value = getErrorMessage(error, t('reader.pdfLoadFailed'))
  } finally {
    event.target.value = ''
  }
}

async function loadPdfPage(pageNumber) {
  if (!pdfDocument.value || !pdfSession.value) {
    return
  }

  pdfSession.value = setPdfPage(pdfSession.value, pageNumber)
  pdfPage.value = await pdfDocument.value.getPage(pdfSession.value.currentPage)
  await ensurePdfPageText(pdfSession.value.currentPage)
}

async function ensurePdfPageText(pageNumber) {
  if (!pdfDocument.value || !pdfSession.value) {
    return ''
  }

  const cachedText = getCachedPageText(pdfTextCache, pageNumber)

  if (cachedText) {
    pdfSession.value = setPdfPageText(pdfSession.value, pageNumber, cachedText)
    return cachedText
  }

  const page = await pdfDocument.value.getPage(pageNumber)
  const pageText = await extractTextFromPdfPage(page)

  setCachedPageText(pdfTextCache, pageNumber, pageText)
  pdfSession.value = setPdfPageText(pdfSession.value, pageNumber, pageText)
  return pageText
}

async function ensureFullDocumentText() {
  if (!pdfDocument.value || !pdfSession.value) {
    return ''
  }

  for (let pageNumber = 1; pageNumber <= pdfSession.value.pageCount; pageNumber += 1) {
    await ensurePdfPageText(pageNumber)
  }

  return getPdfContextText(pdfSession.value)
}

async function askPdfQuestion(question) {
  if (!pdfSession.value || isAnswerLoading.value) {
    return
  }

  answerErrorMessage.value = ''
  isAnswerLoading.value = true

  try {
    const contextText =
      pdfSession.value.contextMode === 'document'
        ? await ensureFullDocumentText()
        : await ensurePdfPageText(pdfSession.value.currentPage)

    if (!contextText) {
      throw new Error(t('reader.pdfNoTextContext'))
    }

    const result = await requestAnswer({
      question,
      contextText,
      contextMode: pdfSession.value.contextMode,
    })

    aiAnswers.value = [
      ...aiAnswers.value,
      {
        id: `${Date.now()}-${aiAnswers.value.length}`,
        question,
        answer: result.answer,
      },
    ]
  } catch (error) {
    answerErrorMessage.value = getErrorMessage(error, t('reader.failedAnswer'))
  } finally {
    isAnswerLoading.value = false
  }
}
```

- [ ] **Step 6: Add text selection explanation functions**

Add in `Reader.vue`:

```js
const pdfExplanationPosition = computed(() => {
  if (!selectedPdfTextRect.value) {
    return null
  }

  const aiPanel = document.querySelector('.pdf-ai-panel')
  const aiRect = aiPanel?.getBoundingClientRect?.()

  return getReaderOverlayPosition({
    anchorRect: selectedPdfTextRect.value,
    viewportRect: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    cardSize: {
      width: Math.min(420, window.innerWidth - 32),
      height: 240,
    },
    blockedRect: aiRect
      ? {
          left: aiRect.left,
          right: aiRect.right,
          top: aiRect.top,
          bottom: aiRect.bottom,
        }
      : null,
  })
})

function selectPdfText(selection) {
  selectedPdfText.value = selection.text
  selectedPdfTextRect.value = selection.rect
  translateSelectedPdfText()
}

async function translateSelectedPdfText() {
  const text = selectedPdfText.value.trim()

  if (!text) {
    return
  }

  pdfExplanation.value = ''
  pdfExplanationErrorMessage.value = ''
  isPdfExplanationLoading.value = true

  try {
    pdfExplanation.value = await getTranslation(text)
  } catch (error) {
    pdfExplanationErrorMessage.value = getErrorMessage(error, t('reader.failedTranslation'))
  } finally {
    isPdfExplanationLoading.value = false
  }
}

function closePdfExplanation() {
  selectedPdfText.value = ''
  selectedPdfTextRect.value = null
  pdfExplanation.value = ''
  pdfExplanationErrorMessage.value = ''
}
```

- [ ] **Step 7: Add PDF template branch**

In `Reader.vue` template, add hidden input near the top of the section:

```vue
    <input
      ref="pdfInputRef"
      class="visually-hidden"
      type="file"
      accept="application/pdf"
      @change="handlePdfFileChange"
    />
```

Before the existing text reader layout, add:

```vue
    <div v-if="readerMode === 'pdf'" class="pdf-reader-layout">
      <div class="pdf-reader-header">
        <div>
          <p class="eyebrow">{{ t('reader.pdfEyebrow') }}</p>
          <h1>{{ pdfSession.fileName }}</h1>
        </div>
        <div class="pdf-page-controls">
          <button class="secondary-button" :disabled="pdfSession.currentPage <= 1" @click="loadPdfPage(pdfSession.currentPage - 1)">
            {{ t('reader.previousPage') }}
          </button>
          <span class="progress-pill">{{ t('reader.pageProgress', { current: pdfSession.currentPage, total: pdfSession.pageCount }) }}</span>
          <button class="secondary-button" :disabled="pdfSession.currentPage >= pdfSession.pageCount" @click="loadPdfPage(pdfSession.currentPage + 1)">
            {{ t('reader.nextPage') }}
          </button>
        </div>
      </div>

      <PdfWorkspace
        :page="pdfPage"
        :zoom="pdfSession.zoom"
        :viewport-size="pdfPageViewportSize"
        :explanation-position="pdfExplanationPosition"
        :selected-text="selectedPdfText"
        :explanation="pdfExplanation"
        :is-explanation-loading="isPdfExplanationLoading"
        :explanation-error-message="pdfExplanationErrorMessage"
        :is-ai-panel-open="pdfSession.isAiPanelOpen"
        :context-mode="pdfSession.contextMode"
        :context-options="[
          { value: 'page', label: t('reader.contextCurrentPage') },
          { value: 'document', label: t('reader.contextArticle') },
        ]"
        :answers="aiAnswers"
        :is-answer-loading="isAnswerLoading"
        :answer-error-message="answerErrorMessage"
        :explanation-title="t('reader.translationCardTitle')"
        :explanation-placeholder="t('reader.translationFallback')"
        :explanation-loading-label="t('reader.loadingTranslation')"
        :retry-label="t('common.retry')"
        :close-explanation-label="t('reader.closeTranslationCard')"
        :ai-eyebrow="t('reader.aiPanelEyebrow')"
        :ai-title="t('reader.aiPanelTitle')"
        :context-label="t('reader.contextLabel')"
        :ask-placeholder="t('reader.askPlaceholder')"
        :ask-button-label="t('reader.askButton')"
        :close-ai-label="t('reader.closeAiPanel')"
        :answer-loading-label="t('reader.loadingAnswer')"
        :empty-answer-label="t('reader.askEmpty')"
        @rendered="pdfPageViewportSize = $event"
        @select-text="selectPdfText"
        @retry-explanation="translateSelectedPdfText"
        @close-explanation="closePdfExplanation"
        @ask="askPdfQuestion"
        @close-ai="pdfSession = setPdfPanelOpen(pdfSession, false)"
        @update:context-mode="pdfSession = setPdfContextMode(pdfSession, $event)"
      />
    </div>
```

Change the existing text reader condition from:

```vue
    <div v-if="sentences.length" class="reader-layout" :style="readerFontSizeStyle">
```

to:

```vue
    <div v-else-if="sentences.length" class="reader-layout" :style="readerFontSizeStyle">
```

- [ ] **Step 8: Add event listeners**

In `onMounted`:

```js
  window.addEventListener('reader:upload-pdf', openPdfPicker)
  window.addEventListener('reader:toggle-ai', togglePdfAiPanel)
```

In `onBeforeUnmount`:

```js
  window.removeEventListener('reader:upload-pdf', openPdfPicker)
  window.removeEventListener('reader:toggle-ai', togglePdfAiPanel)
```

Add:

```js
function togglePdfAiPanel() {
  if (!pdfSession.value) {
    return
  }

  pdfSession.value = setPdfPanelOpen(pdfSession.value, !pdfSession.value.isAiPanelOpen)
}
```

- [ ] **Step 9: Add locale strings**

Add these keys to `zh.reader` in `src/utils/locale.js`:

```js
      pdfEyebrow: 'PDF 阅读',
      pdfInvalidFile: '请上传 PDF 文件。',
      pdfLoadFailed: 'PDF 加载失败。',
      pdfNoTextContext: '当前 PDF 上下文没有可提取文本。',
      previousPage: '上一页',
      nextPage: '下一页',
      pageProgress: '第 {current} / {total} 页',
      contextCurrentPage: '当前页',
      askPlaceholder: '继续追问这篇论文...',
      askButton: '发送',
      closeAiPanel: '关闭 AI 面板',
      loadingAnswer: '正在回答...',
      askEmpty: '输入问题，或选择一个推荐问题。',
      failedAnswer: '问题回答失败。',
```

Add these keys to `en.reader` in `src/utils/locale.js`:

```js
      pdfEyebrow: 'PDF reader',
      pdfInvalidFile: 'Please upload a PDF file.',
      pdfLoadFailed: 'Failed to load this PDF.',
      pdfNoTextContext: 'No extractable text is available for this PDF context.',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      pageProgress: 'Page {current} of {total}',
      contextCurrentPage: 'Current page',
      askPlaceholder: 'Ask about this paper...',
      askButton: 'Send',
      closeAiPanel: 'Close AI panel',
      loadingAnswer: 'Answering...',
      askEmpty: 'Ask a question or choose a suggested prompt.',
      failedAnswer: 'Failed to answer the question.',
```

- [ ] **Step 10: Run integration layout test**

Run:

```powershell
npm.cmd test -- src/pages/Reader.layout.test.js
```

Expected:

```text
PASS
```

- [ ] **Step 11: Commit task**

Run:

```powershell
git add src/pages/Reader.vue src/App.vue src/utils/locale.js src/pages/Reader.layout.test.js
git commit -m "feat: integrate pdf reader mode"
```

---

### Task 7: Add PDF Workspace Styles

**Files:**
- Modify: `src/style.css`
- Modify: `src/pages/Reader.layout.test.js`

- [ ] **Step 1: Add style contract assertions**

Add to `src/pages/Reader.layout.test.js`:

```js
  it('styles the PDF workspace as one document surface with a floating site-style AI panel', () => {
    assert.match(styleSource, /\.pdf-workspace\s*\{[\s\S]*position:\s*relative/)
    assert.match(styleSource, /\.pdf-document-stage\s*\{[\s\S]*padding:\s*8px/)
    assert.match(styleSource, /\.pdf-ai-panel\s*\{[\s\S]*position:\s*absolute/)
    assert.match(styleSource, /\.pdf-ai-panel\s*\{[\s\S]*background:\s*rgba\(255,\s*255,\s*255/)
    assert.match(styleSource, /\.pdf-ai-panel\s*\{[\s\S]*border-radius:\s*var\(--radius\)/)
    assert.match(styleSource, /@media \(max-width:\s*960px\)\s*\{[\s\S]*\.pdf-ai-panel\s*\{[\s\S]*position:\s*static/)
  })
```

- [ ] **Step 2: Run layout test and verify it fails**

Run:

```powershell
npm.cmd test -- src/pages/Reader.layout.test.js
```

Expected:

```text
FAIL
styleSource does not include .pdf-workspace
```

- [ ] **Step 3: Add CSS**

Append to `src/style.css` before `::selection`:

```css
.visually-hidden {
  width: 1px;
  height: 1px;
  position: absolute;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.pdf-reader-layout {
  width: min(100%, 1440px);
  margin: 0 auto;
}

.pdf-reader-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 10px;
  padding: 0 2px;
}

.pdf-reader-header h1 {
  max-width: 780px;
  margin: 5px 0 0;
  color: var(--surface-strong);
  font-size: clamp(19px, 2vw, 27px);
  line-height: 1.24;
}

.pdf-page-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pdf-workspace {
  min-height: 72dvh;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #f5f6f9;
  box-shadow: 0 8px 28px rgba(24, 30, 50, 0.06);
}

.pdf-document-stage {
  min-height: 72dvh;
  display: grid;
  justify-items: center;
  align-items: start;
  padding: 8px;
}

.pdf-page-shell {
  width: var(--pdf-page-width);
  min-height: var(--pdf-page-height);
  position: relative;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(24, 30, 50, 0.08);
}

.pdf-page-canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.pdf-text-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: transparent;
  user-select: text;
}

.pdf-text-item {
  position: absolute;
  transform: translateY(-100%);
  transform-origin: left bottom;
  white-space: pre;
  cursor: text;
}

.floating-explanation-card {
  position: fixed;
  z-index: 45;
  width: min(420px, calc(100vw - 32px));
  max-height: min(70dvh, calc(100dvh - 32px));
  overflow: auto;
  padding: 14px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 18px 44px rgba(24, 30, 50, 0.12),
    0 4px 12px rgba(24, 30, 50, 0.08);
  backdrop-filter: blur(10px);
}

.floating-card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.floating-card-source {
  max-height: 4.8em;
  overflow: hidden;
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.pdf-ai-panel {
  position: absolute;
  top: 14px;
  right: 18px;
  z-index: 35;
  width: min(39%, 500px);
  min-width: 380px;
  max-height: calc(100% - 28px);
  display: flex;
  flex-direction: column;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 18px 44px rgba(24, 30, 50, 0.12),
    0 4px 12px rgba(24, 30, 50, 0.07);
  backdrop-filter: blur(10px);
}

.pdf-ai-panel-header {
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.pdf-ai-panel-title {
  margin: 0;
  color: var(--surface-strong);
  font-size: 20px;
  line-height: 1.2;
}

.pdf-ai-context-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 14px;
}

.pdf-ai-answer-list {
  display: grid;
}

.pdf-ai-answer-item {
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
}

.pdf-ai-question {
  margin: 0 0 9px;
  color: var(--text);
  font-size: 16px;
  line-height: 1.42;
  font-weight: 780;
}

.pdf-ai-answer {
  margin: 0;
  color: #4c5362;
  font-size: 14px;
  line-height: 1.72;
}

.pdf-ai-state {
  margin: 14px 18px;
}

.pdf-ai-ask-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 14px 18px 18px;
  border-top: 1px solid var(--border);
  background: #fbfcff;
}

.pdf-ai-input {
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 11px;
  color: var(--text);
  background: #fff;
  font-size: 14px;
}

.pdf-ai-input:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 4px rgba(83, 102, 214, 0.12);
}

.pdf-ai-submit {
  min-height: 38px;
}
```

Inside the existing `@media (max-width: 960px)` block, add:

```css
  .pdf-ai-panel {
    position: static;
    width: auto;
    min-width: 0;
    max-height: none;
    margin: -4px 8px 8px;
  }
```

Inside the existing `@media (max-width: 720px)` block, add:

```css
  .pdf-reader-header,
  .pdf-page-controls,
  .pdf-ai-context-row,
  .pdf-ai-panel-header,
  .pdf-ai-ask-box {
    align-items: stretch;
    grid-template-columns: 1fr;
    flex-direction: column;
  }
```

- [ ] **Step 4: Run layout test**

Run:

```powershell
npm.cmd test -- src/pages/Reader.layout.test.js
```

Expected:

```text
PASS
```

- [ ] **Step 5: Commit task**

Run:

```powershell
git add src/style.css src/pages/Reader.layout.test.js
git commit -m "style: add pdf reader workspace"
```

---

### Task 8: Verify Build And Browser Behavior

**Files:**
- No new source files unless verification exposes defects.

- [ ] **Step 1: Run all unit tests**

Run:

```powershell
npm.cmd test
```

Expected:

```text
PASS
```

- [ ] **Step 2: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected:

```text
dist/ is generated
vite build exits with code 0
```

- [ ] **Step 3: Start dev server**

Run:

```powershell
npm.cmd run dev
```

Expected:

```text
Local: http://localhost:5173/
```

Keep the dev server running for browser verification.

- [ ] **Step 4: Browser verify desktop**

Open `http://localhost:5173/reader`.

Verify:

```text
Reader shows PDF upload empty state when no text or PDF exists.
Upload PDF action opens a file picker.
After selecting a normal text PDF, page 1 renders clearly.
PDF page fills the workspace with small outer padding.
AI panel floats over the upper-right document area and uses white-card site styling.
AI panel can close or minimize.
Current page / full document segmented control is visible.
Text selection opens the floating explanation card near the selection.
```

- [ ] **Step 5: Browser verify mobile**

Set browser viewport to `390x844`.

Verify:

```text
Toolbar actions remain usable through horizontal scrolling or wrapping.
PDF appears before AI.
AI panel becomes a normal card below the document.
Floating explanation card stays inside the viewport.
No button text overflows its container.
```

- [ ] **Step 6: Commit verification fixes if any**

If verification requires changes, commit them:

```powershell
git add src
git commit -m "fix: polish pdf reader verification issues"
```

If no changes are needed, do not create an empty commit.

---

## Self-Review Checklist

- Spec coverage:
  - Real PDF upload/rendering: Tasks 1, 2, 5, 6, 8.
  - Text extraction and AI context: Tasks 1, 2, 4, 6.
  - Floating AI panel over document: Tasks 5, 6, 7.
  - Site-consistent AI style: Task 7.
  - Floating explanation card: Tasks 3, 5, 6, 7.
  - Local annotation/tool state: Task 1 establishes session state; toolbar modes remain scoped for future annotation persistence.
  - Existing text fallback: Task 6 preserves the existing `v-else-if="sentences.length"` flow.
  - Mobile behavior: Task 7 and Task 8.
- Placeholder scan:
  - The plan contains concrete files, commands, expected results, and code blocks for each implementation step.
- Type consistency:
  - `contextMode` uses `page` and `document` in `pdfSession.js`, `AiQuestionPanel.vue`, `Reader.vue`, and `/api/ask`.
  - `isAiPanelOpen` is session state and is passed to `PdfWorkspace.vue`.
  - `selectedPdfText`, `pdfExplanation`, and `pdfExplanationPosition` are Reader-owned and passed into `PdfWorkspace.vue`.
