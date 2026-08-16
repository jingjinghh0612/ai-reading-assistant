export function createTranslatePrompt(text, type = 'sentence') {
  if (type === 'paragraph') {
    return `
你是英语阅读助手。请把下面英文段落翻译成自然中文。
保留原意，适合中文读者阅读。
只输出译文，不要解释。

英文：
${text}
`
  }

  return `
你是英语阅读助手。请把下面英文句子翻译成自然中文。
只输出译文，不要解释，不要加引号。

英文：
${text}
`
}

export function createWordExplainPrompt(word) {
  return `
Explain this English word for a Chinese beginner.
Return strict JSON only. Do not include markdown.

JSON shape:
{
  "word": "example",
  "meaning": "Chinese meaning in Simplified Chinese",
  "definition": "Short English definition",
  "partOfSpeech": "part of speech",
  "example": "A simple English example sentence."
}

Word:
${word}
`
}

export function createSummarizePrompt(text) {
  return `
Summarize the following English article for a Chinese beginner.
Return strict JSON only. Do not include markdown.

JSON shape:
{
  "summary": "Chinese summary in Simplified Chinese",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Rules:
- summary must be Simplified Chinese.
- keywords must be exactly 3 English keywords.

Article:
${text}
`
}
