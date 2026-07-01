export function findPrototypeBook(books, activeBookId) {
  return books.find((book) => book.id === activeBookId) || books[0] || null
}

export function getPrototypeChapters(book) {
  return book?.chapters || []
}

export function findPrototypeChapterContent(chapterContentById, activeChapterId, fallbackChapterId) {
  return chapterContentById[activeChapterId] || chapterContentById[fallbackChapterId] || null
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
    return null
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
