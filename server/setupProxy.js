import { ProxyAgent, setGlobalDispatcher } from 'undici'

function getProxyUrl() {
  return (
    process.env.GEMINI_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy ||
    process.env.all_proxy ||
    ''
  )
}

function isInvalidLocalProxy(proxyUrl) {
  try {
    const url = new URL(proxyUrl)
    return ['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '9'
  } catch {
    return true
  }
}

function hideProxyAuth(proxyUrl) {
  const url = new URL(proxyUrl)
  url.username = ''
  url.password = ''
  return url.toString().replace(/\/$/, '')
}

export function setupProxy() {
  const proxyUrl = getProxyUrl()

  if (!proxyUrl) {
    return
  }

  if (isInvalidLocalProxy(proxyUrl)) {
    console.warn('Invalid proxy 127.0.0.1:9 ignored. Set GEMINI_PROXY_URL instead.')
    return
  }

  setGlobalDispatcher(new ProxyAgent(proxyUrl))
  console.log(`Gemini proxy enabled: ${hideProxyAuth(proxyUrl)}`)
}
