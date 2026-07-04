import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localDictionaryPath = path.resolve(__dirname, '../data/localWordDefinitions.json')
const generatedDictionaryPath = path.resolve(__dirname, '../data/localWordDefinitions.generated.json')
let localDictionary = null
let localFormIndex = null

function normalizeWord(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
    .trim()
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function readLocalDictionary() {
  if (localDictionary) {
    return localDictionary
  }

  const curatedDictionary = JSON.parse(fs.readFileSync(localDictionaryPath, 'utf8'))
  const generatedDictionary = fs.existsSync(generatedDictionaryPath)
    ? JSON.parse(fs.readFileSync(generatedDictionaryPath, 'utf8'))
    : {}

  localDictionary = {
    ...generatedDictionary,
    ...curatedDictionary,
  }

  return localDictionary
}

function getLocalFormIndex() {
  if (localFormIndex) {
    return localFormIndex
  }

  const dictionary = readLocalDictionary()
  localFormIndex = new Map()

  for (const [lemma, entry] of Object.entries(dictionary)) {
    localFormIndex.set(normalizeWord(lemma), lemma)

    for (const form of entry.forms || []) {
      const normalizedForm = normalizeWord(form)

      if (normalizedForm && !localFormIndex.has(normalizedForm)) {
        localFormIndex.set(normalizedForm, lemma)
      }
    }
  }

  return localFormIndex
}

export function lookupLocalWordDefinition(word) {
  const normalizedWord = normalizeWord(word)

  if (!normalizedWord) {
    return null
  }

  const dictionary = readLocalDictionary()
  const lemma = getLocalFormIndex().get(normalizedWord)
  const entry = lemma ? dictionary[lemma] : null

  if (!entry?.meaning) {
    return null
  }

  return {
    word: normalizeText(word) || entry.word || lemma,
    meaning: normalizeText(entry.meaning),
    definition: normalizeText(entry.definition),
    partOfSpeech: normalizeText(entry.partOfSpeech),
    example: normalizeText(entry.example),
    phonetic: normalizeText(entry.phonetic),
  }
}
