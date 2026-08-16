import { explainWord } from './aiService.js'
import { lookupLocalWordDefinition } from './localDictionaryService.js'

const DEFAULT_EXTERNAL_DICTIONARY_TIMEOUT_MS = 5000
const prototypeWordCache = new Map()
const pendingPrototypeWords = new Map()

function readNumberEnv(name, fallbackValue) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallbackValue
}

function getExternalDictionaryTimeoutMs() {
  return readNumberEnv('EXTERNAL_DICTIONARY_TIMEOUT_MS', DEFAULT_EXTERNAL_DICTIONARY_TIMEOUT_MS)
}

function normalizeWord(word) {
  return word
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
    .trim()
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isExternalDetailUsable(detail) {
  return Boolean(normalizeText(detail?.meaning))
}

function isExternalDictionaryEnabled(options) {
  if (typeof options.enableExternalDictionary === 'boolean') {
    return options.enableExternalDictionary
  }

  return process.env.EXTERNAL_DICTIONARY_ENABLED !== 'false'
}

function normalizeLookupDetail(detail, source, fallbackWord) {
  return {
    word: normalizeText(detail?.word) || fallbackWord,
    meaning: normalizeText(detail?.meaning),
    definition: normalizeText(detail?.definition),
    partOfSpeech: normalizeText(detail?.partOfSpeech),
    example: normalizeText(detail?.example),
    phonetic: normalizeText(detail?.phonetic),
    source,
  }
}

export async function lookupPrototypeWord(word, options = {}) {
  const normalizedWord = normalizeWord(word)

  if (!normalizedWord) {
    return normalizeLookupDetail(null, 'empty', word)
  }

  const cache = options.cache || prototypeWordCache
  const pendingRequests = options.pendingRequests || pendingPrototypeWords
  const cacheKey = normalizedWord
  const cachedDetail = cache.get(cacheKey)

  if (cachedDetail) {
    return {
      ...cachedDetail,
      source: 'cache',
    }
  }

  if (!pendingRequests.has(cacheKey)) {
    pendingRequests.set(
      cacheKey,
      resolvePrototypeWordLookup(word, cacheKey, cache, options).finally(() => {
        pendingRequests.delete(cacheKey)
      }),
    )
  }

  return pendingRequests.get(cacheKey)
}

async function resolvePrototypeWordLookup(word, cacheKey, cache, options) {
  const localLookup = options.localLookup || lookupLocalWordDefinition
  const externalLookup = options.externalLookup || fetchExternalDictionaryDetail
  const aiLookup = options.aiLookup || explainWord
  const localDetail = localLookup(word)
  let externalDetail = null

  if (isExternalDetailUsable(localDetail)) {
    const detail = normalizeLookupDetail(localDetail, 'local-dictionary', word)
    cache.set(cacheKey, detail)
    return detail
  }

  if (isExternalDictionaryEnabled(options)) {
    try {
      externalDetail = await externalLookup(word)
    } catch (error) {
      console.warn(`External dictionary failed for "${word}": ${error?.message || 'unknown error'}`)
    }
  }

  if (isExternalDetailUsable(externalDetail)) {
    const detail = normalizeLookupDetail(externalDetail, 'external-dictionary', word)
    cache.set(cacheKey, detail)
    return detail
  }

  try {
    const aiDetail = normalizeLookupDetail(await aiLookup(word), 'ai', word)
    cache.set(cacheKey, aiDetail)
    return aiDetail
  } catch (error) {
    console.warn(`AI word lookup failed for "${word}": ${error?.message || 'unknown error'}`)
    const fallbackDetail = normalizeLookupDetail(null, 'fallback', word)
    cache.set(cacheKey, fallbackDetail)
    return fallbackDetail
  }
}

async function fetchExternalDictionaryDetail(word) {
  const [translationResult, dictionaryResult] = await Promise.allSettled([
    fetchChineseWordTranslation(word),
    fetchFreeDictionaryEntry(word),
  ])
  const meaning = translationResult.status === 'fulfilled' ? translationResult.value : ''

  if (!meaning) {
    return null
  }

  const dictionaryDetail = dictionaryResult.status === 'fulfilled' ? dictionaryResult.value : {}

  return {
    word,
    meaning,
    definition: dictionaryDetail.definition || '',
    partOfSpeech: dictionaryDetail.partOfSpeech || '',
    example: dictionaryDetail.example || '',
    phonetic: dictionaryDetail.phonetic || '',
  }
}

async function fetchChineseWordTranslation(word) {
  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', word)
  url.searchParams.set('langpair', 'en|zh-CN')
  url.searchParams.set('mt', '1')

  if (process.env.MYMEMORY_EMAIL) {
    url.searchParams.set('de', process.env.MYMEMORY_EMAIL)
  }

  const data = await fetchJson(url)
  const responseStatus = Number(data?.responseStatus)

  if (Number.isFinite(responseStatus) && responseStatus >= 400) {
    return ''
  }

  return normalizeExternalTranslation(data?.responseData?.translatedText, word)
}

function normalizeExternalTranslation(value, sourceWord) {
  const text = normalizeText(value)

  if (!text) {
    return ''
  }

  const normalizedSource = normalizeWord(sourceWord)
  const normalizedTranslation = normalizeWord(text)

  if (normalizedTranslation && normalizedTranslation === normalizedSource) {
    return ''
  }

  if (/^mymemory warning/i.test(text) || /^quota exceeded/i.test(text)) {
    return ''
  }

  return text
}

async function fetchFreeDictionaryEntry(word) {
  const lookupWord = normalizeWord(word)

  if (!lookupWord) {
    return {}
  }

  const data = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookupWord)}`)
  const entry = Array.isArray(data) ? data[0] : null
  const meaning = entry?.meanings?.find((item) => item?.definitions?.length)
  const definition = meaning?.definitions?.[0]

  return {
    definition: normalizeText(definition?.definition),
    partOfSpeech: normalizeText(meaning?.partOfSpeech),
    example: normalizeText(definition?.example),
    phonetic: normalizeText(entry?.phonetic) || normalizeText(entry?.phonetics?.find((item) => item?.text)?.text),
  }
}

async function fetchJson(url) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, getExternalDictionaryTimeoutMs())

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}
