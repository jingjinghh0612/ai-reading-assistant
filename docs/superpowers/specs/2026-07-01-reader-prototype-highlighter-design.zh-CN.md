# 阅读器原型页手动高亮功能设计

## 目标

在独立的 `/reader-prototype` 页面中增加手动句子高亮功能。用户可以选择高亮颜色，并在原型阅读器中标记整句，交互体验参考 Obsidian 和 Notion 这类轻量笔记工具。

这是原型页专用交互，不改变正式 `/reader` 页面，也不改变文章历史、生词本、翻译、总结、AI、存储或服务端逻辑。

## 已确认方向

采用“句子级、可交互、不持久化”的原型方案。

- 用户可以选择预设颜色。
- 用户可以点击句子来添加、改色或取消高亮。
- 高亮状态只存在于 `ReaderPrototype.vue` 的页面内存状态中。
- 刷新页面后，恢复到本地原型数据中的默认示例高亮。
- 这个功能用于验证阅读体验和视觉交互，再决定后续正式标注模型。

本轮不实现任意文本范围高亮。当前原型数据已经按句子和 token 组织，句子级高亮更贴合现有结构，也避免引入文本选区、跨 token、跨句子和移动端选择冲突。

## 范围

包含：

- `/reader-prototype` 上的高亮笔模式。
- 原型页顶部工具条中的紧凑颜色选择器。
- 预设颜色：黄色、绿色、蓝色、粉色、紫色。
- 清除模式。
- 阅读纸张区域中的句子级点击处理。
- 按章节和句子保存的页面内存高亮状态。
- 保留现有“显示高亮”的可见性开关。
- 保留现有单词释义点击行为。

不包含：

- 正式 `/reader` 页面改动。
- `localStorage` 或后端持久化。
- 鼠标拖选或句子局部高亮。
- 笔记、评论、标注气泡、导出或同步。
- 自定义色盘或用户自定义颜色。
- API 请求或 AI 行为。

## 交互模型

顶部工具条提供高亮相关控件：

- `高亮笔` 用于开启或关闭标记模式。
- 颜色圆点用于选择当前颜色，并自动保持高亮笔模式开启。
- `清除` 用于进入移除模式，并自动保持高亮笔模式开启。
- `显示高亮` 是独立的可见性开关，只隐藏或显示高亮样式，不删除高亮状态。

高亮笔模式和可见性开关必须分开。关闭“显示高亮”不应该影响已有高亮状态，只是在重新开启显示前暂时隐藏 marker 样式。

句子行为：

- 高亮笔模式关闭时，点击句子正文不改变高亮状态。
- 高亮笔模式开启且当前选择了颜色时，点击未高亮句子会应用当前颜色。
- 点击已使用相同颜色高亮的句子，会取消该句高亮。
- 点击已使用其他颜色高亮的句子，会改为当前颜色。
- 清除模式开启时，点击已高亮句子会移除高亮。
- 点击单词 token 继续打开单词释义面板，不触发句子高亮。

章节行为：

- 高亮状态按章节 id 和句子 id 保存。
- 切换章节时，本次页面会话中已操作过的章节高亮状态保留。
- 刷新页面后，所有状态恢复为本地原型数据的默认状态。

## 视觉设计

高亮使用类似 marker 的底纹效果，而不是整块实色背景。

- 以现有浅黄色原型高亮样式作为基础。
- 通过 CSS class 或 CSS 自定义属性增加颜色变体。
- 所有颜色上都要保持文字可读。
- 如果已选中的单词出现在高亮句子中，单词选中样式仍要清晰可见。
- 工具条保持紧凑、偏操作型，和当前原型页工具条风格一致。

建议颜色含义：

- 黄色：默认 marker。
- 绿色：已掌握或有用句子。
- 蓝色：结构性或引用句。
- 粉色：疑问或困惑句。
- 紫色：重要观点或摘录。

这些含义只作为原型视觉建议，代码不需要强制语义分类。

## 数据模型

状态保存在 `ReaderPrototype.vue`：

```js
const isHighlightMode = ref(false)
const activeHighlightColorId = ref('yellow')
const isHighlightClearMode = ref(false)
const sentenceHighlightsByChapter = ref({})
```

使用一个小型颜色配置常量：

```js
const prototypeHighlightColors = [
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'pink', label: 'Pink' },
  { id: 'purple', label: 'Purple' },
]
```

推荐数据形态：

```js
{
  "chapter-4": {
    "chapter-4-p1-s2": "yellow",
    "chapter-4-p2-s1": "blue"
  }
}
```

默认状态从 `readerPrototypeData.js` 中已有的 `sentence.highlighted` 字段派生，默认颜色使用黄色。

## 组件职责

### `ReaderPrototype.vue`

拥有高亮状态和行为。

- 初始化当前原型数据中的默认高亮。
- 跟踪高亮笔模式和当前颜色。
- 计算当前章节的高亮映射。
- 处理工具条发出的高亮相关事件。
- 处理句子高亮切换事件。
- 将高亮状态和模式传递给阅读纸张组件。

### `PrototypeTopbar.vue`

展示高亮控件并发出用户意图事件。

- 接收 `isHighlightMode`、`activeHighlightColorId`、颜色列表和清除模式状态。
- 发出 `toggle-highlight-mode`、`select-highlight-color`、`select-highlight-clear`、`toggle-highlight-visibility` 事件。
- 继续发出现有翻译显示切换事件。
- 不直接拥有高亮状态。

### `PrototypeReadingPaper.vue`

渲染句子高亮 class，并发出句子点击事件。

- 接收 `sentenceHighlights`、`showHighlight`、`isHighlightMode` 和 `activeHighlightColorId`。
- 当句子存在颜色且 `showHighlight` 开启时，应用对应颜色的高亮样式。
- 发出 `toggle-sentence-highlight` 事件，并携带 `sentenceId`。
- 保留单词 token 的 `@click.stop` 行为，确保单词释义和句子高亮互不干扰。

### `readerPrototypeSelectors.js`

增加小而聚焦的纯函数，用于默认高亮提取和切换逻辑。

建议函数：

- `getDefaultPrototypeHighlights(chapterContent, defaultColorId = 'yellow')`
- `getPrototypeChapterHighlights(highlightsByChapter, chapterId)`
- `togglePrototypeSentenceHighlight(chapterHighlights, sentenceId, activeColorId)`
- `removePrototypeSentenceHighlight(chapterHighlights, sentenceId)`

这些 helper 只处理数据，不包含 UI 逻辑。

## 数据流

1. `ReaderPrototype.vue` 加载本地原型章节数据。
2. 根据 `sentence.highlighted` 派生默认句子高亮。
3. `PrototypeTopbar` 显示当前高亮笔模式和选中颜色。
4. 用户选择颜色或清除模式。
5. 用户在 `PrototypeReadingPaper` 中点击句子。
6. `PrototypeReadingPaper` 发出句子 id。
7. `ReaderPrototype.vue` 更新当前章节的页面内存高亮映射。
8. 更新后的 props 回流到 `PrototypeReadingPaper`，重新渲染彩色 marker 效果。

## 无障碍

- 颜色圆点需要可访问标签，例如“黄色高亮”。
- 当前选中颜色要通过 `aria-pressed` 或 `aria-current` 表达，不能只依赖颜色。
- 高亮笔模式按钮需要暴露 pressed 状态。
- 清除模式需要可见文本或清晰的 `aria-label`。
- 键盘焦点样式必须保持可见。
- 句子高亮能力不能移除单词按钮的可聚焦性。

## 测试与验证

自动化检查：

- 单元测试：从章节数据提取默认高亮。
- 单元测试：给未高亮句子应用颜色。
- 单元测试：点击相同颜色时取消高亮。
- 单元测试：把已有高亮改为另一种颜色。
- 单元测试：清除模式移除高亮。
- 布局契约测试确认：
  - 顶部工具条接收颜色控件。
  - 阅读纸张接收高亮状态。
  - 存在句子点击事件。
  - 单词 token 点击仍然使用 `@click.stop`。
  - 正式 Reader 文件不在这个功能路径中。

浏览器人工检查：

- 打开 `/reader-prototype`。
- 确认默认示例高亮句子可见。
- 开启高亮笔模式，对不同句子应用黄色、绿色、蓝色、粉色和紫色。
- 把一个已高亮句子从一种颜色改为另一种颜色。
- 再次点击相同颜色，确认高亮被取消。
- 使用清除模式移除高亮。
- 在高亮笔模式下点击单词，确认右侧单词释义面板仍然打开。
- 切换显示/隐藏高亮，确认状态只是隐藏，再次开启后样式恢复。
- 切换章节再切回来，确认本次会话内状态保留。
- 刷新页面，确认状态恢复默认。

运行：

```bash
npm test
npm run build
```

## 验收标准

- `/reader-prototype` 顶部工具条包含清晰、紧凑的高亮控件。
- 用户可以选择预设颜色，并应用到整句。
- 用户可以修改或移除句子高亮。
- 用户可以隐藏和显示高亮，但不会删除高亮状态。
- 高亮笔模式开启时，单词释义交互仍然正常。
- 高亮状态只保存在页面内存中，刷新后重置。
- 正式 Reader 行为没有变化。
- 不改变 localStorage、后端、AI、翻译、总结或生词本逻辑。
