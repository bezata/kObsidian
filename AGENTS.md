# kObsidian Development Guidelines

## Runtime

- Bun + strict TypeScript ESM is the only supported runtime.
- MCP is implemented with `@modelcontextprotocol/sdk` v1.x, `McpServer`, stdio, and Streamable HTTP.
- Zod v4 schemas define public tool contracts.

## Project Structure

```text
src/config/   environment parsing and runtime settings
src/domain/   note, link, tag, task, Dataview, Mermaid, Marp, Kanban, canvas, workspace logic
src/lib/      shared filesystem, markdown, REST client, error, and result helpers
src/schema/   reusable Zod primitives and models
src/server/   MCP server factory, transports, and tool registration
tests/        Vitest fixture and integration tests
docs/         generated tool inventory and supporting docs
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

## Working in the wiki

kObsidian ships a `wiki.*` namespace that layers the "LLM Wiki" pattern on top
of the low-level primitives. The schema is documented inside each vault as
`wiki/wiki-schema.md` once `wiki.init` has run.

- **`wiki.init`** — scaffold `wiki/{Sources,Concepts,Entities}/` plus
  `index.md`, `log.md`, `wiki-schema.md` (idempotent).
- **`wiki.ingest`** — file a source: creates `wiki/Sources/<slug>.md` with
  canonical frontmatter and an append-only log entry. Returns a
  `proposedEdits` array (index line, concept-stub creations, entity-citation
  inserts) for the caller to apply via `notes.create` / `notes.edit` — never
  applies cross-reference edits directly.
- **`wiki.logAppend`** — typed log entry, format
  `## [YYYY-MM-DD] <op> | <title>` so `grep '^## \[' log.md | tail -5` just
  works.
- **`wiki.indexRebuild`** — regenerate `index.md` grouped by category.
- **`wiki.query`** — rank wiki pages for a topic (filename / alias / tag /
  summary / body hits). LLM drills into results with `notes.read`.
- **`wiki.lint`** — read-only health check: orphans, broken links, stale
  sources, missing concept/entity pages, tag singletons, index parity.
- **`wiki.summaryMerge`** — add a cited section to a concept or entity page
  (creates the page with canonical frontmatter if absent); bumps `updated`.

Folder names, index / log / schema filenames, and stale threshold are all
overridable via `KOBSIDIAN_WIKI_*` env vars, and every tool accepts a
per-call `wikiRoot` override.

## MCP resources and prompts

The server also exposes the wiki through MCP resources and prompts so
clients can discover and drive it without any Claude-Code-specific glue:

- **Resources:** `kobsidian://wiki/index`, `kobsidian://wiki/log`,
  `kobsidian://wiki/schema`, plus the template
  `kobsidian://wiki/page/{+path}` whose list callback enumerates every
  Sources / Concepts / Entities page.
- **Prompts:** `ingest-source`, `answer-from-wiki`, `health-check-wiki`
  — server-side counterparts to the `skills/` files; both can coexist.
