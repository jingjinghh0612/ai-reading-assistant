const REQUEST_TIMEOUT_MS = 90000

export async function postJson(url, payload, fallbackErrorMessage) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  let response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }

    throw new Error(fallbackErrorMessage)
  } finally {
    clearTimeout(timeoutId)
  }

  let data = {}

  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok) {
    throw new Error(data.message || fallbackErrorMessage)
  }

  return data
}
