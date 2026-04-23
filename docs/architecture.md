# Architecture

kObsidian is a filesystem-first MCP server that exposes an Obsidian vault
through a typed tool surface, optionally bridging to the Obsidian Local REST
API for workspace / command actions.

## The stack end-to-end

```
┌──────────────────────────────────────────────────────────────────────┐
│                           MCP Clients                                │
│   Claude Code · Claude Desktop · Cursor · VSCode · Antigravity · Zed │
│   JetBrains AI · Cline · Roo Code · Continue · ChatGPT · Smithery    │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ JSON-RPC 2.0
                             │ (MCP 2025-11-25)
         ┌───────────────────┴──────────────────────┐
         ▼                                          ▼
┌──────────────────┐                   ┌─────────────────────────┐
│ stdio transport  │                   │ Streamable HTTP (Hono)  │
│ src/server/      │                   │ src/server/http-app.ts  │
│   stdio.ts       │                   │ + OPTIONS / CORS        │
│                  │                   │ + MCP-Protocol-Version  │
│                  │                   │ + Origin 403 / bearer   │
└────────┬─────────┘                   └────────┬────────────────┘
         │                                      │
         └──────────────────┬───────────────────┘
                            ▼
          ┌──────────────────────────────────┐
          │   McpServer (src/server/         │
          │   create-server.ts)              │
          │                                  │
          │   ┌──────────────┐               │
          │   │   90 Tools   │               │ tool annotations:
          │   │   (wiki.*,   │               │  readOnlyHint, destructiveHint,
          │   │    notes.*,  │               │  idempotentHint, openWorldHint
          │   │    links.*,  │               │
          │   │    …)        │               │
          │   └──────┬───────┘               │
          │          │                       │
          │   ┌──────┴───────┐  ┌──────────┐ │
          │   │ 4 Resources  │  │3 Prompts │ │
          │   │ kobsidian:// │  │ (ingest, │ │
          │   │ wiki/*       │  │  query,  │ │
          │   │              │  │  lint)   │ │
          │   └──────────────┘  └──────────┘ │
          └────────────┬─────────────────────┘
                       │
                       ▼
          ┌──────────────────────────────────┐
          │      Domain layer (pure)         │
          │  src/domain/{notes,links,tags,   │
          │  tasks,dataview,kanban,mermaid,  │
          │  marp,templates,canvas,wiki/…}   │
          └──────┬─────────────────┬─────────┘
                 │                 │
                 ▼                 ▼
         ┌──────────────┐   ┌──────────────────────┐
         │  vault/ (FS) │   │ Obsidian Local REST  │
         │ (authoritative)  │ API plugin (optional;│
         │              │   │ for workspace.* and  │
         │              │   │ commands.* tools)    │
         └──────────────┘   └──────────────────────┘
```

Most tools are **filesystem-first**: they operate directly on the vault
directory and don't require Obsidian to be running. Only the `workspace.*`,
`commands.*`, and `dataview.query*` tools reach the Obsidian Local REST API —
those are the ones annotated `openWorldHint: true`.

## Module map

```
src/
├── config/
│   └── env.ts               # Zod-parsed env; OBSIDIAN_*, KOBSIDIAN_*
│
├── schema/
│   ├── primitives.ts        # notePathSchema, tagSchema, dateStringSchema, …
│   └── wiki.ts              # LLM-Wiki frontmatter + tool I/O + ProposedEdit
│
├── lib/                     # transport-agnostic helpers
│   ├── filesystem.ts        # walkMarkdownFiles, readUtf8, writeUtf8, …
│   ├── frontmatter.ts       # gray-matter wrapper
│   ├── paths.ts             # assertVaultRelativePath, resolveVaultPath, …
│   ├── patterns.ts          # WIKILINK_PATTERN, TAG_PATTERN, …
│   ├── obsidian-api-client  # REST bridge to the Local REST API plugin
│   ├── errors.ts            # AppError + 6 canonical error codes
│   └── results.ts           # ok() wrapper for structuredContent
│
├── domain/                  # business logic, transport-agnostic
│   ├── context.ts           # DomainContext = { env, api }
│   ├── notes.ts             # CRUD, search, move, list
│   ├── smart-insert.ts      # insertAfterHeading, appendToNote, escapeRegExp
│   ├── links.ts             # backlinks, graph, orphans, hubs, health,
│   │                        # collectNoteIndex (reused by wiki.lint)
│   ├── tags.ts              # add / remove / update / list / searchByTag
│   ├── tasks.ts             # Tasks-plugin format (📅 ⏳ 🛫 ✅ ➕ 🔼 🔁)
│   ├── dataview.ts          # fields + blocks (source-preserving edits)
│   ├── api-tools.ts         # DQL + Templater + workspace (REST-bridged)
│   ├── kanban.ts            # board / card mutations
│   ├── mermaid.ts           # fenced-block parse / edit
│   ├── marp.ts              # slide-level parse / edit
│   ├── templates.ts         # filesystem template expand + create
│   ├── canvas.ts            # node / edge / connections
│   ├── statistics.ts        # per-note + vault metrics
│   ├── metadata.ts          # per-note metadata extraction
│   ├── markdown-blocks.ts   # block-id region lookup
│   └── wiki/                # LLM-Wiki orchestration layer
│       ├── paths.ts         # resolveWikiPaths, classifyWikiPath, slugify
│       ├── schema.ts        # renderWithFrontmatter, body skeletons
│       ├── init.ts          # scaffold wiki/{Sources,Concepts,Entities}/
│       ├── ingest.ts        # file a source → proposedEdits
│       ├── log.ts           # greppable ## [YYYY-MM-DD] <op> | <title>
│       ├── index-rebuild.ts # regenerate wiki/index.md
│       ├── query.ts         # rank pages by filename+alias+tag+body
│       ├── lint.ts          # orphans/broken/stale/missing/tag-drift
│       └── merge.ts         # add cited section to concept/entity page
│
└── server/                  # MCP boundary
    ├── create-server.ts     # registerTool for each entry; capabilities
    ├── registry.ts          # concatenates every tools/*.ts array
    ├── tool-definition.ts   # ToolDefinition { name, title, annotations, … }
    ├── tool-schemas.ts      # READ_ONLY / DESTRUCTIVE / IDEMPOTENT / …
    ├── resources.ts         # kobsidian://wiki/{index,log,schema,page/{+path}}
    ├── prompts.ts           # ingest-source, answer-from-wiki, health-check-wiki
    ├── http-app.ts          # Hono + Streamable HTTP + CORS + version check
    ├── stdio.ts             # stdio entrypoint
    ├── http.ts              # Bun.serve entrypoint
    └── tools/               # one file per namespace; each exports an array
        ├── notes.ts  tags.ts  links.ts  analytics.ts  tasks.ts
        ├── dataview.ts  mermaid.ts  marp.ts  kanban.ts
        ├── templates-canvas.ts  api.ts  wiki.ts
```

### Layering rule

- Anything in `src/lib/` is pure — no domain knowledge, no I/O side effects
  that reach outside the vault directory.
- Anything in `src/domain/` can read/write the vault or call the REST API,
  but doesn't know about MCP.
- Anything in `src/server/` handles MCP wiring and transport concerns;
  it never talks to the filesystem directly — always through `src/domain/`.

This is why every domain function takes a `DomainContext` as its first
parameter and returns a plain JSON-serializable object. You can reuse the
whole domain layer from a CLI, a test, or a different protocol without
touching `src/server/`.

## Transports

Both transports share the same `McpServer` instance factory.

- **stdio** (`src/server/stdio.ts`) — standard MCP client transport; what
  Claude Code, Cursor, and other local clients use.
- **Streamable HTTP** (`src/server/http-app.ts`) — Hono app on Bun.serve:
  - `POST /mcp` — main MCP endpoint
  - `OPTIONS /mcp` — CORS preflight (204 + Allow-* headers when Origin
    is in `KOBSIDIAN_ALLOWED_ORIGINS`, 403 otherwise)
  - `MCP-Protocol-Version` header validated: missing → spec fallback to
    `2025-03-26`; present and unsupported → 400 JSON-RPC error
  - Optional bearer auth via `KOBSIDIAN_HTTP_BEARER_TOKEN`

## LLM-Wiki loop (high level)

```
                User drops a source
                        │
                        ▼
              ┌─────────────────────┐      proposedEdits
              │     wiki.ingest     │ ───────────────────────┐
              └──────────┬──────────┘                        │
                         │ creates exactly one file          │
                         ▼                                   ▼
                wiki/Sources/<slug>.md          ┌────────────────────────┐
                         │                      │ LLM applies edits via  │
                         │ appends              │  notes.insertAfter*    │
                         ▼                      │  notes.update          │
                   wiki/log.md                  │  notes.create          │
                                                └────────────────────────┘

   Anytime:      wiki.query ─→ top pages ─→ notes.read ─→ cited synthesis
   Periodic:     wiki.lint  ─→ {orphans, broken, stale, missing, tag-drift, index-mismatch}
   Curate:       wiki.summaryMerge ─→ add a cited section to a concept/entity page
```

The server never blindly rewrites cross-references. `wiki.ingest` creates
exactly one file (the Sources page), appends exactly one file (`log.md`),
and returns a `proposedEdits` array that the agent applies with existing
`notes.*` tools. This keeps writes reviewable. See [wiki.md](wiki.md) for
the full contract.

## Tests

- **Unit / domain** — `tests/wiki-*.test.ts`, `tests/domain-notes.test.ts`,
  `tests/links-kanban-canvas.test.ts`, `tests/tasks-dataview.test.ts`,
  `tests/markdown-compat.test.ts`. Vitest + a temp-vault fixture
  (`tests/helpers.ts::makeTempVault`) that copies `tests/fixtures/sample_vault`
  into `os.tmpdir()` for each test.
- **Server integration** — `tests/server-integration.test.ts`,
  `tests/server-resources-prompts.test.ts`,
  `tests/server-http-compliance.test.ts`. Uses the SDK's
  `InMemoryTransport.createLinkedPair()` and a mock Hono `fetch` for
  HTTP coverage — no real sockets opened.
