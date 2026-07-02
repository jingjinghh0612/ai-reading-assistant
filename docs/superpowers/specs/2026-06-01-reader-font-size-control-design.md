# Reader Font Size Control Design

## Goal

Add a compact font size control for reading content on the Reader page.

## Scope

The control affects only the reading text:

- English sentence text in the left article list.
- The selected sentence shown in the right panel.

The control does not affect navigation, buttons, translations, summaries, vocabulary explanations, or other application chrome.

## User Experience

Place a small control in the English article header using `A-` and `A+` buttons with the current pixel value between them. The default size is `18px`. Users can decrease or increase the size in `2px` steps within a bounded range of `16px` to `24px`.

Disable the decrease button at `16px` and the increase button at `24px`. Persist the selected size in browser storage so the Reader page keeps the user's preference across sessions.

## Architecture

Create a focused `readerFontSize` utility that owns the storage key, default value, range, step, normalization, and next-size calculations. Reader page state initializes from that utility and stores changes through it.

Use a CSS custom property on the Reader layout to apply the chosen font size to both `.sentence-content` and `.selected-sentence`. The `SentenceViewer` component receives the current size and button availability from `Reader.vue`, and emits increase/decrease events back to the page.

## Testing

Add node tests for the utility behavior:

- Stored valid values are restored.
- Invalid stored values fall back to the default.
- Too-small and too-large values are clamped.
- Increase and decrease operations step by `2px` and clamp at the bounds.

Run the focused test, then the full unit test suite, then a production build. After the build passes, verify the Reader page visually in the browser at desktop and mobile widths.
