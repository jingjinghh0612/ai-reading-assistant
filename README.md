# AI 英语阅读助手

一个面向英语初学者的 AI 阅读辅助网站。用户可以输入英文文章，按句子阅读文章，并查看句子翻译、单词解释、文章总结，还可以把生词加入生词本。

项目目前是一个前后端一体的 MVP：前端使用 Vue 3 + Vite，后端使用 Node.js + Express，AI 能力通过 Gemini API 接入；如果没有配置 Gemini API Key，后端会自动使用 mock 数据，保证项目仍然可以正常运行。

## 项目亮点

- 使用 Vue 3 组合式 API 编写页面逻辑，代码结构适合初学者阅读。
- 使用 Vue Router 实现首页、阅读页、生词本页之间的跳转。
- 后端统一封装 Gemini API 调用，前端不会直接接触 API Key。
- 为翻译、单词解释、文章总结分别设计 Prompt。
- 使用 localStorage 保存文章内容和生词本数据。
- 阅读页加入内存缓存，避免同一句子、同一个单词重复请求 AI 接口。
- 请求过程中有 loading 状态，请求失败时有错误提示。
- 没有真实 API Key 时自动降级到 mock 数据，方便本地开发和演示。

## 技术栈

- 前端：Vue 3、Vite、Vue Router、JavaScript
- 后端：Node.js、Express
- AI 接口：Gemini API、`@google/genai`
- 环境变量：dotenv
- 请求代理支持：undici
- 数据存储：localStorage
- 样式：普通 CSS，没有使用 UI 框架和 Tailwind

## 功能列表

- 首页输入英文文章。
- 点击“Start Reading”进入阅读页。
- 阅读页自动把英文文章按句子切分展示。
- 点击句子后高亮当前句子。
- 点击句子后调用后端接口获取中文翻译。
- 点击单词后调用后端接口获取中文释义、词性和英文例句。
- 支持将单词加入生词本。
- 生词本使用 localStorage 持久化保存。
- 生词本支持去重和删除。
- 支持对文章生成中文总结和英文关键词。
- AI 请求支持 loading、错误提示、缓存和 mock fallback。
- 移动端有基础适配。

## 项目目录结构

```text
ai-reading-app
├─ public
├─ server
│  ├─ index.js                 # Express 后端入口，提供 API 和静态文件服务
│  ├─ setupProxy.js             # 可选代理配置，用于 Gemini 请求走本地代理
│  └─ services
│     └─ aiService.js           # Gemini API 调用封装和 mock fallback
├─ src
│  ├─ api
│  │  ├─ request.js             # 前端统一 POST 请求封装，包含超时和错误处理
│  │  ├─ summarize.js           # 文章总结请求
│  │  ├─ translate.js           # 句子翻译请求
│  │  └─ word.js                # 单词解释请求
│  ├─ components
│  │  └─ SentenceViewer.vue     # 句子展示和单词点击组件
│  ├─ pages
│  │  ├─ Home.vue               # 首页，输入英文文章
│  │  ├─ Reader.vue             # 阅读页，处理翻译、单词解释、总结
│  │  └─ Vocabulary.vue         # 生词本页
│  ├─ router
│  │  └─ index.js               # Vue Router 配置
│  ├─ utils
│  │  ├─ sentence.js            # 英文句子切分工具
│  │  ├─ storage.js             # localStorage 安全读写工具
│  │  ├─ vocabulary.js          # 生词本增删查和去重逻辑
│  │  └─ word.js                # 单词切分和标准化工具
│  ├─ App.vue
│  ├─ main.js
│  └─ style.css                 # 全局样式
├─ .env.example                 # 环境变量示例，可以提交到 GitHub
├─ .gitignore
├─ package.json
└─ vite.config.js
```

## 本地运行方式

安装依赖：

```bash
npm install
```

开发前端页面：

```bash
npm run dev
```

启动后端服务：

```bash
npm run server
```

构建前端静态文件：

```bash
npm run build
```

后端会读取 `dist` 目录并提供静态文件服务。构建后可以访问：

```text
http://127.0.0.1:3001/
```

如果访问不了，通常是后端没有启动。请先运行：

```bash
npm run server
```

如果你在 Windows PowerShell 中看到 `npm.ps1 cannot be loaded`，这是本机执行策略限制，不是项目代码错误。可以改用：

```bash
npm.cmd run build
npm.cmd run server
```

## 环境变量说明

项目根目录提供了 `.env.example`，可以复制一份为 `.env`：

```bash
cp .env.example .env
```

Windows PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
```

`.env` 示例：

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_PROXY_URL=http://127.0.0.1:7890
```

变量说明：

- `GEMINI_API_KEY`：Gemini API Key，只能放在后端环境变量中。
- `GEMINI_MODEL`：Gemini 模型名称，例如 `gemini-2.5-flash-lite`。
- `GEMINI_PROXY_URL`：可选。如果本地网络需要代理才能访问 Gemini，可以配置本地代理地址。

注意：`.env` 中可能包含真实 API Key，不要上传到 GitHub。项目中的 `.gitignore` 已经忽略 `.env`。

## Gemini API 接入说明

AI 调用逻辑集中在：

```text
server/services/aiService.js
```

该文件封装了三个核心函数：

- `translateSentence(text)`：翻译英文句子。
- `explainWord(word)`：解释英文单词。
- `summarizeText(text)`：总结英文文章。

后端接口：

```text
POST /api/translate
POST /api/word-explain
POST /api/summarize
```

前端只请求自己的后端接口，不会直接请求 Gemini API，也不会读取 `GEMINI_API_KEY`。

如果检测到 `process.env.GEMINI_API_KEY`，后端会调用真实 Gemini API；如果没有检测到 Key，后端会返回 mock 数据。这样即使没有 API Key，也可以正常演示页面流程。

## Prompt 设计

项目中为不同 AI 功能分别设计了简单 Prompt：

- 翻译 Prompt：要求只返回中文翻译，适合英语初学者理解。
- 单词解释 Prompt：要求严格返回 JSON，包含 `word`、`meaning`、`partOfSpeech`、`example`。
- 总结 Prompt：要求严格返回 JSON，包含 `summary` 和 3 个英文关键词 `keywords`。

后端会对 Gemini 返回的 JSON 做解析和兜底处理，避免模型返回格式不稳定时直接导致接口崩溃。

## 核心功能实现思路

### 文章传递

首页输入文章后，优先保存到 localStorage。阅读页进入时从 localStorage 读取文章内容，再进行句子切分。

### 句子切分

`src/utils/sentence.js` 中提供句子切分函数，当前主要处理英文常见标点：

```text
.
!
?
```

这个方案简单直观，适合 MVP 阶段。

### 点击句子翻译

阅读页中点击句子后：

1. 保存当前选中的句子下标。
2. 设置 loading 状态。
3. 调用 `/api/translate`。
4. 成功后展示翻译结果。
5. 失败后展示错误提示。
6. 如果同一句子已经翻译过，优先使用内存缓存。

### 点击单词解释

句子组件会把句子拆成单词和标点。点击单词后，阅读页调用 `/api/word-explain`，展示单词原文、中文释义、词性和英文例句。

同一个单词重复点击时，优先读取内存缓存，减少重复请求。

### 生词本

生词本逻辑封装在：

```text
src/utils/vocabulary.js
```

数据保存在 localStorage 中。保存时会使用标准化后的单词做去重，避免同一个单词被重复添加。

### 请求缓存和错误处理

前端请求封装在：

```text
src/api/request.js
```

主要处理：

- POST JSON 请求。
- 请求超时。
- 接口错误提示。
- 返回数据格式校验。

阅读页中使用普通对象做内存缓存，不引入 Pinia 或 Vuex，保持项目简单。

## 后续优化方向

- 优化句子切分，处理缩写、引号、小数点等更复杂情况。
- 增加文章历史记录，方便用户查看之前阅读过的内容。
- 生词本增加搜索、分类和复习状态。
- 支持用户手动选择翻译风格，例如直译、意译、语法讲解。
- 为 AI 请求增加更完善的重试机制和速率限制提示。
- 增加单元测试或端到端测试，提升项目稳定性。
- 支持部署到云服务器，并将前后端生产环境配置拆分得更清晰。
