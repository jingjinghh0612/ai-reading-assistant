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

function installIndexedDB() {
  const databases = new Map()

  function createRequest() {
    return {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    }
  }

  function succeedRequest(request, result) {
    queueMicrotask(() => {
      request.result = result
      request.onsuccess?.({ target: request })
    })
    return request
  }

  function createDatabase(state) {
    return {
      objectStoreNames: {
        contains(name) {
          return state.stores.has(name)
        },
      },
      createObjectStore(name, options = {}) {
        const store = {
          keyPath: options.keyPath || 'id',
          records: new Map(),
        }

        state.stores.set(name, store)
        return createObjectStore(store)
      },
      transaction(storeNames) {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames]

        return {
          objectStore(name) {
            if (!names.includes(name) || !state.stores.has(name)) {
              throw new Error(`Missing object store: ${name}`)
            }

            return createObjectStore(state.stores.get(name))
          },
        }
      },
      close() {},
    }
  }

  function createObjectStore(store) {
    return {
      get(key) {
        return succeedRequest(createRequest(), store.records.get(key))
      },
      getAll() {
        return succeedRequest(createRequest(), Array.from(store.records.values()))
      },
      put(value) {
        const key = value?.[store.keyPath]

        if (!key) {
          throw new Error(`Missing keyPath: ${store.keyPath}`)
        }

        store.records.set(key, structuredClone(value))
        return succeedRequest(createRequest(), key)
      },
      delete(key) {
        store.records.delete(key)
        return succeedRequest(createRequest(), undefined)
      },
      clear() {
        store.records.clear()
        return succeedRequest(createRequest(), undefined)
      },
    }
  }

  globalThis.indexedDB = {
    open(name) {
      const request = createRequest()

      queueMicrotask(() => {
        let state = databases.get(name)
        const isNewDatabase = !state

        if (!state) {
          state = {
            stores: new Map(),
          }
          databases.set(name, state)
        }

        request.result = createDatabase(state)

        if (isNewDatabase) {
          request.onupgradeneeded?.({ target: request, oldVersion: 0 })
        }

        request.onsuccess?.({ target: request })
      })

      return request
    },
  }
}

describe('prototype book import utilities', () => {
  beforeEach(() => {
    installLocalStorage()
    installIndexedDB()
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

  it('persists imported books in IndexedDB without depending on localStorage capacity', async () => {
    const book = createImportedPrototypeBookFromText({
      id: 'imported-book-3',
      title: 'Stored Book',
      sourceType: 'epub',
      fileName: 'stored.epub',
      text: 'Chapter 1\nStored text.',
    })

    localStorage.setThrowOnSet(true)

    const saved = await saveImportedPrototypeBooks([book])
    const loaded = await loadImportedPrototypeBooks()
    const contentById = getImportedPrototypeChapterContentById(loaded)

    assert.equal(saved, true)
    assert.equal(localStorage.getItem(IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY), null)
    assert.equal(loaded[0].title, 'Stored Book')
    assert.equal(contentById['imported-book-3-chapter-1'].title, 'Chapter 1')
  })

  it('migrates legacy localStorage imported books into IndexedDB on first load', async () => {
    const book = createImportedPrototypeBookFromText({
      id: 'legacy-imported-book',
      title: 'Legacy Book',
      sourceType: 'pdf',
      fileName: 'legacy.pdf',
      text: 'Legacy stored text.',
    })

    localStorage.setItem(IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY, JSON.stringify([book]))

    const loaded = await loadImportedPrototypeBooks()

    localStorage.removeItem(IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY)

    const loadedAfterLegacyRemoval = await loadImportedPrototypeBooks()

    assert.equal(loaded[0].id, 'legacy-imported-book')
    assert.deepEqual(
      loadedAfterLegacyRemoval.map((item) => item.id),
      ['legacy-imported-book'],
    )
  })

  it('prepends a new imported book in IndexedDB when localStorage cannot grow', async () => {
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

    await saveImportedPrototypeBooks([firstBook])
    localStorage.setThrowOnSet(true)

    const result = await appendImportedPrototypeBook(nextBook)

    assert.equal(result.ok, true)
    assert.deepEqual(
      result.books.map((book) => book.id),
      ['imported-next', 'imported-first'],
    )
  })

  it('deletes an imported book from IndexedDB without touching the remaining books', async () => {
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

    await saveImportedPrototypeBooks([firstBook, secondBook])

    const result = await removeImportedPrototypeBook('imported-delete-first')
    const storedBooks = await loadImportedPrototypeBooks()

    assert.equal(result.deleted, true)
    assert.deepEqual(
      result.books.map((book) => book.id),
      ['imported-delete-second'],
    )
    assert.deepEqual(
      storedBooks.map((book) => book.id),
      ['imported-delete-second'],
    )

    const missingResult = await removeImportedPrototypeBook('missing-book')

    assert.equal(missingResult.deleted, false)
    assert.deepEqual(
      missingResult.books.map((book) => book.id),
      ['imported-delete-second'],
    )
  })

  it('reports storage failures when IndexedDB is unavailable', async () => {
    delete globalThis.indexedDB

    const book = createImportedPrototypeBookFromText({
      id: 'imported-storage-failure',
      title: 'Storage Failure',
      sourceType: 'pdf',
      fileName: 'storage-failure.pdf',
      text: 'Failure text.',
    })

    const appendResult = await appendImportedPrototypeBook(book)
    const deleteResult = await removeImportedPrototypeBook('imported-storage-failure')

    assert.equal(appendResult.ok, false)
    assert.deepEqual(appendResult.books, [])
    assert.equal(deleteResult.deleted, false)
    assert.deepEqual(deleteResult.books, [])
  })
})
