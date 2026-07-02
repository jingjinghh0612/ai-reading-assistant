export const prototypeBooks = [
  {
    id: 'quiet-observatory',
    title: 'The Quiet Observatory',
    meta: '英语精读 · B1+',
    initials: 'TQ',
    tone: 'blue',
    progress: 64,
    chapters: [
      {
        id: 'chapter-3',
        number: '03',
        title: 'The Locked Garden',
        status: '已完成',
        sentenceCount: 12,
        level: 'B1',
        progress: 100,
      },
      {
        id: 'chapter-4',
        number: '04',
        title: 'The Window of Light',
        status: '当前章节',
        sentenceCount: 9,
        level: 'B1+',
        progress: 72,
      },
      {
        id: 'chapter-5',
        number: '05',
        title: 'A Letter at Dawn',
        status: '待阅读',
        sentenceCount: 11,
        level: 'B1',
        progress: 0,
      },
      {
        id: 'chapter-6',
        number: '06',
        title: 'Words in the Rain',
        status: '待阅读',
        sentenceCount: 10,
        level: 'B2',
        progress: 0,
      },
    ],
  },
  {
    id: 'journey-city',
    title: 'Journey to the City',
    meta: '短篇故事 · A2',
    initials: 'JC',
    tone: 'green',
    progress: 32,
    chapters: [],
  },
  {
    id: 'science-stories',
    title: 'Stories of Science',
    meta: '科普阅读 · B2',
    initials: 'SS',
    tone: 'amber',
    progress: 18,
    chapters: [],
  },
]

export const prototypeChapterContent = {
  'chapter-3': {
    id: 'chapter-3',
    bookId: 'quiet-observatory',
    number: '03',
    title: 'The Locked Garden',
    paragraphs: [
      {
        id: 'p1',
        active: true,
        translation:
          '花园门已经锁了好几年，但克拉拉仍能从栅栏缝里看见一条窄窄的小路。她不知道里面藏着什么，只知道每次经过时，那里都显得异常安静。',
        sentences: [
          {
            id: 'chapter-3-p1-s1',
            highlighted: false,
            text: 'The garden gate had been locked for years, but Clara could still see a narrow path through the fence.',
            translation: '花园门已经锁了好几年，但克拉拉仍能从栅栏缝里看见一条窄窄的小路。',
            tokens: [
              {
                id: 'chapter-3-p1-s1-t1',
                text: 'The garden gate had been locked for years, but Clara could still see a narrow path through the fence. ',
              },
            ],
          },
          {
            id: 'chapter-3-p1-s2',
            highlighted: true,
            text: 'She did not know what the garden would reveal, only that it felt unusually quiet whenever she passed it.',
            translation: '她不知道花园会揭示什么，只知道每次经过时，那里都显得异常安静。',
            tokens: [
              { id: 'chapter-3-p1-s2-t1', text: 'She did not know what the garden would ' },
              {
                id: 'chapter-3-p1-s2-reveal',
                text: 'reveal',
                surface: 'reveal',
                lemma: 'reveal',
                wordKey: 'reveal',
                sentenceId: 'chapter-3-p1-s2',
              },
              { id: 'chapter-3-p1-s2-t2', text: ', only that it felt ' },
              {
                id: 'chapter-3-p1-s2-unusually',
                text: 'unusually',
                surface: 'unusually',
                lemma: 'unusually',
                wordKey: 'unusually',
                sentenceId: 'chapter-3-p1-s2',
              },
              { id: 'chapter-3-p1-s2-t3', text: ' quiet whenever she passed it.' },
            ],
          },
        ],
      },
      {
        id: 'p2',
        active: false,
        translation:
          '祖父笔记本里的一句话让她停下脚步。那个句子并没有给出答案，却让她计划在第二天清晨回来。',
        sentences: [
          {
            id: 'chapter-3-p2-s1',
            highlighted: false,
            text: 'One sentence in her grandfather’s notebook made her stop beside the wall.',
            translation: '祖父笔记本里的一句话让她在墙边停下脚步。',
            tokens: [
              { id: 'chapter-3-p2-s1-t1', text: 'One ' },
              {
                id: 'chapter-3-p2-s1-sentence',
                text: 'sentence',
                surface: 'sentence',
                lemma: 'sentence',
                wordKey: 'sentence',
                sentenceId: 'chapter-3-p2-s1',
              },
              { id: 'chapter-3-p2-s1-t2', text: ' in her grandfather’s notebook made her stop beside the wall. ' },
            ],
          },
          {
            id: 'chapter-3-p2-s2',
            highlighted: false,
            text: 'It did not give her an answer, but it helped her plan to return at dawn.',
            translation: '它并没有给她答案，却让她计划在清晨回来。',
            tokens: [
              { id: 'chapter-3-p2-s2-t1', text: 'It did not give her an answer, but it helped her ' },
              {
                id: 'chapter-3-p2-s2-plan',
                text: 'plan',
                surface: 'plan',
                lemma: 'plan',
                wordKey: 'plan',
                sentenceId: 'chapter-3-p2-s2',
              },
              { id: 'chapter-3-p2-s2-t2', text: ' to return at dawn.' },
            ],
          },
        ],
      },
    ],
  },
  'chapter-4': {
    id: 'chapter-4',
    bookId: 'quiet-observatory',
    number: '04',
    title: 'The Window of Light',
    paragraphs: [
      {
        id: 'p1',
        active: true,
        translation:
          '当克拉拉到达那座旧天文台时，东方山丘上方的天空已经开始泛白。她原本只打算读十分钟，但安静的房间让每个句子都显得格外清晰。',
        sentences: [
          {
            id: 'p1-s1',
            highlighted: false,
            text: 'When Clara arrived at the old observatory, the sky was already turning pale above the eastern hills.',
            translation: '当克拉拉到达那座旧天文台时，东方山丘上方的天空已经开始泛白。',
            tokens: [
              { id: 'p1-s1-t1', text: 'When Clara arrived at the old ' },
              {
                id: 'p1-s1-observatory',
                text: 'observatory',
                surface: 'observatory',
                lemma: 'observatory',
                wordKey: 'observatory',
                sentenceId: 'p1-s1',
              },
              { id: 'p1-s1-t2', text: ', the sky was already turning pale above the eastern hills. ' },
            ],
          },
          {
            id: 'p1-s2',
            highlighted: true,
            text: 'She had planned to read for only ten minutes, but the quiet room made each sentence feel unusually clear.',
            translation: '她原本只打算读十分钟，但安静的房间让每个句子都显得格外清晰。',
            tokens: [
              { id: 'p1-s2-t1', text: 'She had ' },
              {
                id: 'p1-s2-planned',
                text: 'planned',
                surface: 'planned',
                lemma: 'plan',
                wordKey: 'plan',
                sentenceId: 'p1-s2',
              },
              { id: 'p1-s2-t2', text: ' to read for only ten minutes, but the quiet room made each ' },
              {
                id: 'p1-s2-sentence',
                text: 'sentence',
                surface: 'sentence',
                lemma: 'sentence',
                wordKey: 'sentence',
                sentenceId: 'p1-s2',
              },
              { id: 'p1-s2-t3', text: ' feel ' },
              {
                id: 'p1-s2-unusually',
                text: 'unusually',
                surface: 'unusually',
                lemma: 'unusually',
                wordKey: 'unusually',
                sentenceId: 'p1-s2',
              },
              { id: 'p1-s2-t4', text: ' clear.' },
            ],
          },
        ],
      },
      {
        id: 'p2',
        active: false,
        translation:
          '桌上的笔记本属于她的祖父，里面记录着关于天气、鸟类和光线变化的细致观察。克拉拉意识到，认真阅读并不在于速度，而在于留意作者选择揭示的内容。',
        sentences: [
          {
            id: 'p2-s1',
            highlighted: false,
            text: 'The notebook on the desk belonged to her grandfather, who had written careful observations about weather, birds, and the changing light.',
            translation:
              '桌上的笔记本属于她的祖父，里面记录着关于天气、鸟类和光线变化的细致观察。',
            tokens: [
              {
                id: 'p2-s1-t1',
                text: 'The notebook on the desk belonged to her grandfather, who had written careful observations about weather, birds, and the changing light. ',
              },
            ],
          },
          {
            id: 'p2-s2',
            highlighted: false,
            text: 'Clara realized that careful reading was less about speed and more about noticing what the writer chooses to reveal.',
            translation:
              '克拉拉意识到，认真阅读并不在于速度，而在于留意作者选择揭示的内容。',
            tokens: [
              {
                id: 'p2-s2-t1',
                text: 'Clara realized that careful reading was less about speed and more about noticing what the writer chooses to ',
              },
              {
                id: 'p2-s2-reveal',
                text: 'reveal',
                surface: 'reveal',
                lemma: 'reveal',
                wordKey: 'reveal',
                sentenceId: 'p2-s2',
              },
              { id: 'p2-s2-t2', text: '.' },
            ],
          },
        ],
      },
      {
        id: 'p3',
        active: false,
        translation:
          '等到镇广场的钟声敲响七下时，她已经把三个生词和一个问题抄进了笔记。故事并没有变得更简单，但它离她更近了。',
        sentences: [
          {
            id: 'p3-s1',
            highlighted: false,
            text: 'By the time the bells in the town square rang seven, she had copied three new words and one question into her notes.',
            translation:
              '等到镇广场的钟声敲响七下时，她已经把三个生词和一个问题抄进了笔记。',
            tokens: [
              { id: 'p3-s1-t1', text: 'By the time the bells in the town square rang seven, she had ' },
              {
                id: 'p3-s1-copied',
                text: 'copied',
                surface: 'copied',
                lemma: 'copy',
                wordKey: 'copy',
                sentenceId: 'p3-s1',
              },
              { id: 'p3-s1-t2', text: ' three new words and one question into her notes. ' },
            ],
          },
          {
            id: 'p3-s2',
            highlighted: false,
            text: 'The story had not become easier, but it had become closer.',
            translation: '故事并没有变得更简单，但它离她更近了。',
            tokens: [{ id: 'p3-s2-t1', text: 'The story had not become easier, but it had become closer.' }],
          },
        ],
      },
    ],
  },
  'chapter-5': {
    id: 'chapter-5',
    bookId: 'quiet-observatory',
    number: '05',
    title: 'A Letter at Dawn',
    paragraphs: [
      {
        id: 'p1',
        active: true,
        translation:
          '天刚亮时，一封薄薄的信出现在天文台门下。克拉拉把它拿到窗边，因为第一句话看起来像是写给她的。',
        sentences: [
          {
            id: 'chapter-5-p1-s1',
            highlighted: false,
            text: 'At dawn, a thin letter appeared under the observatory door.',
            translation: '天刚亮时，一封薄薄的信出现在天文台门下。',
            tokens: [
              { id: 'chapter-5-p1-s1-t1', text: 'At dawn, a thin letter appeared under the ' },
              {
                id: 'chapter-5-p1-s1-observatory',
                text: 'observatory',
                surface: 'observatory',
                lemma: 'observatory',
                wordKey: 'observatory',
                sentenceId: 'chapter-5-p1-s1',
              },
              { id: 'chapter-5-p1-s1-t2', text: ' door. ' },
            ],
          },
          {
            id: 'chapter-5-p1-s2',
            highlighted: true,
            text: 'Clara carried it to the window, because the first sentence seemed to be written for her.',
            translation: '克拉拉把它拿到窗边，因为第一句话看起来像是写给她的。',
            tokens: [
              { id: 'chapter-5-p1-s2-t1', text: 'Clara carried it to the window, because the first ' },
              {
                id: 'chapter-5-p1-s2-sentence',
                text: 'sentence',
                surface: 'sentence',
                lemma: 'sentence',
                wordKey: 'sentence',
                sentenceId: 'chapter-5-p1-s2',
              },
              { id: 'chapter-5-p1-s2-t2', text: ' seemed to be written for her.' },
            ],
          },
        ],
      },
      {
        id: 'p2',
        active: false,
        translation:
          '信里没有解释所有事情，只是揭示了祖父曾经做过的一个小计划。她把最后一行抄进笔记本，然后安静地读了第二遍。',
        sentences: [
          {
            id: 'chapter-5-p2-s1',
            highlighted: false,
            text: 'The letter did not explain everything; it only revealed a small plan her grandfather had made.',
            translation: '信里没有解释所有事情，只是揭示了祖父曾经做过的一个小计划。',
            tokens: [
              { id: 'chapter-5-p2-s1-t1', text: 'The letter did not explain everything; it only ' },
              {
                id: 'chapter-5-p2-s1-revealed',
                text: 'revealed',
                surface: 'revealed',
                lemma: 'reveal',
                wordKey: 'reveal',
                sentenceId: 'chapter-5-p2-s1',
              },
              { id: 'chapter-5-p2-s1-t2', text: ' a small ' },
              {
                id: 'chapter-5-p2-s1-plan',
                text: 'plan',
                surface: 'plan',
                lemma: 'plan',
                wordKey: 'plan',
                sentenceId: 'chapter-5-p2-s1',
              },
              { id: 'chapter-5-p2-s1-t3', text: ' her grandfather had made. ' },
            ],
          },
          {
            id: 'chapter-5-p2-s2',
            highlighted: false,
            text: 'She copied the final line into her notebook, then read it again in silence.',
            translation: '她把最后一行抄进笔记本，然后安静地读了第二遍。',
            tokens: [
              { id: 'chapter-5-p2-s2-t1', text: 'She ' },
              {
                id: 'chapter-5-p2-s2-copied',
                text: 'copied',
                surface: 'copied',
                lemma: 'copy',
                wordKey: 'copy',
                sentenceId: 'chapter-5-p2-s2',
              },
              { id: 'chapter-5-p2-s2-t2', text: ' the final line into her notebook, then read it again in silence.' },
            ],
          },
        ],
      },
    ],
  },
  'chapter-6': {
    id: 'chapter-6',
    bookId: 'quiet-observatory',
    number: '06',
    title: 'Words in the Rain',
    paragraphs: [
      {
        id: 'p1',
        active: true,
        translation:
          '雨在午后开始落下，把天文台外的石阶染成深灰色。克拉拉发现，每个词在雨声里都显得异常清楚。',
        sentences: [
          {
            id: 'chapter-6-p1-s1',
            highlighted: false,
            text: 'Rain began in the afternoon and turned the stone steps outside the observatory dark gray.',
            translation: '雨在午后开始落下，把天文台外的石阶染成深灰色。',
            tokens: [
              { id: 'chapter-6-p1-s1-t1', text: 'Rain began in the afternoon and turned the stone steps outside the ' },
              {
                id: 'chapter-6-p1-s1-observatory',
                text: 'observatory',
                surface: 'observatory',
                lemma: 'observatory',
                wordKey: 'observatory',
                sentenceId: 'chapter-6-p1-s1',
              },
              { id: 'chapter-6-p1-s1-t2', text: ' dark gray. ' },
            ],
          },
          {
            id: 'chapter-6-p1-s2',
            highlighted: true,
            text: 'Clara noticed that each word sounded unusually clear against the rain.',
            translation: '克拉拉发现，每个词在雨声里都显得异常清楚。',
            tokens: [
              { id: 'chapter-6-p1-s2-t1', text: 'Clara noticed that each word sounded ' },
              {
                id: 'chapter-6-p1-s2-unusually',
                text: 'unusually',
                surface: 'unusually',
                lemma: 'unusually',
                wordKey: 'unusually',
                sentenceId: 'chapter-6-p1-s2',
              },
              { id: 'chapter-6-p1-s2-t2', text: ' clear against the rain.' },
            ],
          },
        ],
      },
      {
        id: 'p2',
        active: false,
        translation:
          '她没有急着读完整封信，而是先计划好每一段要问的问题。等雨停时，她已经把三个句子和一个新问题抄了下来。',
        sentences: [
          {
            id: 'chapter-6-p2-s1',
            highlighted: false,
            text: 'Instead of rushing through the whole letter, she planned one question for each paragraph.',
            translation: '她没有急着读完整封信，而是先计划好每一段要问的问题。',
            tokens: [
              { id: 'chapter-6-p2-s1-t1', text: 'Instead of rushing through the whole letter, she ' },
              {
                id: 'chapter-6-p2-s1-planned',
                text: 'planned',
                surface: 'planned',
                lemma: 'plan',
                wordKey: 'plan',
                sentenceId: 'chapter-6-p2-s1',
              },
              { id: 'chapter-6-p2-s1-t2', text: ' one question for each paragraph. ' },
            ],
          },
          {
            id: 'chapter-6-p2-s2',
            highlighted: false,
            text: 'By the time the rain stopped, she had copied three sentences and one new question.',
            translation: '等雨停时，她已经把三个句子和一个新问题抄了下来。',
            tokens: [
              { id: 'chapter-6-p2-s2-t1', text: 'By the time the rain stopped, she had ' },
              {
                id: 'chapter-6-p2-s2-copied',
                text: 'copied',
                surface: 'copied',
                lemma: 'copy',
                wordKey: 'copy',
                sentenceId: 'chapter-6-p2-s2',
              },
              { id: 'chapter-6-p2-s2-t2', text: ' three ' },
              {
                id: 'chapter-6-p2-s2-sentences',
                text: 'sentences',
                surface: 'sentences',
                lemma: 'sentence',
                wordKey: 'sentence',
                sentenceId: 'chapter-6-p2-s2',
              },
              { id: 'chapter-6-p2-s2-t3', text: ' and one new question.' },
            ],
          },
        ],
      },
    ],
  },
}

export const prototypeDictionary = {
  plan: {
    id: 'plan',
    lemma: 'plan',
    display: 'planned',
    phonetic: '/plænd/',
    partOfSpeech: 'v.',
    meanings: [
      {
        zh: '计划；打算',
        en: 'to decide what you are going to do',
        usage: 'planned 是 plan 的过去式或过去分词。',
      },
    ],
    explanation: '在原句中，had planned 表示“原本已经计划好”。',
    examples: [
      {
        en: 'She planned to finish the book before dinner.',
        zh: '她计划在晚饭前读完这本书。',
      },
    ],
    forms: ['plan', 'plans', 'planned', 'planning'],
    sourceSentence:
      'She had planned to read for only ten minutes, but the quiet room made each sentence feel unusually clear.',
  },
  unusually: {
    id: 'unusually',
    lemma: 'unusually',
    display: 'unusually',
    phonetic: '/ʌnˈjuːʒuəli/',
    partOfSpeech: 'adv.',
    meanings: [
      {
        zh: '异常地；不同寻常地',
        en: 'more than usual or different from what is usual',
        usage: '用于强调某件事超出平常情况。',
      },
    ],
    explanation: '在原句中，unusually clear 强调句子显得格外清晰。',
    examples: [
      {
        en: 'The room was unusually quiet.',
        zh: '这个房间异常安静。',
      },
    ],
    forms: ['unusual', 'unusually'],
    sourceSentence: 'The quiet room made each sentence feel unusually clear.',
  },
  observatory: {
    id: 'observatory',
    lemma: 'observatory',
    display: 'observatory',
    phonetic: '/əbˈzɜːrvətɔːri/',
    partOfSpeech: 'n.',
    meanings: [
      {
        zh: '天文台；观测站',
        en: 'a building or place used for watching stars, weather, or natural events',
        usage: '常用于描述天文、气象或自然现象观测地点。',
      },
    ],
    explanation: '在原句中，observatory 指克拉拉到达的旧天文台。',
    examples: [
      {
        en: 'The students visited an observatory on the hill.',
        zh: '学生们参观了山上的一座天文台。',
      },
    ],
    forms: ['observatory', 'observatories'],
    sourceSentence:
      'When Clara arrived at the old observatory, the sky was already turning pale above the eastern hills.',
  },
  reveal: {
    id: 'reveal',
    lemma: 'reveal',
    display: 'reveal',
    phonetic: '/rɪˈviːl/',
    partOfSpeech: 'v.',
    meanings: [
      {
        zh: '揭示；透露',
        en: 'to make something known that was hidden or not known before',
        usage: '表示让隐藏的信息、事实或感受被看见或被知道。',
      },
    ],
    explanation: '在原句中，reveal 表示作者选择向读者揭示的内容。',
    examples: [
      {
        en: 'The final page will reveal the answer.',
        zh: '最后一页会揭示答案。',
      },
    ],
    forms: ['reveal', 'reveals', 'revealed', 'revealing'],
    sourceSentence:
      'Clara realized that careful reading was less about speed and more about noticing what the writer chooses to reveal.',
  },
  copy: {
    id: 'copy',
    lemma: 'copy',
    display: 'copied',
    phonetic: '/ˈkɑːpid/',
    partOfSpeech: 'v.',
    meanings: [
      {
        zh: '抄写；复制',
        en: 'to write something again exactly as it is written somewhere else',
        usage: 'copied 是 copy 的过去式或过去分词。',
      },
    ],
    explanation: '在原句中，copied 表示她把新词和问题抄进笔记。',
    examples: [
      {
        en: 'He copied the sentence into his notebook.',
        zh: '他把这个句子抄进了笔记本。',
      },
    ],
    forms: ['copy', 'copies', 'copied', 'copying'],
    sourceSentence:
      'By the time the bells in the town square rang seven, she had copied three new words and one question into her notes.',
  },
  sentence: {
    id: 'sentence',
    lemma: 'sentence',
    display: 'sentence',
    phonetic: '/ˈsentəns/',
    partOfSpeech: 'n.',
    meanings: [
      {
        zh: '句子',
        en: 'a group of words that expresses a complete idea',
        usage: '用于指表达完整意思的一组词。',
      },
    ],
    explanation: '在原句中，sentence 指阅读材料中的一个英文句子。',
    examples: [
      {
        en: 'Please read the first sentence again.',
        zh: '请再读一遍第一个句子。',
      },
    ],
    forms: ['sentence', 'sentences'],
    sourceSentence:
      'She had planned to read for only ten minutes, but the quiet room made each sentence feel unusually clear.',
  },
}
