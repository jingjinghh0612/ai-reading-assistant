import '../config/loadEnv.js'
import { GoogleGenAI } from '@google/genai'
import {
  createSummarizePrompt,
  createTranslatePrompt,
  createWordExplainPrompt,
} from './prompts.js'

const DEFAULT_MODEL = 'gemini-2.5-flash-lite'
const DEFAULT_TIMEOUT_MS = 25000
const DEFAULT_RETRY_COUNT = 2
const DEFAULT_RETRY_DELAY_MS = 1200
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const GEMINI_ERROR_MESSAGE = 'AI service is temporarily unavailable. Please try again.'
const GEMINI_QUOTA_ERROR_MESSAGE =
  'Gemini quota has been reached. Please wait and try again later, or use another API key/model.'
const translationCache = new Map()
const pendingTranslations = new Map()

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function readNumberEnv(name, fallbackValue) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallbackValue
}

function normalizeWord(word) {
  return word
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
    .trim()
}

function hasGeminiConfig() {
  return Boolean(process.env.GEMINI_API_KEY)
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL
}

function getGeminiTimeoutMs() {
  return readNumberEnv('GEMINI_TIMEOUT_MS', DEFAULT_TIMEOUT_MS)
}

function getGeminiRetryCount() {
  return readNumberEnv('GEMINI_RETRY_COUNT', DEFAULT_RETRY_COUNT)
}

function getGeminiRetryDelayMs() {
  return readNumberEnv('GEMINI_RETRY_DELAY_MS', DEFAULT_RETRY_DELAY_MS)
}

function getAiCacheTtlMs() {
  return readNumberEnv('AI_CACHE_TTL_MS', DEFAULT_CACHE_TTL_MS)
}

function createGeminiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  })
}

function isRetryableError(error) {
  if (isQuotaError(error)) {
    return false
  }

  const message = String(error?.message || '').toLowerCase()

  return (
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable') ||
    message.includes('429') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  )
}

function isQuotaError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('429') || message.includes('quota') || message.includes('resource_exhausted')
}

function getFriendlyGeminiError(error) {
  if (isQuotaError(error)) {
    return GEMINI_QUOTA_ERROR_MESSAGE
  }

  return GEMINI_ERROR_MESSAGE
}

function getSafeErrorSummary(error) {
  if (isQuotaError(error)) {
    return 'quota exceeded'
  }

  return error?.message || 'unknown error'
}

function createGeminiServiceError(error) {
  const serviceError = new Error(getFriendlyGeminiError(error))
  serviceError.statusCode = isQuotaError(error) ? 429 : 503
  return serviceError
}

function createTranslationCacheKey(text) {
  return `${getGeminiModel()}::${text.trim()}`
}

function getCachedValue(cache, key, options = {}) {
  const item = cache.get(key)

  if (!item) {
    return ''
  }

  const isExpired = Date.now() - item.savedAt > getAiCacheTtlMs()

  if (isExpired && !options.allowExpired) {
    return ''
  }

  return item.value
}

function setCachedValue(cache, key, value) {
  cache.set(key, {
    value,
    savedAt: Date.now(),
  })
}

function getPendingTranslation(cacheKey, requestFactory) {
  if (!pendingTranslations.has(cacheKey)) {
    pendingTranslations.set(
      cacheKey,
      requestFactory().finally(() => {
        pendingTranslations.delete(cacheKey)
      }),
    )
  }

  return pendingTranslations.get(cacheKey)
}

async function withTimeout(promise, timeoutMs) {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Gemini request timeout after ${timeoutMs}ms.`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}

async function callGeminiOnce(prompt) {
  const ai = createGeminiClient()
  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: prompt,
  })

  const text = response.text?.trim()

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  return text
}

async function callGemini(prompt) {
  const timeoutMs = getGeminiTimeoutMs()
  const retryCount = getGeminiRetryCount()
  const retryDelayMs = getGeminiRetryDelayMs()
  let lastError

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await withTimeout(callGeminiOnce(prompt), timeoutMs)
    } catch (error) {
      lastError = error

      if (attempt >= retryCount || !isRetryableError(error)) {
        break
      }

      await wait(retryDelayMs * (attempt + 1))
    }
  }

  console.warn(`Gemini request failed after retries: ${getSafeErrorSummary(lastError)}`)
  throw createGeminiServiceError(lastError)
}

async function useMockWithoutApiKey(mockRequest, delayMs = 300) {
  await wait(delayMs)
  return mockRequest()
}

function cleanTextResponse(text) {
  return text
    .replace(/^```[\w-]*\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^translation\s*:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim()
}

function parseJsonObject(text) {
  const cleanedText = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(cleanedText)
  } catch {
    const jsonStart = cleanedText.indexOf('{')
    const jsonEnd = cleanedText.lastIndexOf('}')

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      return null
    }

    try {
      return JSON.parse(cleanedText.slice(jsonStart, jsonEnd + 1))
    } catch {
      return null
    }
  }
}

const MOCK_WORDS = {
  learn: {
    meaning: '学习；掌握',
    definition: 'To get knowledge or skill by study or practice.',
    partOfSpeech: 'verb',
    example: 'I learn English by reading every day.',
  },
  reading: {
    meaning: '阅读；读物',
    definition: 'The activity of looking at and understanding written words.',
    partOfSpeech: 'noun',
    example: 'Reading helps you notice useful sentence patterns.',
  },
  language: {
    meaning: '语言',
    definition: 'A system of words people use to communicate.',
    partOfSpeech: 'noun',
    example: 'Language becomes easier when you meet it often.',
  },
  important: {
    meaning: '重要的',
    definition: 'Having great value or effect.',
    partOfSpeech: 'adjective',
    example: 'It is important to review new words.',
  },
  practice: {
    meaning: '练习；实践',
    definition: 'Repeated activity that helps you improve a skill.',
    partOfSpeech: 'noun / verb',
    example: 'Practice makes difficult words feel familiar.',
  },
}

function mockTranslateSentence(text) {
  return `模拟翻译：${text}`
}

function mockExplainWord(word) {
  const normalizedWord = normalizeWord(word)
  const mock = MOCK_WORDS[normalizedWord]

  if (mock) {
    return {
      word,
      ...mock,
    }
  }

  return {
    word,
    meaning: '',
    definition: '',
    partOfSpeech: '',
    example: '',
  }
}

function mockSummarizeText(text) {
  const shortText = text.length > 80 ? `${text.slice(0, 80)}...` : text

  return {
    summary: `模拟摘要：${shortText}`,
    keywords: ['reading', 'english', 'practice'],
  }
}

export async function translateSentence(text) {
  if (!hasGeminiConfig()) {
    return useMockWithoutApiKey(() => mockTranslateSentence(text), 400)
  }

  const cacheKey = createTranslationCacheKey(text)
  const cachedTranslation = getCachedValue(translationCache, cacheKey)

  if (cachedTranslation) {
    return cachedTranslation
  }

  try {
    return await getPendingTranslation(cacheKey, async () => {
      const prompt = createTranslatePrompt(text)
      const translation = cleanTextResponse(await callGemini(prompt))

      if (!translation) {
        throw new Error(GEMINI_ERROR_MESSAGE)
      }

      setCachedValue(translationCache, cacheKey, translation)
      return translation
    })
  } catch (error) {
    const staleTranslation = getCachedValue(translationCache, cacheKey, {
      allowExpired: true,
    })

    if (staleTranslation) {
      console.warn('Gemini failed, using stale translation cache.')
      return staleTranslation
    }

    throw error
  }
}

export async function explainWord(word) {
  if (!hasGeminiConfig()) {
    return useMockWithoutApiKey(() => mockExplainWord(word), 300)
  }

  const prompt = createWordExplainPrompt(word)
  const parsed = parseJsonObject(await callGemini(prompt))

  if (!parsed) {
    throw new Error('AI returned an invalid word explanation. Please try again.')
  }

  return {
    word: parsed.word || word,
    meaning: parsed.meaning || '',
    definition: parsed.definition || '',
    partOfSpeech: parsed.partOfSpeech?.toLowerCase?.() === 'unknown' ? '' : parsed.partOfSpeech || '',
    example: parsed.example || '',
  }
}

export async function summarizeText(text) {
  if (!hasGeminiConfig()) {
    return useMockWithoutApiKey(() => mockSummarizeText(text), 400)
  }

  const prompt = createSummarizePrompt(text)
  const parsed = parseJsonObject(await callGemini(prompt))

  if (!parsed) {
    throw new Error('AI returned an invalid summary. Please try again.')
  }

  return {
    summary: parsed.summary || '',
    keywords: normalizeKeywords(parsed.keywords),
  }
}

function normalizeKeywords(keywords) {
  if (!Array.isArray(keywords)) {
    return []
  }

  return keywords
    .filter((keyword) => typeof keyword === 'string' && keyword.trim())
    .map((keyword) => keyword.trim())
    .slice(0, 3)
}
