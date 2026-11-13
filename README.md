# AI 英语阅读辅助系统

基于 Vue 与大模型 API 的英语阅读辅助系统。新版入口当前聚焦阅读工作台体验：用户导入英文文本后，可以进行章节化阅读、按需查看句子或段落翻译、点击单词获得释义、加入生词本，并用手动高亮标记重点内容。

项目当前以新版阅读工作台作为正式阅读入口。新版阅读页整合了早期版本中已经成熟的书架、章节结构、右侧单词面板、EPUB/PDF 导入、粘贴文章、按需句子/段落翻译和类 Obsidian / Notion 的手动高亮体验。

## 技术栈

- 前端：Vue 3 Composition API、Vue Router、Vite
- 后端：Node.js、Express
- AI：DeepSeek API 作为默认翻译 provider，默认模型 `deepseek-v4-flash`；Gemini 保留为可选 provider 和旧功能兼容
- 存储：localStorage 与页面内存态
- 测试：Node.js 内置 test runner
- 样式：原生 CSS

## 核心功能

- `/home` 首页可导入英文文章并进入新版阅读工作台，根路径 `/` 默认直接打开阅读工作台。
- 阅读页支持书架、章节、EPUB/PDF 导入、粘贴文章、句子级阅读、按需句子/段落翻译和阅读进度展示。
- 点击单词获取 AI 释义、词性、定义和例句，并可加入本地生词本。
- 右侧单词面板展示本地词典、外部词典或 AI 兜底释义，并支持加入生词本。
- 生词本保留基础管理能力，支持搜索、删除、掌握标记和复习状态筛选。
- 复习页保留基础到期单词展示和“记得 / 忘记”记录能力，后续再完善为完整学习闭环。
- AI 请求支持超时、重试、缓存、错误提示和无 API Key 时的 mock fallback。
- `/reader` 提供新版阅读工作台，包含书架、章节、正文、右侧单词面板和手动句子高亮。
- 新版阅读页高亮支持显示/隐藏、高亮笔模式、五种颜色、清除模式、按章节页面内记忆和刷新重置。

## 路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 默认入口 | 重定向到 `/reader` |
| `/home` | 首页 | 输入英文文章，查看历史文章 |
| `/reader` | 新版阅读页 | 书架、章节、导入、单词释义、按需翻译和高亮 |
| `/reader-prototype` | 新版阅读页兼容入口 | 保留旧入口链接，指向新版阅读页 |
| `/reader-legacy` | 旧版阅读页 | 旧的句子级阅读、翻译、单词解释、摘要流程 |
| `/vocabulary` | 生词本 | 管理已保存单词 |
| `/review` | 复习页 | 复习到期生词 |

## 目录结构

```text
ai-reading-app-github-ready
├─ public
├─ server
│  ├─ index.js                 # Express 后端入口，提供 API 和静态文件服务
│  ├─ setupProxy.js             # 可选代理配置，用于 Gemini 请求走本地代理
│  └─ services
│     ├─ aiService.js           # AI 请求、超时、重试、缓存和模拟结果
│     ├─ wordLookupService.js   # 本地词库、外部词典和 AI 查词
│     └─ prompts.js             # 翻译、单词解释、摘要 prompt
├─ src
│  ├─ api                       # 前端 API 请求封装
│  ├─ components
│  │  ├─ SentenceViewer.vue     # 旧版阅读页句子展示、翻译卡、单词卡
│  │  └─ reader-workspace       # 新版阅读页顶部栏、侧边栏、正文和右侧面板
│  ├─ data
│  │  ├─ builtInReaderData.js         # 内置书籍、章节和词条
│  │  └─ readerWorkspaceSelectors.js # 章节、词汇和高亮数据处理
│  ├─ pages
│  │  ├─ Home.vue
│  │  ├─ ReaderLegacy.vue            # 旧版阅读页，路由 /reader-legacy
│  │  ├─ ReaderWorkspace.vue         # 新版阅读工作台正式入口，路由 /reader
│  │  ├─ Review.vue
│  │  └─ Vocabulary.vue
│  ├─ router
│  │  └─ index.js
│  ├─ utils                     # 书籍导入、文件解析、句子切分、生词和阅读历史
│  ├─ App.vue
│  ├─ main.js
│  ├─ style.css
│  └─ reader-workspace.css      # 阅读工作台样式
├─ .env.example
├─ package.json
└─ vite.config.js
```

## 本地运行

安装依赖：

```bash
npm install
```

一键启动前端和后端开发服务：

```bash
npm run dev:all
```

Windows PowerShell 如果遇到 `npm.ps1 cannot be loaded`，可以改用：

```powershell
npm.cmd run dev:all
```

也可以在调试时分别启动前端和后端：

```bash
npm run dev
npm run server
```

PowerShell 对应命令：

```powershell
npm.cmd run dev
npm.cmd run server
```

后端默认运行在：

```text
http://127.0.0.1:3001/
```

Vite 开发服务会根据终端输出给出本地访问地址，常见为：

```text
http://localhost:5173/
```

## 环境变量

复制环境变量示例：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

`.env.example` 中包含：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_TIMEOUT_MS=25000
GEMINI_RETRY_COUNT=2
GEMINI_RETRY_DELAY_MS=1200
AI_CACHE_TTL_MS=86400000
GEMINI_PROXY_URL=http://127.0.0.1:7890
```

说明：

- `AI_PROVIDER`：AI 翻译 provider，可选 `deepseek` 或 `gemini`，当前默认使用 `deepseek`。
- `DEEPSEEK_API_KEY`：真实 DeepSeek API Key，只放在后端环境变量中，不要提交。
- `DEEPSEEK_MODEL`：DeepSeek 模型名称，当前默认 `deepseek-v4-flash`。
- `GEMINI_API_KEY`：真实 Gemini API Key，只放在后端环境变量中，用于切换 provider 或旧功能兼容，不要提交。
- `GEMINI_MODEL`：Gemini 模型名称，当前默认 `gemini-2.5-flash-lite`。
- `GEMINI_TIMEOUT_MS`：单次 AI 请求超时时间。
- `GEMINI_RETRY_COUNT`：失败后的重试次数。
- `GEMINI_RETRY_DELAY_MS`：重试基础等待时间。
- `AI_CACHE_TTL_MS`：AI 翻译缓存有效期。
- `GEMINI_PROXY_URL`：可选，本地网络需要代理访问 Gemini 时使用。

当 `AI_PROVIDER=deepseek` 时，句子和段落翻译会调用 DeepSeek；如果缺少 `DEEPSEEK_API_KEY`，后端会返回明确的配置错误。Gemini provider 仍保留 mock fallback，方便本地开发和答辩演示。

## 后端接口

```text
GET  /api/health
POST /api/translate
POST /api/word-explain
POST /api/word-lookup
POST /api/summarize
```

工作台使用 `/api/word-lookup` 查词。`/api/prototype-word-explain` 是同一查词服务的兼容地址，旧版阅读页继续使用 `/api/word-explain`。

前端只请求本项目后端接口，不直接暴露或读取 `DEEPSEEK_API_KEY`、`GEMINI_API_KEY`。

## 测试与构建

运行自动化测试：

```bash
npm test
```

Windows PowerShell 可使用：

```powershell
npm.cmd test
```

生产构建：

```bash
npm run build
```

Windows PowerShell 可使用：

```powershell
npm.cmd run build
```

构建产物输出到 `dist`。执行构建后，`npm run server` 会通过 Express 托管 `dist` 中的静态文件。

## 答辩演示建议

1. 打开 `/` 直接进入阅读工作台；也可在 `/home` 输入英文文章后进入 `/reader`。
2. 双击英文句子，展示按需句子翻译；点击“翻译本段”，展示段落翻译。
3. 点击单词，展示本地词典、外部词典或 AI 兜底释义，并加入生词本。
4. 展示 EPUB/PDF 导入、粘贴文章和手动高亮，说明新版阅读工作台已经作为正式入口。
5. 可打开 `/reader-legacy` 对比旧版阅读页，说明旧版入口仍作为兼容页面保留。
6. 展示 `npm.cmd test` 与 `npm.cmd run build` 的通过结果。

## 后续优化方向

- 高亮持久化：按 `chapterId + sentenceId` 保存颜色、备注和时间。
- 高亮备注：点击高亮句子后，在右侧面板编辑备注、标签和关联单词。
- 文章管理：支持标题、历史列表、删除、继续阅读和导入记录管理。
- 数据同步：增加登录、云端生词本和跨设备阅读进度。
- 阅读格式：扩展 PDF、EPUB 或网页文章导入。
- 复习算法：加入更细的错词统计和间隔重复策略。
- 部署配置：区分开发、演示和生产环境，完善线上部署说明。
