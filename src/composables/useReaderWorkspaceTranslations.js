import { computed, ref } from 'vue'
import { requestTranslation as defaultRequestTranslation } from '../api/translate.js'
import {
  getPrototypeLocalParagraphTranslation,
  getPrototypeLocalSentenceTranslation,
  getPrototypeParagraphSourceText,
  getPrototypeSentenceSourceText,
  getPrototypeTranslationStateKey,
} from '../data/readerPrototypeSelectors.js'
import {
  createTranslationCacheKey as defaultCreateTranslationCacheKey,
  getCachedTranslation as defaultGetCachedTranslation,
  saveCachedTranslation as defaultSaveCachedTranslation,
} from '../utils/translationCache.js'

function getErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage
}

function clearRequestVersions(requestVersions) {
  for (const key of Object.keys(requestVersions)) {
    delete requestVersions[key]
  }
}

function setRecordValue(recordRef, key, value) {
  const nextRecord = { ...recordRef.value }

  if (value) {
    nextRecord[key] = value
  } else {
    delete nextRecord[key]
  }

  recordRef.value = nextRecord
}

export function useReaderWorkspaceTranslations({
  currentChapter,
  currentChapterContent,
  paragraphs,
  pastedArticleVersion,
  isPastedArticleActive,
  pastedChapterContent,
  requestTranslation = defaultRequestTranslation,
  createTranslationCacheKey = defaultCreateTranslationCacheKey,
  getCachedTranslation = defaultGetCachedTranslation,
  saveCachedTranslation = defaultSaveCachedTranslation,
}) {
  const translationByParagraphId = ref({})
  const translationLoadingByParagraphId = ref({})
  const translationErrorByParagraphId = ref({})
  const selectedSentenceId = ref('')
  const selectedSentenceParagraphId = ref('')
  const translationBySentenceId = ref({})
  const translationLoadingBySentenceId = ref({})
  const translationErrorBySentenceId = ref({})
  const translationRequests = Object.create(null)
  const paragraphRequestVersions = Object.create(null)
  const sentenceRequestVersions = Object.create(null)
  let translationRequestVersion = 0

  function getPrototypeChapterStateId() {
    if (isPastedArticleActive.value && currentChapterContent.value?.id === pastedChapterContent.value?.id) {
      return `${currentChapterContent.value.id}:${pastedArticleVersion.value}`
    }

    return currentChapter.value?.id || currentChapterContent.value?.id || 'chapter'
  }

  function getPrototypeParagraphStateKey(paragraph) {
    return getPrototypeTranslationStateKey(getPrototypeChapterStateId(), paragraph?.id || '', 'paragraph')
  }

  function getPrototypeSentenceStateKey(sentence, paragraph) {
    return getPrototypeTranslationStateKey(
      getPrototypeChapterStateId(),
      paragraph?.id || selectedSentenceParagraphId.value || '',
      sentence?.id || selectedSentenceId.value || '',
    )
  }

  const displayParagraphs = computed(() =>
    paragraphs.value.map((paragraph) => {
      const paragraphStateKey = getPrototypeParagraphStateKey(paragraph)
      const localTranslation = getPrototypeLocalParagraphTranslation(paragraph)

      return {
        ...paragraph,
        translation: localTranslation || translationByParagraphId.value[paragraphStateKey] || '',
        isTranslationLoading: Boolean(translationLoadingByParagraphId.value[paragraphStateKey]),
        translationErrorMessage: translationErrorByParagraphId.value[paragraphStateKey] || '',
        sentences: (paragraph.sentences || []).map((sentence) => {
          const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
          const localSentenceTranslation = getPrototypeLocalSentenceTranslation(sentence)

          return {
            ...sentence,
            translation: localSentenceTranslation || translationBySentenceId.value[sentenceStateKey] || '',
            isTranslationLoading: Boolean(translationLoadingBySentenceId.value[sentenceStateKey]),
            translationErrorMessage: translationErrorBySentenceId.value[sentenceStateKey] || '',
          }
        }),
      }
    }),
  )

  function clearPrototypeSentenceSelection() {
    selectedSentenceId.value = ''
    selectedSentenceParagraphId.value = ''
  }

  function clearPrototypeTranslationState() {
    translationRequestVersion += 1
    translationByParagraphId.value = {}
    translationLoadingByParagraphId.value = {}
    translationErrorByParagraphId.value = {}
    translationBySentenceId.value = {}
    translationLoadingBySentenceId.value = {}
    translationErrorBySentenceId.value = {}
    clearRequestVersions(paragraphRequestVersions)
    clearRequestVersions(sentenceRequestVersions)
  }

  function getPrototypeTranslation(sourceText, translationType, options = {}) {
    const refresh = Boolean(options.refresh)
    const requestKey = createTranslationCacheKey(sourceText, translationType)

    if (!sourceText.trim()) {
      return Promise.resolve('')
    }

    if (!refresh) {
      const cachedTranslation = getCachedTranslation(sourceText, translationType)

      if (cachedTranslation) {
        return Promise.resolve(cachedTranslation)
      }
    }

    if (refresh) {
      delete translationRequests[requestKey]
    }

    if (!translationRequests[requestKey]) {
      translationRequests[requestKey] = requestTranslation(sourceText, translationType)
        .then((data) => {
          saveCachedTranslation(sourceText, data.translation, translationType)
          return data.translation
        })
        .finally(() => {
          delete translationRequests[requestKey]
        })
    }

    return translationRequests[requestKey]
  }

  async function loadPrototypeParagraphTranslation(paragraph, options = {}) {
    const paragraphStateKey = getPrototypeParagraphStateKey(paragraph)
    const sourceText = getPrototypeParagraphSourceText(paragraph)

    if (!paragraphStateKey || !sourceText || getPrototypeLocalParagraphTranslation(paragraph)) {
      return
    }

    if (!options.refresh && translationByParagraphId.value[paragraphStateKey]) {
      return
    }

    const requestVersion = translationRequestVersion += 1
    paragraphRequestVersions[paragraphStateKey] = requestVersion
    setRecordValue(translationErrorByParagraphId, paragraphStateKey, '')
    setRecordValue(translationLoadingByParagraphId, paragraphStateKey, true)

    try {
      const translation = await getPrototypeTranslation(sourceText, 'paragraph', options)

      if (paragraphRequestVersions[paragraphStateKey] !== requestVersion) {
        return
      }

      if (!translation) {
        throw new Error('没有返回可用译文。')
      }

      setRecordValue(translationByParagraphId, paragraphStateKey, translation)
    } catch (error) {
      if (paragraphRequestVersions[paragraphStateKey] !== requestVersion) {
        return
      }

      setRecordValue(translationErrorByParagraphId, paragraphStateKey, getErrorMessage(error, 'AI 翻译加载失败。'))
    } finally {
      if (paragraphRequestVersions[paragraphStateKey] === requestVersion) {
        setRecordValue(translationLoadingByParagraphId, paragraphStateKey, false)
        delete paragraphRequestVersions[paragraphStateKey]
      }
    }
  }

  function retryPrototypeTranslation(paragraphId) {
    const paragraph = paragraphs.value.find((item) => item.id === paragraphId)

    if (!paragraph) {
      return Promise.resolve()
    }

    const paragraphStateKey = getPrototypeParagraphStateKey(paragraph)
    setRecordValue(translationByParagraphId, paragraphStateKey, '')
    setRecordValue(translationErrorByParagraphId, paragraphStateKey, '')

    return loadPrototypeParagraphTranslation(paragraph, { refresh: true })
  }

  async function loadPrototypeSentenceTranslation(sentence, paragraph, options = {}) {
    const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
    const sourceText = getPrototypeSentenceSourceText(sentence)

    if (!sentenceStateKey || !sourceText || getPrototypeLocalSentenceTranslation(sentence)) {
      return
    }

    if (!options.refresh && translationBySentenceId.value[sentenceStateKey]) {
      return
    }

    const requestVersion = translationRequestVersion += 1
    sentenceRequestVersions[sentenceStateKey] = requestVersion
    setRecordValue(translationErrorBySentenceId, sentenceStateKey, '')
    setRecordValue(translationLoadingBySentenceId, sentenceStateKey, true)

    try {
      const translation = await getPrototypeTranslation(sourceText, 'sentence', options)

      if (sentenceRequestVersions[sentenceStateKey] !== requestVersion) {
        return
      }

      if (!translation) {
        throw new Error('没有返回可用译文。')
      }

      setRecordValue(translationBySentenceId, sentenceStateKey, translation)
    } catch (error) {
      if (sentenceRequestVersions[sentenceStateKey] !== requestVersion) {
        return
      }

      setRecordValue(translationErrorBySentenceId, sentenceStateKey, getErrorMessage(error, 'AI 翻译加载失败。'))
    } finally {
      if (sentenceRequestVersions[sentenceStateKey] === requestVersion) {
        setRecordValue(translationLoadingBySentenceId, sentenceStateKey, false)
        delete sentenceRequestVersions[sentenceStateKey]
      }
    }
  }

  function selectPrototypeSentence({ sentence, paragraph }) {
    if (!sentence?.id || !paragraph?.id) {
      return Promise.resolve()
    }

    selectedSentenceId.value = sentence.id
    selectedSentenceParagraphId.value = paragraph.id

    return loadPrototypeSentenceTranslation(sentence, paragraph)
  }

  function retryPrototypeSentenceTranslation({ sentenceId, paragraphId }) {
    const paragraph = paragraphs.value.find((item) => item.id === paragraphId)
    const sentence = paragraph?.sentences?.find((item) => item.id === sentenceId)

    if (!paragraph || !sentence) {
      return Promise.resolve()
    }

    selectedSentenceId.value = sentence.id
    selectedSentenceParagraphId.value = paragraph.id
    const sentenceStateKey = getPrototypeSentenceStateKey(sentence, paragraph)
    setRecordValue(translationBySentenceId, sentenceStateKey, '')
    setRecordValue(translationErrorBySentenceId, sentenceStateKey, '')

    return loadPrototypeSentenceTranslation(sentence, paragraph, { refresh: true })
  }

  function translatePrototypeParagraph(paragraphId) {
    const paragraph = paragraphs.value.find((item) => item.id === paragraphId)

    if (!paragraph) {
      return Promise.resolve()
    }

    return loadPrototypeParagraphTranslation(paragraph)
  }

  return {
    clearPrototypeSentenceSelection,
    clearPrototypeTranslationState,
    displayParagraphs,
    loadPrototypeParagraphTranslation,
    loadPrototypeSentenceTranslation,
    retryPrototypeSentenceTranslation,
    retryPrototypeTranslation,
    selectPrototypeSentence,
    selectedSentenceId,
    selectedSentenceParagraphId,
    translatePrototypeParagraph,
    translationByParagraphId,
    translationBySentenceId,
    translationErrorByParagraphId,
    translationErrorBySentenceId,
    translationLoadingByParagraphId,
    translationLoadingBySentenceId,
  }
}
