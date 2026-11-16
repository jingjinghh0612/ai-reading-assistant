import { ref } from 'vue'
import { getStorageItem, setStorageItem } from './storage.js'

export const LOCALE_STORAGE_KEY = 'ai-reading-locale'
export const DEFAULT_LOCALE = 'zh'
export const SUPPORTED_LOCALES = ['zh', 'en']

const messages = {
  zh: {
    app: {
      brand: 'AI 英语阅读助手',
      navLabel: '主导航',
      languageSwitch: 'English',
      languageLabel: '界面语言',
    },
    toolbar: {
      toolsLabel: '阅读工具',
      undo: '撤销',
      redo: '重做',
      select: '选择',
      text: '文字',
      pen: '批注',
      pages: 'Pages',
      ask: '问答',
      uploadPdf: 'Upload PDF',
      export: 'Export',
      disabledFeature: '该入口仅作界面展示，暂未接入真实功能。',
    },
    nav: {
      home: '首页',
      reader: '阅读',
      vocabulary: '生词本',
      review: '复习',
    },
    common: {
      loading: '加载中',
      retry: '重试',
      unknownTime: '未知时间',
      soon: '即将开始',
      emptyArticle: '还没有可阅读的文章。',
      goHome: '返回首页添加文章',
      noSavedWords: '还没有保存生词。',
      goReader: '去阅读页',
      viewVocabulary: '查看全部生词',
    },
    home: {
      welcome: '阅读英文，复习生词',
      welcomeDescription: '用逐句翻译和随点词典读懂英文，把读过的生词留下来复习。',
      readingTitle: '阅读工作台',
      readingDescription: '从书架选一本书，或导入文件、粘贴英文文章。',
      reviewDescription: '用单词卡回顾阅读中遇到的生词和原句。',
      eyebrow: '学习工作台',
      title: '把英文文章变成可跟读的学习材料',
      description: '粘贴一篇英文文章，逐句阅读、查看翻译、解释单词，并把生词加入复习计划。',
      inputLabel: '英文文章',
      placeholder: '在这里粘贴英文文章。建议先从一个短段落开始。',
      start: '开始阅读',
      openVocabulary: '打开生词本',
      inputHint: '提示：进入阅读页后，可以点击句子查看翻译，点击单词查看解释。',
      todayTitle: '今日学习',
      vocabularyReview: '生词复习',
      dueWords: '{count} 个单词待复习',
      dueWordLabel: '待复习单词',
      startReview: '开始复习',
      continueReading: '继续阅读',
      continue: '继续',
      historyTitle: '最近阅读',
      fillIn: '填入',
      delete: '删除',
      emptyAlert: '请先输入一篇英文文章。',
    },
    reader: {
      eyebrow: '专注阅读',
      aiPanelEyebrow: '上下文',
      aiPanelTitle: 'AI 问答',
      contextLabel: '上下文：',
      contextArticle: '全文',
      translationCardTitle: '句子翻译',
      closeTranslationCard: '关闭翻译卡片',
      title: '逐句理解文章，随手保存生词',
      description: '点击句子查看中文翻译，点击单词查看释义并加入生词本。',
      selectedSentence: '当前句子',
      sentencePlaceholder: '请先点击左侧的一句话。',
      progress: '第 {current} / {total} 句',
      reviewDueWords: '复习到期单词',
      previous: '上一句',
      next: '下一句',
      translationTitle: '中文翻译',
      selectSentence: '选择句子后会加载翻译。',
      loadingTranslation: '正在加载翻译...',
      retryTranslation: '重新翻译',
      translationFallback: '翻译结果会显示在这里。',
      summaryTitle: '文章总结',
      summarize: '总结',
      refresh: '刷新',
      loadingSummary: '正在生成总结...',
      summaryPlaceholder: '点击“总结”获取一段中文摘要。',
      wordTitle: '单词解释',
      wordPlaceholder: '点击文章里的单词查看释义。',
      loadingWord: '正在加载单词解释...',
      retryWord: '重新加载单词',
      failedTranslation: '翻译加载失败。',
      failedSummary: '总结生成失败。',
      failedWord: '单词解释加载失败。',
      saved: '已保存',
      add: '加入',
      addedMessage: '已加入生词本。',
      alreadySavedMessage: '这个单词已经在生词本中。',
      starWord: '星标并加入生词本',
      starredWord: '已星标并保存',
      closeWordCard: '关闭单词卡片',
    },
    sentenceViewer: {
      title: '英文原文',
      tip: '点击句子翻译，或点击单词查看解释。',
      clickToTranslate: '点击翻译',
      translating: '翻译中...',
      fontSizeLabel: '阅读字号',
      decreaseFontSize: '减小阅读字号',
      increaseFontSize: '增大阅读字号',
    },
    vocabulary: {
      eyebrow: '生词本',
      title: '管理你的已保存单词',
      description: '所有生词和复习进度都会保存在当前浏览器中。',
      searchLabel: '搜索单词',
      searchPlaceholder: '按单词或释义搜索...',
      statusLabel: '复习状态',
      all: '全部',
      review: '待复习',
      mastered: '已掌握',
      wordsCount: '{count} 个单词',
      dueCount: '{count} 个到期',
      reviewCount: '{count} 个待复习',
      masteredCount: '{count} 个已掌握',
      reviewDue: '复习到期',
      clearAll: '清空全部',
      markReview: '标记复习',
      markMastered: '标记掌握',
      delete: '删除',
      addedAt: '保存于 {time}',
      nextReview: '下次复习 {time}',
      meaningLabel: '中文释义',
      definitionLabel: '英文解释',
      sentenceLabel: '原句',
      sourceArticle: '来源：{title}',
      noMeaning: '暂未生成释义',
      noDefinition: '暂未生成英文解释',
      noSentence: '暂未记录原句',
      noArticle: '未命名文章',
      noMatches: '没有符合筛选条件的单词。',
      clearFilters: '清除筛选',
      clearConfirm: '确定清空所有生词吗？此操作无法撤销。',
    },
    review: {
      eyebrow: '复习',
      title: '练习今天到期的单词',
      description: '先回忆词义，再揭晓答案，并记录这次是否记住。',
      dueNow: '当前到期',
      reviewedSession: '本次已复习',
      mastered: '已掌握',
      currentWord: '当前单词',
      progress: '{current} / {total}',
      revealPlaceholder: '准备好后揭晓释义。',
      nextStep: '下一步：{label}',
      reveal: '揭晓释义',
      forgot: '不认识',
      familiar: '有印象',
      masteredFeedback: '已掌握',
      remembered: '记住了',
      noDue: '现在没有到期单词。',
      stageTomorrow: '明天再次复习',
      stageThreeDays: '3 天后复习',
      stageSevenDays: '7 天后复习',
      stageFinal: '最后一次复习后掌握',
    },
    article: {
      notStarted: '尚未开始',
      sentence: '第 {count} 句',
    },
  },
  en: {
    app: {
      brand: 'AI English Reading',
      navLabel: 'Primary navigation',
      languageSwitch: '中文',
      languageLabel: 'Interface language',
    },
    toolbar: {
      toolsLabel: 'Reading tools',
      undo: 'Undo',
      redo: 'Redo',
      select: 'Select',
      text: 'Text',
      pen: 'Annotate',
      pages: 'Pages',
      ask: 'Q&A',
      uploadPdf: 'Upload PDF',
      export: 'Export',
      disabledFeature: 'This control is shown for layout only and is not connected yet.',
    },
    nav: {
      home: 'Home',
      reader: 'Reader',
      vocabulary: 'Vocabulary',
      review: 'Review',
    },
    common: {
      loading: 'Loading',
      retry: 'Retry',
      unknownTime: 'Unknown time',
      soon: 'soon',
      emptyArticle: 'There is no article to read yet.',
      goHome: 'Go back home and add an article',
      noSavedWords: 'No saved words yet.',
      goReader: 'Go to Reader',
      viewVocabulary: 'View all vocabulary',
    },
    home: {
      welcome: 'Read in English. Revisit new words.',
      welcomeDescription: 'Read with sentence translations and a click-to-define dictionary. Save new words for review.',
      readingTitle: 'Reading workspace',
      readingDescription: 'Pick a book from the shelf, import a file, or paste an article.',
      reviewDescription: 'Use flashcards to recall word meanings and see them in context.',
      eyebrow: 'Study desk',
      title: 'Turn an English article into a focused reading session',
      description: 'Paste an article, read sentence by sentence, translate difficult parts, and save useful words.',
      inputLabel: 'English article',
      placeholder: 'Paste your English article here. Start with a short paragraph first.',
      start: 'Start Reading',
      openVocabulary: 'Open Vocabulary',
      inputHint: 'Tip: on the reader page, click any sentence for translation or any word for an explanation.',
      todayTitle: 'Today',
      vocabularyReview: 'Vocabulary review',
      dueWords: '{count} words due now',
      dueWordLabel: 'Words due now',
      startReview: 'Start Review',
      continueReading: 'Continue reading',
      continue: 'Continue',
      historyTitle: 'Recent reading',
      fillIn: 'Fill in',
      delete: 'Delete',
      emptyAlert: 'Please enter an English article first.',
    },
    reader: {
      eyebrow: 'Focused reader',
      aiPanelEyebrow: 'Context',
      aiPanelTitle: 'AI Q&A',
      contextLabel: 'Context:',
      contextArticle: 'Full article',
      translationCardTitle: 'Sentence translation',
      closeTranslationCard: 'Close translation card',
      title: 'Read with translation, word notes, and summary',
      description: 'Click a sentence to translate it. Click a word to see its meaning and save it.',
      selectedSentence: 'Selected sentence',
      sentencePlaceholder: 'Click a sentence on the left first.',
      progress: 'Sentence {current} of {total}',
      reviewDueWords: 'Review due words',
      previous: 'Previous',
      next: 'Next',
      translationTitle: 'Chinese translation',
      selectSentence: 'Select a sentence to load its translation.',
      loadingTranslation: 'Loading translation...',
      retryTranslation: 'Retry translation',
      translationFallback: 'Translation result will appear here.',
      summaryTitle: 'Article summary',
      summarize: 'Summarize',
      refresh: 'Refresh',
      loadingSummary: 'Loading summary...',
      summaryPlaceholder: 'Click Summarize to get a short Chinese summary.',
      wordTitle: 'Word explanation',
      wordPlaceholder: 'Click a word in the article to view its meaning.',
      loadingWord: 'Loading word explanation...',
      retryWord: 'Retry word',
      failedTranslation: 'Failed to load the translation.',
      failedSummary: 'Failed to load the summary.',
      failedWord: 'Failed to load the word explanation.',
      saved: 'Saved',
      add: 'Add',
      addedMessage: 'Added to vocabulary.',
      alreadySavedMessage: 'This word is already saved.',
      starWord: 'Star and save to vocabulary',
      starredWord: 'Starred and saved',
      closeWordCard: 'Close word card',
    },
    sentenceViewer: {
      title: 'English article',
      tip: 'Click a sentence for translation, or click a word for explanation.',
      clickToTranslate: 'Click to translate',
      translating: 'Translating...',
      fontSizeLabel: 'Reading font size',
      decreaseFontSize: 'Decrease reading font size',
      increaseFontSize: 'Increase reading font size',
    },
    vocabulary: {
      eyebrow: 'Vocabulary',
      title: 'Your saved words',
      description: 'Review the words you saved while reading. Data is stored locally in your browser.',
      searchLabel: 'Search words',
      searchPlaceholder: 'Search by word or meaning...',
      statusLabel: 'Review status',
      all: 'All',
      review: 'Review',
      mastered: 'Mastered',
      wordsCount: '{count} words',
      dueCount: '{count} due',
      reviewCount: '{count} review',
      masteredCount: '{count} mastered',
      reviewDue: 'Review Due',
      clearAll: 'Clear All',
      markReview: 'Mark Review',
      markMastered: 'Mark Mastered',
      delete: 'Delete',
      addedAt: 'Added at {time}',
      nextReview: 'Next review {time}',
      meaningLabel: 'Chinese meaning',
      definitionLabel: 'English definition',
      sentenceLabel: 'Original sentence',
      sourceArticle: 'Source: {title}',
      noMeaning: 'Meaning not generated yet',
      noDefinition: 'English definition not generated yet',
      noSentence: 'Original sentence not recorded',
      noArticle: 'Untitled article',
      noMatches: 'No words match your filters.',
      clearFilters: 'Clear Filters',
      clearConfirm: 'Clear all saved vocabulary words? This cannot be undone.',
    },
    review: {
      eyebrow: 'Review',
      title: 'Practice the words due today',
      description: 'Check the word first, reveal the meaning, then mark whether you remembered it.',
      dueNow: 'Due now',
      reviewedSession: 'Reviewed this session',
      mastered: 'Mastered',
      currentWord: 'Current word',
      progress: '{current} of {total}',
      revealPlaceholder: 'Reveal the meaning when you are ready.',
      nextStep: 'Next step: {label}',
      reveal: 'Reveal Meaning',
      forgot: 'Do not know',
      familiar: 'Familiar',
      masteredFeedback: 'Mastered',
      remembered: 'Remembered',
      noDue: 'No words are due right now.',
      stageTomorrow: 'review again tomorrow',
      stageThreeDays: 'next review in 3 days',
      stageSevenDays: 'next review in 7 days',
      stageFinal: 'final review before mastery',
    },
    article: {
      notStarted: 'Not started',
      sentence: 'Sentence {count}',
    },
  },
}

export const locale = ref(getInitialLocale())

export function getInitialLocale() {
  const storedLocale = getStorageItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE)

  return isSupportedLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE
}

export function initializeLocale() {
  locale.value = getInitialLocale()
  return locale.value
}

export function setLocale(nextLocale) {
  const normalizedLocale = isSupportedLocale(nextLocale) ? nextLocale : DEFAULT_LOCALE

  locale.value = normalizedLocale
  setStorageItem(LOCALE_STORAGE_KEY, normalizedLocale)

  return normalizedLocale
}

export function toggleLocale() {
  return setLocale(locale.value === 'zh' ? 'en' : 'zh')
}

export function t(key, params = {}) {
  const template = getMessage(locale.value, key) ?? getMessage(DEFAULT_LOCALE, key) ?? key

  return interpolate(template, params)
}

export function getArticleProgressText(article) {
  const index = article?.currentSentenceIndex

  if (!Number.isInteger(index)) {
    return t('article.notStarted')
  }

  return t('article.sentence', { count: index + 1 })
}

function isSupportedLocale(value) {
  return SUPPORTED_LOCALES.includes(value)
}

function getMessage(targetLocale, key) {
  return key.split('.').reduce((current, segment) => current?.[segment], messages[targetLocale])
}

function interpolate(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (_, name) => {
    return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : `{${name}}`
  })
}
