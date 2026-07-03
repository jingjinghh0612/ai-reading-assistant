import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { prototypeBooks, prototypeChapterContent, prototypeDictionary } from './readerPrototypeData.js'
import * as selectors from './readerPrototypeSelectors.js'
import {
  findPrototypeBook,
  findPrototypeBookChapterContent,
  findPrototypeChapter,
  findPrototypeChapterContent,
  getPrototypeChapters,
  getPrototypeParagraphs,
  getPrototypeReadingProgress,
  mapDictionaryEntryToWordPanel,
  createPastedPrototypeChapterContent,
} from './readerPrototypeSelectors.js'

function flattenPrototypeTokens(chapterContent) {
  return chapterContent.paragraphs.flatMap((paragraph) =>
    paragraph.sentences.flatMap((sentence) => sentence.tokens),
  )
}

describe('reader prototype selectors', () => {
  it('selects the active book and falls back to the first book', () => {
    assert.equal(findPrototypeBook(prototypeBooks, 'quiet-observatory').title, 'The Quiet Observatory')
    assert.equal(findPrototypeBook(prototypeBooks, 'missing-book').id, prototypeBooks[0].id)
    assert.equal(findPrototypeBook([], 'missing-book'), null)
  })

  it('derives chapters from the selected book', () => {
    const book = findPrototypeBook(prototypeBooks, 'quiet-observatory')

    assert.equal(getPrototypeChapters(book), book.chapters)
    assert.deepEqual(getPrototypeChapters(null), [])
  })

  it('selects chapter content with an explicit fallback chapter id', () => {
    const fallbackChapterId = 'chapter-4'

    assert.equal(
      findPrototypeChapterContent(prototypeChapterContent, 'chapter-4', fallbackChapterId),
      prototypeChapterContent['chapter-4'],
    )
    assert.equal(
      findPrototypeChapterContent(prototypeChapterContent, 'missing-chapter', fallbackChapterId),
      prototypeChapterContent['chapter-4'],
    )
    assert.equal(findPrototypeChapterContent({}, 'missing-chapter', fallbackChapterId), null)
  })

  it('selects chapter content only from the active book', () => {
    const emptyBook = {
      id: 'empty-book',
      chapters: [],
    }
    const importedBook = {
      id: 'imported-book',
      chapters: [
        {
          id: 'imported-chapter-1',
        },
      ],
    }
    const importedContent = {
      id: 'imported-chapter-1',
      title: 'Imported Chapter',
      paragraphs: [],
    }
    const chapterContentById = {
      ...prototypeChapterContent,
      'imported-chapter-1': importedContent,
    }

    assert.equal(
      findPrototypeBookChapterContent(chapterContentById, prototypeBooks[0], 'chapter-5', 'chapter-4'),
      prototypeChapterContent['chapter-5'],
    )
    assert.equal(
      findPrototypeBookChapterContent(chapterContentById, prototypeBooks[0], 'missing-chapter', 'chapter-4'),
      prototypeChapterContent['chapter-4'],
    )
    assert.equal(
      findPrototypeBookChapterContent(chapterContentById, importedBook, 'missing-chapter', 'chapter-4'),
      importedContent,
    )
    assert.equal(
      findPrototypeBookChapterContent(chapterContentById, emptyBook, 'chapter-4', 'chapter-4'),
      null,
    )
  })

  it('provides local reading content for every shelf chapter', () => {
    const book = findPrototypeBook(prototypeBooks, 'quiet-observatory')

    for (const chapter of book.chapters) {
      const content = prototypeChapterContent[chapter.id]

      assert.ok(content, `${chapter.id} should have local reading content`)
      assert.equal(content.id, chapter.id)
      assert.equal(content.bookId, book.id)
      assert.equal(content.number, chapter.number)
      assert.equal(content.title, chapter.title)
      assert.ok(content.paragraphs.length >= 2, `${chapter.id} should have at least two paragraphs`)

      for (const paragraph of content.paragraphs) {
        assert.ok(paragraph.translation)
        assert.ok(paragraph.sentences.length >= 1)

        for (const sentence of paragraph.sentences) {
          assert.ok(sentence.id)
          assert.ok(sentence.text)
          assert.ok(Array.isArray(sentence.tokens))
          assert.ok(sentence.tokens.length >= 1)
        }
      }
    }
  })

  it('selects the active chapter and falls back to the chapter content id', () => {
    const book = findPrototypeBook(prototypeBooks, 'quiet-observatory')
    const chapters = getPrototypeChapters(book)
    const chapterContent = findPrototypeChapterContent(prototypeChapterContent, 'chapter-4', 'chapter-4')

    assert.equal(findPrototypeChapter(chapters, 'chapter-5', chapterContent).id, 'chapter-5')
    assert.equal(findPrototypeChapter(chapters, 'missing-chapter', chapterContent).id, 'chapter-4')
    assert.equal(findPrototypeChapter([], 'missing-chapter', chapterContent), null)
  })

  it('derives paragraphs and reading progress without page-specific logic', () => {
    const book = findPrototypeBook(prototypeBooks, 'quiet-observatory')
    const chapter = findPrototypeChapter(book.chapters, 'chapter-4', prototypeChapterContent['chapter-4'])

    assert.equal(getPrototypeParagraphs(prototypeChapterContent['chapter-4']).length, 3)
    assert.deepEqual(getPrototypeParagraphs(null), [])
    assert.deepEqual(getPrototypeReadingProgress(book, chapter), { book: 64, chapter: 72 })
    assert.deepEqual(getPrototypeReadingProgress(null, null), { book: 0, chapter: 0 })
  })

  it('uses dictionary ids as word keys while preserving surface forms', () => {
    const tokens = flattenPrototypeTokens(prototypeChapterContent['chapter-4'])
    const plannedToken = tokens.find((token) => token.surface === 'planned')
    const copiedToken = tokens.find((token) => token.surface === 'copied')

    assert.equal(plannedToken.wordKey, 'plan')
    assert.equal(plannedToken.lemma, 'plan')
    assert.equal(plannedToken.text, 'planned')
    assert.equal(copiedToken.wordKey, 'copy')
    assert.equal(copiedToken.lemma, 'copy')
    assert.equal(copiedToken.text, 'copied')
    assert.ok(prototypeDictionary.plan)
    assert.ok(prototypeDictionary.copy)
    assert.equal(prototypeDictionary.planned, undefined)
    assert.equal(prototypeDictionary.copied, undefined)
  })

  it('maps dictionary entries to the current word panel contract', () => {
    assert.deepEqual(mapDictionaryEntryToWordPanel(null), null)
    assert.deepEqual(mapDictionaryEntryToWordPanel(prototypeDictionary.plan), {
      word: 'planned',
      lemma: 'plan',
      phonetic: prototypeDictionary.plan.phonetic,
      partOfSpeech: 'v.',
      meaning: prototypeDictionary.plan.meanings[0].zh,
      explanation: prototypeDictionary.plan.explanation,
      example: 'She planned to finish the book before dinner.',
      exampleTranslation: prototypeDictionary.plan.examples[0].zh,
      forms: ['plan', 'plans', 'planned', 'planning'],
      sourceSentence: prototypeDictionary.plan.sourceSentence,
      sourceTranslation: '',
    })
    assert.deepEqual(
      mapDictionaryEntryToWordPanel({
        lemma: 'fallback',
        meanings: [{ zh: 'fallback meaning', usage: 'fallback usage' }],
        examples: [],
      }),
      {
        word: 'fallback',
        lemma: 'fallback',
        phonetic: '',
        partOfSpeech: '',
        meaning: 'fallback meaning',
        explanation: 'fallback usage',
        example: '',
        exampleTranslation: '',
        forms: [],
        sourceSentence: '',
        sourceTranslation: '',
      },
    )
  })

  it('creates temporary prototype chapter content from pasted plain text', () => {
    const pastedChapter = createPastedPrototypeChapterContent(
      'First pasted sentence. Second sentence!\n\nAnother paragraph asks why?',
    )

    assert.equal(pastedChapter.id, 'pasted-article')
    assert.equal(pastedChapter.bookId, 'pasted-book')
    assert.equal(pastedChapter.number, 'Paste')
    assert.equal(pastedChapter.title, '粘贴文章')
    assert.equal(pastedChapter.paragraphs.length, 2)
    assert.equal(pastedChapter.paragraphs[0].id, 'pasted-p1')
    assert.equal(pastedChapter.paragraphs[0].active, true)
    assert.equal(pastedChapter.paragraphs[0].translation, '粘贴文章暂未生成译文。')
    assert.deepEqual(
      pastedChapter.paragraphs[0].sentences.map((sentence) => sentence.text),
      ['First pasted sentence.', 'Second sentence!'],
    )
    assert.equal(pastedChapter.paragraphs[1].sentences[0].id, 'pasted-p2-s1')
    assert.equal(pastedChapter.paragraphs[1].sentences[0].text, 'Another paragraph asks why?')

    const firstSentenceTokens = pastedChapter.paragraphs[0].sentences[0].tokens

    assert.deepEqual(
      firstSentenceTokens.filter((token) => token.wordKey).map((token) => ({
        text: token.text,
        surface: token.surface,
        lemma: token.lemma,
        wordKey: token.wordKey,
        sentenceId: token.sentenceId,
      })),
      [
        {
          text: 'First',
          surface: 'First',
          lemma: 'first',
          wordKey: 'first',
          sentenceId: 'pasted-p1-s1',
        },
        {
          text: 'pasted',
          surface: 'pasted',
          lemma: 'pasted',
          wordKey: 'pasted',
          sentenceId: 'pasted-p1-s1',
        },
        {
          text: 'sentence',
          surface: 'sentence',
          lemma: 'sentence',
          wordKey: 'sentence',
          sentenceId: 'pasted-p1-s1',
        },
      ],
    )
  })

  it('keeps readable single-line paragraph breaks in pasted plain text', () => {
    const pastedChapter = createPastedPrototypeChapterContent(
      'First pasted paragraph ends here.\nSecond pasted paragraph asks why?\nThis pasted line wraps without ending\nand should stay together.',
    )

    assert.equal(pastedChapter.paragraphs.length, 3)
    assert.deepEqual(
      pastedChapter.paragraphs.map((paragraph) => paragraph.sentences.map((sentence) => sentence.text).join(' ')),
      [
        'First pasted paragraph ends here.',
        'Second pasted paragraph asks why?',
        'This pasted line wraps without ending and should stay together.',
      ],
    )
  })

  it('returns a basic word panel for pasted words missing from the local dictionary', () => {
    const context = {
      wordKey: 'curious',
      surface: 'Curious',
      sourceSentence: 'Curious readers notice patterns.',
      sourceTranslation: '',
    }

    assert.deepEqual(mapDictionaryEntryToWordPanel(null, context), {
      word: 'Curious',
      lemma: 'curious',
      phonetic: '',
      partOfSpeech: '',
      meaning: '暂无本地释义',
      explanation: '这是粘贴文章中的词，当前原型词典还没有收录。',
      example: '',
      exampleTranslation: '',
      forms: [],
      sourceSentence: 'Curious readers notice patterns.',
      sourceTranslation: '',
    })
  })

  it('maps a clicked token to the word panel with its sentence context', () => {
    assert.equal(typeof selectors.getPrototypeWordContext, 'function')

    const clickedContext = selectors.getPrototypeWordContext(prototypeChapterContent['chapter-5'], {
      wordKey: 'reveal',
      surface: 'revealed',
      sentenceId: 'chapter-5-p2-s1',
    })

    assert.deepEqual(clickedContext, {
      wordKey: 'reveal',
      surface: 'revealed',
      paragraphId: 'p2',
      sentenceId: 'chapter-5-p2-s1',
      sourceSentence: 'The letter did not explain everything; it only revealed a small plan her grandfather had made.',
      sourceTranslation: prototypeChapterContent['chapter-5'].paragraphs[1].sentences[0].translation,
    })

    assert.deepEqual(mapDictionaryEntryToWordPanel(prototypeDictionary.reveal, clickedContext), {
      word: 'revealed',
      lemma: 'reveal',
      phonetic: prototypeDictionary.reveal.phonetic,
      partOfSpeech: 'v.',
      meaning: prototypeDictionary.reveal.meanings[0].zh,
      explanation: prototypeDictionary.reveal.explanation,
      example: prototypeDictionary.reveal.examples[0].en,
      exampleTranslation: prototypeDictionary.reveal.examples[0].zh,
      forms: ['reveal', 'reveals', 'revealed', 'revealing'],
      sourceSentence: clickedContext.sourceSentence,
      sourceTranslation: clickedContext.sourceTranslation,
    })
  })

  it('derives the current chapter vocabulary from structured word tokens', () => {
    assert.equal(typeof selectors.getPrototypeChapterVocabulary, 'function')

    const vocabulary = selectors.getPrototypeChapterVocabulary(
      prototypeChapterContent['chapter-4'],
      prototypeDictionary,
      ['plan'],
    )

    assert.deepEqual(
      vocabulary.map((item) => item.wordKey),
      ['observatory', 'plan', 'sentence', 'unusually', 'reveal', 'copy'],
    )
    assert.deepEqual(vocabulary.find((item) => item.wordKey === 'plan'), {
      wordKey: 'plan',
      word: 'planned',
      lemma: 'plan',
      partOfSpeech: 'v.',
      meaning: prototypeDictionary.plan.meanings[0].zh,
      count: 1,
      isAdded: true,
      selection: {
        wordKey: 'plan',
        surface: 'planned',
        sentenceId: 'p1-s2',
      },
    })

    const duplicateChapter = {
      paragraphs: [
        {
          id: 'p1',
          sentences: [
            {
              id: 's1',
              text: 'She planned, then planned again.',
              tokens: [
                {
                  id: 's1-plan-1',
                  text: 'planned',
                  surface: 'planned',
                  wordKey: 'plan',
                  sentenceId: 's1',
                },
                {
                  id: 's1-plan-2',
                  text: 'planned',
                  surface: 'planned',
                  wordKey: 'plan',
                  sentenceId: 's1',
                },
              ],
            },
          ],
        },
      ],
    }

    assert.deepEqual(selectors.getPrototypeChapterVocabulary(duplicateChapter, prototypeDictionary), [
      {
        wordKey: 'plan',
        word: 'planned',
        lemma: 'plan',
        partOfSpeech: 'v.',
        meaning: prototypeDictionary.plan.meanings[0].zh,
        count: 2,
        isAdded: false,
        selection: {
          wordKey: 'plan',
          surface: 'planned',
          sentenceId: 's1',
        },
      },
    ])
  })

  it('derives a local mock wordbook from added word keys', () => {
    assert.equal(typeof selectors.getPrototypeMockWordbook, 'function')

    const wordbook = selectors.getPrototypeMockWordbook(
      prototypeChapterContent['chapter-4'],
      prototypeDictionary,
      ['copy', 'plan'],
    )

    assert.deepEqual(
      wordbook.map((item) => item.wordKey),
      ['copy', 'plan'],
    )
    assert.deepEqual(wordbook[0], {
      wordKey: 'copy',
      word: 'copied',
      lemma: 'copy',
      partOfSpeech: 'v.',
      meaning: prototypeDictionary.copy.meanings[0].zh,
      count: 1,
      isAdded: true,
      selection: {
        wordKey: 'copy',
        surface: 'copied',
        sentenceId: 'p3-s1',
      },
    })
    assert.deepEqual(selectors.getPrototypeMockWordbook(null, prototypeDictionary, []), [])
  })

  describe('sentence highlight helpers', () => {
    it('derives default sentence highlights from highlighted prototype data', () => {
      assert.equal(typeof selectors.getDefaultPrototypeHighlights, 'function')

      assert.deepEqual(selectors.getDefaultPrototypeHighlights(prototypeChapterContent['chapter-4']), {
        'p1-s2': 'yellow',
      })
      assert.deepEqual(selectors.getDefaultPrototypeHighlights(prototypeChapterContent['chapter-5']), {
        'chapter-5-p1-s2': 'yellow',
      })
      assert.deepEqual(
        selectors.getDefaultPrototypeHighlights(
          {
            paragraphs: [
              {
                id: 'p1',
                sentences: [
                  { id: 's1', highlighted: true },
                  { id: 's2', highlighted: false },
                  { id: '', highlighted: true },
                ],
              },
            ],
          },
          'blue',
        ),
        { s1: 'blue' },
      )
      assert.deepEqual(selectors.getDefaultPrototypeHighlights(null), {})
    })

    it('returns a copied highlight map for the requested chapter', () => {
      assert.equal(typeof selectors.getPrototypeChapterHighlights, 'function')

      const highlightsByChapter = {
        'chapter-4': {
          'p1-s2': 'yellow',
        },
      }
      const chapterHighlights = selectors.getPrototypeChapterHighlights(highlightsByChapter, 'chapter-4')

      assert.deepEqual(chapterHighlights, { 'p1-s2': 'yellow' })
      assert.notEqual(chapterHighlights, highlightsByChapter['chapter-4'])
      assert.deepEqual(selectors.getPrototypeChapterHighlights(highlightsByChapter, 'missing-chapter'), {})
      assert.deepEqual(selectors.getPrototypeChapterHighlights(null, 'chapter-4'), {})
    })

    it('applies, updates, and toggles sentence highlights by color', () => {
      assert.equal(typeof selectors.togglePrototypeSentenceHighlight, 'function')

      const originalHighlights = {
        'p1-s2': 'yellow',
      }

      assert.deepEqual(
        selectors.togglePrototypeSentenceHighlight(originalHighlights, 'p2-s1', 'blue'),
        {
          'p1-s2': 'yellow',
          'p2-s1': 'blue',
        },
      )
      assert.deepEqual(
        selectors.togglePrototypeSentenceHighlight(originalHighlights, 'p1-s2', 'green'),
        {
          'p1-s2': 'green',
        },
      )
      assert.deepEqual(selectors.togglePrototypeSentenceHighlight(originalHighlights, 'p1-s2', 'yellow'), {})
      assert.deepEqual(selectors.togglePrototypeSentenceHighlight(originalHighlights, '', 'yellow'), originalHighlights)
      assert.deepEqual(selectors.togglePrototypeSentenceHighlight(originalHighlights, 'p2-s1', ''), originalHighlights)
      assert.deepEqual(originalHighlights, { 'p1-s2': 'yellow' })
    })

    it('removes one sentence highlight without mutating the original map', () => {
      assert.equal(typeof selectors.removePrototypeSentenceHighlight, 'function')

      const originalHighlights = {
        'p1-s2': 'yellow',
        'p2-s1': 'blue',
      }

      assert.deepEqual(selectors.removePrototypeSentenceHighlight(originalHighlights, 'p1-s2'), {
        'p2-s1': 'blue',
      })
      assert.deepEqual(selectors.removePrototypeSentenceHighlight(originalHighlights, 'missing-sentence'), originalHighlights)
      assert.deepEqual(selectors.removePrototypeSentenceHighlight(null, 'p1-s2'), {})
      assert.deepEqual(originalHighlights, {
        'p1-s2': 'yellow',
        'p2-s1': 'blue',
      })
    })
  })
})
