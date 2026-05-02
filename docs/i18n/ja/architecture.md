# アーキテクチャ

kObsidian は filesystem-first の MCP server です。Obsidian vault を typed tool surface として公開し、必要な場合だけ Obsidian Local REST API で UI や command に橋渡しします。

## 全体の流れ

```text
MCP client
  -> stdio または Streamable HTTP
  -> McpServer
  -> src/server/tools/*
  -> src/domain/*
  -> vault filesystem
  -> optional: Obsidian Local REST API
```

ほとんどの tool は vault directory を直接操作し、Obsidian の起動を必要としません。`workspace.*`、`commands.*`、live `dataview.query*` / Templater 分岐だけが REST API を使います。

## Module map

```text
src/config/   environment parsing と runtime settings
src/schema/   Zod schema と tool contract
src/lib/      filesystem, path, frontmatter, REST client, error/result helper
src/domain/   notes, links, tags, tasks, Dataview, Kanban, canvas, wiki
src/server/   MCP server factory, transports, resources, prompts, tool registration
tests/        Vitest fixtures と integration tests
docs/         documentation と生成 inventory
```

### Layering rule

- `src/lib/` は MCP を知らない汎用 helper。
- `src/domain/` は vault や REST API を扱うが、transport を知らない。
- `src/server/` は MCP wiring と schema/description を担当し、実処理は domain に委譲する。

## Transports

- `src/server/stdio.ts` - Claude Code、Cursor などの local MCP client 向け。
- `src/server/http-app.ts` - Hono + Streamable HTTP。`/mcp`、CORS、Origin check、Bearer token、protocol version check を持つ。

両方とも同じ `createServer()` を使うため、tool/resource/prompt は同じです。

## LLM Wiki loop

```text
wiki.init
  -> wiki/Sources, wiki/Concepts, wiki/Entities, index.md, log.md, wiki-schema.md

wiki.ingest
  -> Source page を 1 つ作る
  -> log.md に追記
  -> proposedEdits を返す

LLM
  -> notes.create / notes.edit で proposedEdits を適用

wiki.query
  -> 関連ページを順位付けし、notes.read で読む

wiki.lint
  -> read-only health check

wiki.summaryMerge
  -> Concept/Entity に引用付き section を追加
```

重要なのは `wiki.ingest` が cross-reference を裏で大量に書き換えないことです。すべての追加編集は `proposedEdits` として見える形で返します。

## Tests

- domain tests は notes、links、tasks、Dataview、wiki などを検証。
- server integration は SDK の `InMemoryTransport` を使用。
- HTTP tests は Hono `fetch` mock を使い、実 socket は開かない。
- fixture vault は `tests/fixtures/sample_vault`。
