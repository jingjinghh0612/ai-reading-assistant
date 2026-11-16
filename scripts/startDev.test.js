import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
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

  it('starts both entries with Node so Windows can launch them without a shell', async () => {
    const { createProcessSpecs } = await import('./startDev.js')
    const [server, vite] = createProcessSpecs()

    assert.deepEqual(server, {
      name: 'server',
      command: process.execPath,
      args: [path.join(repoRoot, 'server', 'index.js')],
    })
    assert.equal(vite.command, process.execPath)
    assert.deepEqual(vite.args.slice(1), ['--configLoader', 'native'])

    const result = spawnSync(vite.command, [...vite.args, '--version'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 5000,
    })
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /vite\//)
  })
})
