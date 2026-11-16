import { splitIntoSentences } from './sentence.js'
import { getStorageItem } from './storage.js'
import { splitReadableParagraphs } from './paragraphs.js'
import { normalizeWord, splitSentenceIntoTokens } from './word.js'
import { decodeXmlText } from './bookFileParser.js'

// 浏览器按这些固定字符串查找书架数据，保留原值以读取已有书籍。
export const LEGACY_IMPORTED_BOOKS_STORAGE_KEY = 'ai-reading:reader-prototype:imported-books'
const IMPORTED_BOOKS_DB_NAME = 'ai-reading-reader-prototype'
const IMPORTED_BOOKS_DB_VERSION = 1
const IMPORTED_BOOKS_STORE_NAME = 'importedBooks'
const IMPORTED_BOOKS_META_STORE_NAME = 'metadata'
const IMPORTED_BOOKS_ORDER_KEY = 'bookOrder'
let importedBooksDatabasePromise = null
let importedBooksIndexedDbReference = null

export function createImportedBookFromText({
  id,
  title,
  sourceType = 'file',
  fileName = '',
  text,
  chapters,
} = {}) {
  const cleanTitle = decodeImportedText(title || fileName || 'Imported Book') || 'Imported Book'
  const cleanText = decodeImportedText(text, { preserveLineBreaks: true }).trim()
  const parsedChapters = Array.isArray(chapters)
    ? chapters
        .map((chapter, index) => ({
          title: decodeImportedText(chapter?.title || `Chapter ${index + 1}`) || `Chapter ${index + 1}`,
          text: decodeImportedText(chapter?.text, { preserveLineBreaks: true }).trim(),
        }))
        .filter((chapter) => chapter.text)
    : []

  if (!cleanText && !parsedChapters.length) {
    return null
  }

  const bookId = id || createImportedBookId(cleanTitle, fileName, cleanText)
  const chapterBlocks = parsedChapters.length ? parsedChapters : splitImportedTextIntoChapterBlocks(cleanText, cleanTitle)
  const chapterContents = {}
  const bookChapters = chapterBlocks.map((chapterBlock, chapterIndex) => {
    const chapterNumber = String(chapterIndex + 1).padStart(2, '0')
    const chapterId = `${bookId}-chapter-${chapterIndex + 1}`
    const chapterContent = createImportedChapterContent({
      bookId,
      chapterId,
      number: chapterNumber,
      title: chapterBlock.title,
      text: chapterBlock.text,
    })

    chapterContents[chapterId] = chapterContent

    return {
      id: chapterId,
      number: chapterNumber,
      title: chapterBlock.title,
      status: chapterIndex === 0 ? '当前章节' : '待阅读',
      sentenceCount: countChapterSentences(chapterContent),
      level: 'Local',
      progress: chapterIndex === 0 ? 0 : 0,
    }
  })

  return {
    id: bookId,
    title: cleanTitle,
    meta: `本地导入 · ${String(sourceType || 'file').toUpperCase()}`,
    initials: createBookInitials(cleanTitle),
    tone: 'blue',
    progress: 0,
    sourceType,
    fileName,
    isImported: true,
    importedAt: new Date().toISOString(),
    chapters: bookChapters,
    chapterContents,
  }
}

export function splitImportedTextIntoChapterBlocks(text, fallbackTitle = 'Imported Book') {
  const content = String(text || '').replace(/\r\n?/g, '\n').trim()

  if (!content) {
    return []
  }

  const lines = content.split('\n')
  const blocks = []
  let currentBlock = null
  let sawExplicitHeading = false

  for (const line of lines) {
    const trimmedLine = line.trim()
    const heading = getImportedChapterHeading(trimmedLine)

    if (heading) {
      sawExplicitHeading = true

      if (currentBlock?.lines.some((item) => item.trim())) {
        blocks.push(currentBlock)
      }

      currentBlock = {
        title: heading,
        lines: [],
      }
      continue
    }

    if (!currentBlock) {
      currentBlock = {
        title: fallbackTitle,
        lines: [],
      }
    }

    currentBlock.lines.push(line)
  }

  if (currentBlock?.lines.some((item) => item.trim())) {
    blocks.push(currentBlock)
  }

  if (!sawExplicitHeading) {
    return [
      {
        title: fallbackTitle,
        text: content,
      },
    ]
  }

  return blocks.map((block, index) => ({
    title: block.title || `Chapter ${index + 1}`,
    text: block.lines.join('\n').trim(),
  }))
}

export async function loadImportedBooks() {
  const indexedDbBooks = await loadImportedBooksFromIndexedDb()

  if (indexedDbBooks) {
    const legacyBooks = loadLegacyImportedBooks()

    if (legacyBooks.length) {
      // 同一本书以 IndexedDB 中的版本为准，确认写入成功后才清理旧数据。
      const indexedDbBookIds = new Set(indexedDbBooks.map((book) => book.id))
      const migratedBooks = [
        ...legacyBooks.filter((book) => !indexedDbBookIds.has(book.id)),
        ...indexedDbBooks,
      ]

      if (await saveImportedBooks(migratedBooks)) {
        clearLegacyImportedBooks()
        return migratedBooks
      }
    }

    return indexedDbBooks
  }

  return loadLegacyImportedBooks()
}

function loadLegacyImportedBooks() {
  const rawValue = getStorageItem(LEGACY_IMPORTED_BOOKS_STORAGE_KEY, '[]')

  try {
    const parsedBooks = JSON.parse(rawValue)

    if (!Array.isArray(parsedBooks)) {
      return []
    }

    return parsedBooks.map(normalizeImportedBook).filter(Boolean)
  } catch {
    return []
  }
}

function clearLegacyImportedBooks() {
  try {
    localStorage.removeItem(LEGACY_IMPORTED_BOOKS_STORAGE_KEY)
  } catch {}
}

export async function saveImportedBooks(books) {
  const normalizedBooks = Array.isArray(books) ? books.map(normalizeImportedBook).filter(Boolean) : []
  const database = await openImportedBooksDatabase()

  if (!database) {
    return false
  }

  try {
    await clearObjectStore(database, IMPORTED_BOOKS_STORE_NAME)

    for (const book of normalizedBooks) {
      await putObjectStoreValue(database, IMPORTED_BOOKS_STORE_NAME, book)
    }

    await putObjectStoreValue(database, IMPORTED_BOOKS_META_STORE_NAME, {
      key: IMPORTED_BOOKS_ORDER_KEY,
      value: normalizedBooks.map((book) => book.id),
    })

    return true
  } catch {
    return false
  }
}

export async function appendImportedBook(book) {
  const existingBooks = await loadImportedBooks()

  if (!book) {
    return {
      ok: false,
      books: existingBooks,
    }
  }

  const nextBooks = [book, ...existingBooks.filter((item) => item.id !== book.id)]

  if (!(await saveImportedBooks(nextBooks))) {
    return {
      ok: false,
      books: existingBooks,
    }
  }

  return {
    ok: true,
    books: nextBooks,
  }
}

export async function removeImportedBook(bookId) {
  const existingBooks = await loadImportedBooks()
  const nextBooks = existingBooks.filter((book) => book.id !== bookId)

  if (nextBooks.length === existingBooks.length) {
    return {
      deleted: false,
      books: existingBooks,
    }
  }

  if (!(await saveImportedBooks(nextBooks))) {
    return {
      deleted: false,
      books: existingBooks,
    }
  }

  return {
    deleted: true,
    books: nextBooks,
  }
}

async function loadImportedBooksFromIndexedDb() {
  const database = await openImportedBooksDatabase()

  if (!database) {
    return null
  }

  try {
    const [books, orderRecord] = await Promise.all([
      getAllObjectStoreValues(database, IMPORTED_BOOKS_STORE_NAME),
      getObjectStoreValue(database, IMPORTED_BOOKS_META_STORE_NAME, IMPORTED_BOOKS_ORDER_KEY),
    ])
    const order = Array.isArray(orderRecord?.value) ? orderRecord.value : []

    return sortImportedBooksByStoredOrder(books.map(normalizeImportedBook).filter(Boolean), order)
  } catch {
    return null
  }
}

function sortImportedBooksByStoredOrder(books, order) {
  if (!order.length) {
    return [...books].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
  }

  const orderIndex = new Map(order.map((bookId, index) => [bookId, index]))

  return [...books].sort((a, b) => {
    const firstIndex = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER
    const secondIndex = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER

    if (firstIndex !== secondIndex) {
      return firstIndex - secondIndex
    }

    return new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
  })
}

async function openImportedBooksDatabase() {
  if (!globalThis.indexedDB?.open) {
    return null
  }

  if (importedBooksIndexedDbReference !== globalThis.indexedDB) {
    importedBooksIndexedDbReference = globalThis.indexedDB
    importedBooksDatabasePromise = null
  }

  if (!importedBooksDatabasePromise) {
    importedBooksDatabasePromise = new Promise((resolve) => {
      const request = indexedDB.open(IMPORTED_BOOKS_DB_NAME, IMPORTED_BOOKS_DB_VERSION)

      request.onupgradeneeded = (event) => {
        const database = event.target.result

        if (!database.objectStoreNames.contains(IMPORTED_BOOKS_STORE_NAME)) {
          database.createObjectStore(IMPORTED_BOOKS_STORE_NAME, { keyPath: 'id' })
        }

        if (!database.objectStoreNames.contains(IMPORTED_BOOKS_META_STORE_NAME)) {
          database.createObjectStore(IMPORTED_BOOKS_META_STORE_NAME, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        importedBooksDatabasePromise = null
        resolve(null)
      }
    })
  }

  return importedBooksDatabasePromise
}

function getObjectStore(database, storeName, mode = 'readonly') {
  return database.transaction(storeName, mode).objectStore(storeName)
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error || new Error('IndexedDB request failed.'))
    }
  })
}

function getObjectStoreValue(database, storeName, key) {
  return requestToPromise(getObjectStore(database, storeName).get(key))
}

function getAllObjectStoreValues(database, storeName) {
  return requestToPromise(getObjectStore(database, storeName).getAll())
}

function putObjectStoreValue(database, storeName, value) {
  return requestToPromise(getObjectStore(database, storeName, 'readwrite').put(value))
}

function clearObjectStore(database, storeName) {
  return requestToPromise(getObjectStore(database, storeName, 'readwrite').clear())
}

export function getImportedChapterContentById(books) {
  const contentById = {}

  for (const book of books || []) {
    for (const [chapterId, chapterContent] of Object.entries(book?.chapterContents || {})) {
      contentById[chapterId] = chapterContent
    }
  }

  return contentById
}

function createImportedChapterContent({ bookId, chapterId, number, title, text }) {
  const paragraphTexts = splitReadableParagraphs(text)

  return {
    id: chapterId,
    bookId,
    number,
    title,
    paragraphs: paragraphTexts.map((paragraphText, paragraphIndex) => {
      const paragraphId = `${chapterId}-p${paragraphIndex + 1}`
      const sentences = splitIntoSentences(paragraphText)

      return {
        id: paragraphId,
        active: paragraphIndex === 0,
        translation: '导入书籍暂未生成译文。',
        sentences: sentences.map((sentence, sentenceIndex) => {
          const sentenceId = `${paragraphId}-s${sentenceIndex + 1}`

          return {
            id: sentenceId,
            highlighted: false,
            text: sentence,
            translation: '',
            tokens: createImportedSentenceTokens(sentence, sentenceId),
          }
        }),
      }
    }),
  }
}

function createImportedSentenceTokens(sentence, sentenceId) {
  let tokenIndex = 0

  return splitSentenceIntoTokens(sentence).map((token) => {
    tokenIndex += 1

    const wordKey = normalizeWord(token)

    if (!wordKey) {
      return {
        id: `${sentenceId}-t${tokenIndex}`,
        text: token,
      }
    }

    return {
      id: `${sentenceId}-w${tokenIndex}`,
      text: token,
      surface: token,
      lemma: wordKey,
      wordKey,
      sentenceId,
    }
  })
}

function getImportedChapterHeading(line) {
  if (!line) {
    return ''
  }

  if (/^(chapter|chap\.?)\s+([0-9]+|[ivxlcdm]+)\b/i.test(line)) {
    return line
  }

  if (/^第\s*[\d一二三四五六七八九十百千万]+\s*章\b/.test(line)) {
    return line
  }

  return ''
}

function countChapterSentences(chapterContent) {
  return (chapterContent?.paragraphs || []).reduce(
    (total, paragraph) => total + (paragraph.sentences?.length || 0),
    0,
  )
}

function createBookInitials(title) {
  const words = String(title || '')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) {
    return 'IB'
  }

  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

function createImportedBookId(title, fileName, text) {
  return `imported-${hashImportedBook(`${title}|${fileName}|${text}`).toString(36)}`
}

function hashImportedBook(value) {
  let hash = 0

  for (const character of String(value || '')) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return hash
}

function normalizeImportedBook(book) {
  if (!book?.id || !book?.title || !Array.isArray(book.chapters)) {
    return null
  }

  const sourceType = String(book.sourceType || 'file')
  const title = decodeImportedText(book.title) || 'Imported Book'

  return {
    ...book,
    title,
    meta: decodeImportedText(book.meta) || `本地导入 · ${sourceType.toUpperCase()}`,
    chapters: book.chapters.map(normalizeImportedChapter),
    initials: book.initials || createBookInitials(title),
    tone: book.tone || 'blue',
    progress: Number.isFinite(book.progress) ? book.progress : 0,
    isImported: true,
    chapterContents: normalizeImportedChapterContents(book.chapterContents || {}),
  }
}

function normalizeImportedChapter(chapter, index) {
  return {
    ...chapter,
    title: decodeImportedText(chapter?.title || `Chapter ${index + 1}`) || `Chapter ${index + 1}`,
  }
}

function normalizeImportedChapterContents(chapterContents) {
  const normalizedContents = {}

  for (const [chapterId, chapterContent] of Object.entries(chapterContents || {})) {
    normalizedContents[chapterId] = {
      ...chapterContent,
      title: decodeImportedText(chapterContent?.title) || chapterContent?.title || 'Chapter',
      paragraphs: (chapterContent?.paragraphs || []).map(normalizeImportedParagraph),
    }
  }

  return normalizedContents
}

function normalizeImportedParagraph(paragraph) {
  return {
    ...paragraph,
    translation: decodeImportedText(paragraph?.translation),
    sentences: (paragraph?.sentences || []).map(normalizeImportedSentence),
  }
}

function normalizeImportedSentence(sentence) {
  const sentenceId = sentence?.id || 'sentence'
  const text = decodeImportedText(sentence?.text)

  return {
    ...sentence,
    id: sentenceId,
    text,
    translation: decodeImportedText(sentence?.translation),
    tokens: createImportedSentenceTokens(text, sentenceId),
  }
}

function decodeImportedText(value, options) {
  return decodeXmlText(value, options)
}
