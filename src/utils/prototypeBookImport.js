import { splitIntoSentences } from './sentence.js'
import { getStorageItem, setStorageItem } from './storage.js'
import { splitPrototypeReadableParagraphs } from './prototypeParagraphs.js'
import { normalizeWord, splitSentenceIntoTokens } from './word.js'

export const IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY = 'ai-reading:reader-prototype:imported-books'

export function createImportedPrototypeBookFromText({
  id,
  title,
  sourceType = 'file',
  fileName = '',
  text,
  chapters,
} = {}) {
  const cleanTitle = String(title || fileName || 'Imported Book').trim() || 'Imported Book'
  const cleanText = String(text || '').trim()
  const parsedChapters = Array.isArray(chapters)
    ? chapters
        .map((chapter, index) => ({
          title: String(chapter?.title || `Chapter ${index + 1}`).trim() || `Chapter ${index + 1}`,
          text: String(chapter?.text || '').trim(),
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
    const chapterContent = createImportedPrototypeChapterContent({
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

export function loadImportedPrototypeBooks() {
  const rawValue = getStorageItem(IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY, '[]')

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

export function saveImportedPrototypeBooks(books) {
  return setStorageItem(IMPORTED_PROTOTYPE_BOOKS_STORAGE_KEY, JSON.stringify(Array.isArray(books) ? books : []))
}

export function appendImportedPrototypeBook(book) {
  const existingBooks = loadImportedPrototypeBooks()

  if (!book) {
    return {
      ok: false,
      books: existingBooks,
    }
  }

  const nextBooks = [book, ...existingBooks.filter((item) => item.id !== book.id)]

  if (!saveImportedPrototypeBooks(nextBooks)) {
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

export function removeImportedPrototypeBook(bookId) {
  const existingBooks = loadImportedPrototypeBooks()
  const nextBooks = existingBooks.filter((book) => book.id !== bookId)

  if (nextBooks.length === existingBooks.length) {
    return {
      deleted: false,
      books: existingBooks,
    }
  }

  if (!saveImportedPrototypeBooks(nextBooks)) {
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

export function getImportedPrototypeChapterContentById(books) {
  const contentById = {}

  for (const book of books || []) {
    for (const [chapterId, chapterContent] of Object.entries(book?.chapterContents || {})) {
      contentById[chapterId] = chapterContent
    }
  }

  return contentById
}

function createImportedPrototypeChapterContent({ bookId, chapterId, number, title, text }) {
  const paragraphTexts = splitPrototypeReadableParagraphs(text)

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

  return {
    ...book,
    meta: book.meta || `本地导入 · ${String(book.sourceType || 'file').toUpperCase()}`,
    initials: book.initials || createBookInitials(book.title),
    tone: book.tone || 'blue',
    progress: Number.isFinite(book.progress) ? book.progress : 0,
    isImported: true,
    chapterContents: book.chapterContents || {},
  }
}
