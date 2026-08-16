import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readClipboardText } from './clipboard.js'

describe('clipboard utilities', () => {
  it('returns trimmed text from a readable clipboard', async () => {
    const result = await readClipboardText({
      clipboard: {
        readText: async () => '  Article text.  ',
      },
    })

    assert.deepEqual(result, {
      ok: true,
      text: 'Article text.',
      reason: '',
    })
  })

  it('reports unsupported when the Clipboard API is unavailable', async () => {
    const result = await readClipboardText({})

    assert.deepEqual(result, {
      ok: false,
      text: '',
      reason: 'unsupported',
    })
  })

  it('reports empty when clipboard text is blank after trimming', async () => {
    const result = await readClipboardText({
      clipboard: {
        readText: async () => '   \n  ',
      },
    })

    assert.deepEqual(result, {
      ok: false,
      text: '',
      reason: 'empty',
    })
  })

  it('reports denied when clipboard reading throws', async () => {
    const result = await readClipboardText({
      clipboard: {
        readText: async () => {
          throw new Error('Permission denied')
        },
      },
    })

    assert.deepEqual(result, {
      ok: false,
      text: '',
      reason: 'denied',
    })
  })
})
