import { getStorageItem, setStorageItem } from './storage.js'

export const ARTICLE_HISTORY_STORAGE_KEY = 'ai-reading-article-history'
export const MAX_ARTICLE_HISTORY_ITEMS = 20

const STORAGE_ERROR = 'Unable to update article history in this browser.'
const TITLE_MAX_LENGTH = 80
const SNIPPET_MAX_LENGTH = 150

function compactText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 3).trim()}...`
}

function hashText(text) {
  let hash = 0

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }

  return hash.toString(36)
}

function createArticleId(content) {
  return `article-${hashText(compactText(content).toLowerCase())}`
}

function normalizeSentenceIndex(index) {
  const number = Number(index)
  return Number.isInteger(number) && number > 0 ? number : 0
}

function createTitle(content) {
  const firstLine = String(content || '')
    .split(/\r?\n/)
    .map((line) => compactText(line))
    .find(Boolean)

  return truncateText(firstLine || compactText(content) || 'Untitled article', TITLE_MAX_LENGTH)
}

function createSnippet(content) {
  return truncateText(compactText(content), SNIPPET_MAX_LENGTH)
}

function normalizeArticleItem(item) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const content = String(item.content || '').trim()

  if (!content) {
    return null
  }

  const id = item.id || createArticleId(content)
  const now = new Date().toISOString()

  return {
    id,
    title: item.title || createTitle(content),
    snippet: item.snippet || createSnippet(content),
    content,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.lastReadAt || item.createdAt || now,
    currentSentenceIndex: normalizeSentenceIndex(item.currentSentenceIndex),
  }
}

function sortByUpdatedAtDesc(articles) {
  return [...articles].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

function writeArticleHistory(articles) {
  const normalizedArticles = sortByUpdatedAtDesc(
    articles.map(normalizeArticleItem).filter(Boolean),
  ).slice(0, MAX_ARTICLE_HISTORY_ITEMS)

  const saved = setStorageItem(ARTICLE_HISTORY_STORAGE_KEY, JSON.stringify(normalizedArticles))

  return {
    saved,
    articles: saved ? normalizedArticles : getArticleHistory(),
  }
}

export function getArticleHistory() {
  try {
    const saved = JSON.parse(getStorageItem(ARTICLE_HISTORY_STORAGE_KEY, '[]'))

    if (!Array.isArray(saved)) {
      return []
    }

    const uniqueArticles = new Map()

    saved
      .map(normalizeArticleItem)
      .filter(Boolean)
      .forEach((item) => {
        if (!uniqueArticles.has(item.id)) {
          uniqueArticles.set(item.id, item)
        }
      })

    return sortByUpdatedAtDesc(Array.from(uniqueArticles.values())).slice(0, MAX_ARTICLE_HISTORY_ITEMS)
  } catch {
    return []
  }
}

export function getArticleById(articleId) {
  return getArticleHistory().find((article) => article.id === articleId) || null
}

export function saveArticleToHistory(content) {
  const trimmedContent = String(content || '').trim()

  if (!trimmedContent) {
    return {
      article: null,
      articles: getArticleHistory(),
    }
  }

  const articles = getArticleHistory()
  const id = createArticleId(trimmedContent)
  const existingArticle = articles.find((article) => article.id === id)
  const now = new Date().toISOString()
  const article = {
    id,
    title: createTitle(trimmedContent),
    snippet: createSnippet(trimmedContent),
    content: trimmedContent,
    createdAt: existingArticle?.createdAt || now,
    updatedAt: now,
    currentSentenceIndex: normalizeSentenceIndex(existingArticle?.currentSentenceIndex),
  }
  const nextArticles = [article, ...articles.filter((item) => item.id !== id)]
  const result = writeArticleHistory(nextArticles)

  if (!result.saved) {
    return {
      article: existingArticle || article,
      articles: result.articles,
      error: STORAGE_ERROR,
    }
  }

  return {
    article,
    articles: result.articles,
  }
}

export function deleteArticleFromHistory(articleId) {
  const articles = getArticleHistory()
  const nextArticles = articles.filter((article) => article.id !== articleId)

  if (nextArticles.length === articles.length) {
    return {
      deleted: false,
      articles,
    }
  }

  const result = writeArticleHistory(nextArticles)

  if (!result.saved) {
    return {
      deleted: false,
      articles: result.articles,
      error: STORAGE_ERROR,
    }
  }

  return {
    deleted: true,
    articles: result.articles,
  }
}

export function updateArticleProgress(articleId, sentenceIndex) {
  const articles = getArticleHistory()
  const targetArticle = articles.find((article) => article.id === articleId)

  if (!targetArticle) {
    return {
      article: null,
      articles,
    }
  }

  const updatedArticle = {
    ...targetArticle,
    updatedAt: new Date().toISOString(),
    currentSentenceIndex: normalizeSentenceIndex(sentenceIndex),
  }
  const result = writeArticleHistory([
    updatedArticle,
    ...articles.filter((article) => article.id !== articleId),
  ])

  if (!result.saved) {
    return {
      article: targetArticle,
      articles: result.articles,
      error: STORAGE_ERROR,
    }
  }

  return {
    article: updatedArticle,
    articles: result.articles,
  }
}
