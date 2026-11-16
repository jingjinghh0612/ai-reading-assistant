import { computed, ref } from 'vue'
import { requestTranslation as defaultRequestTranslation } from '../api/translate.js'
import {
  getLocalParagraphTranslation,
  getLocalSentenceTranslation,
  getParagraphSourceText,
  getSentenceSourceText,
  createTranslationStateKey,
} from '../data/readerWorkspaceSelectors.js'
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

  function getChapterStateId() {
    if (isPastedArticleActive.value && currentChapterContent.value?.id === pastedChapterContent.value?.id) {
      return `${currentChapterContent.value.id}:${pastedArticleVersion.value}`
    }

    return currentChapter.value?.id || currentChapterContent.value?.id || 'chapter'
  }

  function getParagraphStateKey(paragraph) {
    return createTranslationStateKey(getChapterStateId(), paragraph?.id || '', 'paragraph')
  }

  function getSentenceStateKey(sentence, paragraph) {
    return createTranslationStateKey(
      getChapterStateId(),
      paragraph?.id || selectedSentenceParagraphId.value || '',
      sentence?.id || selectedSentenceId.value || '',
    )
  }

  const displayParagraphs = computed(() =>
    paragraphs.value.map((paragraph) => {
      const paragraphStateKey = getParagraphStateKey(paragraph)
      const localTranslation = getLocalParagraphTranslation(paragraph)

      return {
        ...paragraph,
        translation: localTranslation || translationByParagraphId.value[paragraphStateKey] || '',
        isTranslationLoading: Boolean(translationLoadingByParagraphId.value[paragraphStateKey]),
        translationErrorMessage: translationErrorByParagraphId.value[paragraphStateKey] || '',
        sentences: (paragraph.sentences || []).map((sentence) => {
          const sentenceStateKey = getSentenceStateKey(sentence, paragraph)
          const localSentenceTranslation = getLocalSentenceTranslation(sentence)

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

  function clearSentenceSelection() {
    selectedSentenceId.value = ''
    selectedSentenceParagraphId.value = ''
  }

  function clearTranslationState() {
    // 清空翻译状态时废弃旧请求版本，防止迟到的译文写回。
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

  function requestCachedTranslation(sourceText, translationType, options = {}) {
    // 按原文和翻译类型查缓存，重复请求共享进行中的翻译，手动重试会重新请求。
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

  async function loadParagraphTranslation(paragraph, options = {}) {
    const paragraphStateKey = getParagraphStateKey(paragraph)
    const sourceText = getParagraphSourceText(paragraph)

    if (!paragraphStateKey || !sourceText || getLocalParagraphTranslation(paragraph)) {
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
      const translation = await requestCachedTranslation(sourceText, 'paragraph', options)

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

  function retryParagraphTranslation(paragraphId) {
    const paragraph = paragraphs.value.find((item) => item.id === paragraphId)

    if (!paragraph) {
      return Promise.resolve()
    }

    const paragraphStateKey = getParagraphStateKey(paragraph)
    setRecordValue(translationByParagraphId, paragraphStateKey, '')
    setRecordValue(translationErrorByParagraphId, paragraphStateKey, '')

    return loadParagraphTranslation(paragraph, { refresh: true })
  }

  async function loadSentenceTranslation(sentence, paragraph, options = {}) {
    const sentenceStateKey = getSentenceStateKey(sentence, paragraph)
    const sourceText = getSentenceSourceText(sentence)

    if (!sentenceStateKey || !sourceText || getLocalSentenceTranslation(sentence)) {
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
      const translation = await requestCachedTranslation(sourceText, 'sentence', options)

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

  function selectSentence({ sentence, paragraph }) {
    if (!sentence?.id || !paragraph?.id) {
      return Promise.resolve()
    }

    selectedSentenceId.value = sentence.id
    selectedSentenceParagraphId.value = paragraph.id

    return loadSentenceTranslation(sentence, paragraph)
  }

  function retrySentenceTranslation({ sentenceId, paragraphId }) {
    const paragraph = paragraphs.value.find((item) => item.id === paragraphId)
    const sentence = paragraph?.sentences?.find((item) => item.id === sentenceId)

    if (!paragraph || !sentence) {
      return Promise.resolve()
    }

    selectedSentenceId.value = sentence.id
    selectedSentenceParagraphId.value = paragraph.id
    const sentenceStateKey = getSentenceStateKey(sentence, paragraph)
    setRecordValue(translationBySentenceId, sentenceStateKey, '')
    setRecordValue(translationErrorBySentenceId, sentenceStateKey, '')

    return loadSentenceTranslation(sentence, paragraph, { refresh: true })
  }

  function translateParagraph(paragraphId) {
    const paragraph = paragraphs.value.find((item) => item.id === paragraphId)

    if (!paragraph) {
      return Promise.resolve()
    }

    return loadParagraphTranslation(paragraph)
  }

  return {
    clearSentenceSelection,
    clearTranslationState,
    displayParagraphs,
    loadParagraphTranslation,
    loadSentenceTranslation,
    retrySentenceTranslation,
    retryParagraphTranslation,
    selectSentence,
    selectedSentenceId,
    selectedSentenceParagraphId,
    translateParagraph,
    translationByParagraphId,
    translationBySentenceId,
    translationErrorByParagraphId,
    translationErrorBySentenceId,
    translationLoadingByParagraphId,
    translationLoadingBySentenceId,
  }
}
