import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { lookupWord } from './wordLookupService.js'
import { explainWord, summarizeText, translateSentence } from './aiService.js'

const ORIGINAL_ENV = { ...process.env }
const originalFetch = globalThis.fetch

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }

  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value
  }
}

function clearAiEnv() {
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.DEEPSEEK_TIMEOUT_MS
  delete process.env.DEEPSEEK_MODEL
}

function installDeepSeekFetch(responseFactory) {
  const calls = []

  globalThis.fetch = async (url, options = {}) => {
    calls.push({
      url,
      options,
      body: JSON.parse(options.body || '{}'),
    })

    return responseFactory(options)
  }

  return calls
}

describe('DeepSeek AI service', () => {
  beforeEach(() => {
    resetEnv()
    clearAiEnv()
  })

  afterEach(() => {
    resetEnv()
    globalThis.fetch = originalFetch
  })

  it('calls the DeepSeek chat completions endpoint for translation', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'

    const calls = installDeepSeekFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'translated sentence' } }],
      }),
    }))

    const translation = await translateSentence('The quiet room felt clear.', 'sentence')

    assert.equal(translation, 'translated sentence')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://api.deepseek.com/chat/completions')
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-deepseek-key')
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json')
    assert.equal(calls[0].body.model, 'deepseek-v4-flash')
    assert.deepEqual(calls[0].body.thinking, { type: 'disabled' })
    assert.equal(calls[0].body.stream, false)
  })

  it('uses the translation cache on repeated DeepSeek requests for the same text and type', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'

    const calls = installDeepSeekFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'cached translation' } }],
      }),
    }))

    const firstTranslation = await translateSentence('Cache this exact sentence.', 'sentence')
    const secondTranslation = await translateSentence('Cache this exact sentence.', 'sentence')

    assert.equal(firstTranslation, 'cached translation')
    assert.equal(secondTranslation, 'cached translation')
    assert.equal(calls.length, 1)
  })

  it('uses the sentence translation prompt for DeepSeek sentence requests', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'

    const calls = installDeepSeekFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '句子译文。' } }],
      }),
    }))

    await translateSentence('A single sentence.', 'sentence')

    const prompt = calls[0].body.messages[0].content

    assert.match(prompt, /请把下面英文句子翻译成自然中文/)
    assert.match(prompt, /只输出译文，不要解释，不要加引号/)
    assert.match(prompt, /英文：\s*A single sentence\./)
  })

  it('uses the paragraph translation prompt for DeepSeek paragraph requests', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'

    const calls = installDeepSeekFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '段落译文。' } }],
      }),
    }))

    await translateSentence('First sentence. Second sentence.', 'paragraph')

    const prompt = calls[0].body.messages[0].content

    assert.match(prompt, /请把下面英文段落翻译成自然中文/)
    assert.match(prompt, /保留原意，适合中文读者阅读/)
    assert.match(prompt, /只输出译文，不要解释/)
  })

  it('returns a configuration error when translation has no API key', async () => {
    const calls = installDeepSeekFetch(() => {
      throw new Error('fetch should not be called')
    })

    await assert.rejects(
      () => translateSentence('Missing key.', 'sentence'),
      /DeepSeek API key is not configured/,
    )
    assert.equal(calls.length, 0)
  })

  it('normalizes DeepSeek API failures to a safe translation error', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'

    installDeepSeekFetch(() => ({
      ok: false,
      status: 401,
      json: async () => ({
        error: { message: 'invalid api key test-deepseek-key' },
      }),
    }))

    await assert.rejects(
      () => translateSentence('Unauthorized.', 'sentence'),
      /翻译失败，请稍后重试。/,
    )
  })

  it('uses DeepSeek for word explanations', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'

    const detail = {
      word: 'learn',
      meaning: '学习',
      definition: 'To gain knowledge.',
      partOfSpeech: 'verb',
      example: 'I learn English.',
    }
    const calls = installDeepSeekFetch(() => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(detail) } }] }),
    }))

    assert.deepEqual(await explainWord('learn'), detail)
    assert.match(calls[0].body.messages[0].content, /Word:\s+learn/)
  })

  it('uses DeepSeek for summaries', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'

    const summary = { summary: '持续阅读有助于学习英语。', keywords: ['reading', 'learning', 'English'] }
    const calls = installDeepSeekFetch(() => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(summary) } }] }),
    }))

    assert.deepEqual(await summarizeText('Read English regularly.'), summary)
    assert.match(calls[0].body.messages[0].content, /Article:\s+Read English regularly\./)
  })

  it('keeps local word and summary examples available without an API key', async () => {
    const calls = installDeepSeekFetch(() => {
      throw new Error('DeepSeek should not be called')
    })

    const [detail, summary] = await Promise.all([explainWord('learn'), summarizeText('Read every day.')])

    assert.match(detail.meaning, /学习/)
    assert.match(summary.summary, /模拟摘要：Read every day\./)
    assert.equal(calls.length, 0)
  })
  function waitForAbort(signal) {
    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    })
  }

  for (const phase of ['fetch', 'json']) {
    for (const [name, request, message] of [
      ['word explanation', () => explainWord('timeoutword'), 'AI service is temporarily unavailable. Please try again.'],
      ['summary', () => summarizeText('Timeout summary.'), 'AI service is temporarily unavailable. Please try again.'],
      ['translation', () => translateSentence('Timeout translation ' + phase), '翻译失败，请稍后重试。'],
    ]) {
      it(`bounds ${name} when ${phase} stalls, using one deadline`, async (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] })
        process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'
        process.env.DEEPSEEK_TIMEOUT_MS = '20'
        let bodyStarted = false
        const calls = installDeepSeekFetch(async ({ signal }) => {
          if (phase === 'fetch') return waitForAbort(signal)
          await new Promise((resolve) => setTimeout(resolve, 10))
          return {
            ok: true,
            json: () => {
              bodyStarted = true
              return waitForAbort(signal)
            },
          }
        })
        const rejected = assert.rejects(request(), { message, statusCode: 503 })
        if (phase === 'json') {
          t.mock.timers.tick(10)
          await setImmediate()
          assert.equal(bodyStarted, true)
          t.mock.timers.tick(9)
        } else {
          t.mock.timers.tick(19)
        }
        assert.equal(calls[0].options.signal.aborted, false)
        t.mock.timers.tick(1)
        await rejected
        assert.equal(calls[0].options.signal.aborted, true)
        assert.equal(calls.length, 1)
      })
    }

    it(`clears shared pending word lookups after a ${phase} timeout`, async (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] })
      process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'
      process.env.DEEPSEEK_TIMEOUT_MS = '20'
      const pendingRequests = new Map()
      const cache = new Map()
      const options = { pendingRequests, cache, localLookup: () => null, enableExternalDictionary: false }
      const calls = installDeepSeekFetch(({ signal }) => phase === 'fetch'
        ? waitForAbort(signal)
        : { ok: true, json: () => waitForAbort(signal) })
      const first = lookupWord('timeoutword', options)
      const second = lookupWord('timeoutword', options)
      await setImmediate()
      assert.equal(calls.length, 1)
      assert.equal(pendingRequests.size, 1)
      t.mock.timers.tick(20)
      const details = await Promise.all([first, second])
      assert.equal(details[0].source, 'fallback')
      assert.deepEqual(details[0], details[1])
      assert.equal(pendingRequests.size, 0)
      // The existing lookup service caches fallback results; evict to verify a fresh request.
      cache.clear()
      installDeepSeekFetch(() => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"meaning":"恢复"}' } }] }),
      }))
      assert.equal((await lookupWord('timeoutword', options)).meaning, '恢复')
      assert.equal(pendingRequests.size, 0)
    })
  }

  for (const outcome of ['success', 'http-error', 'network-error', 'invalid-json']) {
    it(`clears the timeout after ${outcome}`, async (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] })
      process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'
      process.env.DEEPSEEK_TIMEOUT_MS = '20'
      const calls = installDeepSeekFetch(() => {
        if (outcome === 'network-error') throw new Error('network failed')
        return {
          ok: outcome !== 'http-error',
          status: 401,
          json: async () => {
            if (outcome === 'invalid-json') throw new SyntaxError('bad json')
            return { choices: [{ message: { content: '{"meaning":"成功"}' } }] }
          },
        }
      })
      if (outcome === 'success') {
        assert.equal((await explainWord('cleanup')).meaning, '成功')
      } else {
        await assert.rejects(explainWord('cleanup'), {
          statusCode: outcome === 'http-error' ? 401 : 503,
        })
      }
      t.mock.timers.tick(100)
      assert.equal(calls[0].options.signal.aborted, false)
    })
  }

  for (const invalid of [undefined, '0', '-1', 'not-a-number']) {
    it(`uses the 25-second default for timeout setting ${invalid}`, async (t) => {
      t.mock.timers.enable({ apis: ['setTimeout'] })
      process.env.DEEPSEEK_API_KEY = 'test-deepseek-key'
      if (invalid !== undefined) process.env.DEEPSEEK_TIMEOUT_MS = invalid
      const calls = installDeepSeekFetch(({ signal }) => waitForAbort(signal))
      const rejected = assert.rejects(explainWord('defaulttimeout'), { statusCode: 503 })
      t.mock.timers.tick(24999)
      assert.equal(calls[0].options.signal.aborted, false)
      t.mock.timers.tick(1)
      await rejected
    })
  }

})
