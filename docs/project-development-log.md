# 项目完整开发日志

项目名称：AI 英语阅读辅助系统
当前主要入口：`/reader` 新版阅读工作台
日志生成日期：2026-07-08
项目目录：`C:\Users\35432\Desktop\reader\ai-reading-app-github-ready`

## 1. 资料来源与遍历范围

本日志根据当前项目文件夹、Git 提交历史、项目 README、`docs/superpowers` 设计与实施文档、源码模块、测试文件和已读取的项目相关 Codex 对话摘要整理。

本次遍历范围：

- 遍历项目文件：104 个。
- 遍历测试文件：26 个。
- 排除目录与大文件：`node_modules`、`dist`、`server/data/localWordDefinitions.generated.json`。
- 当前工作区状态：生成本日志后，`git status` 显示 `README.md`、`src/components/reader-prototype/PrototypeTopbar.vue`、`src/pages/ReaderPrototype.layout.test.js` 存在既有改动，另有本日志文件为新增文档。
- 当前分支：`style/halftone-paper-theme`。

当前验证结果：

- `npm.cmd test` 通过，155 个测试全部通过。
- `npm.cmd run build` 通过。

## 2. 项目定位

本项目是一个面向英语学习者的 AI 阅读辅助系统。项目不是单纯的英文阅读器，而是围绕“阅读、理解、查词、积累、复习”构建学习闭环。

系统早期以传统句子级阅读页为主，后续逐步演进出新版阅读工作台。新版工作台最初以 `/reader-prototype` 作为原型页开发，在功能成熟后被提升为主入口 `/reader`，旧版阅读页保留为 `/reader-legacy`。

推荐报告题目：

《基于 Vue 与大模型 API 的英语阅读辅助学习系统设计与实现》

## 3. 当前技术栈

- 前端：Vue 3 Composition API、Vue Router、Vite。
- 后端：Node.js、Express。
- AI Provider：Gemini、DeepSeek。
- 默认模型配置：`gemini-2.5-flash-lite`、`deepseek-v4-flash`。
- 数据存储：localStorage、IndexedDB、页面内存态、本地 JSON 词库。
- 文件解析：PDF 相关依赖 `pdfjs-dist`，EPUB 解析依赖 `jszip`。
- 测试：Node.js 内置 test runner。
- 样式：原生 CSS。

## 4. 目录遍历摘要

### 4.1 根目录

- `README.md`：项目说明、路由说明、运行方式、环境变量、测试构建和答辩建议。
- `package.json`：定义 `dev`、`dev:all`、`server`、`test`、`build`、`preview` 等脚本。
- `vite.config.js`：Vite 配置。
- `.env.example`：Gemini、DeepSeek、外部词典、代理、缓存等环境变量示例。
- `scripts/startDev.js`：一键启动后端和 Vite 前端。
- `scripts/startDev.test.js`：验证一键启动脚本的命令配置。

### 4.2 `src/pages`

- `Home.vue`：首页文章输入、历史文章、继续阅读和复习入口。
- `ReaderPrototype.vue`：新版阅读工作台主页面，当前 `/reader` 和 `/reader-prototype` 都指向该组件。
- `Reader.vue`：旧版句子级阅读页，当前保留在 `/reader-legacy`。
- `Vocabulary.vue`：生词本管理页面。
- `Review.vue`：生词复习页面。

### 4.3 `src/components`

- `SentenceViewer.vue`：旧版阅读页的句子展示、翻译卡、单词卡组件。
- `reader-prototype/PrototypeTopbar.vue`：新版阅读工作台顶部栏。
- `reader-prototype/PrototypeSidebar.vue`：书架、章节、阅读进度侧栏。
- `reader-prototype/PrototypeReadingPaper.vue`：中间阅读正文、句子点击、双击翻译、段落翻译、高亮渲染。
- `reader-prototype/PrototypeAssistant.vue`：右侧单词释义、章节词汇、本地生词本面板。
- `reader-prototype/PrototypePasteEditor.vue`：粘贴文章编辑器。
- `reader-prototype/PrototypeBookImportPanel.vue`：PDF/EPUB 导入面板。

### 4.4 `src/data`

- `readerPrototypeData.js`：内置书籍、章节、词典 mock 数据。
- `readerPrototypeSelectors.js`：新版阅读页的数据选择器、结构转换、查词上下文、高亮 helper、翻译 key helper、粘贴文章转换逻辑。
- `readerPrototypeSelectors.test.js`：覆盖章节选择、词汇派生、点击 token、句子翻译、高亮、粘贴文章等纯逻辑。

### 4.5 `src/utils`

- `articleHistory.js`：文章历史、阅读进度保存与恢复。
- `vocabulary.js`：生词保存、筛选、复习状态和间隔复习字段。
- `sentence.js`：英文句子切分。
- `word.js`：单词规范化和 token 拆分。
- `readerNavigation.js`：旧版阅读页句子导航和进度计算。
- `readerFontSize.js`：旧版阅读页字号控制。
- `translationCache.js`：句子/段落按内容 hash 的翻译缓存。
- `prototypeFileParser.js`：PDF/EPUB 文件解析。
- `prototypeBookImport.js`：导入书籍结构化、IndexedDB 存储、旧 localStorage 迁移。
- `clipboard.js`：剪贴板读取。
- `wordCardPosition.js`、`wordCardInteraction.js`、`wordStar.js`：旧版浮动单词卡相关工具。

### 4.6 `src/api`

- `request.js`：统一 JSON 请求封装。
- `translate.js`：调用 `/api/translate`，支持传入 `sentence` 或 `paragraph` 类型。
- `prototypeWord.js`：调用 `/api/prototype-word-explain`。
- `word.js`、`summarize.js`：旧版 AI 单词解释和摘要接口封装。

### 4.7 `server`

- `server/index.js`：Express 入口，提供静态文件和 API。
- `server/config/loadEnv.js`：加载 `.env.local` 和 `.env`。
- `server/services/aiService.js`：Gemini、DeepSeek、mock fallback、缓存、重试、超时、provider 路由。
- `server/services/prompts.js`：翻译、单词解释、摘要 prompt。
- `server/services/prototypeWordService.js`：原型页查词链路，本地词库 -> 外部词典 -> AI -> fallback。
- `server/services/localDictionaryService.js`：本地词库读取与词形索引。
- `server/scripts/buildLocalDictionary.js`：从外部词典数据构建本地 JSON 词库。
- `server/data/localWordDefinitions.json`：本地词库。
- `server/data/localWordDefinitions.schema.md`：本地词库字段规范。
- `server/data/ECDICT_LICENSE`：词库授权说明。

### 4.8 `docs/superpowers`

该目录记录了多次需求分析、设计方案和实施计划，是项目开发过程的重要依据。

- 2026-06-01：阅读字号控制设计与实施计划。
- 2026-06-08：PDF-ready Reader 设计与实施计划。
- 2026-06-24：英语阅读器 UI 原型设计。
- 2026-07-01：原型页高亮设计与实施计划。
- 2026-07-02：粘贴文章实施计划。
- 2026-07-03：原型页词典查询链路实施计划。
- 2026-07-04：原型页句子与段落翻译设计与实施计划。

## 5. 路由演进

当前路由结构：

- `/`：首页。
- `/reader`：新版阅读工作台，组件为 `ReaderPrototype.vue`，使用独立全屏工作区。
- `/reader-prototype`：兼容旧原型页路径，同样指向新版阅读工作台。
- `/reader-legacy`：旧版阅读页，组件为 `Reader.vue`。
- `/vocabulary`：生词本。
- `/review`：复习页。

该演进说明项目经历了“旧版正式阅读页”和“新版产品化工作台”并存的阶段。最终新版工作台被提升为主入口，同时保留旧版页面便于对比和回退。

## 6. Git 提交时间线

### 2026-05-06

- `initial commit`
- 初始化项目。

### 2026-05-28

- `feat: add recent reading history`
- `feat: improve reader utilities and vocabulary review`
- `feat: add vocabulary review loop`
- 建立文章历史、阅读工具、生词本和复习闭环。
- 项目开始从“阅读页面”扩展为“阅读 + 生词积累 + 复习”的学习系统。

### 2026-06-01

- `fix article progress handling`
- 修复文章阅读进度处理。
- 设计 Reader 字号控制方案，规划 `A-`、`A+`、字号持久化和范围限制。

### 2026-06-08

- `docs: add pdf-ready reader design`
- `docs: add pdf-ready reader implementation plan`
- 规划 PDF-ready Reader，包括 PDF 上传、渲染、文本层、选中文本解释、浮动 AI 问答面板。
- 该阶段主要是设计与计划，并非当前主工作台的最终实现路径。

### 2026-06-24

- `docs: add english reader prototype design`
- `docs: add chinese reader prototype design`
- 确定新版阅读器 UI 原型方向。
- 设计目标从旧版句子练习工具转向高密度、三栏、正文优先的阅读工作区。

### 2026-07-01

- `docs: add reader prototype highlighter design`
- `docs: add chinese reader prototype highlighter design`
- `docs: add reader prototype highlighter plan`
- `feat: add prototype highlight selectors`
- 设计并实现原型页句子高亮纯逻辑。
- 参考 Obsidian 和 Notion 的手动标注体验。

### 2026-07-02

- `chore: baseline reading app prototype and docs`
- 建立原型页基线和相关文档。
- `/reader-prototype` 成为后续产品化阅读体验的主要实验区。

### 2026-07-03

- `feat: add reader prototype import and paste workflow`
- 新增粘贴文章、PDF/EPUB 导入、导入书籍结构化、剪贴板工具、文件解析和导入存储。

- `style: polish reader prototype workspace UI`
- 优化新版工作台视觉层级，包括顶部栏、侧栏、阅读纸张、工具条和整体工作区质感。

- `chore: remove reader prototype preview script`
- 删除旧预览脚本，清理项目结构。

### 2026-07-04

- `Add prototype dictionary lookup pipeline`
- 接入原型页查词链路。
- 后端统一 `/api/prototype-word-explain`，查询顺序为本地词库、外部词典、AI、fallback。
- 新增本地词库、词典构建脚本、词库 schema、外部词典配置和相关测试。

- `docs: design prototype sentence translation`
- `docs: plan prototype sentence translation`
- 设计句子/段落按需翻译。

- `feat: add prototype sentence translation selectors`
- 新增句子翻译源文本、本地译文、翻译状态 key helper。

- `feat: render prototype sentence translations inline`
- 在正文中渲染句子译文和段落翻译按钮。

- `feat: load prototype translations on demand`
- 移除打开译文后自动批量翻译，改成用户点击句子或点击“翻译本段”才请求 AI。

- `fix: isolate prototype translation requests`
- 隔离粘贴文章和章节切换时的翻译请求，避免旧请求覆盖新页面状态。

- `feat: support double click sentence translation`
- 支持双击句子触发翻译，同时不破坏单词点击。

- `chore: remove empty prototype shelf books`
- 清理默认书架中的空书籍。

- `fix: decode epub html entities`
- 修复 EPUB 文本实体解码问题，提升导入文本可读性。

### 2026-07-08

- `feat: cache prototype translations by content`
- 翻译缓存改为基于内容 hash。
- 句子缓存 key：`sentence:${hash(text)}`。
- 段落缓存 key：`paragraph:${hash(text)}`。
- 同文本重复翻译可复用缓存，避免重复消耗 AI API。

- `feat: add deepseek translation provider`
- 增加 DeepSeek provider。
- `.env.example` 新增 `AI_PROVIDER`、`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`。
- `/api/translate` 接收翻译类型，后端按 provider 选择 Gemini 或 DeepSeek。
- DeepSeek 请求体包含 `thinking: { type: 'disabled' }` 和 `stream: false`。
- 保留 Gemini/mock 路径，不删除原有能力。

- `feat: promote prototype reader to main entry`
- 将新版阅读工作台提升为 `/reader` 主入口。
- `/reader-prototype` 保持兼容。
- 旧版阅读页迁移到 `/reader-legacy`。
- 新增 `npm run dev:all` 一键启动前后端。
- 更新 README 和路由测试。

## 7. 对话驱动的需求演进

### 7.1 产品定位收敛

早期对话中，项目被定位为 AI 英语阅读辅助系统，而不是简单翻译工具。核心价值逐步明确为：

- 文章导入。
- 句子级阅读理解。
- 单词点击释义。
- 生词保存。
- 复习巩固。
- AI 翻译、摘要、解释作为辅助能力。

### 7.2 原型页方向确定

随后对话集中在 `/reader-prototype`。用户明确希望右侧不是聊天助手，而是单词释义面板；页面保持三栏布局，不大改路由，不随意引入真实 API 或新依赖。

这一阶段形成了新版工作台的基础约束：

- 左侧书架和章节。
- 中间英文正文和中文译文。
- 右侧单词释义面板。
- 不让旧的字符串正则切词路径回流。
- 使用结构化 token 支撑查词和上下文。

### 7.3 高亮能力

用户希望参考 Obsidian 和 Notion，增加手动句子高亮和颜色选择。项目因此引入：

- 高亮显示开关。
- 高亮笔模式。
- 五种颜色。
- 清除模式。
- 章节内页面记忆。
- 刷新后恢复默认高亮。

### 7.4 导入和真实阅读材料

项目从静态原型继续扩展到可导入内容：

- 支持粘贴文章。
- 支持 PDF/EPUB 导入。
- 导入内容转换为统一的书籍、章节、段落、句子、token 结构。
- 导入书籍使用 IndexedDB 存储，避免 localStorage 单字符串容量限制。

### 7.5 查词链路

用户提出“先调用外部词典，翻译不了再调用 AI”的方向。后端因此建立稳定查词链路：

```text
本地词库 -> 外部词典 -> AI -> fallback
```

本地词库用于高频词和常见词形，外部词典用于补充释义，AI 用于兜底短语、上下文词义和未收录词。

### 7.6 按需翻译与省额度

用户担心 API 额度消耗，项目把翻译策略调整为：

- 打开文章不自动全文翻译。
- 切换章节不自动翻译。
- 单击单词只查词，不翻译句子。
- 双击句子只翻译当前句。
- 点击“翻译本段”只翻译当前段。
- 失败后只显示重试，不自动循环请求。
- 同文本使用内容 hash 缓存。

### 7.7 Provider 扩展

最后接入 DeepSeek provider，同时保留 Gemini 代码。该决策保证：

- 前端不暴露 API key。
- 后端按 `AI_PROVIDER` 选择 provider。
- Gemini 可作为保留路径。
- 不做隐式自动 fallback，避免用户误以为只消耗某一个 provider。

## 8. 核心模块开发日志

### 8.1 首页与文章历史

首页支持输入文章、保存到本地历史、展示最近阅读、继续阅读、填回文章、删除历史文章。它通过 `articleHistory.js` 和 `storage.js` 管理本地数据，并将用户送入 `/reader`。

新版 `/reader` 已经是工作台入口，因此首页现在实际会进入新版阅读体验。

### 8.2 旧版阅读页

旧版 `Reader.vue` 保留了早期项目能力：

- 句子切分。
- 上一句/下一句。
- 句子翻译。
- 单词解释。
- 文章摘要。
- 浮动单词卡。
- 字号控制。

旧版页面现在保留为 `/reader-legacy`，可以在答辩中作为演进对比。

### 8.3 新版阅读工作台

新版 `ReaderPrototype.vue` 是当前核心页面。它整合：

- 书架和章节。
- 内置书籍。
- 导入书籍。
- 粘贴文章。
- PDF/EPUB 解析结果。
- 句子翻译。
- 段落翻译。
- 高亮状态。
- 单词释义。
- 本地生词本。
- 外部词典和 AI 查词。

该页面承担主要状态编排，复杂纯逻辑尽量下沉到 selectors 和 utils。

### 8.4 数据选择器

`readerPrototypeSelectors.js` 是新版工作台稳定性的关键。它负责：

- 选择当前书籍、章节、正文。
- 派生章节词汇。
- 构造单词上下文。
- 映射本地词典和 AI 词典结果。
- 生成高亮状态。
- 生成翻译状态 key。
- 把粘贴文本转换为章节内容。
- 从非结构化文本生成可点击 token。

大量测试覆盖该文件，避免 UI 组件中混入过多字符串处理逻辑。

### 8.5 文件导入

PDF/EPUB 导入由 `prototypeFileParser.js` 和 `prototypeBookImport.js` 支撑。

实现重点：

- 识别文件类型。
- 提取文本。
- EPUB 按 spine 顺序组织章节。
- 修复 HTML/XML 实体编码。
- 将文本拆分为章节、段落、句子、token。
- 以 IndexedDB 存储导入书籍。
- 从旧 localStorage 导入数据迁移到 IndexedDB。
- IndexedDB 不可用时提供临时导入 fallback。

### 8.6 翻译系统

前端通过 `src/api/translate.js` 请求 `/api/translate`，并传入类型：

- `sentence`
- `paragraph`

前端缓存使用 `translationCache.js`，按内容 hash 和类型区分，避免同一句和同一段互相串用。

后端 `aiService.js` 负责：

- Gemini 调用。
- DeepSeek 调用。
- provider 选择。
- mock fallback。
- 超时。
- 重试。
- 缓存。
- stale cache fallback。
- 安全错误信息。

### 8.7 查词系统

原型页查词接口为 `/api/prototype-word-explain`。

后端查询顺序：

```text
local-dictionary -> external-dictionary -> ai -> fallback
```

本地词库命中时响应最快，外部词典用于补充，AI 用于兜底。如果全部失败，仍返回空结构，避免右侧面板直接崩掉。

### 8.8 生词本与复习

生词本从早期功能逐步完善为学习闭环：

- 保存 word、meaning、definition、sentence、articleTitle、status、createdAt、nextReviewAt、reviewCount。
- 支持搜索、删除、掌握状态。
- 复习页支持揭晓释义。
- 后续加入“不认识 / 有印象 / 已掌握”等反馈。
- 间隔复习状态通过 `vocabulary.js` 管理。

### 8.9 高亮系统

高亮系统设计为页面内存态，不使用 localStorage 持久化。

能力包括：

- 默认高亮。
- 高亮显示/隐藏。
- 高亮笔模式。
- 五色标注。
- 清除模式。
- 单词点击阻止冒泡，不误触发高亮。
- 切换章节时保留当前页面内的章节高亮。
- 刷新后回到默认原型高亮。

### 8.10 启动与部署准备

项目新增 `npm run dev:all`，通过 `scripts/startDev.js` 同时启动：

- `npm run server`
- `npm run dev`

这降低了本地演示和答辩时的启动成本。

## 9. 测试覆盖摘要

当前测试文件共 26 个，覆盖范围包括：

- 启动脚本。
- 环境变量加载。
- 本地词库构建脚本。
- AI provider。
- 本地词典服务。
- 原型页查词服务。
- API client。
- 原型页 selectors。
- 旧版 Reader 布局契约。
- 新版工作台布局契约。
- 生词本与复习流程。
- 路由入口。
- 文章历史。
- 剪贴板。
- 导入书籍。
- PDF/EPUB 解析。
- 字号控制。
- 句子切分。
- 翻译缓存。
- 生词复习算法。
- 浮动单词卡交互与定位。

最新验证：

```powershell
npm.cmd test
```

结果：

```text
155 pass / 0 fail
```

构建验证：

```powershell
npm.cmd run build
```

结果：

```text
vite build succeeded
```

## 10. 当前功能清单

已完成能力：

- 首页输入文章。
- 阅读历史与继续阅读。
- 新版 `/reader` 工作台。
- `/reader-prototype` 兼容入口。
- `/reader-legacy` 旧版入口。
- 书架与章节切换。
- 内置阅读材料。
- 粘贴文章。
- PDF/EPUB 导入。
- IndexedDB 导入书籍存储。
- 句子级按需翻译。
- 段落级手动翻译。
- 内容 hash 翻译缓存。
- 单词点击释义。
- 本地词库。
- 外部词典。
- AI 查词兜底。
- Gemini provider。
- DeepSeek provider。
- 生词本。
- 复习页。
- 高亮笔和五色标注。
- 测试和构建验证。

## 11. 当前限制

当前仍存在的限制：

- 用户系统和云同步尚未实现。
- 高亮标注刷新后不持久化。
- 高亮备注和标签尚未实现。
- 生词本主要依赖本地存储。
- PDF/EPUB 导入的阅读体验仍可继续优化。
- DeepSeek/Gemini 的线上稳定性取决于 API key、额度和网络环境。
- 外部词典服务依赖第三方接口，生产部署时需要考虑限流和可用性。
- 没有正式数据库，数据持久化仍偏本地化。

## 12. 后续开发建议

建议按答辩和实用价值排序：

1. 高亮持久化：按 `bookId + chapterId + sentenceId` 保存颜色、备注和时间。
2. 高亮备注：点击高亮句子后，在右侧记录备注、标签和关联单词。
3. 文章管理：增加导入历史、标题编辑、删除确认、继续阅读。
4. 生词复习增强：加入更明确的间隔重复策略和错词统计。
5. 后端持久化：引入数据库保存用户文章、生词、阅读进度和高亮。
6. 登录同步：实现账号体系和跨设备同步。
7. 部署整理：区分开发、演示、生产配置，完善服务器部署文档。
8. 报告与答辩材料：补充系统架构图、功能截图、测试截图和演示流程。

## 13. 答辩表述建议

答辩时建议把项目讲成一个完整学习系统，而不是一个网页 Demo。

推荐表述：

本系统面向英语学习者的精读场景，围绕“阅读、理解、积累、复习”构建学习闭环。用户可以导入英文文章、PDF 或 EPUB，在阅读过程中按需查看句子和段落翻译，点击单词获得释义和例句，将重点词汇加入生词本，并通过复习页完成后续巩固。系统前端采用 Vue 3 和 Vite，后端采用 Express 封装 Gemini 与 DeepSeek 等 AI provider，并通过本地词库、外部词典和 AI 兜底构建稳定查词链路。

项目创新点：

- 句子级精读而不是整篇机器翻译。
- 单词释义与阅读上下文结合。
- 生词本和复习页形成学习闭环。
- 类 Notion/Obsidian 的手动高亮体验。
- PDF/EPUB/粘贴文章统一转换为结构化阅读数据。
- 按需翻译和内容缓存降低 API 成本。
- 具有自动化测试、构建验证和清晰模块分层。

## 14. 推荐演示流程

1. 打开首页，输入或选择历史文章。
2. 进入 `/reader` 新版阅读工作台。
3. 演示书架、章节切换和阅读进度。
4. 点击单词，展示右侧释义面板。
5. 将单词加入生词本。
6. 双击句子，展示句子翻译。
7. 点击“翻译本段”，展示段落翻译。
8. 开启高亮笔，演示多颜色标注和清除。
9. 粘贴一篇文章并进入临时阅读。
10. 导入 PDF/EPUB 文件。
11. 打开生词本和复习页，说明学习闭环。
12. 展示测试命令和构建通过结果。

## 15. 结论

截至 2026-07-08，项目已经从基础阅读器演进为较完整的 AI 英语阅读工作台。核心功能、数据结构、AI 接口、查词链路、导入流程、学习闭环和测试体系都已经具备。项目适合作为软件开发实训选题，也具备继续扩展为正式个人学习工具的基础。
