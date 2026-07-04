import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\\n/g, '\n').trim() : ''
}

function normalizeWord(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
}

function normalizePhonetic(value) {
  const text = normalizeText(value).replace(/^\/|\/$/g, '')
  return text ? `/${text}/` : ''
}

function derivePartOfSpeech(row) {
  const explicitPartOfSpeech = normalizeText(row.pos)

  if (explicitPartOfSpeech) {
    return explicitPartOfSpeech
  }

  const partMatches = Array.from(normalizeText(row.translation).matchAll(/(^|\n|\\n)\s*([a-z]+)\./gi))
  const parts = partMatches.map((match) => match[2].toLowerCase())

  return Array.from(new Set(parts)).join(' / ')
}

function parseExchangeForms(exchange) {
  const text = normalizeText(exchange)

  if (!text) {
    return []
  }

  return Array.from(
    new Set(
      text
        .split('/')
        .map((part) => part.split(':')[1])
        .map(normalizeWord)
        .filter(Boolean),
    ),
  )
}

function parseCsvRecords(csvText) {
  const records = []
  let record = []
  let field = ''
  let isQuoted = false

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]
    const nextCharacter = csvText[index + 1]

    if (character === '"') {
      if (isQuoted && nextCharacter === '"') {
        field += '"'
        index += 1
      } else {
        isQuoted = !isQuoted
      }
      continue
    }

    if (character === ',' && !isQuoted) {
      record.push(field)
      field = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !isQuoted) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      record.push(field)
      field = ''

      if (record.some((value) => normalizeText(value))) {
        records.push(record)
      }

      record = []
      continue
    }

    field += character
  }

  record.push(field)

  if (record.some((value) => normalizeText(value))) {
    records.push(record)
  }

  return records
}

function readNumber(value, fallbackValue = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallbackValue
}

function getRankBoost(value) {
  const rank = readNumber(value)
  return rank > 0 ? Math.max(0, 100000 - rank) : 0
}

function getCommonWordScore(row) {
  return (
    readNumber(row.collins) * 10000000
    + readNumber(row.oxford) * 1000000
    + getRankBoost(row.bnc)
    + getRankBoost(row.frq)
  )
}

export function normalizeDictionaryRow(row) {
  const key = normalizeWord(row.word)

  return {
    key,
    entry: {
      word: key,
      meaning: normalizeText(row.translation),
      definition: normalizeText(row.definition),
      partOfSpeech: derivePartOfSpeech(row),
      example: '',
      phonetic: normalizePhonetic(row.phonetic),
      forms: parseExchangeForms(row.exchange).filter((form) => form !== key),
    },
  }
}

export function parseDictionaryCsv(csvText) {
  const records = parseCsvRecords(csvText)
  const headers = records[0]?.map((header) => normalizeText(header)) || []

  return records.slice(1).map((record) => Object.fromEntries(
    headers.map((header, index) => [header, normalizeText(record[index])]),
  ))
}

export function buildLocalDictionary(rows, options = {}) {
  const limit = readNumber(options.limit, rows.length)
  const rankedRows = rows
    .map((row, index) => ({
      index,
      row,
      score: getCommonWordScore(row),
      normalized: normalizeDictionaryRow(row),
    }))
    .filter((item) => item.normalized.key && item.normalized.entry.meaning)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.index - right.index
    })

  const dictionary = {}

  for (const item of rankedRows) {
    if (Object.keys(dictionary).length >= limit) {
      break
    }

    if (!dictionary[item.normalized.key]) {
      dictionary[item.normalized.key] = item.normalized.entry
    }
  }

  return dictionary
}

function parseArgs(argv) {
  const args = {
    limit: 5000,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--input') {
      args.input = next
      index += 1
    } else if (current === '--output') {
      args.output = next
      index += 1
    } else if (current === '--limit') {
      args.limit = readNumber(next, args.limit)
      index += 1
    }
  }

  return args
}

export async function runBuildLocalDictionaryCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)

  if (!args.input || !args.output) {
    throw new Error('Usage: node server/scripts/buildLocalDictionary.js --input <stardict.csv> --output <localWordDefinitions.json> [--limit 5000]')
  }

  const csvText = await fs.readFile(args.input, 'utf8')
  const rows = parseDictionaryCsv(csvText)
  const dictionary = buildLocalDictionary(rows, { limit: args.limit })

  await fs.writeFile(args.output, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8')

  return {
    count: Object.keys(dictionary).length,
    output: args.output,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBuildLocalDictionaryCli()
    .then((result) => {
      console.log(`Wrote ${result.count} entries to ${result.output}`)
    })
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
