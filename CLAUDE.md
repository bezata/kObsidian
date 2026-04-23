# kObsidian Development Guidelines

## Runtime

- Bun + strict TypeScript ESM is the only supported runtime.
- MCP is implemented with `@modelcontextprotocol/sdk` v1.x, `McpServer`, stdio, and Streamable HTTP.
- Zod v4 schemas define public tool contracts.

## Project Structure

```text
src/config/       environment parsing and runtime settings
src/domain/       note, link, tag, task, Dataview, Mermaid, Marp, Kanban, canvas, workspace logic
src/domain/wiki/  LLM-Wiki orchestration (init, ingest, log, indexRebuild, query, lint, summaryMerge)
src/lib/          shared filesystem, markdown, REST client, error, and result helpers
src/schema/       reusable Zod primitives and models
src/server/       MCP server factory, transports, and tool registration
skills/           Claude Code skills (wiki-bootstrap, wiki-ingest, wiki-query, wiki-lint)
tests/            Vitest fixture and integration tests
docs/             generated tool inventory and supporting docs
```

## Commands

```bash
bun install
bun run dev:stdio
bun run dev:http
bun run typecheck
bun run test
bun run lint
bun run build
bun run inventory
```

## Code Style

- Keep domain logic transport-agnostic.
- Prefer filesystem-first behavior where possible.
- Return typed JSON objects through `structuredContent`.
- Keep source-preserving Markdown edits region-based.
- Do not commit secrets, `.env` files, `node_modules`, or build output.

## LLM Wiki (`wiki.*` tools)

The `wiki.*` namespace layers the LLM-Wiki pattern on top of the primitives.
Intended flow from any MCP client:

1. `wiki.init` once to scaffold `wiki/{Sources,Concepts,Entities}/` plus
   `index.md`, `log.md`, `wiki-schema.md`.
2. `wiki.ingest` per source — creates `wiki/Sources/<slug>.md` with canonical
   frontmatter, appends a greppable log entry, and returns `proposedEdits`
   that the LLM applies via `notes.update` / `notes.append` /
   `notes.insertAfterHeading`. The ingest step never writes cross-references
   blindly.
3. `wiki.query` → `notes.read` to synthesize answers; save interesting
   syntheses as concept pages via `wiki.summaryMerge`.
4. `wiki.lint` periodically for orphans, broken links, stale sources,
   missing pages, tag singletons, and index parity.

Defaults live under `KOBSIDIAN_WIKI_*` env vars; every tool also accepts a
per-call `wikiRoot` override.
