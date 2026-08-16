import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('development startup script', () => {
  it('exposes a single npm script that starts both frontend and backend services', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))

    assert.equal(packageJson.scripts['dev:all'], 'node scripts/startDev.js')
  })

  it('declares the backend server and Vite frontend commands', async () => {
    const { createProcessSpecs } = await import('./startDev.js')

    assert.deepEqual(createProcessSpecs('npm.cmd'), [
      {
        name: 'server',
        command: 'npm.cmd',
        args: ['run', 'server'],
      },
      {
        name: 'vite',
        command: 'npm.cmd',
        args: ['run', 'dev'],
      },
    ])
  })
})
