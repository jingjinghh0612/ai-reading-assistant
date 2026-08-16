# 本地词库字段规范

本地原型词库位于：

`server/data/localWordDefinitions.json`

批量生成词库位于：

`server/data/localWordDefinitions.generated.json`

读取优先级：

1. 先读取 `localWordDefinitions.generated.json`
2. 再读取 `localWordDefinitions.json`
3. 手工维护的 `localWordDefinitions.json` 会覆盖同名生成词条

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
- `example`：例句，优先使用简单、适合学习者的句子。
- `phonetic`：音标，没有时使用空字符串。
- `forms`：词形变化，比如过去式、复数、现在分词。

维护规则：

- 顶层 key 使用小写基础词，比如 `make`。
- `forms` 中只放可映射回该基础词的变形，比如 `made`、`making`。
- 高频词优先放本地词库，减少外部接口和 AI 调用。
- 如果从外部词库批量生成，生成结果也必须符合这个结构。

## 从 ECDICT 生成本地词库

原始 ECDICT CSV 放在：

`server/data/sources/ecdict.csv`

`server/data/sources/` 已加入 `.gitignore`，不要提交原始大文件。

生成词库派生自 ECDICT，授权声明保存在：

`server/data/ECDICT_LICENSE`

生成 5000 个高频词条：

```bash
npm.cmd run dictionary:build -- --input server/data/sources/ecdict.csv --output server/data/localWordDefinitions.generated.json --limit 5000
```

生成规则：

- 使用 ECDICT 字段：`word`、`phonetic`、`definition`、`translation`、`pos`、`collins`、`oxford`、`bnc`、`frq`、`exchange`。
- 过滤没有基础词或中文释义的词条。
- 按 `collins`、`oxford`、`bnc`、`frq` 计算常用度，优先保留高频词。
- `exchange` 会转换成 `forms`，用于支持过去式、复数、比较级等词形点击。
- 如果 `pos` 为空，会从 `translation` 里的 `prep.`、`adv.` 等前缀补出词性。
