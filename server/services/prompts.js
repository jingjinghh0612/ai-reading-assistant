export function createTranslatePrompt(text) {
  return `
Translate the following English sentence into Simplified Chinese.

Rules:
- Return only the Chinese translation.
- Do not include markdown, quotation marks, labels, or explanations.
- Make it natural and easy for beginner English learners to understand.

Sentence:
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
