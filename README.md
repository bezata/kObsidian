<div align="center">

# kObsidian MCP

**Filesystem-first MCP server for Obsidian vaults — with an LLM-Wiki layer on top.**

_Inspired by [Andrej Karpathy's **LLM Wiki**](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) idea._
You curate the sources; the LLM does the bookkeeping.

<br />

[![npm version](https://img.shields.io/npm/v/kobsidian-mcp?color=cb3837&label=npm&logo=npm)](https://www.npmjs.com/package/kobsidian-mcp)
[![npm downloads](https://img.shields.io/npm/dt/kobsidian-mcp?color=cb3837&label=downloads&logo=npm)](https://www.npmjs.com/package/kobsidian-mcp)
[![GitHub release](https://img.shields.io/github/v/release/bezata/kObsidian?color=1e88e5&label=release&logo=github&sort=semver)](https://github.com/bezata/kObsidian/releases/latest)
[![license](https://img.shields.io/npm/l/kobsidian-mcp?color=blue)](LICENSE)
[![Release CI](https://img.shields.io/github/actions/workflow/status/bezata/kObsidian/release.yml?branch=main&label=CI&logo=github)](https://github.com/bezata/kObsidian/actions/workflows/release.yml)

[![MCP](https://img.shields.io/badge/MCP-2025--11--25-1e88e5?logo=anthropic&logoColor=white)](https://modelcontextprotocol.io)
[![Bun](https://img.shields.io/badge/runtime-Bun_1.3+-f472b6?logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tools](https://img.shields.io/badge/MCP_tools-90-1e88e5)](docs/tools.md)
[![Resources](https://img.shields.io/badge/MCP_resources-4-1e88e5)](docs/tools.md#resources)
[![Prompts](https://img.shields.io/badge/MCP_prompts-3-1e88e5)](docs/tools.md#prompts)
[![Smithery](https://img.shields.io/badge/Smithery-listed-8b5cf6)](https://smithery.ai)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-10b981)](https://registry.modelcontextprotocol.io)
[![VirusTotal](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbezata%2FkObsidian%2Fmain%2F.github%2Fbadges%2Fvirustotal.json)](https://github.com/bezata/kObsidian/releases/latest)

<br />

[**Install**](#install) ·
[**Quick start**](#quick-start) ·
[**Architecture**](#architecture) ·
[**LLM Wiki**](#llm-wiki-60-seconds) ·
[**Tools**](#tool-surface) ·
[**Docs**](docs/README.md)

[![kObsidian MCP server](https://glama.ai/mcp/servers/bezata/kObsidian/badges/card.svg)](https://glama.ai/mcp/servers/bezata/kObsidian)

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

### `npx` / `bunx` — Claude Code, Claude Desktop, Cursor, VSCode, Antigravity, Zed, Cline, JetBrains AI, …

```json
{
  "mcpServers": {
    "kobsidian": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "kobsidian-mcp"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/absolute/path/to/vault",
        "OBSIDIAN_API_URL": "https://127.0.0.1:27124",
        "OBSIDIAN_API_VERIFY_TLS": "false",
        "OBSIDIAN_REST_API_KEY": "only-if-you-use-workspace-or-commands-tools"
      }
    }
  }
}
```

`"type": "stdio"` is optional on clients that infer transport from
`command` (Claude Code), but **required by Claude Desktop, Cursor,
VSCode, and Antigravity** — include it for maximum portability. Swap
`npx` for `bunx` for ≈10 ms cold-start instead of ≈200 ms.

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

## Obsidian plugins

kObsidian is **filesystem-first** — 80+ of the 90 tools work against a
bare vault directory with no Obsidian plugins installed. The plugins
below only matter if you want the specific tool namespaces that depend
on them.

### Enabling community plugins (one-time, if not already on)

Obsidian ships with community plugins disabled by default. Enable them
once per vault:

1. Open your vault in Obsidian.
2. **Settings** (⚙️, bottom-left) → **Community plugins**.
3. Click **Turn on community plugins**.
4. **Browse** → search → **Install** → **Enable**.

### Required for the REST-bridged tools

**[Obsidian Local REST API](obsidian://show-plugin?id=obsidian-local-rest-api)** (by Adam Coddington) — needed for:
- `workspace.*` (activeFile, openFile, navigateBack/Forward, toggleEditMode)
- `commands.*` (execute, list, search)
- `dataview.query` / `dataview.listByTag` / `dataview.listByFolder` / `dataview.table` (runtime DQL — the offline `dataview.fields.*` / `dataview.index.read` / `dataview.query.read` tools work without it)
- `templates.renderTemplater` / `templates.createNoteTemplater` / `templates.insertTemplater`

**Setup after install:**

1. Enable the plugin.
2. Open its settings — scroll to **API key** → click **Copy** (or **Reset** first if you want a fresh one).
3. Paste that key as `OBSIDIAN_REST_API_KEY` in your MCP client config's `env:` block. The `OBSIDIAN_API_URL` default (`https://127.0.0.1:27124`) works out of the box.

Leave the plugin running while you use the REST-bridged tools — the endpoint is local-only (`127.0.0.1`) so nothing leaves your machine.

### Enhances (but not required for) specific tool namespaces

| Plugin | Link | What it unlocks |
|---|---|---|
| **[Dataview](obsidian://show-plugin?id=dataview)** | `id=dataview` | All `dataview.*` tools still work on the raw markdown; Dataview plugin is what makes DQL queries in `dataview.query*` actually execute. Also renders your fields + queries visually inside Obsidian. |
| **[Templater](obsidian://show-plugin?id=templater-obsidian)** | `id=templater-obsidian` | Runtime template rendering via the REST API (`templates.renderTemplater`, etc.). The offline `templates.expand` / `templates.list` / `templates.createNote` work without it. |
| **[Marp](obsidian://show-plugin?id=marp-slides)** | `id=marp-slides` | Marp `marp.*` tools parse + edit Marp-front-matter markdown even without the plugin; the plugin is what renders slides / exports to PDF inside Obsidian. |
| **[Kanban](obsidian://show-plugin?id=obsidian-kanban)** | `id=obsidian-kanban` | `kanban.*` tools read/write the plain markdown board format regardless of plugin; the plugin is what renders the board as draggable columns inside Obsidian. |
| **[Tasks](obsidian://show-plugin?id=obsidian-tasks-plugin)** | `id=obsidian-tasks-plugin` | `tasks.*` tools understand the Tasks-plugin emoji syntax (📅 ⏳ 🛫 ✅ 🔼 🔁) regardless of plugin; the plugin is what provides filtering / querying / toggling inside Obsidian. |

> The `obsidian://show-plugin?id=…` links jump straight to the plugin
> in Obsidian's in-app browser — click one with Obsidian open and it
> deep-links to the install screen.

### TLDR

| You want to … | Minimum you need |
|---|---|
| Use `notes.*` / `tags.*` / `links.*` / `stats.*` / `tasks.*` / `wiki.*` / `kanban.*` / `mermaid.*` / `marp.*` / `canvas.*` / `templates.expand` + `list` + `createNote` / offline `dataview.*` | **Just a vault path.** No plugins required. |
| Use `workspace.*` / `commands.*` | + **Local REST API** plugin + API key env var |
| Run live DQL queries (`dataview.query` / `dataview.listBy*` / `dataview.table`) | + **Local REST API** + **Dataview** |
| Run Templater templates at runtime | + **Local REST API** + **Templater** |

No combination of plugins makes kObsidian depend on Obsidian being
running — the REST-bridged tools just return a clear error if the
plugin isn't reachable, and the filesystem-first tools keep working.

---

## Quick start

> **Before the first session** — kObsidian works on a bare Obsidian vault,
> but enabling a few Obsidian plugins unlocks the full tool surface.
> See [Obsidian plugins](#obsidian-plugins) below for the 5-minute
> setup (Local REST API, Dataview, Templater, Marp, Kanban, Tasks).
> Skip it if you only need the 80+ filesystem-first tools.

Once installed, a typical session opens with three natural-language
prompts. The `wiki.*` tools + the `.claude` skills handle the rest.

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

## Example use cases

The same primitives cover several real-world flavors of knowledge base.
Three worked examples below; longer walkthroughs in [`docs/examples.md`](docs/examples.md).

### A. Personal research wiki

```
You: "Ingest this paper on in-context learning: <url or pasted markdown>"
LLM:  wiki.ingest title="In-Context Learning — A Survey" sourceType=paper
        tags=[icl, prompting] relatedConcepts=[In-Context Learning, Few-Shot Prompting]
        relatedEntities=[Brown 2020]
      → wiki/Sources/in-context-learning-a-survey.md
      → proposedEdits:
          • createStub  wiki/Concepts/in-context-learning.md
          • createStub  wiki/Concepts/few-shot-prompting.md
          • createStub  wiki/Entities/brown-2020.md
          • insertAfterHeading  wiki/index.md#Sources
      LLM applies each via notes.create / notes.insertAfterHeading.
```

### B. Architecture Decision Records (ADRs) for a codebase

Model each ADR as a Source, architectural patterns as Concepts, and
services / teams / libraries as Entities. The wiki becomes your ADR
archive with cross-links you never have to maintain by hand.

```
You: "Record ADR-004: we're switching internal service comms from REST
      to gRPC. Context: <paste>"
LLM:  wiki.ingest title="ADR-004 — gRPC for internal service comms"
        sourceType=note tags=[adr, architecture, rpc]
        relatedConcepts=[gRPC, Service Mesh, Internal RPC]
        relatedEntities=[order-service, payment-service, inventory-service]
      → wiki/Sources/adr-004-grpc-for-internal-service-comms.md
      → proposedEdits:
          • createStub   wiki/Concepts/grpc.md
          • createStub   wiki/Concepts/service-mesh.md
          • insertAfterHeading  wiki/Entities/order-service.md#Notable Facts
          • insertAfterHeading  wiki/Entities/payment-service.md#Notable Facts
          • …

Three weeks later —
You: "Why did we pick gRPC for internal comms?"
LLM:  wiki.query "grpc internal comms"
      notes.read top matches
      → "Per [[wiki/Sources/adr-004-grpc-for-internal-service-comms.md|ADR-004]],
         chosen over REST because of native streaming + typed schemas; tradeoff
         accepted: browser clients still use REST via an edge gateway
         ([[wiki/Concepts/service-mesh.md]])."
```

### C. Codebase wiki (design docs + post-mortems + RFCs)

Engineering teams abandon wikis because nobody updates them. Let the
LLM do it. Ingest design docs, RFCs, and post-mortems as Sources;
architectural patterns become Concepts; services and teams become
Entities.

```
You: "We had an incident today — payment-service timeouts cascaded
      into order-service. Here's the post-mortem: <paste>"
LLM:  wiki.ingest title="Postmortem 2026-04-10 — Payment timeouts cascade"
        sourceType=other tags=[postmortem, incident, reliability]
        relatedConcepts=[Circuit Breaker, Cascade Failure, Timeout Budget]
        relatedEntities=[payment-service, order-service]
      → wiki/Sources/postmortem-2026-04-10-payment-timeouts-cascade.md
      → proposedEdits:
          • createStub  wiki/Concepts/circuit-breaker.md
          • createStub  wiki/Concepts/cascade-failure.md
          • insertAfterHeading  wiki/Entities/payment-service.md#Notable Facts
          • insertAfterHeading  wiki/Entities/order-service.md#Notable Facts

Periodic housekeeping —
You: "Audit the codebase wiki."
LLM:  wiki.lint
      → 3 orphan RFCs (unlinked from any Concept; link or archive?)
      → 1 broken link: [[wiki/Entities/legacy-auth-service.md]]
        (deprecated in Q1; remove the link from
         [[wiki/Sources/adr-002-session-migration.md]]?)
      → 4 post-mortems past the 180-day stale threshold — tag with
        "needs-review" or re-ingest with updated lessons-learned?
      → 2 tag singletons: `retry-logic` (merge into `retry-policy`?),
        `observability` (first use; keep).
```

**Why this works for engineering teams**

- The `proposedEdits` contract means every cross-reference write is
  visible in the transcript — no silent vault corruption from an LLM
  hallucination about which services a decision affects.
- The greppable log format (`## [YYYY-MM-DD] ingest | ADR-004 …`) makes
  `grep '^## \[' wiki/log.md | tail -20` a valid "what did the team
  decide recently" query.
- `wiki.lint` surfaces broken links to services that were deprecated
  months ago — the bookkeeping humans never get around to.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           MCP Clients                                │
│   Claude Code · Claude Desktop · Cursor · VSCode · Antigravity · Zed │
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

kObsidian implements the **LLM Wiki** pattern from
[Andrej Karpathy's gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):
a persistent, compounding knowledge base the LLM maintains. The vault becomes a
private, curated Memex (Vannevar Bush, 1945) where cross-references,
log-keeping, and lint are the LLM's job while you focus on curating
sources and asking questions.

> "Instead of just retrieving from raw documents at query time, the LLM
> incrementally builds and maintains a persistent wiki — a structured,
> interlinked collection of markdown files that sits between you and the
> raw sources." — Andrej Karpathy

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
| [examples.md](docs/examples.md) | Personal research wiki · engineering ADRs · codebase wiki — end-to-end |
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

- **npm Trusted Publishing.** No long-lived `NPM_TOKEN` is stored in the
  repo. GitHub Actions mints a short-lived OIDC token on every tag push
  and the npm CLI exchanges it for a one-time publish token scoped to
  this exact workflow file (`.github/workflows/release.yml` on the
  `bezata/kObsidian` repo). Provenance attestations are automatic — every
  published version has a cryptographically-linked build statement
  pointing at the exact Actions run that produced it. Forks, other
  branches, or modified workflow files cannot publish — the OIDC
  audience claim won't match.

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

- **LLM Wiki pattern** — [Andrej Karpathy's gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
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
