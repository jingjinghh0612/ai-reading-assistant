import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const routerSource = readFileSync(new URL('./index.js', import.meta.url), 'utf8')

describe('router entry contract', () => {
  it('uses the new reader workspace as the primary /reader entry', () => {
    assert.match(routerSource, /import\s+ReaderLegacy\s+from\s+['"]\.\.\/pages\/Reader\.vue['"]/)
    assert.match(routerSource, /import\s+Reader\s+from\s+['"]\.\.\/pages\/ReaderPrototype\.vue['"]/)
    assert.match(
      routerSource,
      /path:\s*['"]\/reader['"][\s\S]*name:\s*['"]reader['"][\s\S]*component:\s*Reader[\s\S]*meta:\s*\{[\s\S]*standalone:\s*true/,
    )
  })

  it('keeps compatibility routes for the old reader and prototype URL', () => {
    assert.match(
      routerSource,
      /path:\s*['"]\/reader-prototype['"][\s\S]*name:\s*['"]reader-prototype['"][\s\S]*component:\s*Reader[\s\S]*meta:\s*\{[\s\S]*standalone:\s*true/,
    )
    assert.match(
      routerSource,
      /path:\s*['"]\/reader-legacy['"][\s\S]*name:\s*['"]reader-legacy['"][\s\S]*component:\s*ReaderLegacy/,
    )
  })
})
