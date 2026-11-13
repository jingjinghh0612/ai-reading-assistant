import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import JSZip from 'jszip'
import {
  extractTextFromEpubArrayBuffer,
  getBookTitleFromFileName,
  getImportFileType,
} from './bookFileParser.js'

async function createTinyEpub() {
  const zip = new JSZip()

  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
    <container version="1.0">
      <rootfiles>
        <rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/>
      </rootfiles>
    </container>`,
  )
  zip.file(
    'OPS/content.opf',
    `<?xml version="1.0"?>
    <package>
      <metadata>
        <dc:title>Small EPUB</dc:title>
      </metadata>
      <manifest>
        <item id="chapter-1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
        <item id="chapter-2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
      </manifest>
      <spine>
        <itemref idref="chapter-1"/>
        <itemref idref="chapter-2"/>
      </spine>
    </package>`,
  )
  zip.file(
    'OPS/chapter1.xhtml',
    '<html><head><title>Opening</title></head><body><h1>Opening</h1><p>First sentence.</p><p>Second sentence.</p></body></html>',
  )
  zip.file(
    'OPS/chapter2.xhtml',
    '<html><head><title>After Rain</title></head><body><h2>After Rain</h2><p>Rain stopped.</p></body></html>',
  )

  return zip.generateAsync({ type: 'arraybuffer' })
}

describe('book file parser utilities', () => {
  it('detects supported import file types', () => {
    assert.equal(getImportFileType({ name: 'book.epub', type: 'application/epub+zip' }), 'epub')
    assert.equal(getImportFileType({ name: 'book.pdf', type: 'application/pdf' }), 'pdf')
    assert.equal(getImportFileType({ name: 'book.txt', type: 'text/plain' }), '')
  })

  it('uses the filename as a default book title', () => {
    assert.equal(getBookTitleFromFileName('The-Book.epub'), 'The Book')
    assert.equal(getBookTitleFromFileName('report.final.pdf'), 'report final')
  })

  it('extracts EPUB title and spine ordered chapter text', async () => {
    const result = await extractTextFromEpubArrayBuffer(await createTinyEpub())

    assert.equal(result.title, 'Small EPUB')
    assert.deepEqual(
      result.chapters.map((chapter) => chapter.title),
      ['Opening', 'After Rain'],
    )
    assert.match(result.text, /First sentence\./)
    assert.match(result.text, /Rain stopped\./)
    assert.match(result.chapters[0].text, /First sentence\.\n\nSecond sentence\./)
  })

  it('decodes hexadecimal HTML entities from EPUB text', async () => {
    const zip = new JSZip()

    zip.file(
      'META-INF/container.xml',
      '<container><rootfiles><rootfile full-path="OPS/content.opf"/></rootfiles></container>',
    )
    zip.file(
      'OPS/content.opf',
      `<package>
        <metadata><dc:title>&#x5C0F;&#x4E66;</dc:title></metadata>
        <manifest><item id="preface" href="preface.xhtml" media-type="application/xhtml+xml"/></manifest>
        <spine><itemref idref="preface"/></spine>
      </package>`,
    )
    zip.file(
      'OPS/preface.xhtml',
      '<html><head><title>&#x524D;&#x8A00;</title></head><body><p>&#x539F;&#x6587;&#xFF1A; http://example.com</p></body></html>',
    )

    const result = await extractTextFromEpubArrayBuffer(await zip.generateAsync({ type: 'arraybuffer' }))

    assert.equal(result.title, '小书')
    assert.equal(result.chapters[0].title, '前言')
    assert.match(result.chapters[0].text, /原文： http:\/\/example\.com/)
    assert.doesNotMatch(result.chapters[0].text, /&#x/i)
  })
})
