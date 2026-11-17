import '../config/loadEnv.js'
import {
  createSummarizePrompt,
  createTranslatePrompt,
  createWordExplainPrompt,
} from './prompts.js'

const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash'
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const AI_ERROR_MESSAGE = 'AI service is temporarily unavailable. Please try again.'
const TRANSLATION_ERROR_MESSAGE = '翻译失败，请稍后重试。'
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions'
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

function hasDeepSeekConfig() {
  return Boolean(process.env.DEEPSEEK_API_KEY)
}

function getDeepSeekModel() {
  return process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL
}

function getAiCacheTtlMs() {
  return readNumberEnv('AI_CACHE_TTL_MS', DEFAULT_CACHE_TTL_MS)
}

function createAiServiceError(message, statusCode = 503) {
  const serviceError = new Error(message)
  serviceError.statusCode = statusCode
  return serviceError
}

function createTranslationCacheKey(text, type = 'sentence') {
  return `${getDeepSeekModel()}:${type}::${text.trim()}`
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

async function callDeepSeek(prompt, errorMessage = AI_ERROR_MESSAGE) {
  if (!hasDeepSeekConfig()) {
    throw createAiServiceError('DeepSeek API key is not configured.', 500)
  }

  let response

  try {
    response = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: getDeepSeekModel(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        thinking: {
          type: 'disabled',
        },
        stream: false,
      }),
    })
  } catch {
    throw createAiServiceError(errorMessage)
  }

  let data

  try {
    data = await response.json()
  } catch {
    throw createAiServiceError(errorMessage)
  }

  if (!response.ok) {
    throw createAiServiceError(errorMessage, response.status || 503)
  }

  const content = data?.choices?.[0]?.message?.content
  const text = typeof content === 'string' ? content.trim() : ''

  if (!text) {
    throw createAiServiceError(errorMessage)
  }

  return text
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

export async function translateSentence(text, type = 'sentence') {
  const cacheKey = createTranslationCacheKey(text, type)
  const cachedTranslation = getCachedValue(translationCache, cacheKey)

  if (cachedTranslation) {
    return cachedTranslation
  }

  try {
    return await getPendingTranslation(cacheKey, async () => {
      const prompt = createTranslatePrompt(text, type)
      const translation = cleanTextResponse(await callDeepSeek(prompt, TRANSLATION_ERROR_MESSAGE))

      if (!translation) {
        throw createAiServiceError(TRANSLATION_ERROR_MESSAGE)
      }

      setCachedValue(translationCache, cacheKey, translation)
      return translation
    })
  } catch (error) {
    const staleTranslation = getCachedValue(translationCache, cacheKey, {
      allowExpired: true,
    })

    if (staleTranslation) {
      console.warn('AI translation failed, using stale translation cache.')
      return staleTranslation
    }

    throw error
  }
}

export async function explainWord(word) {
  if (!hasDeepSeekConfig()) {
    return useMockWithoutApiKey(() => mockExplainWord(word), 300)
  }

  const prompt = createWordExplainPrompt(word)
  const parsed = parseJsonObject(await callDeepSeek(prompt))

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
  if (!hasDeepSeekConfig()) {
    return useMockWithoutApiKey(() => mockSummarizeText(text), 400)
  }

  const prompt = createSummarizePrompt(text)
  const parsed = parseJsonObject(await callDeepSeek(prompt))

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
