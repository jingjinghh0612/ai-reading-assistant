import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import { loadEnv } from './loadEnv.js'

describe('server env loader', () => {
  it('loads .env.local before .env without overriding existing env values', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-env-'))
    fs.writeFileSync(path.join(tempDir, '.env'), 'DEEPSEEK_API_KEY=from-env\nDEEPSEEK_MODEL=from-env-model\n')
    fs.writeFileSync(path.join(tempDir, '.env.local'), 'DEEPSEEK_API_KEY=from-local\n')

    const targetEnv = {
      DEEPSEEK_MODEL: 'existing-model',
    }

    loadEnv({
      cwd: tempDir,
      env: targetEnv,
      force: true,
    })

    assert.equal(targetEnv.DEEPSEEK_API_KEY, 'from-local')
    assert.equal(targetEnv.DEEPSEEK_MODEL, 'existing-model')
  })
})
