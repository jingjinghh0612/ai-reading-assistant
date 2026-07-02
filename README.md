# AI 英语阅读辅助系统

基于 Vue 与大模型 API 的英语阅读辅助学习系统。项目不是单纯的英文阅读器，而是围绕“阅读、理解、积累、复习”设计的学习闭环：用户导入英文文本后，可以按句子精读、查看 AI 翻译、点击单词获得释义、加入生词本，并在复习页完成后续巩固。

项目当前包含正式阅读流程和一个独立的阅读产品原型页。正式页面用于展示完整学习闭环，原型页用于探索更成熟的阅读界面、章节结构、右侧单词面板和类 Obsidian / Notion 的手动高亮体验。

## 技术栈

- 前端：Vue 3 Composition API、Vue Router、Vite
- 后端：Node.js、Express
- AI：Google Gemini API，默认模型 `gemini-2.5-flash-lite`
- 存储：localStorage 与页面内存态
- 测试：Node.js 内置 test runner
- 样式：原生 CSS

## 核心功能

- 首页导入英文文章并进入正式阅读页。
- 阅读页自动切分英文句子，支持句子级翻译、上下句导航、阅读进度保存和字号调整。
- 点击单词获取 AI 释义、词性、定义和例句，并可加入本地生词本。
- 右侧 AI 面板支持文章摘要和关键词提取。
- 生词本支持搜索、删除、掌握标记和复习状态筛选。
- 复习页展示到期单词，并记录“记得 / 忘记”的复习结果。
- AI 请求支持超时、重试、缓存、错误提示和无 API Key 时的 mock fallback。
- `/reader-prototype` 提供独立原型界面，包含书架、章节、正文、右侧单词面板和手动句子高亮。
- 原型页高亮支持显示/隐藏、高亮笔模式、五种颜色、清除模式、按章节页面内记忆和刷新重置。

## 路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 首页 | 输入英文文章，查看历史文章 |
| `/reader` | 正式阅读页 | 句子级阅读、翻译、单词解释、摘要 |
| `/reader-prototype` | 原型阅读页 | 产品化阅读界面和高亮交互原型 |
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
│     ├─ aiService.js           # Gemini 调用、超时、重试、缓存和 mock fallback
│     └─ prompts.js             # 翻译、单词解释、摘要 prompt
├─ src
│  ├─ api                       # 前端 API 请求封装
│  ├─ components
│  │  ├─ SentenceViewer.vue     # 正式阅读页句子展示、翻译卡、单词卡
│  │  └─ reader-prototype       # 原型页顶部栏、侧边栏、正文和右侧面板
│  ├─ data
│  │  ├─ readerPrototypeData.js       # 原型页本地书籍、章节、词典数据
│  │  └─ readerPrototypeSelectors.js  # 原型页选择器和高亮 helper
│  ├─ pages
│  │  ├─ Home.vue
│  │  ├─ Reader.vue
│  │  ├─ ReaderPrototype.vue
│  │  ├─ Review.vue
│  │  └─ Vocabulary.vue
│  ├─ router
│  │  └─ index.js
│  ├─ utils                     # 句子切分、导航、字号、生词、历史、单词卡工具
│  ├─ App.vue
│  ├─ main.js
│  └─ style.css
├─ .env.example
├─ package.json
└─ vite.config.js
```

## 本地运行

安装依赖：

```bash
npm install
```

启动前端开发服务：

```bash
npm run dev
```

启动后端服务：

```bash
npm run server
```

Windows PowerShell 如果遇到 `npm.ps1 cannot be loaded`，可以改用：

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
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_TIMEOUT_MS=25000
GEMINI_RETRY_COUNT=2
GEMINI_RETRY_DELAY_MS=1200
AI_CACHE_TTL_MS=86400000
GEMINI_PROXY_URL=http://127.0.0.1:7890
```

说明：

- `GEMINI_API_KEY`：真实 Gemini API Key，只放在后端环境变量中，不要提交。
- `GEMINI_MODEL`：Gemini 模型名称，当前默认 `gemini-2.5-flash-lite`。
- `GEMINI_TIMEOUT_MS`：单次 Gemini 请求超时时间。
- `GEMINI_RETRY_COUNT`：失败后的重试次数。
- `GEMINI_RETRY_DELAY_MS`：重试基础等待时间。
- `AI_CACHE_TTL_MS`：AI 翻译缓存有效期。
- `GEMINI_PROXY_URL`：可选，本地网络需要代理访问 Gemini 时使用。

如果没有配置 `GEMINI_API_KEY`，后端会自动返回 mock 数据，方便本地开发和答辩演示。

## 后端接口

```text
GET  /api/health
POST /api/translate
POST /api/word-explain
POST /api/summarize
```

前端只请求本项目后端接口，不直接暴露或读取 `GEMINI_API_KEY`。

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

1. 在首页输入英文文章，进入 `/reader`。
2. 点击句子，展示句子级翻译和当前句高亮。
3. 点击单词，展示 AI 释义并加入生词本。
4. 打开 `/vocabulary` 和 `/review`，说明生词学习闭环。
5. 打开 `/reader-prototype`，展示书架、章节、单词面板和五色高亮笔。
6. 展示 `npm.cmd test` 与 `npm.cmd run build` 的通过结果。

## 后续优化方向

- 高亮持久化：按 `chapterId + sentenceId` 保存颜色、备注和时间。
- 高亮备注：点击高亮句子后，在右侧面板编辑备注、标签和关联单词。
- 文章管理：支持标题、历史列表、删除、继续阅读和导入记录管理。
- 数据同步：增加登录、云端生词本和跨设备阅读进度。
- 阅读格式：扩展 PDF、EPUB 或网页文章导入。
- 复习算法：加入更细的错词统计和间隔重复策略。
- 部署配置：区分开发、演示和生产环境，完善线上部署说明。
