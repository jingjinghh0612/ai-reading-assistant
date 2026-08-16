export async function readClipboardText(source = globalThis.navigator) {
  if (!source?.clipboard || typeof source.clipboard.readText !== 'function') {
    return {
      ok: false,
      text: '',
      reason: 'unsupported',
    }
  }

  try {
    const text = String(await source.clipboard.readText()).trim()

    if (!text) {
      return {
        ok: false,
        text: '',
        reason: 'empty',
      }
    }

    return {
      ok: true,
      text,
      reason: '',
    }
  } catch {
    return {
      ok: false,
      text: '',
      reason: 'denied',
    }
  }
}
