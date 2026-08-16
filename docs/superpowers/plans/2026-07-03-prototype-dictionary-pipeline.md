# 原型页词典查询链路实施方案

> **给执行 agent 的要求：** 执行本方案时使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`。任务使用复选框格式，方便逐项推进。

**目标：** 为原型阅读页建立稳定的查词链路：本地高频词库优先，外部词典补充，AI 最后兜底。

**整体架构：** 保留现有 `POST /api/prototype-word-explain` 接口，前端不需要知道具体查的是哪个词典。后端统一通过 `lookupPrototypeWord()` 完成查询，顺序为：本地词库 -> 外部词典 -> AI -> 空结果兜底。无论来源是什么，都返回同一套字段结构，保证右侧词义面板稳定展示。

**技术栈：** Vue 3、Vite、Express 5、Node.js ESM、JSON 本地词库、Node 内置测试框架。

---

## 一、推荐查询顺序

查词时按下面顺序执行：

1. **本地高频词库**
   - 存常见词、阅读高频词、常见变形。
   - 响应最快，不依赖网络，不花 AI 成本。

2. **外部词典接口**
   - 本地没有时再查。
   - 短期沿用当前代码里的在线外部词典组合：
     - `MyMemory Translated`：负责英文到中文的简短翻译。
     - `Free Dictionary API`：负责英文释义、词性、例句和音标。
   - 中期建议接入 `ECDICT`，把常用英中词条导入成本地 JSON 或 SQLite。

3. **AI 释义**
   - 本地和外部都没有时调用。
   - 适合短语、专有名词、上下文含义。

4. **空结果兜底**
   - 如果外部词典和 AI 都失败，也不要让页面显示红色错误。
   - 返回一个空释义对象，让页面保持可用。

统一返回结构：

```js
{
  word: 'each',
  meaning: '每个；各自',
  definition: 'Every one of two or more people or things, considered separately.',
  partOfSpeech: 'determiner / pronoun',
  example: 'Each sentence felt unusually clear.',
  phonetic: '/iːtʃ/',
  source: 'local-dictionary'
}
```

`source` 可选值：

```js
local-dictionary
external-dictionary
ai
fallback
cache
empty
```

---

## 二、外部词典选择

### 短期在线外部词典

当前原型页后端已经使用两个在线接口组合成“外部词典”：

1. **MyMemory Translated**
   - 用途：把英文单词翻译成中文简明释义。
   - 当前接口：`https://api.mymemory.translated.net/get`
   - 当前参数：
     - `q`：要查询的英文单词。
     - `langpair=en|zh-CN`：英文到简体中文。
     - `mt=1`：允许机器翻译。
     - `de`：可选邮箱，来自 `MYMEMORY_EMAIL`。

2. **Free Dictionary API**
   - 用途：查询英文释义、词性、例句、音标。
   - 当前接口：`https://api.dictionaryapi.dev/api/v2/entries/en/<word>`
   - 当前使用字段：
     - `meanings[].partOfSpeech`
     - `meanings[].definitions[].definition`
     - `meanings[].definitions[].example`
     - `phonetic` 或 `phonetics[].text`

组合规则：

```text
MyMemory 提供 meaning
Free Dictionary API 提供 definition / partOfSpeech / example / phonetic
```

如果 `MyMemory` 没有返回有效中文释义，则这次外部词典结果视为不可用，继续走 AI。

### 中期本地化词典来源

推荐使用 `ECDICT` 作为批量本地词库来源。

用途：

- 生成 3000-10000 个常用本地词条。
- 替代大部分在线外部词典请求。
- 让查词更快、更稳定。

建议处理方式：

```text
ECDICT 原始数据 -> 构建脚本 -> localWordDefinitions.json -> 本地查询
```

注意：

- `ECDICT` 更适合作为“本地词库数据源”，不是每次点击时在线请求。
- 上线公开版本前，需要确认词库授权是否符合项目使用方式。

---

## 三、涉及文件

- 修改：`server/services/prototypeWordService.js`
  - 负责查词顺序、缓存、请求去重、失败兜底。

- 修改：`server/services/prototypeWordService.test.js`
  - 测试本地优先、外部词典优先于 AI、AI 兜底、全部失败时不抛错。

- 修改：`server/services/localDictionaryService.js`
  - 负责读取本地词库，并建立基本词和变形词索引。

- 修改：`server/services/localDictionaryService.test.js`
  - 测试本地词库命中、大小写、词形变化、高频词。

- 修改：`server/data/localWordDefinitions.json`
  - 当前本地词库文件。
  - 第一阶段继续使用 JSON，不急着上数据库。

- 新增：`server/data/localWordDefinitions.schema.md`
  - 记录本地词库字段规范。

- 新增：`server/scripts/buildLocalDictionary.js`
  - 后续用于把外部词典数据转换成本地 JSON。

- 新增：`server/scripts/buildLocalDictionary.test.js`
  - 测试词典转换脚本。

- 修改：`.env.example`
  - 增加外部词典开关和超时配置说明。

- 保持：`src/api/prototypeWord.js`
  - 前端继续请求 `/api/prototype-word-explain`。

- 保持：`src/components/reader-prototype/PrototypeAssistant.vue`
  - 继续展示统一后的词义数据。
  - 只在接口请求失败时显示错误，不因为“没有释义”显示红框。

---

## 四、阶段一：先把原型页体验做稳

### 任务 1：固定查词接口返回协议

**目标：** 不管本地、外部、AI、兜底，接口都返回同一种数据结构。

**修改文件：**

- `server/services/prototypeWordService.js`
- `server/services/prototypeWordService.test.js`

步骤：

- [ ] 在 `server/services/prototypeWordService.test.js` 增加测试：当外部词典和 AI 都失败时，接口返回 `source: 'fallback'`，而不是抛错。

测试代码：

```js
it('所有查词来源失败时返回空兜底结果，而不是抛错', async () => {
  const detail = await lookupPrototypeWord('unknownword', {
    cache: new Map(),
    pendingRequests: new Map(),
    localLookup: () => null,
    externalLookup: async () => {
      throw new Error('external unavailable')
    },
    aiLookup: async () => {
      throw new Error('ai unavailable')
    },
  })

  assert.deepEqual(detail, {
    word: 'unknownword',
    meaning: '',
    definition: '',
    partOfSpeech: '',
    example: '',
    phonetic: '',
    source: 'fallback',
  })
})
```

- [ ] 运行测试：

```bash
npm.cmd test -- server/services/prototypeWordService.test.js
```

- [ ] 在 `server/services/prototypeWordService.js` 中保证 AI 调用失败会被接住：

```js
try {
  const aiDetail = normalizeLookupDetail(await aiLookup(word), 'ai', word)
  cache.set(cacheKey, aiDetail)
  return aiDetail
} catch (error) {
  console.warn(`AI word lookup failed for "${word}": ${error?.message || 'unknown error'}`)
  const fallbackDetail = normalizeLookupDetail(null, 'fallback', word)
  cache.set(cacheKey, fallbackDetail)
  return fallbackDetail
}
```

- [ ] 再次运行测试，确认通过。

---

### 任务 2：扩充本地高频词库

**目标：** 先补一批阅读页里最常出现的词，减少外部接口和 AI 调用。

**修改文件：**

- `server/data/localWordDefinitions.json`
- `server/services/localDictionaryService.test.js`

建议第一批补这些类型：

- 冠词：`the`、`a`、`an`
- 代词：`each`、`this`、`that`、`it`、`she`、`he`
- 常见动词：`make`、`made`、`read`、`see`、`know`、`feel`
- 常见形容词：`clear`、`quiet`、`old`、`small`
- 阅读相关词：`sentence`、`word`、`chapter`、`story`

测试示例：

```js
it('能返回常见阅读高频词的本地释义', () => {
  assert.equal(lookupLocalWordDefinition('the')?.meaning, '这个；那个')
  assert.equal(lookupLocalWordDefinition('make')?.meaning, '制造；使得')
  assert.equal(lookupLocalWordDefinition('made')?.word, 'made')
  assert.equal(lookupLocalWordDefinition('clear')?.meaning, '清楚的；明亮的')
})
```

词条示例：

```json
{
  "make": {
    "word": "make",
    "meaning": "制造；使得",
    "definition": "To create something or cause something to happen.",
    "partOfSpeech": "verb",
    "example": "The quiet room made each sentence feel clear.",
    "phonetic": "/meɪk/",
    "forms": ["makes", "made", "making"]
  }
}
```

验收命令：

```bash
npm.cmd test -- server/services/localDictionaryService.test.js
```

---

### 任务 3：补本地词库字段说明

**目标：** 以后新增词条时格式统一，避免字段缺失。

**新增文件：**

- `server/data/localWordDefinitions.schema.md`

内容：

```markdown
# 本地词库字段规范

本地原型词库位于：

`server/data/localWordDefinitions.json`

每个顶层 key 是小写基础词。

字段示例：

```json
{
  "word": "make",
  "meaning": "制造；使得",
  "definition": "To create something or cause something to happen.",
  "partOfSpeech": "verb",
  "example": "The quiet room made each sentence feel clear.",
  "phonetic": "/meɪk/",
  "forms": ["makes", "made", "making"]
}
```

字段说明：

- `word`：基础展示词。
- `meaning`：中文简明释义。
- `definition`：英文释义。
- `partOfSpeech`：词性展示文本。
- `example`：例句。
- `phonetic`：音标，没有可以为空字符串。
- `forms`：词形变化，比如过去式、复数、现在分词。
```

验收命令：

```powershell
Test-Path server/data/localWordDefinitions.schema.md
```

期望输出：

```text
True
```

---

## 五、阶段二：接入可批量导入的词库

### 任务 4：增加词库构建脚本

**目标：** 后续不再手动维护几千个词，而是从外部词库数据生成本地 JSON。

**新增文件：**

- `server/scripts/buildLocalDictionary.js`
- `server/scripts/buildLocalDictionary.test.js`

脚本职责：

- 读取外部词库导出的行数据。
- 标准化单词 key。
- 标准化中文释义、英文释义、词性、音标。
- 解析词形变化。
- 输出符合 `localWordDefinitions.json` 结构的数据。

测试示例：

```js
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeDictionaryRow } from './buildLocalDictionary.js'

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
})
```

验收命令：

```bash
npm.cmd test -- server/scripts/buildLocalDictionary.test.js
```

---

### 任务 5：让外部词典变成可配置开关

**目标：** 开发时可以开外部词典；如果网络不稳定，也可以关闭，只走本地 + AI。

本阶段明确外部词典使用：

```text
MyMemory Translated：中文简明释义
Free Dictionary API：英文释义 / 词性 / 例句 / 音标
```

当前后端对应函数：

```js
fetchChineseWordTranslation(word) // MyMemory
fetchFreeDictionaryEntry(word) // Free Dictionary API
fetchExternalDictionaryDetail(word) // 合并两个接口结果
```

**修改文件：**

- `server/services/prototypeWordService.js`
- `server/services/prototypeWordService.test.js`
- `.env.example`

新增配置：

```env
EXTERNAL_DICTIONARY_ENABLED=true
EXTERNAL_DICTIONARY_TIMEOUT_MS=5000
MYMEMORY_EMAIL=
```

后端判断逻辑：

```js
function isExternalDictionaryEnabled(options) {
  if (typeof options.enableExternalDictionary === 'boolean') {
    return options.enableExternalDictionary
  }

  return process.env.EXTERNAL_DICTIONARY_ENABLED !== 'false'
}
```

外部词典调用包一层判断：

```js
if (isExternalDictionaryEnabled(options)) {
  try {
    externalDetail = await externalLookup(word)
  } catch (error) {
    console.warn(`External dictionary failed for "${word}": ${error?.message || 'unknown error'}`)
  }
}
```

验收命令：

```bash
npm.cmd test -- server/services/prototypeWordService.test.js
```

---

## 六、阶段三：前端展示规则

### 任务 6：保持原型页错误语义清晰

**目标：** “没有释义”和“接口失败”要区分开。

规则：

- 接口请求失败：可以显示红色错误。
- 接口返回 `fallback`：不显示红色错误。
- 本地没有释义但有原文上下文：右侧面板继续显示单词和原文句子。

涉及文件：

- `src/components/reader-prototype/PrototypeAssistant.vue`
- `src/pages/ReaderPrototype.vue`
- `src/pages/ReaderPrototype.layout.test.js`

验收：

- 点击本地词库词：显示中文释义。
- 点击未收录词：不出现红色 `Failed to load...`。
- 后端没启动时：仍然可以显示请求失败，这属于真实接口错误。

---

## 七、最终验证

执行完后跑：

```bash
npm.cmd test
```

期望：

```text
所有测试通过
```

再跑：

```bash
npm.cmd run build
```

期望：

```text
✓ built
```

启动后端：

```bash
npm.cmd run server
```

接口验证：

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/prototype-word-explain -Method Post -ContentType 'application/json' -Body '{"word":"each"}'
```

期望：

```text
word    : each
meaning : 每个；各自
source  : local-dictionary
```

浏览器验证：

打开：

```text
http://127.0.0.1:5173/reader-prototype
```

点击这些词：

```text
each
sentence
clear
made
the
```

期望：

- 本地词显示中文释义。
- 未收录词不出现红色失败框。
- 右侧词义面板保持可用。

---

## 八、推荐上线节奏

### 第一阶段：马上做

- 保持 JSON 本地词库。
- 扩充 300-500 个高频词。
- 保留外部词典和 AI 兜底。
- 只作用于原型阅读页。

### 第二阶段：体验稳定后做

- 增加词库导入脚本。
- 从 ECDICT 这类词库生成 3000-10000 个本地词条。
- 上线前确认词库授权是否适合项目使用。

### 第三阶段：正式页复用

- 如果 JSON 文件变得太大，再考虑 SQLite。
- 等原型页行为稳定后，把同一套查词服务复用到正式阅读页。

---

## 九、结论

当前最合适的方案不是一上来就全部依赖外部接口，也不是手动补每个词。

推荐路线是：

```text
本地高频词库 -> 外部词典 -> AI -> 空兜底
```

这样能兼顾：

- 响应速度
- 稳定性
- 成本
- 后续扩展空间
