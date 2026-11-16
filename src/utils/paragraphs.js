export function splitReadableParagraphs(text) {
  const content = String(text || '').replace(/\r\n?/g, '\n').trim()

  if (!content) {
    return []
  }

  return content
    .split(/\n\s*\n/g)
    .flatMap(splitParagraphBlock)
    .map(compactParagraphText)
    .filter(Boolean)
}

function splitParagraphBlock(block) {
  const lines = String(block || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    return lines
  }

  const paragraphs = []
  let currentLines = []

  for (const line of lines) {
    if (!currentLines.length) {
      currentLines.push(line)
      continue
    }

    const previousLine = currentLines[currentLines.length - 1]

    if (shouldStartNewParagraph(previousLine, line)) {
      paragraphs.push(currentLines.join(' '))
      currentLines = [line]
      continue
    }

    currentLines.push(line)
  }

  if (currentLines.length) {
    paragraphs.push(currentLines.join(' '))
  }

  return paragraphs
}

function shouldStartNewParagraph(previousLine, nextLine) {
  return endsWithSentenceTerminal(previousLine) && startsLikeParagraph(nextLine)
}

function endsWithSentenceTerminal(line) {
  return /[.!?。！？]["'”’)\]]?$/.test(String(line || '').trim())
}

function startsLikeParagraph(line) {
  return /^[A-Z0-9"“'(\[]|^[\u4e00-\u9fff]/.test(String(line || '').trim())
}

function compactParagraphText(paragraph) {
  return String(paragraph || '').replace(/\s+/g, ' ').trim()
}
