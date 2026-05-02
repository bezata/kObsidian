# LLM Wiki

LLM Wiki の考え方は、人間が保存すべき source を判断し、LLM が整理、索引、相互参照、保守を担当することです。kObsidian はこれを `wiki.*` 名前空間として実装しています。

## 3 つの層

1. Raw sources：web clip、paper、meeting note、draft など。vault 内の任意の場所に置けます。
2. Wiki：`wiki/Sources/`、`wiki/Concepts/`、`wiki/Entities/`、`wiki/index.md`、`wiki/log.md`、`wiki/wiki-schema.md`。
3. Schema：Zod schema と vault 内 `wiki-schema.md` が LLM の契約を定義します。

## Loop

```text
source を追加
  -> wiki.ingest
  -> wiki/Sources/<slug>.md を作成
  -> wiki/log.md に追記
  -> proposedEdits を返す
  -> LLM が notes.* で適用

その後：
  -> wiki.query
  -> wiki.lint
  -> wiki.summaryMerge
  -> wiki.indexRebuild
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

`wiki.ingest` は新しい Source と log だけを書き、他ページの編集は直接行いません。代わりに次を返します。

- `createStub`
- `insertAfterHeading`
- `append`

呼び出し側は `notes.create` または `notes.edit` で適用します。これにより cross-file write が transcript 上で見える状態になります。

## Log format

```markdown
## [2026-04-23] ingest | Vannevar Bush - As We May Think

## [2026-04-24] query | memex vs hypertext

## [2026-04-25] lint | 3 broken links, 1 orphan
```

固定形式なので `grep '^## \[' wiki/log.md | tail -20` が使えます。

## Lint categories

- `orphans`
- `brokenLinks`
- `staleSources`
- `stalePages`
- `missingPages`
- `tagSingletons`
- `indexMismatch`

## Configuration

- `KOBSIDIAN_WIKI_ROOT`
- `KOBSIDIAN_WIKI_SOURCES_DIR`
- `KOBSIDIAN_WIKI_CONCEPTS_DIR`
- `KOBSIDIAN_WIKI_ENTITIES_DIR`
- `KOBSIDIAN_WIKI_INDEX_FILE`
- `KOBSIDIAN_WIKI_LOG_FILE`
- `KOBSIDIAN_WIKI_SCHEMA_FILE`
- `KOBSIDIAN_WIKI_STALE_DAYS`

各 wiki tool は `wikiRoot` override も受け取ります。

## MCP resources と prompts

Resources：

- `kobsidian://wiki/index`
- `kobsidian://wiki/log`
- `kobsidian://wiki/schema`
- `kobsidian://wiki/page/{+path}`

Prompts：

- `ingest-source`
- `answer-from-wiki`
- `health-check-wiki`

## 関連

Andrej Karpathy の LLM Wiki idea と、Vannevar Bush の Memex concept が背景にあります。
