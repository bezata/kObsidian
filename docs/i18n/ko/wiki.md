# LLM Wiki

LLM Wiki의 핵심은 사람이 저장할 source를 판단하고, LLM이 정리, 색인, 상호 참조, 유지보수를 담당하는 것입니다. kObsidian은 이를 `wiki.*` namespace로 구현합니다.

## 세 계층

1. Raw sources: web clip, paper, meeting note, draft 등. vault 어디에나 둘 수 있습니다.
2. Wiki: `wiki/Sources/`, `wiki/Concepts/`, `wiki/Entities/`, `wiki/index.md`, `wiki/log.md`, `wiki/wiki-schema.md`.
3. Schema: Zod schema와 vault 안의 `wiki-schema.md`가 LLM이 따라야 할 계약을 정의합니다.

## Loop

```text
source 추가
  -> wiki.ingest
  -> wiki/Sources/<slug>.md 생성
  -> wiki/log.md append
  -> proposedEdits 반환
  -> LLM이 notes.*로 적용

이후:
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

`wiki.ingest`는 새 Source와 log만 쓰고 다른 페이지를 직접 수정하지 않습니다. 대신 다음을 반환합니다.

- `createStub`
- `insertAfterHeading`
- `append`

호출자는 `notes.create` 또는 `notes.edit`로 적용합니다. 이렇게 하면 cross-file write가 transcript에서 보입니다.

## Log format

```markdown
## [2026-04-23] ingest | Vannevar Bush - As We May Think

## [2026-04-24] query | memex vs hypertext

## [2026-04-25] lint | 3 broken links, 1 orphan
```

고정 형식이므로 `grep '^## \[' wiki/log.md | tail -20`가 가능합니다.

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

각 wiki tool은 `wikiRoot` override도 받습니다.

## MCP resources와 prompts

Resources:

- `kobsidian://wiki/index`
- `kobsidian://wiki/log`
- `kobsidian://wiki/schema`
- `kobsidian://wiki/page/{+path}`

Prompts:

- `ingest-source`
- `answer-from-wiki`
- `health-check-wiki`

## 관련 배경

Andrej Karpathy의 LLM Wiki 아이디어와 Vannevar Bush의 Memex concept가 배경입니다.
