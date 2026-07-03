import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import JSZip from 'jszip'
import {
  extractTextFromEpubArrayBuffer,
  getPrototypeBookTitleFromFileName,
  getPrototypeImportFileType,
} from './prototypeFileParser.js'

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

describe('prototype file parser utilities', () => {
  it('detects supported import file types', () => {
    assert.equal(getPrototypeImportFileType({ name: 'book.epub', type: 'application/epub+zip' }), 'epub')
    assert.equal(getPrototypeImportFileType({ name: 'book.pdf', type: 'application/pdf' }), 'pdf')
    assert.equal(getPrototypeImportFileType({ name: 'book.txt', type: 'text/plain' }), '')
  })

  it('uses the filename as a default book title', () => {
    assert.equal(getPrototypeBookTitleFromFileName('The-Book.epub'), 'The Book')
    assert.equal(getPrototypeBookTitleFromFileName('report.final.pdf'), 'report final')
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
})
