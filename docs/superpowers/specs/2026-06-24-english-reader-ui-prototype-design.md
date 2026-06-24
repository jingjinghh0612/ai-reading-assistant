# English Reader UI Prototype Design

## Goal

Add a standalone static reader prototype for the English reading website. The prototype should translate the reference screenshot's dense document workspace into an English learning experience without adding PDF behavior, real AI, real data, or text import.

The new page must not replace or alter the behavior of the existing Home, Reader, Vocabulary, or Review pages.

## Confirmed Direction

The selected visual direction is **B: compact, reading-first workspace**.

- Keep the three-column desktop structure from the reference.
- Use narrower sidebars so the bilingual reading content remains the visual focus.
- Preserve a dense, work-oriented interface rather than a marketing layout.
- Use white surfaces, cool gray borders, restrained shadows, and one blue accent.
- Keep card radii between 6px and 8px.
- Use serif typography only for English reading content; use the existing system sans stack for application controls and Chinese translation.

## Route And Isolation

Add a new route:

- Path: /reader-prototype
- Name: reader-prototype
- Component: src/pages/ReaderPrototype.vue
- Route metadata: marks the page as a standalone workspace.

The existing App.vue shell currently renders one global header around every route. Add a route-aware standalone branch so /reader-prototype renders its own full-height shell while every existing route continues through the current header and main container unchanged.

All prototype-specific styles live in src/reader-prototype.css. The page imports that stylesheet directly. Existing styles in src/style.css remain unchanged unless a minimal global compatibility fix is proven necessary.

## Page Structure

### Top Navigation

The prototype owns a 60px top bar.

- Left: compact AI mark and the application name AI Reading.
- Center: current book title, The Little Prince · Antoine de Saint-Exupéry.
- Right: search, import text, settings, and avatar controls.

All controls are visually active but static. Clicking them does not open dialogs, import files, change settings, or navigate.

### Left Library And Chapter Rail

The left rail is approximately 220px wide on large desktop screens.

It contains:

- 我的书架 heading.
- One static book summary card with cover treatment, author, chapter count, and 68% progress.
- A compact reading progress bar.
- Five chapter cards.
- The second chapter highlighted as the current chapter.
- Completed, current, and not-started status text.

The chapter items use 6px to 8px radius, thin borders, and compact spacing. The current chapter uses a blue-tinted background, blue border, and left indicator.

### Main Reading Area

The center column is the largest grid track and uses a cool gray canvas around a white reading paper.

The reading paper contains:

- Chapter eyebrow and title.
- Reading time and level metadata.
- Three English paragraphs.
- A Chinese translation directly below every English paragraph.
- One sentence highlighted with a pale yellow marker treatment.

English content uses Georgia or the existing reader serif stack at a comfortable line height. Chinese translations use the application sans stack, smaller type, muted color, and a subtle left rule.

### Floating Notes Bar

A notes bar floats above the bottom of the center reading area.

- 笔记 label.
- Static placeholder text.
- 保存笔记 button.

The notes bar is a visual prototype only. It does not accept or store content.

### AI Reading Assistant

The right rail is approximately 310px wide on large desktop screens.

It contains:

- AI 阅读助手 title and short subtitle.
- A three-option segmented control: 当前句子, 当前段落, 全文.
- 当前句子 shown as the selected static state.
- Four recommended question cards:
  - 解释这句话
  - 提取生词
  - 总结本段
  - 生成阅读理解题
- A static input area with send icon at the bottom.

Question cards are compact, bordered rows with a numbered marker, title, short description, and chevron. They do not trigger AI requests.

## Static Data And Behavior

All displayed data is local markup or local constants inside ReaderPrototype.vue.

Allowed prototype behavior:

- Native hover, focus, and active visual feedback.
- Responsive layout changes.
- Accessible button labels and visible keyboard focus.

Explicitly excluded:

- API calls.
- AI responses.
- File or text import.
- Search.
- Settings persistence.
- Chapter navigation.
- Note editing or saving.
- Real progress calculations.
- Reading data from localStorage or route query parameters.

The prototype must not import existing translation, summary, vocabulary, article-history, storage, or AI modules.

## Responsive Design

### Wide Desktop

At widths above approximately 1180px:

- Fixed three-column grid: 220px / flexible center / 310px.
- Full-height workspace below the 60px top bar.
- Each column scrolls independently only if its content exceeds the viewport.

### Compact Desktop And Tablet

Between approximately 760px and 1179px:

- Top actions may simplify to icon-only buttons where labels no longer fit.
- The left rail narrows.
- The AI assistant moves below the reading area if three readable columns no longer fit.
- The reading column remains first in visual priority.

### Mobile

Below approximately 760px:

- Top bar wraps into a compact two-row layout.
- Main content becomes one column.
- Order: book and progress summary, reading paper, notes bar, AI assistant, chapter list.
- The notes bar becomes a normal in-flow control rather than a viewport overlay.
- No horizontal page scrolling.
- Buttons keep at least a 40px touch target.

## Accessibility

- Use semantic header, main, aside, nav, article, and button elements.
- Provide aria-label text for icon-only controls.
- Keep the current chapter and current AI context programmatically identifiable.
- Preserve visible focus states.
- Maintain readable color contrast for text, borders, and controls.
- Respect prefers-reduced-motion; the page needs no essential animation.

## Visual Assets And Icons

The page does not require photography or generated artwork because it is a dense operational reading tool. The book cover may use a simple CSS color treatment rather than a decorative illustration.

Use one established icon family for search, import, settings, chevrons, send, and book-related controls. Because the project currently has no suitable application icon package, add lucide-vue-next rather than drawing SVG paths manually.

## File Changes

Create:

- src/pages/ReaderPrototype.vue
- src/reader-prototype.css
- src/pages/ReaderPrototype.layout.test.js

Modify:

- src/router/index.js to register /reader-prototype.
- src/App.vue to render standalone routes without the existing global header.
- package.json and package-lock.json to add lucide-vue-next.

Do not modify:

- Existing page components.
- Existing API or server modules.
- Existing reading, translation, vocabulary, review, or storage utilities.
- Existing prototype-independent styling behavior.

## Testing And Verification

Automated checks:

- Route test confirms /reader-prototype is registered.
- Layout contract test confirms the page includes all three columns, three bilingual paragraph pairs, the highlighted sentence, floating notes bar, AI context options, and four required questions.
- Isolation test confirms the prototype does not import API, storage, translation, summary, vocabulary, or article-history modules.
- Production build succeeds.
- Existing test suite remains green.

Browser checks:

- Desktop viewport around 1440x900 shows the full three-column workspace without overlap.
- Tablet viewport around 1024x768 keeps the reading paper usable and moves the AI rail when required.
- Mobile viewport around 390x844 has no horizontal overflow or text/button overlap.
- Top controls, chapter cards, and question rows have visible hover/focus states.
- Existing routes retain their current global header and layout.

## Acceptance Criteria

- /reader-prototype opens as an independent static full-height reader workspace.
- Existing routes and functions behave exactly as before.
- The desktop page clearly presents a top navigation bar and three-column English learning layout.
- Every English paragraph has a Chinese translation below it.
- One sentence is visibly highlighted.
- The notes bar floats at the bottom of the desktop reading area.
- The AI assistant shows all three context choices and all four specified questions.
- No real AI, data, import, search, settings, notes, or navigation behavior is implemented.
- Prototype styles are isolated in src/reader-prototype.css.
- Desktop, tablet, and mobile layouts remain readable without overlap.
