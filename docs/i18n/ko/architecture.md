# 아키텍처

kObsidian은 filesystem-first MCP server입니다. Obsidian vault를 typed tool surface로 노출하고, 필요한 경우에만 Obsidian Local REST API로 UI와 command를 연결합니다.

## 전체 흐름

```text
MCP client
  -> stdio 또는 Streamable HTTP
  -> McpServer
  -> src/server/tools/*
  -> src/domain/*
  -> vault filesystem
  -> optional: Obsidian Local REST API
```

대부분의 도구는 vault directory를 직접 읽고 쓰며 Obsidian 실행이 필요 없습니다. `workspace.*`, `commands.*`, live `dataview.query*` / Templater 분기만 REST API를 사용합니다.

## Module map

```text
src/config/   environment parsing 및 runtime settings
src/schema/   Zod schema 및 tool contract
src/lib/      filesystem, path, frontmatter, REST client, error/result helper
src/domain/   notes, links, tags, tasks, Dataview, Kanban, canvas, wiki
src/server/   MCP server factory, transports, resources, prompts, tool registration
tests/        Vitest fixtures 및 integration tests
docs/         documentation 및 generated inventory
```

### Layering rule

- `src/lib/`은 MCP를 모르는 공용 helper입니다.
- `src/domain/`은 vault나 REST API를 다루지만 transport를 모릅니다.
- `src/server/`는 MCP wiring과 schema/description을 담당하고 실제 처리는 domain에 위임합니다.

## Transports

- `src/server/stdio.ts` - Claude Code, Cursor 같은 local MCP client용.
- `src/server/http-app.ts` - Hono + Streamable HTTP. `/mcp`, CORS, Origin check, Bearer token, protocol version check를 제공합니다.

둘 다 같은 `createServer()`를 사용하므로 tool/resource/prompt 표면이 동일합니다.

## LLM Wiki loop

```text
wiki.init
  -> wiki/Sources, wiki/Concepts, wiki/Entities, index.md, log.md, wiki-schema.md

wiki.ingest
  -> Source page 하나 생성
  -> log.md append
  -> proposedEdits 반환

LLM
  -> notes.create / notes.edit로 proposedEdits 적용

wiki.query
  -> 관련 페이지 순위화 후 notes.read

wiki.lint
  -> read-only health check

wiki.summaryMerge
  -> Concept/Entity에 citation이 있는 section 추가
```

핵심은 `wiki.ingest`가 cross-reference를 뒤에서 대량으로 수정하지 않는다는 점입니다. 모든 추가 편집은 `proposedEdits`로 보이게 반환됩니다.

## Tests

- domain tests는 notes, links, tasks, Dataview, wiki 등을 검증합니다.
- server integration은 SDK의 `InMemoryTransport`를 사용합니다.
- HTTP tests는 Hono `fetch` mock을 사용하고 실제 socket을 열지 않습니다.
- fixture vault는 `tests/fixtures/sample_vault`입니다.
