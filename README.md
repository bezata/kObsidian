# kObsidian

**Filesystem-first MCP server for Obsidian vaults, with an LLM-Wiki layer on top.**
Point it at a vault and any MCP client (Claude Code, Cursor, VSCode, Claude
Desktop, Smithery, …) gets 90 typed tools for notes, links, tags, tasks,
Dataview, Canvas, Kanban, Mermaid, Marp, Templates — plus a `wiki.*`
orchestration namespace that turns the vault into a compounding knowledge
base the LLM maintains for you.

[![npm version](https://img.shields.io/npm/v/kobsidian-mcp?color=cb3837&label=npm)](https://www.npmjs.com/package/kobsidian-mcp)
[![npm downloads](https://img.shields.io/npm/dm/kobsidian-mcp?color=cb3837&label=downloads)](https://www.npmjs.com/package/kobsidian-mcp)
[![license](https://img.shields.io/npm/l/kobsidian-mcp?color=blue)](LICENSE)
[![Release CI](https://img.shields.io/github/actions/workflow/status/bezata/kObsidian/release.yml?branch=main&label=release)](https://github.com/bezata/kObsidian/actions/workflows/release.yml)

[![MCP](https://img.shields.io/badge/MCP-2025--11--25-1e88e5)](https://modelcontextprotocol.io)
[![Bun](https://img.shields.io/badge/runtime-Bun_1.2+-f472b6)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)
[![Tools](https://img.shields.io/badge/MCP_tools-90-1e88e5)](docs/tools.md)
[![Resources](https://img.shields.io/badge/MCP_resources-4-1e88e5)](docs/tools.md#resources)
[![Prompts](https://img.shields.io/badge/MCP_prompts-3-1e88e5)](docs/tools.md#prompts)

[![Smithery](https://img.shields.io/badge/Smithery-listed-8b5cf6)](https://smithery.ai)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-10b981)](https://registry.modelcontextprotocol.io)
[![VirusTotal](https://img.shields.io/badge/release_scan-VirusTotal-brightgreen)](https://github.com/bezata/kObsidian/releases/latest)

---

## Install

Pick the channel that matches your client. All three read the same
`OBSIDIAN_VAULT_PATH`, `OBSIDIAN_API_URL`, and `OBSIDIAN_REST_API_KEY`
environment variables — see [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

### npx / bunx — Claude Code, Cursor, VSCode, Windsurf, Zed, Cline, …

```json
{
  "mcpServers": {
    "kobsidian": {
      "command": "npx",
      "args": ["-y", "kobsidian-mcp"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/absolute/path/to/vault",
        "OBSIDIAN_API_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_REST_API_KEY": "only-if-you-use-workspace-or-commands-tools"
      }
    }
  }
}
```

Swap `npx` for `bunx` for faster cold-start (≈10 ms vs ≈200 ms).

### Claude Desktop — drag-and-drop `.mcpb`

Download `kobsidian-<platform>.mcpb` from the
[latest release](https://github.com/bezata/kObsidian/releases/latest) and
drag it into Claude Desktop. The installer prompts for vault path +
optional API key. Each release asset is VirusTotal-scanned — scan links
are in the release body.

Build one locally:

```bash
bun install
bun run build:compile   # → dist/kobsidian (or .exe on Windows)
bun run bundle:mcpb     # → kobsidian.mcpb
```

### Smithery

[smithery.ai](https://smithery.ai) renders an install UI from
[`smithery.yaml`](smithery.yaml) and collects the three env vars for you.

### From source (contributing / hacking)

```bash
git clone https://github.com/bezata/kObsidian
cd kObsidian
bun install
bun run dev:stdio      # or dev:http
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           MCP Clients                                │
│   Claude Code · Claude Desktop · Cursor · VSCode · Windsurf · Zed    │
│   JetBrains AI · Cline · Continue · ChatGPT · Smithery · …           │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ JSON-RPC 2.0 · MCP 2025-11-25
         ┌───────────────────┴──────────────────────┐
         ▼                                          ▼
┌──────────────────┐                   ┌─────────────────────────┐
│ stdio transport  │                   │ Streamable HTTP (Hono)  │
│                  │                   │ + OPTIONS / CORS        │
│                  │                   │ + MCP-Protocol-Version  │
│                  │                   │ + Origin 403 / bearer   │
└────────┬─────────┘                   └────────┬────────────────┘
         │                                      │
         └──────────────────┬───────────────────┘
                            ▼
          ┌──────────────────────────────────┐
          │          McpServer               │
          │  ┌────────────┐ ┌─────────────┐  │
          │  │  90 Tools  │ │ 4 Resources │  │
          │  └────────────┘ └─────────────┘  │
          │  ┌────────────┐ ┌─────────────┐  │
          │  │ 3 Prompts  │ │ structured  │  │
          │  │            │ │   content   │  │
          │  └────────────┘ └─────────────┘  │
          └────────────┬─────────────────────┘
                       │
                       ▼
          ┌──────────────────────────────────┐
          │      Domain layer (pure)         │
          │  notes · links · tags · tasks    │
          │  dataview · canvas · kanban      │
          │  mermaid · marp · templates      │
          │  wiki/ orchestration             │
          └──────┬─────────────────┬─────────┘
                 │                 │
                 ▼                 ▼
         ┌──────────────┐   ┌──────────────────────┐
         │  vault/ (FS) │   │ Obsidian Local REST  │
         │ authoritative│   │ API plugin (optional)│
         └──────────────┘   └──────────────────────┘
```

Full map in [`docs/architecture.md`](docs/architecture.md).

---

## LLM Wiki in 60 seconds

On top of the primitives, kObsidian ships a `wiki.*` namespace that
implements the **LLM Wiki** pattern — the vault becomes a persistent,
compounding knowledge base the LLM maintains for you.

```
              User drops a source
                      │
                      ▼
            ┌──────────────────────┐    proposedEdits
            │     wiki.ingest      │ ─────────────────────┐
            └──────────┬───────────┘                      │
                       │ creates 1 file                   ▼
                       │              ┌──────────────────────────────┐
                       ▼              │ LLM applies edits via        │
              wiki/Sources/           │  notes.insertAfterHeading    │
              <slug>.md               │  notes.update                │
                       │              │  notes.create                │
                       │ appends      └──────────────────────────────┘
                       ▼
                 wiki/log.md

   Anytime: wiki.query   → top pages → notes.read → cited synthesis
   Periodic: wiki.lint   → orphans · broken · stale · missing · tag-drift
   Curate:   wiki.summaryMerge — add cited section to concept/entity page
```

Default layout under the vault:

```
wiki/
├── Sources/           per-source summary pages
├── Concepts/          topic / idea pages (LLM-maintained)
├── Entities/          people / places / orgs / works
├── index.md           categorized catalog (wiki.indexRebuild)
├── log.md             greppable chronological log
└── wiki-schema.md     vault-local copy of the contract
```

Key design decision: **the server never blindly rewrites cross-references.**
`wiki.ingest` creates exactly one file and returns a `proposedEdits` array
that the agent applies with existing `notes.*` tools. Every write is
visible in the transcript. Full contract in [`docs/wiki.md`](docs/wiki.md).

### Claude Code skills

Four skills at [`skills/`](skills/) trigger on natural language:
`wiki-bootstrap` · `wiki-ingest` · `wiki-query` · `wiki-lint`. Copy or
symlink them into `~/.claude/skills/` (see
[`skills/README.md`](skills/README.md)).

---

## Tool surface

90 tools across 12 namespaces. Generated inventory:
**[`docs/tool-inventory.json`](docs/tool-inventory.json)**.

| Namespace | Count | |
|---|---:|---|
| `notes.*` | 16 | CRUD + search + move + smart-insert |
| `tags.*` | 6 | Add / remove / search / analyze |
| `links.*` | 8 | Backlinks, broken, orphans, hubs, graph |
| `stats.*` | 2 | Per-note + vault metrics |
| `tasks.*` | 5 | Tasks-plugin format (📅 ⏳ 🛫 ✅ 🔼 🔁) |
| `dataview.*` | 13 | Fields + DQL + DataviewJS |
| `mermaid.*` | 3 | Source-preserving block edits |
| `marp.*` | 5 | Slide-level reads + edits |
| `kanban.*` | 5 | Board + card mutations |
| `templates.*` + `canvas.*` | 10 | Templates + Templater bridge + Canvas |
| `workspace.*` + `commands.*` | 9 | Obsidian REST bridge |
| `wiki.*` | 7 | LLM-Wiki orchestration |

**Tool annotations** (`readOnlyHint` / `destructiveHint` / `idempotentHint`
/ `openWorldHint`) on 80+ tools let clients auto-approve read-only calls
and prompt more firmly on destructive ones. See
[`docs/tools.md`](docs/tools.md).

**MCP resources + prompts**:

```
kobsidian://wiki/index                       wiki/index.md
kobsidian://wiki/log                         wiki/log.md
kobsidian://wiki/schema                      wiki/wiki-schema.md
kobsidian://wiki/page/{+path}                any Sources/Concepts/Entities page
```

Plus prompts `ingest-source`, `answer-from-wiki`, `health-check-wiki` for
clients that don't consume the `skills/` files.

---

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `OBSIDIAN_VAULT_PATH` | — | **Required.** Absolute path to the vault. |
| `OBSIDIAN_API_URL` | `https://127.0.0.1:27124` | Obsidian Local REST API base; only for `workspace.*` / `commands.*` / `dataview.query*`. |
| `OBSIDIAN_API_VERIFY_TLS` | `false` | Set `true` if you've trusted the REST API's self-signed cert. |
| `OBSIDIAN_REST_API_KEY` | — | Bearer key for the REST API plugin (if used). |
| `KOBSIDIAN_HTTP_HOST` | `127.0.0.1` | Bind host for `dev:http`. |
| `KOBSIDIAN_HTTP_PORT` | `3000` | Bind port for `dev:http`. |
| `KOBSIDIAN_HTTP_BEARER_TOKEN` | — | Optional bearer for the Streamable HTTP transport. |
| `KOBSIDIAN_ALLOWED_ORIGINS` | `http://localhost,http://127.0.0.1` | Comma-separated CORS allowlist. |
| `KOBSIDIAN_WIKI_ROOT` | `wiki` | Wiki directory under the vault. |
| `KOBSIDIAN_WIKI_SOURCES_DIR` | `Sources` | Per-source summary pages. |
| `KOBSIDIAN_WIKI_CONCEPTS_DIR` | `Concepts` | Topic / idea pages. |
| `KOBSIDIAN_WIKI_ENTITIES_DIR` | `Entities` | People / places / orgs / works. |
| `KOBSIDIAN_WIKI_INDEX_FILE` | `index.md` | Wiki catalog filename. |
| `KOBSIDIAN_WIKI_LOG_FILE` | `log.md` | Wiki log filename. |
| `KOBSIDIAN_WIKI_SCHEMA_FILE` | `wiki-schema.md` | Seed schema filename. |
| `KOBSIDIAN_WIKI_STALE_DAYS` | `180` | `wiki.lint` stale-page threshold. |

Every wiki tool also accepts a per-call `wikiRoot` override.

---

## Docs

- **[architecture](docs/architecture.md)** — stack, module map, layering rules
- **[wiki](docs/wiki.md)** — LLM-Wiki contract, loop, frontmatter, lint categories
- **[tools](docs/tools.md)** — namespace table, annotations, resources, prompts
- **[SECURITY](docs/SECURITY.md)** — Origin/CORS, VirusTotal scans, env hygiene
- **[TESTING](docs/TESTING.md)** — `bun run …` commands + coverage
- **[ENVIRONMENT](docs/ENVIRONMENT.md)** — every env var with defaults
- **[MIGRATION](docs/MIGRATION.md)** — upgrade notes

---

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run test
bun run build         # node-target stdio.js + bun-target http.js
bun run inventory     # regenerate docs/tool-inventory.json
```

See [`docs/TESTING.md`](docs/TESTING.md) for per-area coverage, and
[`AGENTS.md`](AGENTS.md) for project conventions.

---

## Compatibility notes

- **Protocol version** — `2025-11-25` (the current MCP spec revision).
  HTTP clients without `MCP-Protocol-Version` fall back to `2025-03-26`
  per spec.
- **Dataview split** — offline tools index frontmatter / inline / list /
  task / fenced `dataview` / fenced `dataviewjs` blocks. Runtime DQL
  execution is delegated to Obsidian + Dataview through the Local REST
  API. DataviewJS is source-preserving but not executed inside this
  server.
- **Mermaid + Marp** — source-preserving parse/edit only; this server
  doesn't render. Rendering is intentionally the client's job.

---

## License

MIT — see [LICENSE](LICENSE). Contributions welcome; open an issue first
for anything non-trivial.
