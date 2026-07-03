import JSZip from 'jszip'

export function getPrototypeImportFileType(file) {
  const fileName = String(file?.name || '').toLowerCase()
  const mimeType = String(file?.type || '').toLowerCase()

  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'pdf'
  }

  if (mimeType === 'application/epub+zip' || fileName.endsWith('.epub')) {
    return 'epub'
  }

  return ''
}

export function getPrototypeBookTitleFromFileName(fileName) {
  return String(fileName || 'Imported Book')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Imported Book'
}

export async function parsePrototypeBookFile(file) {
  const sourceType = getPrototypeImportFileType(file)

  if (!sourceType) {
    return {
      ok: false,
      reason: 'unsupported',
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const parsed =
    sourceType === 'pdf'
      ? await extractTextFromPdfArrayBuffer(arrayBuffer)
      : await extractTextFromEpubArrayBuffer(arrayBuffer)

  if (!parsed.text?.trim()) {
    return {
      ok: false,
      reason: 'empty',
      sourceType,
    }
  }

  return {
    ok: true,
    title: parsed.title || getPrototypeBookTitleFromFileName(file.name),
    text: parsed.text,
    chapters: parsed.chapters || [],
    sourceType,
    fileName: file.name || '',
  }
}

export async function extractTextFromPdfArrayBuffer(arrayBuffer) {
  const pdfjs = await import('pdfjs-dist')

  if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    } catch {
      // Node tests do not understand Vite's ?url import. Browser builds do.
    }
  }

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  const pageTexts = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => item.str || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text) {
      pageTexts.push(text)
    }
  }

  return {
    title: '',
    text: pageTexts.join('\n\n'),
    chapters: pageTexts.map((text, index) => ({
      title: `Page ${index + 1}`,
      text,
    })),
  }
}

export async function extractTextFromEpubArrayBuffer(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const containerXml = await readZipText(zip, 'META-INF/container.xml')
  const opfPath = getXmlAttribute(containerXml, 'rootfile', 'full-path')

  if (!opfPath) {
    throw new Error('EPUB container is missing rootfile path')
  }

  const opfXml = await readZipText(zip, opfPath)
  const packageTitle = decodeXmlText(getXmlTagText(opfXml, 'title'))
  const manifest = parseManifest(opfXml)
  const spine = parseSpine(opfXml)
  const chapters = []

  for (const itemRef of spine) {
    const manifestItem = manifest.get(itemRef.idref)

    if (!manifestItem || !isReadableEpubDocument(manifestItem.mediaType)) {
      continue
    }

    const chapterPath = resolveZipPath(opfPath, manifestItem.href)
    const html = await readZipText(zip, chapterPath)
    const title = extractHtmlTitle(html, manifestItem.id)
    const text = extractTextFromHtml(html)

    if (!text) {
      continue
    }

    chapters.push({
      title,
      text,
    })
  }

  return {
    title: packageTitle,
    text: chapters.map((chapter) => `${chapter.title}\n${chapter.text}`).join('\n\n'),
    chapters,
  }
}

async function readZipText(zip, path) {
  const file = zip.file(path)

  if (!file) {
    throw new Error(`EPUB file is missing ${path}`)
  }

  return file.async('text')
}

function parseManifest(opfXml) {
  const manifest = new Map()
  const manifestBlock = getXmlTagText(opfXml, 'manifest') || ''
  const itemPattern = /<item\b([^>]*)\/?>/gi
  let match = itemPattern.exec(manifestBlock)

  while (match) {
    const attrs = parseXmlAttributes(match[1])

    if (attrs.id && attrs.href) {
      manifest.set(attrs.id, {
        id: attrs.id,
        href: attrs.href,
        mediaType: attrs['media-type'] || '',
      })
    }

    match = itemPattern.exec(manifestBlock)
  }

  return manifest
}

function parseSpine(opfXml) {
  const spineBlock = getXmlTagText(opfXml, 'spine') || ''
  const itemRefPattern = /<itemref\b([^>]*)\/?>/gi
  const itemRefs = []
  let match = itemRefPattern.exec(spineBlock)

  while (match) {
    const attrs = parseXmlAttributes(match[1])

    if (attrs.idref) {
      itemRefs.push({ idref: attrs.idref })
    }

    match = itemRefPattern.exec(spineBlock)
  }

  return itemRefs
}

function parseXmlAttributes(source) {
  const attrs = {}
  const attrPattern = /([\w:-]+)\s*=\s*["']([^"']*)["']/g
  let match = attrPattern.exec(source || '')

  while (match) {
    attrs[match[1]] = decodeXmlText(match[2])
    match = attrPattern.exec(source || '')
  }

  return attrs
}

function getXmlAttribute(xml, tagName, attributeName) {
  const tagPattern = new RegExp(`<(?:[\\w-]+:)?${tagName}\\b([^>]*)>`, 'i')
  const match = tagPattern.exec(xml || '')

  if (!match) {
    return ''
  }

  return parseXmlAttributes(match[1])[attributeName] || ''
}

function getXmlTagText(xml, tagName) {
  const tagPattern = new RegExp(`<(?:[\\w-]+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tagName}>`, 'i')
  const match = tagPattern.exec(xml || '')

  return match?.[1]?.trim() || ''
}

function isReadableEpubDocument(mediaType) {
  return ['application/xhtml+xml', 'text/html', 'application/xml', 'text/xml'].includes(String(mediaType || '').toLowerCase())
}

function resolveZipPath(opfPath, href) {
  const baseParts = String(opfPath || '').split('/').slice(0, -1)
  const hrefParts = String(href || '').split('/')
  const outputParts = []

  for (const part of [...baseParts, ...hrefParts]) {
    if (!part || part === '.') {
      continue
    }

    if (part === '..') {
      outputParts.pop()
      continue
    }

    outputParts.push(part)
  }

  return outputParts.join('/')
}

function extractHtmlTitle(html, fallbackTitle) {
  return (
    decodeXmlText(getXmlTagText(html, 'title')) ||
    decodeXmlText(getXmlTagText(html, 'h1')) ||
    decodeXmlText(getXmlTagText(html, 'h2')) ||
    fallbackTitle ||
    'Chapter'
  )
}

function extractTextFromHtml(html) {
  return decodeXmlText(
    String(html || '')
      .replace(/<head\b[\s\S]*?<\/head>/gi, '')
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<\/(p|div|section|article|h[1-6]|li)>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\n[ \t\f\v]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    { preserveLineBreaks: true },
  )
}

function decodeXmlText(value, { preserveLineBreaks = false } = {}) {
  const decoded = String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

  if (preserveLineBreaks) {
    return decoded
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return decoded
    .replace(/\s+/g, ' ')
    .trim()
}
