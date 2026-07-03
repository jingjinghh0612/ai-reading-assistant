import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import {
  IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY,
  appendImportedPrototypeBook,
  createImportedPrototypeBookFromText,
  getImportedPrototypeChapterContentById,
  loadImportedPrototypeBooks,
  removeImportedPrototypeBook,
  saveImportedPrototypeBooks,
} from './prototypeBookImport.js'

function installLocalStorage() {
  const store = new Map()
  let shouldThrowOnSet = false

  globalThis.localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      if (shouldThrowOnSet) {
        throw new Error('Storage unavailable')
      }

      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    setThrowOnSet(value) {
      shouldThrowOnSet = Boolean(value)
    },
  }
}

describe('prototype book import utilities', () => {
  beforeEach(() => {
    installLocalStorage()
  })

  it('creates a real local book with chapters from imported file text', () => {
    const book = createImportedPrototypeBookFromText({
      id: 'imported-book-1',
      title: 'Alice Notes',
      sourceType: 'epub',
      fileName: 'alice-notes.epub',
      text: 'Chapter 1\nThe garden opened. It was bright.\n\nChapter 2: Rain\nRain came. People waited.',
    })

    assert.equal(book.id, 'imported-book-1')
    assert.equal(book.title, 'Alice Notes')
    assert.equal(book.isImported, true)
    assert.equal(book.meta, '本地导入 · EPUB')
    assert.equal(book.initials, 'AN')
    assert.equal(book.chapters.length, 2)
    assert.equal(book.chapters[0].id, 'imported-book-1-chapter-1')
    assert.equal(book.chapters[0].title, 'Chapter 1')
    assert.equal(book.chapters[0].sentenceCount, 2)
    assert.equal(book.chapterContents['imported-book-1-chapter-2'].title, 'Chapter 2: Rain')
    assert.deepEqual(
      book.chapterContents['imported-book-1-chapter-2'].paragraphs[0].sentences.map((sentence) => sentence.text),
      ['Rain came.', 'People waited.'],
    )
  })

  it('uses one imported chapter when the file has no explicit headings', () => {
    const book = createImportedPrototypeBookFromText({
      id: 'imported-book-2',
      title: 'Plain PDF',
      sourceType: 'pdf',
      fileName: 'plain.pdf',
      text: 'First imported sentence. Second imported sentence.',
    })

    assert.equal(book.chapters.length, 1)
    assert.equal(book.chapters[0].title, 'Plain PDF')
    assert.equal(book.chapters[0].sentenceCount, 2)

    const tokens = book.chapterContents['imported-book-2-chapter-1'].paragraphs[0].sentences[0].tokens
    assert.ok(tokens.some((token) => token.wordKey === 'first'))
    assert.ok(tokens.some((token) => token.wordKey === 'imported'))
  })

  it('keeps readable single-line paragraph breaks in imported books', () => {
    const book = createImportedPrototypeBookFromText({
      id: 'imported-line-paragraphs',
      title: 'Line Paragraphs',
      sourceType: 'epub',
      fileName: 'line-paragraphs.epub',
      text: 'First paragraph ends here.\nSecond paragraph asks why?\nThis line wraps without ending\nand should stay together.',
    })

    const paragraphs = book.chapterContents['imported-line-paragraphs-chapter-1'].paragraphs

    assert.equal(paragraphs.length, 3)
    assert.deepEqual(
      paragraphs.map((paragraph) => paragraph.sentences.map((sentence) => sentence.text).join(' ')),
      [
        'First paragraph ends here.',
        'Second paragraph asks why?',
        'This line wraps without ending and should stay together.',
      ],
    )
  })

  it('persists imported books without mixing them into prototype fixture data', () => {
    const book = createImportedPrototypeBookFromText({
      id: 'imported-book-3',
      title: 'Stored Book',
      sourceType: 'epub',
      fileName: 'stored.epub',
      text: 'Chapter 1\nStored text.',
    })

    const saved = saveImportedPrototypeBooks([book])
    const loaded = loadImportedPrototypeBooks()
    const contentById = getImportedPrototypeChapterContentById(loaded)

    assert.equal(saved, true)
    assert.equal(JSON.parse(localStorage.getItem(IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY)).length, 1)
    assert.equal(loaded[0].title, 'Stored Book')
    assert.equal(contentById['imported-book-3-chapter-1'].title, 'Chapter 1')
  })

  it('prepends a new imported book and reports storage failures', () => {
    const firstBook = createImportedPrototypeBookFromText({
      id: 'imported-first',
      title: 'First Book',
      sourceType: 'pdf',
      fileName: 'first.pdf',
      text: 'First text.',
    })
    const nextBook = createImportedPrototypeBookFromText({
      id: 'imported-next',
      title: 'Next Book',
      sourceType: 'pdf',
      fileName: 'next.pdf',
      text: 'Next text.',
    })

    saveImportedPrototypeBooks([firstBook])

    const result = appendImportedPrototypeBook(nextBook)

    assert.equal(result.ok, true)
    assert.deepEqual(
      result.books.map((book) => book.id),
      ['imported-next', 'imported-first'],
    )

    localStorage.setThrowOnSet(true)

    const failedResult = appendImportedPrototypeBook(firstBook)

    assert.equal(failedResult.ok, false)
    assert.equal(failedResult.books.length, 2)
  })

  it('deletes an imported book from local storage without touching the remaining books', () => {
    const firstBook = createImportedPrototypeBookFromText({
      id: 'imported-delete-first',
      title: 'Delete First',
      sourceType: 'pdf',
      fileName: 'delete-first.pdf',
      text: 'First book text.',
    })
    const secondBook = createImportedPrototypeBookFromText({
      id: 'imported-delete-second',
      title: 'Delete Second',
      sourceType: 'epub',
      fileName: 'delete-second.epub',
      text: 'Second book text.',
    })

    saveImportedPrototypeBooks([firstBook, secondBook])

    const result = removeImportedPrototypeBook('imported-delete-first')
    const storedBooks = JSON.parse(localStorage.getItem(IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY))

    assert.equal(result.deleted, true)
    assert.deepEqual(
      result.books.map((book) => book.id),
      ['imported-delete-second'],
    )
    assert.deepEqual(
      storedBooks.map((book) => book.id),
      ['imported-delete-second'],
    )

    const missingResult = removeImportedPrototypeBook('missing-book')

    assert.equal(missingResult.deleted, false)
    assert.deepEqual(
      missingResult.books.map((book) => book.id),
      ['imported-delete-second'],
    )
  })

  it('reports storage failures when deleting an imported book', () => {
    const book = createImportedPrototypeBookFromText({
      id: 'imported-delete-failure',
      title: 'Delete Failure',
      sourceType: 'pdf',
      fileName: 'delete-failure.pdf',
      text: 'Failure text.',
    })

    saveImportedPrototypeBooks([book])
    localStorage.setThrowOnSet(true)

    const result = removeImportedPrototypeBook('imported-delete-failure')

    assert.equal(result.deleted, false)
    assert.equal(result.books.length, 1)
    assert.equal(result.books[0].id, 'imported-delete-failure')
  })
})
