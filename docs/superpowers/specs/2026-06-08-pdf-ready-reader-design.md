# PDF-ready Reader Design

## Goal

Redesign the existing `/reader` page into a PDF reading workspace that matches the screenshot's core workflow while staying consistent with this app's current visual system.

The page should feel like a focused paper reader with a floating AI assistant, not like two separate tool panels. The PDF content remains the primary surface. AI, translation, and annotation controls appear as supporting layers on top of the document.

## Scope

This design covers the first production-ready pass:

- Upload a PDF from the Reader toolbar.
- Render real PDF pages in the main reading canvas.
- Extract text from the PDF for AI context.
- Show a floating AI Q&A panel over the right side of the document.
- Support AI context switching between current page and full document.
- Show a floating explanation card near selected text.
- Keep selection, text note, and annotation UI states locally.
- Preserve the existing article-reading path as a text-document fallback.

This design intentionally does not include full PDF annotation export in the first pass. The Export button can export source text or remain visibly disabled with a clear tooltip until true annotated PDF export is implemented.

## Visual Direction

Use the existing site style as the source of truth:

- White surfaces.
- Light borders using the existing border token.
- 8px or smaller radius.
- Soft shadows only for floating layers.
- Blue-purple primary color only for active controls, focus states, and primary actions.
- System sans for app chrome and AI UI.
- Serif text only inside rendered document content or fallback text-document pages.

The screenshot informs the layout and workflow, but the AI panel should not copy the screenshot's large pale-purple block style. It should use this app's current card language: white background, thin border, compact header, segmented context control, readable body text, and restrained blue-purple accents.

## Layout

The Reader page has one main workspace below the sticky app toolbar.

The document canvas fills the available width with minimal outer padding. The application should not add large empty gutters around the PDF. Real PDF page margins remain because they are part of the source document, but the app should not amplify them.

On desktop, the AI Q&A panel floats over the right side of the document:

- Position: upper-right inside the Reader workspace.
- Width: roughly 39-40% of the workspace, capped near 480-500px.
- Minimum width: about 380px.
- Background: white with light border and soft shadow.
- Radius: 8px.
- The panel can be minimized or closed to restore full document visibility.

The floating explanation card appears near the selected text:

- Prefer right-below or left-below the selection.
- Avoid overlapping the AI panel when possible.
- Constrain the card inside the viewport.
- Use the same white, bordered floating-card style as the current word and translation cards.

On mobile and narrow widths:

- The PDF remains first.
- The AI panel becomes a normal card below the document instead of covering text.
- Toolbar actions can scroll horizontally.
- Floating explanation cards stay viewport-constrained and should never cover the whole document.

## Reading Comfort

The goal is not to make the PDF artificially dense. The goal is to make it feel full without hurting readability.

Use a comfortable default PDF zoom:

- Render PDF pages at high DPI so text is crisp.
- Default zoom should make body text readable without immediate pinch/zoom.
- Provide zoom controls in the toolbar or near the page controls.
- Preserve the source PDF layout; do not reflow or rewrite PDF text.

For fallback text-document mode, use a paper-like two-column layout only at wide desktop widths. Use moderate line height, readable font size, and enough column gap to avoid cramped text.

## Toolbar

The app toolbar keeps the screenshot's functional intent but uses the existing toolbar style.

Primary tool group:

- Undo.
- Redo.
- Select.
- Text note.
- Annotation or pen.

Document actions:

- Pages.
- Q&A.
- Upload PDF.
- Export.
- Language toggle remains available.

States:

- Active tool uses the existing primary-soft background and primary-strong text.
- Disabled tools use muted text and tooltip copy that explains the limitation.
- Upload PDF is enabled in the first pass.
- Export can be disabled or limited until annotated PDF export exists.

## PDF Loading Flow

When the Reader has no PDF or text article:

- Show a compact empty state inside the document workspace.
- Primary action: Upload PDF.
- Secondary action: return home or paste an article.

When a user uploads a PDF:

- Read the file in the browser.
- Render page 1 by default.
- Extract text per page for AI context.
- Store transient PDF session state in memory.
- Store lightweight metadata in localStorage only if needed, such as file name, current page, zoom, and panel state.

Errors:

- Invalid file type: show an inline error.
- PDF parse/render failure: show a retry action and keep Upload PDF available.
- Text extraction failure: still render the PDF, but show AI context as unavailable for that page.

## AI Q&A Panel

The AI panel is a floating assistant over the document, styled like this app's own components.

Panel sections:

- Header: small eyebrow plus "AI 问答" title and minimize/close control.
- Context control: segmented control for 当前页 and 全文.
- Answer list: question title plus readable answer text.
- Ask box: compact input and send button.

Initial suggested questions can mirror the screenshot:

- "这是否是一个新的问题？"
- "这篇文章要验证一个什么科学假设？"
- "有哪些相关研究？如何分类？各有什么优缺点？"

Behavior:

- Current page mode sends only extracted text from the active PDF page.
- Full document mode sends the full extracted document text, subject to a safe length limit.
- If text is too long, summarize or chunk before sending to the backend.
- Loading states should use skeleton rows or inline loading text, not a large spinner.
- Errors should be inline and retryable.

## Text Selection And Explanation

PDF text selection should support:

- Selecting text from the PDF text layer when available.
- Showing a floating explanation card near the selection.
- Requesting translation or explanation from the backend.

The existing sentence translation and word explanation logic should be reused where possible:

- Translation endpoint for selected sentence or selected text.
- Word explanation endpoint for single-word selections.
- Vocabulary saving for selected word explanations.

If a PDF page has no extractable text:

- Allow AI Q&A only from document text that was successfully extracted.
- Show a clear message for scanned/image-only pages.
- Do not block visual PDF rendering.

## Annotation State

The first pass supports local UI state for annotations:

- Selected text highlights.
- Text notes.
- Active tool mode.
- Undo/redo for local annotation actions.

These can be stored per PDF session in browser memory first. Persistent storage can be added later with a stable document id.

Out of scope for this pass:

- Exporting annotations back into a PDF file.
- Collaborative annotations.
- OCR for scanned PDFs.
- Freehand drawing persistence beyond local session state.

## Architecture

Keep the change centered on the Reader page and small supporting modules.

Suggested components:

- `Reader.vue`: owns high-level reader mode, PDF session state, selected context, and existing text fallback.
- `PdfWorkspace.vue`: renders the document canvas, page controls, and floating overlay slots.
- `PdfPageCanvas.vue`: renders the current PDF page using PDF.js.
- `PdfTextLayer.vue`: renders selectable text layer and emits text selection.
- `AiQuestionPanel.vue`: floating Q&A UI with context segmented control and ask box.
- `FloatingExplanationCard.vue`: shared floating card for selected text, sentence translation, and word explanation.

Suggested utilities:

- `pdfDocument.js`: load PDF, get page count, render page, extract page text.
- `pdfSession.js`: manage current page, zoom, extracted text cache, and local annotation state.
- `readerOverlayPosition.js`: place floating cards while avoiding viewport overflow and the AI panel.

Backend/API:

- Reuse current translate, word explanation, and summarize APIs.
- Add an ask endpoint only when free-form Q&A is implemented.
- The ask endpoint should accept `question`, `contextText`, and `contextMode`.

Dependency:

- Use Mozilla PDF.js via `pdfjs-dist` for PDF rendering and text extraction.

## Data Flow

Upload PDF:

1. User clicks Upload PDF.
2. Browser reads the selected PDF file.
3. Reader creates a PDF session.
4. PDF.js renders current page to canvas.
5. Text extraction runs for the current page and lazily for full-document context.
6. AI panel receives available context status.

Ask question:

1. User chooses 当前页 or 全文.
2. User selects a suggested question or types a question.
3. Reader resolves context text.
4. Frontend sends question and context to backend.
5. Backend returns a concise Chinese answer.
6. AI panel appends or updates the answer list.

Text explanation:

1. User selects text in the PDF text layer.
2. Reader computes selection bounds.
3. Floating explanation card opens near the selection.
4. Frontend requests translation or word explanation.
5. Result appears in the floating card.

## Accessibility

- Upload input must be keyboard accessible.
- Toolbar buttons need clear labels and disabled tooltips.
- Segmented context control needs current state semantics.
- Floating AI panel needs a close/minimize button with accessible label.
- Floating explanation card should be dismissible with Escape.
- Focus should move predictably when panels open from keyboard actions.
- Text contrast should follow current app contrast levels.

## Testing

Add focused tests where logic can be tested without a browser:

- PDF session state: page bounds, zoom bounds, context mode selection.
- Text extraction cache behavior.
- Overlay placement utility: avoids viewport overflow and known AI panel bounds.
- AI context resolver: current page versus full document.

Manual/browser verification:

- Upload a valid PDF.
- Render page 1 clearly at desktop width.
- Change page and verify text extraction context updates.
- Open and close/minimize AI panel.
- Select text and verify explanation card placement.
- Test narrow viewport behavior where AI panel moves below the document.
- Verify empty, loading, error, and scanned/no-text states.

## Acceptance Criteria

- `/reader` visually reads as a single document workspace.
- PDF content fills the workspace without large app-created side gutters.
- Body text is comfortable to read at default zoom.
- AI Q&A floats over the document and matches the site's existing white-card style.
- The AI panel can be minimized or closed.
- Upload PDF works for normal text PDFs.
- Current page and full document AI contexts are clearly selectable.
- Selected text opens a nearby floating explanation card.
- Existing text article reading does not break.
- Mobile layout remains usable without overlaying AI over the main reading text.
