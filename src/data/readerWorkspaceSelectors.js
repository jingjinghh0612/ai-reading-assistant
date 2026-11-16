import { splitIntoSentences } from '../utils/sentence.js'
import { splitReadableParagraphs } from '../utils/paragraphs.js'
import { normalizeWord, splitSentenceIntoTokens } from '../utils/word.js'

const PASTED_CHAPTER_ID = 'pasted-article'
const PASTED_BOOK_ID = 'pasted-book'
const TRANSLATION_PLACEHOLDER_PATTERNS = [
  /暂无译文/,
  /暂未生成译文/,
  /鏆傛湭鐢熸垚璇戞枃/,
  /no translation/i,
]

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isTranslationPlaceholder(value) {
  const text = normalizeText(value)

  return !text || TRANSLATION_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))
}

export function findBook(books, activeBookId) {
  return books.find((book) => book.id === activeBookId) || books[0] || null
}

export function getChapters(book) {
  return book?.chapters || []
}

export function findChapterContent(chapterContentById, activeChapterId, fallbackChapterId) {
  return chapterContentById[activeChapterId] || chapterContentById[fallbackChapterId] || null
}

export function findBookChapterContent(chapterContentById, book, activeChapterId, fallbackChapterId) {
  const chapters = getChapters(book)

  if (!chapters.length) {
    return null
  }

  const chapterIds = new Set(chapters.map((chapter) => chapter.id))

  if (chapterIds.has(activeChapterId) && chapterContentById[activeChapterId]) {
    return chapterContentById[activeChapterId]
  }

  if (chapterIds.has(fallbackChapterId) && chapterContentById[fallbackChapterId]) {
    return chapterContentById[fallbackChapterId]
  }

  const firstReadableChapter = chapters.find((chapter) => chapterContentById[chapter.id])

  return firstReadableChapter ? chapterContentById[firstReadableChapter.id] : null
}

export function findChapter(chapters, activeChapterId, chapterContent) {
  return (
    chapters.find((chapter) => chapter.id === activeChapterId) ||
    chapters.find((chapter) => chapter.id === chapterContent?.id) ||
    chapters[0] ||
    null
  )
}

export function getChapterParagraphs(chapterContent) {
  return chapterContent?.paragraphs || []
}

export function getParagraphSourceText(paragraph) {
  const sentenceText = (paragraph?.sentences || [])
    .map((sentence) => normalizeText(sentence.text))
    .filter(Boolean)
    .join(' ')

  return sentenceText || normalizeText(paragraph?.text)
}

export function getLocalParagraphTranslation(paragraph) {
  const paragraphTranslation = normalizeText(paragraph?.translation)

  if (paragraphTranslation && !isTranslationPlaceholder(paragraphTranslation)) {
    return paragraphTranslation
  }

  return (paragraph?.sentences || [])
    .map((sentence) => normalizeText(sentence.translation))
    .filter((translation) => translation && !isTranslationPlaceholder(translation))
    .join(' ')
}

export function getSentenceSourceText(sentence) {
  return normalizeText(sentence?.text)
}

export function getLocalSentenceTranslation(sentence) {
  const sentenceTranslation = normalizeText(sentence?.translation)

  return sentenceTranslation && !isTranslationPlaceholder(sentenceTranslation) ? sentenceTranslation : ''
}

export function createTranslationStateKey(chapterId, paragraphId, itemId) {
  return `${chapterId || 'chapter'}:${paragraphId || 'paragraph'}:${itemId || ''}`
}

export function getReadingProgress(book, chapter) {
  return {
    book: book?.progress || 0,
    chapter: chapter?.progress || 0,
  }
}

export function getChapterVocabulary(chapterContent, dictionary, sessionVocabularyWordKeys = []) {
  const vocabularyByKey = new Map()

  for (const paragraph of chapterContent?.paragraphs || []) {
    for (const sentence of paragraph.sentences || []) {
      for (const token of sentence.tokens || []) {
        if (!token.wordKey) {
          continue
        }

        const entry = dictionary?.[token.wordKey]
        const existingItem = vocabularyByKey.get(token.wordKey)

        if (existingItem) {
          existingItem.count += 1
          continue
        }

        const meaning = entry?.meanings
          ?.map((item) => item.zh)
          .filter(Boolean)
          .join('; ')

        vocabularyByKey.set(token.wordKey, {
          wordKey: token.wordKey,
          word: token.surface || token.text || entry?.display || entry?.lemma || token.wordKey,
          lemma: entry?.lemma || token.lemma || token.wordKey,
          partOfSpeech: entry?.partOfSpeech || '',
          meaning: meaning || '',
          count: 1,
          isAdded: sessionVocabularyWordKeys.includes(token.wordKey),
          selection: {
            wordKey: token.wordKey,
            surface: token.surface || token.text || '',
            sentenceId: token.sentenceId || sentence.id,
          },
        })
      }
    }
  }

  return Array.from(vocabularyByKey.values())
}

export function getSessionVocabulary(chapterContent, dictionary, sessionVocabularyWordKeys = []) {
  const chapterVocabularyByKey = new Map(
    getChapterVocabulary(chapterContent, dictionary, sessionVocabularyWordKeys).map((item) => [item.wordKey, item]),
  )
  const seenWordKeys = new Set()

  return sessionVocabularyWordKeys
    .filter((wordKey) => {
      if (seenWordKeys.has(wordKey)) {
        return false
      }

      seenWordKeys.add(wordKey)
      return true
    })
    .map((wordKey) => {
      const chapterItem = chapterVocabularyByKey.get(wordKey)

      if (chapterItem) {
        return {
          ...chapterItem,
          isAdded: true,
        }
      }

      const entry = dictionary?.[wordKey]
      const meaning = entry?.meanings
        ?.map((item) => item.zh)
        .filter(Boolean)
        .join('; ')
      const word = entry?.display || entry?.lemma || wordKey

      return {
        wordKey,
        word,
        lemma: entry?.lemma || wordKey,
        partOfSpeech: entry?.partOfSpeech || '',
        meaning: meaning || '',
        count: 0,
        isAdded: true,
        selection: {
          wordKey,
          surface: word,
          sentenceId: '',
        },
      }
    })
}

export function getClickableSentenceTokens(sentence) {
  return (sentence?.tokens || []).flatMap((token) => {
    const sentenceId = token.sentenceId || sentence?.id || ''

    if (token.wordKey) {
      return [
        {
          ...token,
          sentenceId,
        },
      ]
    }

    return splitTextTokenForClicks(token, sentenceId)
  })
}

function splitTextTokenForClicks(token, sentenceId) {
  const sourceText = typeof token?.text === 'string' ? token.text : ''

  if (!sourceText) {
    return []
  }

  const tokenBaseId = token?.id || `${sentenceId || 'sentence'}-token`

  return splitSentenceIntoTokens(sourceText).map((text, index) => {
    const tokenIndex = index + 1
    const wordKey = normalizeWord(text)

    if (!wordKey) {
      return {
        id: `${tokenBaseId}-t${tokenIndex}`,
        text,
      }
    }

    return {
      id: `${tokenBaseId}-w${tokenIndex}`,
      text,
      surface: text,
      lemma: wordKey,
      wordKey,
      sentenceId,
      isGenerated: true,
    }
  })
}

export function getWordContext(chapterContent, selection) {
  if (!chapterContent || !selection?.wordKey) {
    return null
  }

  for (const paragraph of chapterContent.paragraphs || []) {
    for (const sentence of paragraph.sentences || []) {
      if (selection.sentenceId && sentence.id !== selection.sentenceId) {
        continue
      }

      const token = sentence.tokens?.find((item) => item.wordKey === selection.wordKey)
      if (!token && sentence.id !== selection.sentenceId) {
        continue
      }

      return {
        wordKey: selection.wordKey,
        surface: selection.surface || token?.surface || token?.text || '',
        paragraphId: paragraph.id,
        sentenceId: sentence.id,
        sourceSentence: sentence.text || '',
        sourceTranslation: sentence.translation || paragraph.translation || '',
      }
    }
  }

  return {
    wordKey: selection.wordKey,
    surface: selection.surface || '',
    paragraphId: '',
    sentenceId: selection.sentenceId || '',
    sourceSentence: '',
    sourceTranslation: '',
  }
}

export function mapDictionaryEntryToWordPanel(entry, context = null) {
  if (!entry) {
    if (!context) {
      return null
    }

    return {
      word: context.surface || context.wordKey || '',
      lemma: context.wordKey || normalizeWord(context.surface || ''),
      phonetic: '',
      partOfSpeech: '',
      meaning: '暂无本地释义',
      explanation: '',
      example: '',
      exampleTranslation: '',
      forms: [],
      sourceSentence: context.sourceSentence || '',
      sourceTranslation: context.sourceTranslation || '',
    }
  }

  const firstExample = entry.examples?.[0]
  const meaning = entry.meanings
    ?.map((item) => item.zh)
    .filter(Boolean)
    .join('；')

  return {
    word: context?.surface || entry.display || entry.lemma,
    lemma: entry.lemma || entry.display || '',
    phonetic: entry.phonetic || '',
    partOfSpeech: entry.partOfSpeech || '',
    meaning: meaning || '',
    explanation: entry.explanation || entry.meanings?.[0]?.usage || '',
    example: firstExample?.en || '',
    exampleTranslation: firstExample?.zh || '',
    forms: entry.forms || [],
    sourceSentence: context?.sourceSentence || entry.sourceSentence || '',
    sourceTranslation: context?.sourceTranslation || '',
  }
}

export function mapWordLookupDetailToWordPanel(detail, context = null) {
  if (!detail && !context) {
    return null
  }

  const word = normalizeText(context?.surface) || normalizeText(detail?.word) || context?.wordKey || ''
  const lemma = normalizeWord(context?.wordKey || detail?.word || word)

  return {
    word,
    lemma,
    phonetic: '',
    partOfSpeech: normalizeText(detail?.partOfSpeech),
    meaning: normalizeText(detail?.meaning),
    explanation: normalizeText(detail?.definition),
    example: normalizeText(detail?.example),
    exampleTranslation: '',
    forms: [],
    sourceSentence: normalizeText(context?.sourceSentence),
    sourceTranslation: normalizeText(context?.sourceTranslation),
  }
}

export function getDefaultHighlights(chapterContent, defaultColorId = 'yellow') {
  const highlights = {}

  for (const paragraph of chapterContent?.paragraphs || []) {
    for (const sentence of paragraph.sentences || []) {
      if (sentence?.highlighted && sentence.id) {
        highlights[sentence.id] = defaultColorId
      }
    }
  }

  return highlights
}

export function getChapterHighlights(highlightsByChapter, chapterId) {
  return {
    ...(highlightsByChapter?.[chapterId] || {}),
  }
}

export function toggleSentenceHighlight(chapterHighlights, sentenceId, activeColorId) {
  const nextHighlights = {
    ...(chapterHighlights || {}),
  }

  if (!sentenceId || !activeColorId) {
    return nextHighlights
  }

  if (nextHighlights[sentenceId] === activeColorId) {
    delete nextHighlights[sentenceId]
    return nextHighlights
  }

  nextHighlights[sentenceId] = activeColorId
  return nextHighlights
}

export function removeSentenceHighlight(chapterHighlights, sentenceId) {
  const nextHighlights = {
    ...(chapterHighlights || {}),
  }

  if (sentenceId) {
    delete nextHighlights[sentenceId]
  }

  return nextHighlights
}

export function createPastedChapterContent(text) {
  const content = String(text || '').trim()

  if (!content) {
    return null
  }

  const paragraphTexts = splitReadableParagraphs(content)

  return {
    id: PASTED_CHAPTER_ID,
    bookId: PASTED_BOOK_ID,
    number: 'Paste',
    title: '粘贴文章',
    paragraphs: paragraphTexts.map((paragraphText, paragraphIndex) => {
      const paragraphId = `pasted-p${paragraphIndex + 1}`
      const sentences = splitIntoSentences(paragraphText)

      return {
        id: paragraphId,
        active: paragraphIndex === 0,
        translation: '粘贴文章暂未生成译文。',
        sentences: sentences.map((sentence, sentenceIndex) => {
          const sentenceId = `${paragraphId}-s${sentenceIndex + 1}`

          return {
            id: sentenceId,
            highlighted: false,
            text: sentence,
            translation: '',
            tokens: createPastedSentenceTokens(sentence, sentenceId),
          }
        }),
      }
    }),
  }
}

function createPastedSentenceTokens(sentence, sentenceId) {
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
