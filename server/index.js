import './config/loadEnv.js'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { explainWord, summarizeText, translateSentence } from './services/aiService.js'
import { lookupWord } from './services/wordLookupService.js'
import { setupProxy } from './setupProxy.js'

const app = express()
const PORT = 3001
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../dist')

setupProxy()

app.use(express.json())
app.use(express.static(distPath))

app.get('/api/health', (request, response) => {
  response.json({ ok: true })
})

function sendApiError(response, error, fallbackMessage) {
  response.status(error.statusCode || 500).json({
    message: error.message || fallbackMessage,
  })
}

app.post('/api/translate', async (request, response) => {
  const text = request.body?.text?.trim()
  const type = request.body?.type === 'paragraph' ? 'paragraph' : 'sentence'

  if (!text) {
    response.status(400).json({
      message: 'Text is required.',
    })
    return
  }

  try {
    const translation = await translateSentence(text, type)

    response.json({
      translation,
    })
  } catch (error) {
    sendApiError(response, error, 'Translation failed.')
  }
})

app.post('/api/word-explain', async (request, response) => {
  const word = request.body?.word?.trim()

  if (!word) {
    response.status(400).json({
      message: 'Word is required.',
    })
    return
  }

  try {
    const detail = await explainWord(word)
    response.json(detail)
  } catch (error) {
    sendApiError(response, error, 'Word explanation failed.')
  }
})

// 新旧查词地址共用同一处理函数，旧客户端可继续调用原地址。
app.post(['/api/word-lookup', '/api/prototype-word-explain'], async (request, response) => {
  const word = request.body?.word?.trim()

  if (!word) {
    response.status(400).json({
      message: 'Word is required.',
    })
    return
  }

  try {
    const detail = await lookupWord(word)
    response.json(detail)
  } catch (error) {
    sendApiError(response, error, 'Word lookup failed.')
  }
})

app.post('/api/summarize', async (request, response) => {
  const text = request.body?.text?.trim()

  if (!text) {
    response.status(400).json({
      message: 'Text is required.',
    })
    return
  }

  try {
    const result = await summarizeText(text)

    response.json(result)
  } catch (error) {
    sendApiError(response, error, 'Summarization failed.')
  }
})

app.get(/.*/, (request, response) => {
  response.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Translation server is running at http://127.0.0.1:${PORT}`)
})
