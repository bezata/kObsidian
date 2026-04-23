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

```bash
bun install
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
