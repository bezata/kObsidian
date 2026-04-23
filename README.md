<div align="center">

# kObsidian

**Filesystem-first MCP server for Obsidian vaults — with an LLM-Wiki layer on top.**

_Inspired by [Andrej Karpathy's LLM Wiki idea](https://github.com/karpathy)._
You curate the sources; the LLM does the bookkeeping.

<br />

[![npm version](https://img.shields.io/npm/v/kobsidian-mcp?color=cb3837&label=npm&logo=npm)](https://www.npmjs.com/package/kobsidian-mcp)
[![npm downloads](https://img.shields.io/npm/dm/kobsidian-mcp?color=cb3837&label=downloads&logo=npm)](https://www.npmjs.com/package/kobsidian-mcp)
[![license](https://img.shields.io/npm/l/kobsidian-mcp?color=blue)](LICENSE)
[![Release CI](https://img.shields.io/github/actions/workflow/status/bezata/kObsidian/release.yml?branch=main&label=release&logo=github)](https://github.com/bezata/kObsidian/actions/workflows/release.yml)

[![MCP](https://img.shields.io/badge/MCP-2025--11--25-1e88e5?logo=anthropic&logoColor=white)](https://modelcontextprotocol.io)
[![Bun](https://img.shields.io/badge/runtime-Bun_1.2+-f472b6?logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tools](https://img.shields.io/badge/MCP_tools-90-1e88e5)](docs/tools.md)
[![Resources](https://img.shields.io/badge/MCP_resources-4-1e88e5)](docs/tools.md#resources)
[![Prompts](https://img.shields.io/badge/MCP_prompts-3-1e88e5)](docs/tools.md#prompts)

[![Smithery](https://img.shields.io/badge/Smithery-listed-8b5cf6)](https://smithery.ai)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-10b981)](https://registry.modelcontextprotocol.io)
[![VirusTotal](https://img.shields.io/badge/release_scan-VirusTotal-brightgreen)](https://github.com/bezata/kObsidian/releases/latest)

<br />

[**Install**](#install) ·
[**Quick start**](#quick-start) ·
[**Architecture**](#architecture) ·
[**LLM Wiki**](#llm-wiki-60-seconds) ·
[**Tools**](#tool-surface) ·
[**Docs**](docs/README.md)

</div>

---

## Why kObsidian

- **Filesystem-first.** Operates on your vault directly. Obsidian doesn't need to be running for 80+ of the 90 tools.
- **90 typed MCP tools** across notes, links, tags, tasks, Dataview, Canvas, Kanban, Mermaid, Marp, Templates — every one Zod-validated with `structuredContent` output and client-safety annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`).
- **LLM-Wiki orchestration** — a `wiki.*` namespace that turns your vault into a compounding knowledge base: ingest sources, auto-update an index + greppable log, lint for orphans / broken links / stale pages. Agent applies cross-refs via a `proposedEdits` contract so every write is visible in the transcript.
- **Both transports.** Classic stdio for local MCP clients and Streamable HTTP (Hono) for remote, with CORS preflight, `MCP-Protocol-Version` handling, origin 403, and optional bearer auth — all per the 2025-11-25 spec.
- **Ships everywhere.** npm (`npx -y kobsidian-mcp`), cross-platform `.mcpb` bundles for Claude Desktop drag-and-drop, a `smithery.yaml` for Smithery, and a `server.json` for the MCP Registry. Each `.mcpb` release asset is VirusTotal-scanned with links appended to the release body.

---

## Install

Pick the channel that matches your client. All three read the same
`OBSIDIAN_VAULT_PATH`, `OBSIDIAN_API_URL`, and `OBSIDIAN_REST_API_KEY`
environment variables — see [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

### `npx` / `bunx` — Claude Code, Cursor, VSCode, Windsurf, Zed, Cline, JetBrains AI, …

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

Swap `npx` for `bunx` for ≈10 ms cold-start instead of ≈200 ms.

### Claude Desktop — drag-and-drop `.mcpb`

Download `kobsidian-<platform>.mcpb` from the
[latest release](https://github.com/bezata/kObsidian/releases/latest) and
drag it into Claude Desktop. The installer prompts for vault path +
optional API URL / key. Every release asset is scanned — the VirusTotal
links are in the release body.

Build one locally:

```bash
bun install
bun run build:compile   # → dist/kobsidian (or .exe on Windows)
bun run bundle:mcpb     # → kobsidian.mcpb
```

### Smithery

[smithery.ai](https://smithery.ai) renders an install UI straight from
[`smithery.yaml`](smithery.yaml) and collects the three env vars for you.

### From source (contributing / hacking)

```bash
git clone https://github.com/bezata/kObsidian
cd kObsidian
bun install
bun run dev:stdio    # or dev:http
```

---

## Quick start

> Once installed, a typical session opens with three natural-language
> prompts. The `wiki.*` tools + the `.claude` skills handle the rest.

```
You:  "Set up a wiki in this vault."
LLM:  wiki.init  →  wiki/{Sources,Concepts,Entities}/ + index.md + log.md + wiki-schema.md

You:  "Ingest this: https://… (paper on Memex)"
LLM:  wiki.ingest  →  creates wiki/Sources/as-we-may-think.md + log entry
      returns proposedEdits:
        - insertAfterHeading  index.md#Sources
        - createStub          Concepts/memex.md
        - createStub          Entities/vannevar-bush.md
      LLM applies each via notes.*  (you see every write in the transcript)

You:  "What does the wiki say about memex vs hypertext?"
LLM:  wiki.query memex  →  top-ranked pages
      notes.read on each  →  cited synthesis
      offers to file the synthesis back via wiki.summaryMerge

You:  "Audit the wiki."
LLM:  wiki.lint  →  {orphans, brokenLinks, stale, missingPages, tagSingletons, indexMismatch}
      proposes concrete fixes; applies after you confirm
```

Full loop, frontmatter contracts, and the `proposedEdits` design in
[`docs/wiki.md`](docs/wiki.md).

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

Full module map in [`docs/architecture.md`](docs/architecture.md).

---

## LLM Wiki (60 seconds)

> The tedious part of maintaining a knowledge base is not the reading or
> the thinking — it's the bookkeeping. Humans abandon wikis because the
> maintenance burden grows faster than the value. **LLMs don't get
> bored.**

kObsidian implements the **LLM Wiki** pattern —
[Andrej Karpathy's idea](https://github.com/karpathy) of a persistent,
compounding knowledge base the LLM maintains. The vault becomes a
private, curated Memex (Vannevar Bush, 1945) where cross-references,
log-keeping, and lint are the LLM's job while you focus on curating
sources and asking questions.

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

**The key design decision** is that `wiki.ingest` never rewrites
cross-references blindly. It creates exactly one file (the Sources
page), appends one file (`log.md`), and returns a `proposedEdits` array
the agent applies with existing `notes.*` tools. Every write is visible
in the transcript — so LLM hallucinations show up as reviewable edits
rather than silent vault corruption.

Full contract in [`docs/wiki.md`](docs/wiki.md).

### Claude Code skills

Four skills at [`skills/`](skills/) trigger on natural language:
`wiki-bootstrap`, `wiki-ingest`, `wiki-query`, `wiki-lint`. Copy or
symlink them into `~/.claude/skills/` — see
[`skills/README.md`](skills/README.md).

---

## Tool surface

90 MCP tools across 12 namespaces. Always-current inventory at
**[`docs/tool-inventory.json`](docs/tool-inventory.json)**.

| Namespace | Count | Highlights |
|---|---:|---|
| `notes.*` | 16 | CRUD · search · move · smart-insert (after heading / block) |
| `tags.*` | 6 | Add · remove · search · analyze |
| `links.*` | 8 | Backlinks · broken · orphans · hubs · graph · health |
| `stats.*` | 2 | Per-note + vault-wide metrics |
| `tasks.*` | 5 | Tasks-plugin format (📅 ⏳ 🛫 ✅ 🔼 🔁) |
| `dataview.*` | 13 | Fields · DQL · DataviewJS (source-preserving edits) |
| `mermaid.*` | 3 | Fenced-block parse / read / update |
| `marp.*` | 5 | Slide-level reads + edits |
| `kanban.*` | 5 | Board + card mutations |
| `templates.*` + `canvas.*` | 10 | Templates · Templater bridge · Canvas nodes/edges |
| `workspace.*` + `commands.*` | 9 | Obsidian REST bridge (only tools needing Obsidian running) |
| `wiki.*` | **7** | init · ingest · log · indexRebuild · query · lint · summaryMerge |

**Client-safety annotations** (MCP 2025-11-25):

| Hint | Tools |
|---|---:|
| `readOnlyHint: true` (clients can auto-approve) | 47 |
| `destructiveHint: true` (clients prompt more firmly) | 6 |
| `idempotentHint: true` (safe to retry) | 12 |
| `openWorldHint: true` (reaches outside the vault) | 16 |

**MCP resources** (URI-addressable; any client can browse without tool
calls):

```
kobsidian://wiki/index              wiki/index.md
kobsidian://wiki/log                wiki/log.md
kobsidian://wiki/schema             wiki/wiki-schema.md
kobsidian://wiki/page/{+path}       any Sources/Concepts/Entities page
```

**MCP prompts** (for clients that don't consume the `skills/` files):
`ingest-source`, `answer-from-wiki`, `health-check-wiki`.

Details in [`docs/tools.md`](docs/tools.md).

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

| | |
|---|---|
| [architecture.md](docs/architecture.md) | Stack, module map, layering rules |
| [wiki.md](docs/wiki.md) | LLM-Wiki contract, loop, frontmatter, lint categories |
| [tools.md](docs/tools.md) | Namespace table, annotations, resources, prompts |
| [SECURITY.md](docs/SECURITY.md) | Origin/CORS, VirusTotal scans, env hygiene |
| [TESTING.md](docs/TESTING.md) | `bun run …` commands + coverage |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every env var with defaults |
| [MIGRATION.md](docs/MIGRATION.md) | Upgrade notes |

---

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run test          # 56 tests across 14 files
bun run build         # node-target stdio.js + bun-target http.js
bun run inventory     # regenerate docs/tool-inventory.json
```

Project conventions in [`AGENTS.md`](AGENTS.md).

---

## Security & supply chain

- **Every `.mcpb` release asset is VirusTotal-scanned.** The `Release`
  workflow uploads each `kobsidian-<platform>.mcpb` bundle to
  [VirusTotal](https://www.virustotal.com) via
  [`crazy-max/ghaction-virustotal@v4`](https://github.com/crazy-max/ghaction-virustotal)
  right after the release is published, then appends the analysis links
  to the release body. Any user installing from a GitHub release can
  click through to the public VirusTotal report for their platform's
  bundle **before** they run it — no trust in the maintainer required.

- **Transport hardening.** Streamable HTTP validates `Origin` against
  an allowlist (403 on mismatch), implements CORS preflight
  (`OPTIONS /mcp` → 204 + `Access-Control-*`), requires or defaults
  `MCP-Protocol-Version`, and supports optional bearer auth via
  `KOBSIDIAN_HTTP_BEARER_TOKEN`. stdio has no network surface.

- **Pinned SDK floor.** `@modelcontextprotocol/sdk@^1.26.0` — mitigates
  `GHSA-345p-7cg4-v4c7` (cross-client response leak) and
  `CVE-2026-0621` (UriTemplate ReDoS). This repo pins `1.29.0`.

- **npm provenance.** The release workflow publishes with
  `npm publish --provenance`, so every version on npm has a
  cryptographically-linked build statement pointing at the exact
  GitHub Actions run that produced it.

Full notes in [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Compatibility notes

- **Protocol version** — `2025-11-25` (current MCP spec). HTTP clients
  without `MCP-Protocol-Version` fall back to `2025-03-26` per spec;
  explicit-but-unsupported versions return 400.
- **Dataview split** — offline tools index frontmatter / inline / list /
  task / fenced `dataview` / fenced `dataviewjs` blocks. Runtime DQL is
  delegated to Obsidian + Dataview through the Local REST API.
  DataviewJS is source-preserving but not executed inside this server.
- **Mermaid + Marp** — source-preserving parse/edit only; rendering is
  the client's job.
- **SDK floor** — `@modelcontextprotocol/sdk@^1.26.0` (mitigates
  `GHSA-345p-7cg4-v4c7` cross-client response leak + `CVE-2026-0621`
  UriTemplate ReDoS). This repo pins `1.29.0`.

---

## Credits

- **LLM Wiki pattern** — [Andrej Karpathy](https://github.com/karpathy).
  kObsidian is one concrete, filesystem-first TypeScript implementation
  of the idea.
- **Memex** — Vannevar Bush, [_As We May Think_, 1945](https://www.theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/).
  The associative-trails concept is what the wiki's cross-reference
  graph tries to be.
- **Model Context Protocol** — [Anthropic + the Agentic AI Foundation](https://modelcontextprotocol.io).
- **Obsidian** — [obsidian.md](https://obsidian.md). The vault format
  is authoritative; kObsidian respects it, doesn't migrate it.

## License

MIT — see [LICENSE](LICENSE). Contributions welcome; open an issue first
for anything non-trivial.
