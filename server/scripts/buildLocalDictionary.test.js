import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildLocalDictionary,
  parseDictionaryCsv,
  normalizeDictionaryRow,
} from './buildLocalDictionary.js'

describe('本地词库构建脚本', () => {
  it('能把外部词典行数据转换成本地词库格式', () => {
    assert.deepEqual(
      normalizeDictionaryRow({
        word: 'make',
        translation: '制造；使得',
        definition: 'To create something or cause something to happen.',
        pos: 'verb',
        phonetic: 'meɪk',
        exchange: 'p:made/d:made/i:making/3:makes',
      }),
      {
        key: 'make',
        entry: {
          word: 'make',
          meaning: '制造；使得',
          definition: 'To create something or cause something to happen.',
          partOfSpeech: 'verb',
          example: '',
          phonetic: '/meɪk/',
          forms: ['made', 'making', 'makes'],
        },
      },
    )
  })

  it('忽略空词和重复词形', () => {
    assert.deepEqual(
      normalizeDictionaryRow({
        word: ' stories ',
        translation: '故事',
        definition: 'Accounts of events.',
        pos: 'noun',
        phonetic: '/ˈstɔːriz/',
        exchange: '0:story/p:stories/p:stories',
      }),
      {
        key: 'stories',
        entry: {
          word: 'stories',
          meaning: '故事',
          definition: 'Accounts of events.',
          partOfSpeech: 'noun',
          example: '',
          phonetic: '/ˈstɔːriz/',
          forms: ['story'],
        },
      },
    )
  })
  it('parses ECDICT-style CSV rows with quoted fields', () => {
    const rows = parseDictionaryCsv(
      'word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio\n' +
        'make,meɪk,"To create, cause, or prepare.","制造；使得",verb,5,1,zk,353,395,p:made/d:made/i:making/3:makes,,\n' +
        'clear,klɪr,"Easy to understand, see, or hear.","清楚的；明亮的",adjective,4,1,zk,1314,1094,r:clearer/t:clearest,,\n',
    )

    assert.equal(rows.length, 2)
    assert.deepEqual(rows[0], {
      word: 'make',
      phonetic: 'meɪk',
      definition: 'To create, cause, or prepare.',
      translation: '\u5236\u9020\uff1b\u4f7f\u5f97',
      pos: 'verb',
      collins: '5',
      oxford: '1',
      tag: 'zk',
      bnc: '353',
      frq: '395',
      exchange: 'p:made/d:made/i:making/3:makes',
      detail: '',
      audio: '',
    })
  })

  it('builds a limited local dictionary ordered by common-word score', () => {
    const rows = [
      {
        word: 'rare',
        translation: '\u7a00\u6709\u7684',
        definition: 'Not common.',
        pos: 'adjective',
        phonetic: 'rer',
        collins: '1',
        oxford: '0',
        bnc: '9000',
        frq: '9000',
        exchange: '',
      },
      {
        word: 'make',
        translation: '\u5236\u9020\uff1b\u4f7f\u5f97',
        definition: 'To create something or cause something to happen.',
        pos: 'verb',
        phonetic: 'meɪk',
        collins: '5',
        oxford: '1',
        bnc: '353',
        frq: '395',
        exchange: 'p:made/d:made/i:making/3:makes',
      },
      {
        word: 'empty',
        translation: '',
        definition: 'No translated meaning.',
        pos: 'adjective',
        phonetic: '',
        collins: '5',
        oxford: '1',
        bnc: '1',
        frq: '1',
        exchange: '',
      },
      {
        word: 'clear',
        translation: '\u6e05\u695a\u7684\uff1b\u660e\u4eae\u7684',
        definition: 'Easy to understand, see, or hear.',
        pos: 'adjective',
        phonetic: 'klɪr',
        collins: '4',
        oxford: '1',
        bnc: '1314',
        frq: '1094',
        exchange: 'r:clearer/t:clearest',
      },
    ]

    const dictionary = buildLocalDictionary(rows, { limit: 2 })

    assert.deepEqual(Object.keys(dictionary), ['make', 'clear'])
    assert.deepEqual(dictionary.make.forms, ['made', 'making', 'makes'])
    assert.equal(dictionary.clear.meaning, '\u6e05\u695a\u7684\uff1b\u660e\u4eae\u7684')
  })

  it('derives part of speech from translation prefixes when pos is blank', () => {
    const detail = normalizeDictionaryRow({
      word: 'about',
      translation: 'prep. \u5173\u4e8e\\nadv. \u5927\u7ea6',
      definition: 'r. near\\nr. approximately',
      pos: '',
      phonetic: "\u0259'baut",
      exchange: '',
    }).entry

    assert.equal(detail.partOfSpeech, 'prep / adv')
    assert.equal(detail.meaning, 'prep. \u5173\u4e8e\nadv. \u5927\u7ea6')
    assert.equal(detail.definition, 'r. near\nr. approximately')
  })
})
