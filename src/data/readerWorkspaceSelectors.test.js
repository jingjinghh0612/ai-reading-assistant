import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { builtInBooks, builtInChapterContent, builtInDictionary } from './builtInReaderData.js'
import * as selectors from './readerWorkspaceSelectors.js'
import {
  findBook,
  findBookChapterContent,
  findChapter,
  findChapterContent,
  getChapters,
  getChapterParagraphs,
  getReadingProgress,
  mapDictionaryEntryToWordPanel,
  mapWordLookupDetailToWordPanel,
  getLocalParagraphTranslation,
  getParagraphSourceText,
  createPastedChapterContent,
} from './readerWorkspaceSelectors.js'

function flattenTokens(chapterContent) {
  return chapterContent.paragraphs.flatMap((paragraph) =>
    paragraph.sentences.flatMap((sentence) => sentence.tokens),
  )
}

describe('reader workspace selectors', () => {
  it('selects the active book and falls back to the first book', () => {
    assert.equal(findBook(builtInBooks, 'quiet-observatory').title, 'The Quiet Observatory')
    assert.equal(findBook(builtInBooks, 'missing-book').id, builtInBooks[0].id)
    assert.equal(findBook([], 'missing-book'), null)
  })

  it('derives chapters from the selected book', () => {
    const book = findBook(builtInBooks, 'quiet-observatory')

    assert.equal(getChapters(book), book.chapters)
    assert.deepEqual(getChapters(null), [])
  })

  it('keeps the default reader workspace shelf focused on books with local chapter content', () => {
    assert.deepEqual(
      builtInBooks.map((book) => book.id),
      ['quiet-observatory'],
    )
  })

  it('selects chapter content with an explicit fallback chapter id', () => {
    const fallbackChapterId = 'chapter-4'

    assert.equal(
      findChapterContent(builtInChapterContent, 'chapter-4', fallbackChapterId),
      builtInChapterContent['chapter-4'],
    )
    assert.equal(
      findChapterContent(builtInChapterContent, 'missing-chapter', fallbackChapterId),
      builtInChapterContent['chapter-4'],
    )
    assert.equal(findChapterContent({}, 'missing-chapter', fallbackChapterId), null)
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
      ...builtInChapterContent,
      'imported-chapter-1': importedContent,
    }

    assert.equal(
      findBookChapterContent(chapterContentById, builtInBooks[0], 'chapter-5', 'chapter-4'),
      builtInChapterContent['chapter-5'],
    )
    assert.equal(
      findBookChapterContent(chapterContentById, builtInBooks[0], 'missing-chapter', 'chapter-4'),
      builtInChapterContent['chapter-4'],
    )
    assert.equal(
      findBookChapterContent(chapterContentById, importedBook, 'missing-chapter', 'chapter-4'),
      importedContent,
    )
    assert.equal(
      findBookChapterContent(chapterContentById, emptyBook, 'chapter-4', 'chapter-4'),
      null,
    )
  })

  it('provides local reading content for every shelf chapter', () => {
    const book = findBook(builtInBooks, 'quiet-observatory')

    for (const chapter of book.chapters) {
      const content = builtInChapterContent[chapter.id]

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
    const book = findBook(builtInBooks, 'quiet-observatory')
    const chapters = getChapters(book)
    const chapterContent = findChapterContent(builtInChapterContent, 'chapter-4', 'chapter-4')

    assert.equal(findChapter(chapters, 'chapter-5', chapterContent).id, 'chapter-5')
    assert.equal(findChapter(chapters, 'missing-chapter', chapterContent).id, 'chapter-4')
    assert.equal(findChapter([], 'missing-chapter', chapterContent), null)
  })

  it('derives paragraphs and reading progress without page-specific logic', () => {
    const book = findBook(builtInBooks, 'quiet-observatory')
    const chapter = findChapter(book.chapters, 'chapter-4', builtInChapterContent['chapter-4'])

    assert.equal(getChapterParagraphs(builtInChapterContent['chapter-4']).length, 3)
    assert.deepEqual(getChapterParagraphs(null), [])
    assert.deepEqual(getReadingProgress(book, chapter), { book: 64, chapter: 72 })
    assert.deepEqual(getReadingProgress(null, null), { book: 0, chapter: 0 })
  })

  it('uses dictionary ids as word keys while preserving surface forms', () => {
    const tokens = flattenTokens(builtInChapterContent['chapter-4'])
    const plannedToken = tokens.find((token) => token.surface === 'planned')
    const copiedToken = tokens.find((token) => token.surface === 'copied')

    assert.equal(plannedToken.wordKey, 'plan')
    assert.equal(plannedToken.lemma, 'plan')
    assert.equal(plannedToken.text, 'planned')
    assert.equal(copiedToken.wordKey, 'copy')
    assert.equal(copiedToken.lemma, 'copy')
    assert.equal(copiedToken.text, 'copied')
    assert.ok(builtInDictionary.plan)
    assert.ok(builtInDictionary.copy)
    assert.equal(builtInDictionary.planned, undefined)
    assert.equal(builtInDictionary.copied, undefined)
  })

  it('maps dictionary entries to the current word panel contract', () => {
    assert.deepEqual(mapDictionaryEntryToWordPanel(null), null)
    assert.deepEqual(mapDictionaryEntryToWordPanel(builtInDictionary.plan), {
      word: 'planned',
      lemma: 'plan',
      phonetic: builtInDictionary.plan.phonetic,
      partOfSpeech: 'v.',
      meaning: builtInDictionary.plan.meanings[0].zh,
      explanation: builtInDictionary.plan.explanation,
      example: 'She planned to finish the book before dinner.',
      exampleTranslation: builtInDictionary.plan.examples[0].zh,
      forms: ['plan', 'plans', 'planned', 'planning'],
      sourceSentence: builtInDictionary.plan.sourceSentence,
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

  it('prepares paragraph text and local translations for AI translation fallback', () => {
    assert.equal(typeof getLocalParagraphTranslation, 'function')
    assert.equal(typeof getParagraphSourceText, 'function')

    assert.equal(
      getLocalParagraphTranslation({
        translation: 'Local paragraph translation.',
        sentences: [
          {
            text: 'The local paragraph already has a translation.',
            translation: 'Local sentence translation.',
          },
        ],
      }),
      'Local paragraph translation.',
    )
    assert.equal(
      getLocalParagraphTranslation({
        translation: '粘贴文章暂未生成译文。',
        sentences: [
          {
            text: 'Sentence one.',
            translation: '第一句译文。',
          },
          {
            text: 'Sentence two.',
            translation: '第二句译文。',
          },
        ],
      }),
      '第一句译文。 第二句译文。',
    )
    assert.equal(
      getLocalParagraphTranslation({
        translation: '导入书籍暂未生成译文。',
        sentences: [{ text: 'Imported text without a translation.', translation: '' }],
      }),
      '',
    )
    assert.equal(
      getParagraphSourceText({
        text: 'Ignored paragraph text.',
        sentences: [{ text: 'First sentence.' }, { text: 'Second sentence.' }],
      }),
      'First sentence. Second sentence.',
    )
  })

  it('prepares sentence text and local translations for inline sentence translation', () => {
    assert.equal(typeof selectors.getSentenceSourceText, 'function')
    assert.equal(typeof selectors.getLocalSentenceTranslation, 'function')
    assert.equal(typeof selectors.createTranslationStateKey, 'function')

    assert.equal(
      selectors.getSentenceSourceText({
        text: '  The room became quiet.  ',
      }),
      'The room became quiet.',
    )
    assert.equal(selectors.getSentenceSourceText(null), '')
    assert.equal(
      selectors.getLocalSentenceTranslation({
        translation: ' 房间安静下来。 ',
      }),
      '房间安静下来。',
    )
    assert.equal(
      selectors.getLocalSentenceTranslation({
        translation: '暂无译文',
      }),
      '',
    )
    assert.equal(
      selectors.createTranslationStateKey('chapter-4', 'p1', 'p1-s2'),
      'chapter-4:p1:p1-s2',
    )
    assert.equal(
      selectors.createTranslationStateKey('', 'p1', 'p1-s2'),
      'chapter:p1:p1-s2',
    )
  })

  it('maps word lookup results to the reader workspace word panel contract with sentence context', () => {
    assert.equal(typeof mapWordLookupDetailToWordPanel, 'function')

    assert.deepEqual(
      mapWordLookupDetailToWordPanel(
        {
          word: 'curious',
          meaning: '好奇的',
          definition: 'Wanting to know or learn something.',
          partOfSpeech: 'adj.',
          example: 'Curious readers notice patterns.',
        },
        {
          wordKey: 'curious',
          surface: 'Curious',
          sourceSentence: 'Curious readers notice patterns.',
          sourceTranslation: '好奇的读者会注意到规律。',
        },
      ),
      {
        word: 'Curious',
        lemma: 'curious',
        phonetic: '',
        partOfSpeech: 'adj.',
        meaning: '好奇的',
        explanation: 'Wanting to know or learn something.',
        example: 'Curious readers notice patterns.',
        exampleTranslation: '',
        forms: [],
        sourceSentence: 'Curious readers notice patterns.',
        sourceTranslation: '好奇的读者会注意到规律。',
      },
    )
  })

  it('creates temporary reader workspace chapter content from pasted plain text', () => {
    const pastedChapter = createPastedChapterContent(
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
    const pastedChapter = createPastedChapterContent(
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
    const panel = mapDictionaryEntryToWordPanel(null, context)

    assert.equal(panel.explanation, '')

    assert.deepEqual(mapDictionaryEntryToWordPanel(null, context), {
      word: 'Curious',
      lemma: 'curious',
      phonetic: '',
      partOfSpeech: '',
      meaning: '暂无本地释义',
      explanation: '',
      example: '',
      exampleTranslation: '',
      forms: [],
      sourceSentence: 'Curious readers notice patterns.',
      sourceTranslation: '',
    })
  })

  it('maps a clicked token to the word panel with its sentence context', () => {
    assert.equal(typeof selectors.getWordContext, 'function')

    const clickedContext = selectors.getWordContext(builtInChapterContent['chapter-5'], {
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
      sourceTranslation: builtInChapterContent['chapter-5'].paragraphs[1].sentences[0].translation,
    })

    assert.deepEqual(mapDictionaryEntryToWordPanel(builtInDictionary.reveal, clickedContext), {
      word: 'revealed',
      lemma: 'reveal',
      phonetic: builtInDictionary.reveal.phonetic,
      partOfSpeech: 'v.',
      meaning: builtInDictionary.reveal.meanings[0].zh,
      explanation: builtInDictionary.reveal.explanation,
      example: builtInDictionary.reveal.examples[0].en,
      exampleTranslation: builtInDictionary.reveal.examples[0].zh,
      forms: ['reveal', 'reveals', 'revealed', 'revealing'],
      sourceSentence: clickedContext.sourceSentence,
      sourceTranslation: clickedContext.sourceTranslation,
    })
  })

  it('creates clickable word tokens from unstructured reader workspace text', () => {
    assert.equal(typeof selectors.getClickableSentenceTokens, 'function')

    const [firstWord, firstGap, secondWord] = selectors.getClickableSentenceTokens({
      id: 's1',
      tokens: [
        {
          id: 's1-t1',
          text: 'Curious readers',
        },
      ],
    })

    assert.deepEqual(firstWord, {
      id: 's1-t1-w1',
      text: 'Curious',
      surface: 'Curious',
      lemma: 'curious',
      wordKey: 'curious',
      sentenceId: 's1',
      isGenerated: true,
    })
    assert.deepEqual(firstGap, {
      id: 's1-t1-t2',
      text: ' ',
    })
    assert.deepEqual(secondWord, {
      id: 's1-t1-w3',
      text: 'readers',
      surface: 'readers',
      lemma: 'readers',
      wordKey: 'readers',
      sentenceId: 's1',
      isGenerated: true,
    })
  })

  it('preserves whitespace around generated clickable words', () => {
    const tokens = selectors.getClickableSentenceTokens({
      id: 's1',
      tokens: [
        {
          id: 's1-t1',
          text: 'She had ',
        },
        {
          id: 's1-plan',
          text: 'planned',
          surface: 'planned',
          lemma: 'plan',
          wordKey: 'plan',
          sentenceId: 's1',
        },
        {
          id: 's1-t2',
          text: ' to read.',
        },
      ],
    })

    assert.equal(
      tokens.map((token) => token.text).join(''),
      'She had planned to read.',
    )
  })

  it('keeps source sentence context for generated clickable words', () => {
    const clickedContext = selectors.getWordContext(builtInChapterContent['chapter-3'], {
      wordKey: 'garden',
      surface: 'garden',
      sentenceId: 'chapter-3-p1-s1',
    })

    assert.deepEqual(clickedContext, {
      wordKey: 'garden',
      surface: 'garden',
      paragraphId: 'p1',
      sentenceId: 'chapter-3-p1-s1',
      sourceSentence:
        'The garden gate had been locked for years, but Clara could still see a narrow path through the fence.',
      sourceTranslation: builtInChapterContent['chapter-3'].paragraphs[0].sentences[0].translation,
    })
  })

  it('derives the current chapter vocabulary from structured word tokens', () => {
    assert.equal(typeof selectors.getChapterVocabulary, 'function')

    const vocabulary = selectors.getChapterVocabulary(
      builtInChapterContent['chapter-4'],
      builtInDictionary,
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
      meaning: builtInDictionary.plan.meanings[0].zh,
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

    assert.deepEqual(selectors.getChapterVocabulary(duplicateChapter, builtInDictionary), [
      {
        wordKey: 'plan',
        word: 'planned',
        lemma: 'plan',
        partOfSpeech: 'v.',
        meaning: builtInDictionary.plan.meanings[0].zh,
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

  it('derives a session vocabulary from the words added during the session', () => {
    assert.equal(typeof selectors.getSessionVocabulary, 'function')

    const sessionVocabulary = selectors.getSessionVocabulary(
      builtInChapterContent['chapter-4'],
      builtInDictionary,
      ['copy', 'plan'],
    )

    assert.deepEqual(
      sessionVocabulary.map((item) => item.wordKey),
      ['copy', 'plan'],
    )
    assert.deepEqual(sessionVocabulary[0], {
      wordKey: 'copy',
      word: 'copied',
      lemma: 'copy',
      partOfSpeech: 'v.',
      meaning: builtInDictionary.copy.meanings[0].zh,
      count: 1,
      isAdded: true,
      selection: {
        wordKey: 'copy',
        surface: 'copied',
        sentenceId: 'p3-s1',
      },
    })
    assert.deepEqual(selectors.getSessionVocabulary(null, builtInDictionary, []), [])
  })

  describe('sentence highlight helpers', () => {
    it('derives default sentence highlights from highlighted reader workspace data', () => {
      assert.equal(typeof selectors.getDefaultHighlights, 'function')

      assert.deepEqual(selectors.getDefaultHighlights(builtInChapterContent['chapter-4']), {
        'p1-s2': 'yellow',
      })
      assert.deepEqual(selectors.getDefaultHighlights(builtInChapterContent['chapter-5']), {
        'chapter-5-p1-s2': 'yellow',
      })
      assert.deepEqual(
        selectors.getDefaultHighlights(
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
      assert.deepEqual(selectors.getDefaultHighlights(null), {})
    })

    it('returns a copied highlight map for the requested chapter', () => {
      assert.equal(typeof selectors.getChapterHighlights, 'function')

      const highlightsByChapter = {
        'chapter-4': {
          'p1-s2': 'yellow',
        },
      }
      const chapterHighlights = selectors.getChapterHighlights(highlightsByChapter, 'chapter-4')

      assert.deepEqual(chapterHighlights, { 'p1-s2': 'yellow' })
      assert.notEqual(chapterHighlights, highlightsByChapter['chapter-4'])
      assert.deepEqual(selectors.getChapterHighlights(highlightsByChapter, 'missing-chapter'), {})
      assert.deepEqual(selectors.getChapterHighlights(null, 'chapter-4'), {})
    })

    it('applies, updates, and toggles sentence highlights by color', () => {
      assert.equal(typeof selectors.toggleSentenceHighlight, 'function')

      const originalHighlights = {
        'p1-s2': 'yellow',
      }

      assert.deepEqual(
        selectors.toggleSentenceHighlight(originalHighlights, 'p2-s1', 'blue'),
        {
          'p1-s2': 'yellow',
          'p2-s1': 'blue',
        },
      )
      assert.deepEqual(
        selectors.toggleSentenceHighlight(originalHighlights, 'p1-s2', 'green'),
        {
          'p1-s2': 'green',
        },
      )
      assert.deepEqual(selectors.toggleSentenceHighlight(originalHighlights, 'p1-s2', 'yellow'), {})
      assert.deepEqual(selectors.toggleSentenceHighlight(originalHighlights, '', 'yellow'), originalHighlights)
      assert.deepEqual(selectors.toggleSentenceHighlight(originalHighlights, 'p2-s1', ''), originalHighlights)
      assert.deepEqual(originalHighlights, { 'p1-s2': 'yellow' })
    })

    it('removes one sentence highlight without mutating the original map', () => {
      assert.equal(typeof selectors.removeSentenceHighlight, 'function')

      const originalHighlights = {
        'p1-s2': 'yellow',
        'p2-s1': 'blue',
      }

      assert.deepEqual(selectors.removeSentenceHighlight(originalHighlights, 'p1-s2'), {
        'p2-s1': 'blue',
      })
      assert.deepEqual(selectors.removeSentenceHighlight(originalHighlights, 'missing-sentence'), originalHighlights)
      assert.deepEqual(selectors.removeSentenceHighlight(null, 'p1-s2'), {})
      assert.deepEqual(originalHighlights, {
        'p1-s2': 'yellow',
        'p2-s1': 'blue',
      })
    })
  })
})
