# Reader Prototype Manual Highlight Design

## Goal

Add a manual sentence highlighter to the standalone `/reader-prototype` page. The feature should let users choose a highlight color and mark sentences in the prototype reader, similar to lightweight note tools in Obsidian and Notion.

This is a prototype-only interaction. It must not change the production `/reader` page, article history, vocabulary, translation, summary, AI, storage, or server behavior.

## Confirmed Direction

Use a sentence-level, interactive, non-persistent prototype.

- Users can select a preset color.
- Users can click sentences to apply, change, or remove highlights.
- Highlight state lives only in `ReaderPrototype.vue` while the page is open.
- Refreshing the page restores the default static example highlights from the local prototype data.
- The feature validates the reading experience and visual interaction before designing a production annotation model.

Do not implement arbitrary text-range highlighting in this iteration. The current prototype data is sentence and token based, so sentence-level highlighting keeps the implementation aligned with existing structure and avoids selection-range complexity.

## Scope

Included:

- A highlighter mode on `/reader-prototype`.
- A compact color picker in the prototype top toolbar.
- Preset colors: yellow, green, blue, pink, and purple.
- A clear/removal option.
- Sentence-level click handling in the reading paper.
- In-memory highlight state per chapter and sentence.
- Existing "show highlights" behavior preserved as a visibility toggle.
- Existing word definition clicks preserved.

Excluded:

- Production `/reader` changes.
- Persistence in `localStorage` or any backend store.
- Drag-selection or partial-sentence highlighting.
- Notes, comments, annotation popovers, export, or sync.
- Custom color picker or user-defined colors.
- API calls or AI behavior.

## Interaction Model

The top toolbar exposes highlighter controls:

- `Highlighter` toggles marking mode.
- Color swatches select the active color and keep highlighter mode on.
- `Clear` selects removal mode and keeps highlighter mode on.
- `Show highlights` remains a separate visibility switch. It hides or shows highlight styling but does not delete highlight state.

The marking mode and visibility switch must stay separate. Turning visibility off should not prevent users from keeping the highlighter state; it should only hide the marker treatment until visibility is enabled again.

Sentence behavior:

- If highlighter mode is off, clicking sentence text does not change highlight state.
- If highlighter mode is on and a color is selected, clicking an unhighlighted sentence applies that color.
- Clicking a sentence that already has the same color removes the highlight.
- Clicking a sentence with a different selected color changes the highlight to the selected color.
- If clear mode is active, clicking a highlighted sentence removes its highlight.
- Clicking a word token keeps opening the word definition panel and must not trigger sentence highlighting.

Chapter behavior:

- Highlight state is stored by chapter id and sentence id.
- Switching chapters keeps the in-memory state for chapters already touched during the current page session.
- Refreshing the page resets all state to the prototype's default local data.

## Visual Design

Highlights use a marker-like background rather than a solid block.

- Use the existing pale yellow prototype highlight as the base treatment.
- Add color variants through CSS classes or CSS custom properties.
- Keep text readable over every highlight color.
- Keep selected word styling visible when a selected word appears inside a highlighted sentence.
- Keep the toolbar compact and operational, matching the current prototype toolbar style.

Recommended swatches:

- Yellow: marker default.
- Green: learned or useful sentence.
- Blue: structural or reference sentence.
- Pink: question or confusing sentence.
- Purple: important idea or quote.

These meanings are only visual suggestions in the prototype. The implementation should not enforce semantic categories.

## Data Model

Keep state in `ReaderPrototype.vue`:

```js
const isHighlightMode = ref(false)
const activeHighlightColorId = ref('yellow')
const isHighlightClearMode = ref(false)
const sentenceHighlightsByChapter = ref({})
```

Use a small color configuration constant:

```js
const prototypeHighlightColors = [
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'pink', label: 'Pink' },
  { id: 'purple', label: 'Purple' },
]
```

Recommended shape:

```js
{
  "chapter-4": {
    "chapter-4-p1-s2": "yellow",
    "chapter-4-p2-s1": "blue"
  }
}
```

The default state should be derived from existing `sentence.highlighted` flags in `readerPrototypeData.js`, using yellow as the default color.

## Component Responsibilities

### `ReaderPrototype.vue`

Owns highlighter state and behavior.

- Initializes default highlights for the active prototype data set.
- Tracks highlighter mode and active color.
- Computes current chapter highlight map.
- Handles highlighter toolbar events.
- Handles sentence highlight toggle events.
- Passes highlight state and mode down to the reading paper.

### `PrototypeTopbar.vue`

Displays highlighter controls and emits user intent.

- Receives `isHighlightMode`, `activeHighlightColorId`, color list, and clear mode state.
- Emits `toggle-highlight-mode`, `select-highlight-color`, `select-highlight-clear`, and `toggle-highlight-visibility`.
- Continues to emit the existing translation toggle.
- Does not own highlight state.

### `PrototypeReadingPaper.vue`

Renders sentence highlight classes and emits sentence clicks.

- Receives `sentenceHighlights`, `showHighlight`, `isHighlightMode`, and `activeHighlightColorId`.
- Applies the color-specific highlight style when the sentence has a color and show-highlight is on.
- Emits `toggle-sentence-highlight` with `sentenceId`.
- Keeps word token `@click.stop` behavior so word selection remains independent.

### `readerPrototypeSelectors.js`

Add focused pure helpers for default highlight extraction and toggle behavior.

Suggested functions:

- `getDefaultPrototypeHighlights(chapterContent, defaultColorId = 'yellow')`
- `getPrototypeChapterHighlights(highlightsByChapter, chapterId)`
- `togglePrototypeSentenceHighlight(chapterHighlights, sentenceId, activeColorId)`
- `removePrototypeSentenceHighlight(chapterHighlights, sentenceId)`

Keep these helpers data-only and UI-agnostic.

## Data Flow

1. `ReaderPrototype.vue` loads local prototype chapter data.
2. Default sentence highlights are derived from `sentence.highlighted`.
3. `PrototypeTopbar` shows the current highlighter mode and selected color.
4. User selects a color or clear mode.
5. User clicks a sentence in `PrototypeReadingPaper`.
6. `PrototypeReadingPaper` emits the sentence id.
7. `ReaderPrototype.vue` updates the in-memory chapter highlight map.
8. Updated props flow back into `PrototypeReadingPaper`, which re-renders the colored marker treatment.

## Accessibility

- Color swatches need accessible labels such as "Highlight yellow".
- The selected color should be indicated through `aria-pressed` or `aria-current`, not color alone.
- The highlighter mode button should expose pressed state.
- Clear mode should have a text label or clear aria-label.
- Keyboard focus styles must remain visible.
- Sentence highlighting should not remove word button focusability.

## Testing And Verification

Automated checks:

- Unit tests for default highlight extraction from chapter data.
- Unit tests for applying a color to an unhighlighted sentence.
- Unit tests for clicking the same color to remove the highlight.
- Unit tests for changing an existing highlight to another color.
- Unit tests for clear mode removal.
- Layout contract tests confirming:
  - Topbar receives color controls.
  - Reading paper receives highlight state.
  - Sentence click event exists.
  - Word token clicks still use `@click.stop`.
  - Production Reader files are not part of this feature path.

Manual browser checks:

- Open `/reader-prototype`.
- Confirm existing default highlighted sentence appears.
- Turn highlighter mode on and apply yellow, green, blue, pink, and purple to different sentences.
- Change a highlighted sentence from one color to another.
- Click the same color again to remove a highlight.
- Use clear mode to remove a highlight.
- Click a word inside highlighter mode and confirm the word definition panel still opens.
- Toggle show/hide highlights and confirm state is hidden, then restored visually.
- Switch chapters and return to confirm session state is preserved.
- Refresh the page and confirm state resets to defaults.

Run:

```bash
npm test
npm run build
```

## Acceptance Criteria

- `/reader-prototype` contains a visible, compact highlighter control in the top toolbar.
- Users can choose a preset color and apply it to a full sentence.
- Users can change or remove a sentence highlight.
- Users can hide and show highlights without deleting them.
- Word definition interactions still work while highlighter mode is active.
- Highlight state is kept only in memory and resets on refresh.
- No production Reader behavior changes.
- No localStorage, backend, AI, translation, summary, or vocabulary behavior changes.
