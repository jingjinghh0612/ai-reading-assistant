import { splitIntoSentences } from '../utils/sentence.js'
import { splitPrototypeReadableParagraphs } from '../utils/prototypeParagraphs.js'
import { normalizeWord, splitSentenceIntoTokens } from '../utils/word.js'

const PASTED_CHAPTER_ID = 'pasted-article'
const PASTED_BOOK_ID = 'pasted-book'

export function findPrototypeBook(books, activeBookId) {
  return books.find((book) => book.id === activeBookId) || books[0] || null
}

export function getPrototypeChapters(book) {
  return book?.chapters || []
}

export function findPrototypeChapterContent(chapterContentById, activeChapterId, fallbackChapterId) {
  return chapterContentById[activeChapterId] || chapterContentById[fallbackChapterId] || null
}

export function findPrototypeBookChapterContent(chapterContentById, book, activeChapterId, fallbackChapterId) {
  const chapters = getPrototypeChapters(book)

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

export function findPrototypeChapter(chapters, activeChapterId, chapterContent) {
  return (
    chapters.find((chapter) => chapter.id === activeChapterId) ||
    chapters.find((chapter) => chapter.id === chapterContent?.id) ||
    chapters[0] ||
    null
  )
}

export function getPrototypeParagraphs(chapterContent) {
  return chapterContent?.paragraphs || []
}

export function getPrototypeReadingProgress(book, chapter) {
  return {
    book: book?.progress || 0,
    chapter: chapter?.progress || 0,
  }
}

export function getPrototypeChapterVocabulary(chapterContent, dictionary, addedWordKeys = []) {
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
          isAdded: addedWordKeys.includes(token.wordKey),
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

export function getPrototypeMockWordbook(chapterContent, dictionary, addedWordKeys = []) {
  const chapterVocabularyByKey = new Map(
    getPrototypeChapterVocabulary(chapterContent, dictionary, addedWordKeys).map((item) => [item.wordKey, item]),
  )
  const seenWordKeys = new Set()

  return addedWordKeys
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

export function getPrototypeWordContext(chapterContent, selection) {
  if (!chapterContent || !selection?.wordKey) {
    return null
  }

  for (const paragraph of chapterContent.paragraphs || []) {
    for (const sentence of paragraph.sentences || []) {
      if (selection.sentenceId && sentence.id !== selection.sentenceId) {
        continue
      }

      const token = sentence.tokens?.find((item) => item.wordKey === selection.wordKey)
      if (!token) {
        continue
      }

      return {
        wordKey: selection.wordKey,
        surface: selection.surface || token.surface || token.text || '',
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
      explanation: '这是粘贴文章中的词，当前原型词典还没有收录。',
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

export function getDefaultPrototypeHighlights(chapterContent, defaultColorId = 'yellow') {
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

export function getPrototypeChapterHighlights(highlightsByChapter, chapterId) {
  return {
    ...(highlightsByChapter?.[chapterId] || {}),
  }
}

export function togglePrototypeSentenceHighlight(chapterHighlights, sentenceId, activeColorId) {
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

export function removePrototypeSentenceHighlight(chapterHighlights, sentenceId) {
  const nextHighlights = {
    ...(chapterHighlights || {}),
  }

  if (sentenceId) {
    delete nextHighlights[sentenceId]
  }

  return nextHighlights
}

export function createPastedPrototypeChapterContent(text) {
  const content = String(text || '').trim()

  if (!content) {
    return null
  }

  const paragraphTexts = splitPrototypeReadableParagraphs(content)

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
            tokens: createPastedPrototypeSentenceTokens(sentence, sentenceId),
          }
        }),
      }
    }),
  }
}

function createPastedPrototypeSentenceTokens(sentence, sentenceId) {
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
