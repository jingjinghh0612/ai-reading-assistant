import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const routerSource = readFileSync(new URL('./index.js', import.meta.url), 'utf8')

describe('router entry contract', () => {
  it('opens the reader workspace from the root URL and keeps the old home page available', () => {
    assert.match(
      routerSource,
      /path:\s*['"]\/['"][\s\S]*redirect:\s*['"]\/reader['"]/,
    )
    assert.match(
      routerSource,
      /path:\s*['"]\/home['"][\s\S]*name:\s*['"]home['"][\s\S]*component:\s*Home/,
    )
  })

  it('uses the new reader workspace as the primary /reader entry', () => {
    assert.match(routerSource, /import\s+ReaderLegacy\s+from\s+['"]\.\.\/pages\/ReaderLegacy\.vue['"]/)
    assert.match(routerSource, /import\s+ReaderWorkspace\s+from\s+['"]\.\.\/pages\/ReaderWorkspace\.vue['"]/)
    assert.match(
      routerSource,
      /path:\s*['"]\/reader['"][\s\S]*name:\s*['"]reader['"][\s\S]*component:\s*ReaderWorkspace[\s\S]*meta:\s*\{[\s\S]*standalone:\s*true/,
    )
  })

  it('keeps compatibility routes for the old reader and prototype URL', () => {
    assert.match(
      routerSource,
      /path:\s*['"]\/reader-prototype['"],\s*name:\s*['"]reader-prototype['"],\s*component:\s*ReaderWorkspace,\s*meta:\s*\{\s*standalone:\s*true/,
    )
    assert.match(
      routerSource,
      /path:\s*['"]\/reader-legacy['"][\s\S]*name:\s*['"]reader-legacy['"][\s\S]*component:\s*ReaderLegacy/,
    )
  })
})
