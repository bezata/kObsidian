# kObsidian

`kObsidian` is a Bun-native TypeScript MCP server for Obsidian with a hybrid architecture:

- Filesystem-first note, tag, link, task, Dataview, Mermaid, Marp, Kanban, template, statistics, and canvas tooling
- API-backed Dataview DQL, Templater, workspace, and command execution when the Obsidian Local REST API is available
- A clean vNext MCP tool surface built on the official MCP TypeScript SDK and Zod v4

The server ships two entrypoints from the same codebase:

- `stdio` for local MCP clients such as Claude Code, Cursor, Cline, Roo Code, and similar tools
- `Streamable HTTP` at `/mcp` for remote-style integrations and future deployment flexibility

## Stack

- Bun
- TypeScript
- `@modelcontextprotocol/sdk@1.29.0`
- Hono
- Zod v4
- Vitest

## Project Layout

```text
src/
  config/
  domain/
  lib/
  schema/
  server/
tests/
docs/
```

## Install

Pick the channel that matches how you use MCP. All three read the same
`OBSIDIAN_VAULT_PATH`, `OBSIDIAN_API_URL`, and `OBSIDIAN_REST_API_KEY`
environment variables.

### npx / bunx (Claude Code, Cursor, VSCode, Windsurf, Zed, Cline…)

Once published to npm:

```json
{
  "mcpServers": {
    "kobsidian": {
      "command": "npx",
      "args": ["-y", "kobsidian"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/absolute/path/to/vault",
        "OBSIDIAN_API_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_REST_API_KEY": "optional-if-you-use-workspace-or-commands-tools"
      }
    }
  }
}
```

(Use `bunx` instead of `npx` for faster cold-start.)

### Claude Desktop (.mcpb drag-and-drop)

Download `kobsidian-<platform>.mcpb` from the
[latest release](https://github.com/behzatcan/kObsidian/releases/latest)
and drag it into Claude Desktop. The installer prompts for vault path +
optional API URL / key.

Build one locally with:

```bash
bun install
bun run build:compile   # produces dist/kobsidian (or .exe on Windows)
bun run bundle:mcpb     # produces kobsidian.mcpb
```

### Smithery

Install from [smithery.ai](https://smithery.ai) — the catalog form fills
the three env vars for you. `smithery.yaml` at repo root is the source
of truth.

### From source (dev / contributing)

```bash
bun install
bun run dev:stdio       # or dev:http
```

## Run

Stdio:

```bash
bun run dev:stdio
```

HTTP:

```bash
bun run dev:http
```

Build:

```bash
bun run build
```

Typecheck:

```bash
bun run typecheck
```

Test:

```bash
bun run test
```

Generate tool inventory:

```bash
bun run inventory
```

## Configuration

Environment variables:

- `OBSIDIAN_VAULT_PATH`
- `OBSIDIAN_API_URL`
- `OBSIDIAN_API_VERIFY_TLS` (`false` by default for the Obsidian Local REST API self-signed certificate)
- `OBSIDIAN_REST_API_KEY`
- `KOBSIDIAN_HTTP_HOST`
- `KOBSIDIAN_HTTP_PORT`
- `KOBSIDIAN_HTTP_BEARER_TOKEN`
- `KOBSIDIAN_ALLOWED_ORIGINS`
- `KOBSIDIAN_WIKI_ROOT` (default `wiki`)
- `KOBSIDIAN_WIKI_SOURCES_DIR`, `KOBSIDIAN_WIKI_CONCEPTS_DIR`, `KOBSIDIAN_WIKI_ENTITIES_DIR`
- `KOBSIDIAN_WIKI_INDEX_FILE`, `KOBSIDIAN_WIKI_LOG_FILE`, `KOBSIDIAN_WIKI_SCHEMA_FILE`
- `KOBSIDIAN_WIKI_STALE_DAYS` (default `180`)

`OBSIDIAN_VAULT_PATH` is required for filesystem-native tools unless the tool call provides an explicit `vaultPath`.

## MCP Client Examples

Claude Code / similar stdio clients:

```json
{
  "mcpServers": {
    "kobsidian": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/kObsidian/src/server/stdio.ts"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/absolute/path/to/vault",
        "OBSIDIAN_API_URL": "http://127.0.0.1:27124",
        "OBSIDIAN_REST_API_KEY": "your-api-key"
      }
    }
  }
}
```

VS Code / Copilot style local command:

```json
{
  "servers": {
    "kobsidian": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/kObsidian/src/server/stdio.ts"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/absolute/path/to/vault"
      }
    }
  }
}
```

HTTP endpoint:

- URL: `http://127.0.0.1:3000/mcp`
- Allowed origins default to `http://localhost,http://127.0.0.1`
- Optional bearer auth is controlled by `KOBSIDIAN_HTTP_BEARER_TOKEN`

## Tool Surface

The current tool inventory is generated from the registry and written to:

- [docs/tool-inventory.json](/C:/Users/Gaming/Desktop/Code/kObsidian/docs/tool-inventory.json)

Representative tool namespaces:

- `notes.*`
- `tags.*`
- `links.*`
- `stats.*`
- `tasks.*`
- `dataview.*`
- `mermaid.*`
- `marp.*`
- `kanban.*`
- `templates.*`
- `canvas.*`
- `workspace.*`
- `commands.*`
- `wiki.*` — LLM Wiki orchestration (init, ingest, logAppend, indexRebuild, query, lint, summaryMerge)

## LLM Wiki

On top of the primitives, kObsidian ships a `wiki.*` namespace that
implements the "LLM Wiki" pattern — a persistent, compounding knowledge
base where each ingested source produces a summary page, updates an
index, and appends a greppable log.

The default layout under the vault:

```text
wiki/
  Sources/         per-source summary pages
  Concepts/        topic / idea pages (LLM-maintained)
  Entities/        people, places, orgs, works
  index.md         categorized catalog (rebuild with wiki.indexRebuild)
  log.md           append-only chronological log
  wiki-schema.md   vault-local copy of the contract (seeded by wiki.init)
```

Run `wiki.init` once to scaffold, then:

- `wiki.ingest` to file sources (non-destructive — returns proposed
  cross-reference edits for the caller to apply via `notes.update`)
- `wiki.query` to rank relevant pages for a topic
- `wiki.lint` to surface orphans, broken links, stale sources, missing
  concept pages, tag drift, and index parity
- `wiki.summaryMerge` to add a cited section to an existing concept or
  entity page (creates the page with canonical frontmatter if missing)

Four Claude Code skills live at `skills/` to drive this loop from
natural-language triggers: `wiki-bootstrap`, `wiki-ingest`,
`wiki-query`, `wiki-lint`. See [skills/README.md](/skills/README.md)
for install and usage.

### MCP resources

Any MCP client can discover the wiki as URI-addressable resources:

- `kobsidian://wiki/index` — `wiki/index.md`
- `kobsidian://wiki/log` — `wiki/log.md`
- `kobsidian://wiki/schema` — `wiki/wiki-schema.md`
- `kobsidian://wiki/page/{+path}` — any wiki page, e.g. `kobsidian://wiki/page/Sources/my-source.md`

The template's list callback enumerates every Sources / Concepts /
Entities page so clients can browse the wiki without calling tools.

### MCP prompts

Three server-side prompts mirror the skills for clients that don't
consume Claude Code skill files:

- `ingest-source` — wraps `wiki.ingest` + `proposedEdits` application
- `answer-from-wiki` — wraps `wiki.query` + cited synthesis
- `health-check-wiki` — wraps `wiki.lint` + triaged fix proposals

Each takes arguments and returns a messages array ready for the LLM to
execute.

Customizable via env vars (`KOBSIDIAN_WIKI_ROOT`,
`KOBSIDIAN_WIKI_SOURCES_DIR`, …, `KOBSIDIAN_WIKI_STALE_DAYS`) and a
per-call `wikiRoot` override on every tool.

## Compatibility Notes

This project intentionally exposes a **vNext** MCP contract with normalized tool names and more consistent result shapes. Feature coverage is preserved, but earlier public tool names are not kept verbatim.

Dataview compatibility is split intentionally:

- Offline tools index frontmatter fields, page inline fields, list-item fields, task fields, fenced `dataview` query blocks, and fenced `dataviewjs` blocks.
- Runtime DQL execution remains delegated to Obsidian + Dataview through the Local REST API.
- `dataviewjs` is source-compatible and runtime-bound; this server does not execute DataviewJS inside Bun.

Mermaid and Marp support is source-safe parse/edit support. The server preserves author-written source and only replaces targeted fenced blocks, slides, or frontmatter fields. Rendering, preview generation, and export are intentionally out of scope for this phase.

The earlier implementation has been removed from the main codebase. Bun/TypeScript is now the only runtime path.

The tool-name migration guide lives at:

- [MIGRATION.md](/C:/Users/Gaming/Desktop/Code/kObsidian/MIGRATION.md)
