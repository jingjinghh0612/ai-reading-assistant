import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ref } from 'vue'
import { useReaderWorkspaceTranslations } from './useReaderWorkspaceTranslations.js'

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, resolve, reject }
}

function createTranslationFixture(options = {}) {
  const currentChapter = ref({ id: 'chapter-a' })
  const currentChapterContent = ref({ id: 'chapter-a' })
  const paragraphs = ref([
    {
      id: 'p1',
      sentences: [
        { id: 's1', text: 'First sentence.' },
        { id: 's2', text: 'Second sentence.' },
      ],
    },
  ])
  const pastedArticleVersion = ref(0)
  const isPastedArticleActive = ref(false)
  const pastedChapterContent = ref(null)
  const requests = []
  const savedTranslations = []
  const cache = new Map(options.cachedTranslations || [])

  const translations = useReaderWorkspaceTranslations({
    currentChapter,
    currentChapterContent,
    paragraphs,
    pastedArticleVersion,
    isPastedArticleActive,
    pastedChapterContent,
    requestTranslation: options.requestTranslation || (async (text, type) => {
      requests.push({ text, type })

      return { translation: `${type} translation for ${text}` }
    }),
    createTranslationCacheKey: (text, type) => `${type}:${text}`,
    getCachedTranslation: (text, type) => cache.get(`${type}:${text}`) || '',
    saveCachedTranslation: (text, translation, type) => {
      cache.set(`${type}:${text}`, translation)
      savedTranslations.push({ text, translation, type })

      return true
    },
  })

  return {
    cache,
    currentChapter,
    currentChapterContent,
    isPastedArticleActive,
    paragraphs,
    pastedArticleVersion,
    pastedChapterContent,
    requests,
    savedTranslations,
    translations,
  }
}

describe('useReaderWorkspaceTranslations', () => {
  it('loads paragraph and sentence translations into display paragraphs', async () => {
    const { paragraphs, requests, savedTranslations, translations } = createTranslationFixture()

    await translations.translateParagraph('p1')

    assert.deepEqual(requests[0], {
      text: 'First sentence. Second sentence.',
      type: 'paragraph',
    })
    assert.deepEqual(savedTranslations[0], {
      text: 'First sentence. Second sentence.',
      translation: 'paragraph translation for First sentence. Second sentence.',
      type: 'paragraph',
    })
    assert.equal(
      translations.displayParagraphs.value[0].translation,
      'paragraph translation for First sentence. Second sentence.',
    )

    await translations.selectSentence({
      sentence: paragraphs.value[0].sentences[0],
      paragraph: paragraphs.value[0],
    })

    assert.equal(translations.selectedSentenceId.value, 's1')
    assert.deepEqual(requests[1], {
      text: 'First sentence.',
      type: 'sentence',
    })
    assert.equal(
      translations.displayParagraphs.value[0].sentences[0].translation,
      'sentence translation for First sentence.',
    )
  })

  it('uses cached translations until a retry forces refresh', async () => {
    const { requests, translations } = createTranslationFixture({
      cachedTranslations: [
        ['paragraph:First sentence. Second sentence.', 'cached paragraph translation'],
      ],
    })

    await translations.translateParagraph('p1')

    assert.equal(requests.length, 0)
    assert.equal(translations.displayParagraphs.value[0].translation, 'cached paragraph translation')

    await translations.retryParagraphTranslation('p1')

    assert.equal(requests.length, 1)
    assert.equal(
      translations.displayParagraphs.value[0].translation,
      'paragraph translation for First sentence. Second sentence.',
    )
  })

  it('ignores stale translation responses after clearing state', async () => {
    const deferred = createDeferred()
    const { paragraphs, translations } = createTranslationFixture({
      requestTranslation: () => deferred.promise,
    })

    const loadingPromise = translations.loadParagraphTranslation(paragraphs.value[0])
    translations.clearTranslationState()

    deferred.resolve({ translation: 'stale paragraph translation' })
    await loadingPromise

    assert.equal(translations.displayParagraphs.value[0].translation, '')
    assert.equal(translations.displayParagraphs.value[0].isTranslationLoading, false)
  })
})
