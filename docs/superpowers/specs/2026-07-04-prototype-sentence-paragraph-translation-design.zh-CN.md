# 原型页句子与段落翻译设计

## 背景

当前原型页已经支持单词点击释义，并且后端已经接入 Gemini 翻译接口。段落数据里已有 `translation` 字段，缺失译文时也已经具备调用 `/api/translate` 的基础逻辑。

下一步要补齐的是阅读过程中的句子翻译和段落翻译交互。该功能只作用于 `/reader-prototype`，不改正式阅读页。

## 目标

- 点击英文句子后，在该句下方显示中文翻译。
- 段落翻译保留在段落底部，但改为手动触发，避免一打开译文就批量消耗 Gemini API。
- 单词释义仍然显示在右侧栏，句子翻译不占用右侧栏。
- 已请求过的句子或段落译文应缓存，避免重复请求。
- 翻译失败时在原位置显示错误和重试入口。

## 非目标

- 不做正式阅读页的句子翻译。
- 不做整章批量翻译。
- 不做多语言选择，目标语言固定为简体中文。
- 不把句子翻译和单词释义合并进同一个右侧面板。

## 交互设计

### 句子翻译

用户点击英文句子时，原型页将该句设为当前选中句子，并在该句下方展开译文区域。

展示状态：

- 已有本地句子译文：直接显示本地译文。
- 无本地译文且未请求过：调用 `/api/translate` 生成译文。
- 请求中：显示“正在翻译...”。
- 请求失败：显示错误文案和“重试”按钮。
- 切换到另一句：旧句译文收起，新句译文展开。

点单词时不触发句子翻译。单词点击继续只更新右侧单词释义。

### 段落翻译

段落底部保留译文区域，但不自动为所有段落批量请求 AI。

展示状态：

- 已有本地段落译文：直接显示。
- 无本地段落译文：显示“翻译本段”按钮。
- 点击“翻译本段”：调用 `/api/translate`，源文本为该段所有句子的拼接文本。
- 请求中：显示“正在翻译...”。
- 请求失败：显示错误文案和“重试”按钮。
- 请求成功：显示整段中文译文。

顶部“译文”开关只控制段落译文区域是否显示，不负责自动批量翻译。

## 数据流

### 前端状态

在 `ReaderPrototype.vue` 中维护：

- `selectedSentenceId`：当前展开译文的句子 ID。
- `translationBySentenceId`：AI 生成的句子译文缓存。
- `translationLoadingBySentenceId`：句子翻译 loading 状态。
- `translationErrorBySentenceId`：句子翻译错误状态。
- 继续复用现有段落翻译状态：`translationByParagraphId`、`translationLoadingByParagraphId`、`translationErrorByParagraphId`。

段落和句子的状态 key 应结合章节或段落上下文，避免导入书籍、粘贴文章、内置章节之间 ID 冲突。

### API

继续复用现有前端 `requestTranslation(text)` 和后端 `POST /api/translate`。

后端暂不新增接口。`/api/translate` 仍然只接收：

```json
{
  "text": "English text to translate."
}
```

并返回：

```json
{
  "translation": "中文译文"
}
```

### 缓存

前端按源文本缓存翻译请求，避免同一文本并发或重复请求。

后端 `aiService` 已有 Gemini 翻译缓存和 pending request 去重，继续复用。

## 组件改动

### `PrototypeReadingPaper.vue`

新增句子选择和句子译文展示能力：

- 接收 `selectedSentenceId`。
- 接收句子级翻译状态映射。
- 点击句子时触发 `select-sentence`。
- 在选中句子下方渲染句子译文状态。
- 段落底部新增“翻译本段”按钮事件。

仍需保持：

- 高亮模式下点击句子用于高亮。
- 非高亮模式下点击句子用于翻译。
- 点击单词时阻止冒泡，避免同时触发句子翻译。

### `ReaderPrototype.vue`

新增句子翻译调度逻辑：

- `selectPrototypeSentence(sentence, paragraph)`：选中句子并加载译文。
- `loadPrototypeSentenceTranslation(sentence, paragraph, options)`：加载或刷新句子译文。
- `loadPrototypeParagraphTranslation(paragraph, options)`：改为由按钮触发，不再在 watcher 中自动遍历所有段落。
- `retryPrototypeSentenceTranslation(sentenceId)` 和现有段落 retry 分开处理。

### `readerPrototypeSelectors.js`

补充纯函数：

- `getPrototypeSentenceSourceText(sentence)`：规范化句子源文本。
- `getPrototypeLocalSentenceTranslation(sentence)`：读取句子本地译文。
- 必要时补充 state key helper，方便测试 ID 冲突。

## 错误处理

- 空文本不发请求。
- Gemini 失败时展示用户可理解的错误文案。
- 重试只刷新当前句子或当前段落，不影响其他翻译。
- 已存在本地译文时不请求 AI。

## 测试计划

新增或调整 Node 测试：

- 句子源文本和本地句子译文 selector。
- `PrototypeReadingPaper.vue` 合约：非高亮模式点击句子触发翻译事件，高亮模式不触发翻译事件。
- 选中句子后只显示该句译文。
- 段落译文不再自动批量请求，只有点击“翻译本段”才请求。
- 段落 retry 和句子 retry 各自只影响对应状态。
- 点单词不触发句子翻译。

保留现有验证：

- `npm.cmd test`
- `npm.cmd run build`

## 验收标准

- 在 `/reader-prototype` 点击一句英文后，该句下方能显示中文译文。
- 点击另一句时，译文展示切换到新句。
- 点击单词时右侧显示单词释义，句子译文不被误触发。
- 打开段落译文区域时，不自动批量调用 Gemini。
- 点击“翻译本段”后，该段底部显示整段译文。
- 翻译失败时可以在原位置重试。
