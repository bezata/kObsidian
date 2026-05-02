# LLM Wiki

LLM Wiki 的核心思想是：人类负责判断来源是否值得保存，LLM 负责整理、索引、交叉引用和维护结构。kObsidian 把这个模式实现为 `wiki.*` 工具命名空间。

## 三层结构

1. 原始来源：网页剪藏、论文、会议记录、草稿等，可以放在 vault 任意位置。
2. wiki 层：`wiki/Sources/`、`wiki/Concepts/`、`wiki/Entities/`、`wiki/index.md`、`wiki/log.md`、`wiki/wiki-schema.md`。
3. schema：Zod schema 和 vault 内的 `wiki-schema.md` 共同定义 LLM 应遵守的 contract。

## 循环

```text
用户提供来源
  -> wiki.ingest
  -> 创建 wiki/Sources/<slug>.md
  -> 追加 wiki/log.md
  -> 返回 proposedEdits
  -> LLM 用 notes.* 应用建议

之后：
  -> wiki.query 查知识
  -> wiki.lint 做健康检查
  -> wiki.summaryMerge 把新总结写回 Concept/Entity
  -> wiki.indexRebuild 重建索引
```

## Frontmatter contract

### Source

```yaml
type: source
source_type: article | paper | note | transcript | other
title: ...
url: ...
author: ...
ingested_at: YYYY-MM-DD
tags: []
confidence: low | medium | high
summary: ...
```

### Concept

```yaml
type: concept
aliases: []
related: []
sources: []
updated: YYYY-MM-DD
summary: ...
```

### Entity

```yaml
type: entity
kind: person | place | org | work | other
aliases: []
related: []
sources: []
updated: YYYY-MM-DD
summary: ...
```

## `proposedEdits` contract

这是 wiki 层最重要的设计：`wiki.ingest` 只写新 Source 和 log，不直接改其他页面。它返回：

- `createStub`：建议创建缺失的 Concept/Entity 页面。
- `insertAfterHeading`：建议在指定 heading 后插入引用。
- `append`：建议追加内容。

调用方再用 `notes.create` 或 `notes.edit` 应用这些建议。这样，跨引用写入不会在后台静默发生。

## 日志格式

```markdown
## [2026-04-23] ingest | Vannevar Bush - As We May Think

## [2026-04-24] query | memex vs hypertext

## [2026-04-25] lint | 3 broken links, 1 orphan
```

格式固定是为了让 `grep '^## \[' wiki/log.md | tail -20` 这种查询可用。

## Lint 分类

- `orphans`：没有入链或出链的页面。
- `brokenLinks`：无法解析的 wikilink。
- `staleSources` / `stalePages`：超过阈值未更新。
- `missingPages`：Source 引用了 Concept/Entity，但页面不存在。
- `tagSingletons`：只出现一次的标签，常见于拼写错误。
- `indexMismatch`：磁盘页面和 `index.md` 不一致。

## 配置

可用环境变量覆盖 wiki 路径和文件名：

- `KOBSIDIAN_WIKI_ROOT`
- `KOBSIDIAN_WIKI_SOURCES_DIR`
- `KOBSIDIAN_WIKI_CONCEPTS_DIR`
- `KOBSIDIAN_WIKI_ENTITIES_DIR`
- `KOBSIDIAN_WIKI_INDEX_FILE`
- `KOBSIDIAN_WIKI_LOG_FILE`
- `KOBSIDIAN_WIKI_SCHEMA_FILE`
- `KOBSIDIAN_WIKI_STALE_DAYS`

每个 wiki 工具也接受单次调用的 `wikiRoot`。

## MCP 资源与提示词

资源：

- `kobsidian://wiki/index`
- `kobsidian://wiki/log`
- `kobsidian://wiki/schema`
- `kobsidian://wiki/page/{+path}`

提示词：

- `ingest-source`
- `answer-from-wiki`
- `health-check-wiki`

## 相关阅读

- Andrej Karpathy 的 LLM Wiki 思路。
- Vannevar Bush 的 Memex 概念，它是私人、可维护、带关联路径的知识库先驱。
