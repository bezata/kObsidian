# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] — 2026-04-25

> **Multi-vault support.** kObsidian can now discover and switch between
> multiple Obsidian vaults in a single server session. The four new
> `vault.*` tools (`list`, `current`, `select`, `reset`) let an LLM
> enumerate the user's known vaults and change the active vault for
> subsequent filesystem tool calls — without the user having to restart
> the server or thread `vaultPath` through every call.
>
> **Fully backwards compatible.** `OBSIDIAN_VAULT_PATH` continues to
> work exactly as in v0.2.5; if `vault.select` is never called, every
> tool resolves to the same path as before. No existing tool signatures
> change.

### Added

- **`vault.*` namespace (4 tools, +1 new namespace)** — bringing the surface to
  **66 tools across 16 namespaces**.
  - `vault.list` — discover known vaults merged from three sources.
  - `vault.current` — echo the active vault + precedence explanation.
  - `vault.select` — set the session-active vault (by `id`, `name`, or `path`).
  - `vault.reset` — clear the session selection, fall back to env default.
- **Named env-var vaults.** `OBSIDIAN_VAULT_<NAME>=path` env vars
  register additional vaults (suffix becomes the lowercase name).
  Documented, stable, and the recommended path for explicit multi-vault
  setups.
- **obsidian.json discovery (EXPERIMENTAL).** When
  `KOBSIDIAN_VAULT_DISCOVERY=on` (default), kObsidian parses Obsidian's
  undocumented obsidian.json vault registry so `vault.list` returns the
  user's real vaults with zero config. Platform-specific paths
  (macOS `~/Library/Application Support/…`, Windows `%APPDATA%\obsidian\…`,
  Linux XDG + Flatpak + Snap). Escape hatch:
  `KOBSIDIAN_OBSIDIAN_CONFIG=/absolute/path/obsidian.json` for portable
  installs and WSL. Marked experimental because the format is internal
  to Obsidian and could change without notice; parse failures are
  surfaced via `vault.list.obsidianConfigError` and never crash the
  server.
- **Operator gating env vars.** `KOBSIDIAN_VAULT_ALLOW` (comma-separated
  allowlist, names or paths) and `KOBSIDIAN_VAULT_DENY` (denylist,
  applied after allowlist). `OBSIDIAN_VAULT_PATH` is never filtered by
  either to prevent accidental self-lockout.
- **`pick-vault` prompt.** A new MCP server-side prompt template that
  clients like Claude Desktop surface as a slash command; it walks
  `vault.list` → presents options → calls `vault.select`.
- **Session-active-vault addendum on every filesystem tool.** Descriptions
  for every tool in `notes.*`, `tags.*`, `dataview.*`, `blocks.*`,
  `canvas.*`, `kanban.*`, `marp.*`, `templates.*`, `tasks.*`, `links.*`,
  `wiki.*`, and `stats.vault` now explain the precedence chain inline.
  `workspace.*` and `commands.*` get the inverse note: they target the
  live Obsidian process's vault, not the filesystem selection.
- **Cross-platform CI matrix.** New `.github/workflows/ci.yml` runs
  `typecheck + lint + test + build` on `ubuntu-latest` + `macos-latest` +
  `windows-latest` for every PR and push to main. Was ubuntu-only
  via `release.yml`'s `prepublishOnly` gate before.

### Changed

- **`requireVaultPath` precedence** is now `arg > session > env > error`
  (was `arg > env > error`). The middle slot is populated by
  `vault.select`; absent when no select has happened, so behaviour
  collapses to v0.2.5 exactly.
- **`DomainContext` type** extended with `session: SessionState` +
  `vaults: VaultCache`. Additive — existing consumers that destructure
  `{env, api}` continue to work unmodified.
- **`AppEnv` type** extended with `namedVaults: Record<string, string>`
  parsed from `OBSIDIAN_VAULT_<NAME>=path` env vars.

### Fixed

- `ingest-source` prompt updated to reference `notes.edit` (with
  `mode: 'after-heading'` / `mode: 'append'`) instead of the removed
  `notes.insertAfterHeading` / `notes.append` (v0.2.5 fallout that
  slipped through that release's prompt text).

### Migration from 0.2.5

Zero required changes — `OBSIDIAN_VAULT_PATH` behaviour is identical.
Opt in to multi-vault by adding named env vars or using `vault.select`:

```diff
# Before (still works in 0.3.0)
- OBSIDIAN_VAULT_PATH=/Users/alice/Vaults/Personal

# After — optional multi-vault
+ OBSIDIAN_VAULT_PATH=/Users/alice/Vaults/Personal
+ OBSIDIAN_VAULT_WORK=/Users/alice/Vaults/Work
+ OBSIDIAN_VAULT_SCRATCH=/Users/alice/Vaults/Scratch
```

Then from the LLM: `vault.select { name: "work" }` to switch,
`vault.reset` to return to the default.

## [0.2.5] — 2026-04-25

> **Tool-surface consolidation.** The tool surface has been reduced from ~90
> tools across 16 namespaces to **62 tools across 15 namespaces** (a 31%
> reduction). This is shipped as a minor bump; callers relying on the removed
> tool names listed below will need to migrate.
> Every remaining tool description has been rewritten to match Anthropic's
> tool-use guidance — outcome-focused prose, inline enum docs, explicit safety
> hints — and every tool now declares the full MCP 4-hint annotation set
> (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`).
> `input_examples` are attached to complex tools and rendered into the tool
> description at registration time so Anthropic clients, Glama, and LLMs all
> see them. The goal: lift Glama's automated tool ratings out of C-grade and
> give LLMs a cleaner mental model of the vault.

### Breaking — namespace changes

- **`mermaid.*` removed.** Mermaid blocks are now handled by the new
  `blocks.*` namespace. Same domain behaviour, different tool names.
- **`stats.note` removed.** Use `notes.read` with `include: ['stats']`.

### Breaking — tool renames & merges

| Removed | Replacement | Notes |
| --- | --- | --- |
| `notes.info` | `notes.read` with `include: ['metadata']` | Single read tool with `include` array |
| `stats.note` | `notes.read` with `include: ['stats']` | |
| `notes.update`, `notes.append`, `notes.insertAfterHeading`, `notes.insertAfterBlock` | `notes.edit` with `mode` discriminated union | Modes: `replace`, `append`, `prepend`, `after-heading`, `after-block`. `prepend` is new. |
| `notes.createFolder` | `notes.create` with `kind: 'folder'` | |
| `notes.moveFolder` | `notes.move` with `kind: 'folder'` | `from`/`to` replace `sourcePath`/`destinationPath`. |
| `notes.listFolders`, `notes.searchByDate` | `notes.list` with `include` and `since`/`until`/`dateField` | |
| `notes.updateFrontmatter` | `notes.frontmatter` | Now supports `set`, `unset`, and `strategy: 'merge' \| 'replace'`. |
| `tags.add`, `tags.remove`, `tags.update` | `tags.modify` with `op: 'add' \| 'remove' \| 'replace' \| 'merge'` | |
| `kanban.addCard`, `kanban.moveCard`, `kanban.toggleCard` | `kanban.card` with `op: 'add' \| 'move' \| 'toggle'` | Zod discriminated union. |
| `canvas.addNode`, `canvas.addEdge`, `canvas.removeNode` | `canvas.edit` with `op: 'add-node' \| 'add-edge' \| 'remove-node'` | |
| `marp.deck.read`, `marp.slides.list`, `marp.slides.read` | `marp.read` with `part: 'deck' \| 'slides' \| 'slide'` | |
| `marp.slides.update`, `marp.frontmatter.update` | `marp.update` with `part: 'slide' \| 'frontmatter'` | |
| `templates.expand`, `templates.createNote`, `templates.renderTemplater`, `templates.createNoteTemplater`, `templates.insertTemplater` | `templates.use` with `engine × action` discriminated union | `engine: 'filesystem' \| 'templater'`; actions: `render`, `create-note`, `insert-active` (templater only). |
| `dataview.query.read`, `dataview.query.update`, `dataview.js.read`, `dataview.js.update`, `mermaid.blocks.list`, `mermaid.blocks.read`, `mermaid.blocks.update` | `blocks.list`, `blocks.read`, `blocks.update` with `language: 'dataview' \| 'dataviewjs' \| 'mermaid'` | Unified fenced-block API. |
| `dataview.fields.extract`, `dataview.fields.search` | `dataview.fields.read` with `op: 'extract' \| 'search'` | |
| `dataview.fields.add`, `dataview.fields.remove` | `dataview.fields.write` with `op: 'add' \| 'remove'` | |
| `dataview.index.read` | `dataview.index` | Shortened. |
| `workspace.navigateBack`, `workspace.navigateForward` | `workspace.navigate` with `direction: 'back' \| 'forward'` | |
| `commands.search`, `commands.list` | `commands.list` with optional `query` | Omit `query` for full list; supply substring to search. |

### Changed

- **Every tool description is now a 3–5 sentence paragraph** covering the
  action, when-to-use, constraints, return shape, and safety/limitations —
  per Anthropic's ["Providing extremely detailed descriptions is the most
  critical factor for tool performance"](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools).
- **Annotation constants expanded** to always set all four MCP 2025-11-25
  hints explicitly, preventing default-leak issues (`readOnlyHint=false`,
  `destructiveHint=true`, `idempotentHint=false`, `openWorldHint=true` are
  the defaults — nearly always wrong for us). New named constants:
  `ADDITIVE`, `ADDITIVE_OPEN_WORLD`, `IDEMPOTENT_ADDITIVE`, `DESTRUCTIVE`.
  Legacy names (`IDEMPOTENT`, `READ_ONLY_IDEMPOTENT`, `OPEN_WORLD`) kept as
  aliases during migration.
- **Per-namespace Zod schemas** live in `src/schema/<namespace>.ts` —
  every field carries `.describe()`, every argument object uses `.strict()`
  (emits JSON Schema `additionalProperties: false`).
- **`input_examples`** are now a first-class `ToolDefinition` field,
  rendered into the registered tool description. Attached on complex tools:
  `notes.create`, `notes.edit`, `notes.frontmatter`, `tags.modify`,
  `kanban.card`, `canvas.edit`, `marp.update`, `templates.use`,
  `dataview.fields.write`, `blocks.update`, `tasks.create`.

### Migration examples

```diff
- notes.append { filePath: "foo.md", content: "..." }
+ notes.edit   { mode: "append", path: "foo.md", content: "..." }

- tags.add { path: "foo.md", tags: ["x"] }
+ tags.modify { path: "foo.md", op: "add", tags: ["x"] }

- mermaid.blocks.update { filePath, source, index }
+ blocks.update { filePath, source, index, language: "mermaid" }

- dataview.query.update { filePath, source, blockId }
+ blocks.update { filePath, source, blockId, language: "dataview" }

- templates.createNote { templatePath, targetPath, variables }
+ templates.use {
+   engine: "filesystem", action: "create-note",
+   templatePath, targetPath, variables
+ }
```

## [0.2.1] — 2026-04-23

### Fixed

- **`dataview.query` / `dataview.listByTag` / `dataview.listByFolder` —
  400 on LIST queries.** The Obsidian Local REST API `/search/`
  endpoint only accepts DQL `TABLE` queries; `LIST`, `TASK`, and
  `CALENDAR` are rejected with HTTP 400 regardless of `FROM` / `WHERE`
  shape. `listNotesByTagDql` / `listNotesByFolderDql` now build
  `TABLE file.name FROM …` instead of `LIST FROM …`, returning the
  same per-note result set. The raw `dataview.query` validator was
  narrowed from `/^(LIST|TABLE|TASK|CALENDAR)\b/` to `/^TABLE\b/` with
  a clear error: *"Obsidian Local REST API /search/ only accepts DQL
  TABLE queries. Use dataview.table, or rewrite LIST/TASK/CALENDAR
  queries as TABLE."*
- **`dataview.fields.remove` — missing `summary` tripped
  `mutationResultSchema`.** Both the no-op branch (no matching field)
  and the success branch now return a `summary` string, matching
  `dataview.fields.add` and satisfying the Zod envelope on the server
  tool's declared `outputSchema`.
- **`workspace.closeActiveFile` — 404.** The command id was
  `app:close-active-file`, which doesn't exist in Obsidian. Changed to
  `workspace:close`.
- **Transport-level flakiness on rapid bursts (e.g. `workspace.openFile`
  right after `notes.create`).** `ObsidianApiClient` now retries once
  (150 ms delay) on `fetch`-level throws — connection resets, TLS
  aborts — while still surfacing `AbortError` timeouts and HTTP
  4xx/5xx immediately without retry.
- **Templater tools (`templates.renderTemplater`,
  `templates.createNoteTemplater`, `templates.insertTemplater`) —
  opaque 404 when the Templater plugin is absent.** 404 from
  `/templater/execute/` or the Templater command id is now translated
  to a clear `unavailable` error: *"Templater plugin is not installed
  or enabled in this vault. Install 'Templater' from Community Plugins
  to use this tool."*
- **`templates.list` — `not_found` with no args when the default
  `Templates/` folder doesn't exist.** With no explicit
  `templateFolder`, the tool now returns an empty list. An
  explicitly-passed-but-missing folder still throws `not_found`.

### Added

- **`canvas.create` tool.** Creates a new empty Obsidian canvas
  (`.canvas`) file. Refuses an existing file unless `overwrite: true`.
  `notes.create` still rejects non-markdown paths (it uses
  `notePathSchema`); the new tool uses a dedicated `canvasPathSchema`
  that refines on `.canvas`.

### Changed

- **`ObsidianApiClient` error messages now include a ≤2 KB snippet of
  the response body on non-2xx.** Previously the error was just
  `Obsidian API request failed: 400 /search/` with no context. Now the
  server's actual complaint is appended, which is what surfaced the
  DQL-`TABLE`-only limitation above.

## [0.2.0] — 2026-04-23

### Fixed

- **Live-Obsidian tools now work under Node** (`workspace.*`,
  `commands.*`, and every other call through the Local REST API
  plugin). The previous client passed `tls: { rejectUnauthorized:
  false }` on `RequestInit`, which is a Bun-only fetch extension —
  Node's fetch (undici) silently ignored it, so the plugin's
  self-signed cert was rejected and every request failed with a
  generic `unavailable: Unable to reach Obsidian API at
  https://127.0.0.1:27124`. The client now branches on runtime: Bun
  keeps the `tls` RequestInit key; Node uses an explicit `undici`
  `Agent` dispatcher with `rejectUnauthorized: false`. The
  `unavailable` error now also includes the underlying fetch error
  code (e.g. `SELF_SIGNED_CERT_IN_CHAIN`, `ECONNREFUSED`) so future
  misdiagnoses are a one-line grep.

### Added

- **Update check on startup.** On every spawn, `stdio` and `http`
  entrypoints fire a non-blocking, 3-second-budget fetch against
  `https://registry.npmjs.org/kobsidian-mcp/latest`. If a newer
  version is published, a single line is written to **stderr** (which
  Claude Code / Cursor / Antigravity capture into their MCP server
  logs). Errors are swallowed. Disable with
  `KOBSIDIAN_DISABLE_UPDATE_CHECK=1`.
- **`system.version` MCP tool** — returns `{ name, version, runtime,
  runtimeVersion }` so clients can introspect which build is actually
  running without parsing the MCP handshake payload.
- **Obsidian plugins section in README** with per-plugin setup: Local
  REST API (required for `workspace.*` / `commands.*` / runtime DQL
  / Templater tools — includes key generation + env var mapping),
  plus enhancement plugins (Dataview, Templater, Marp, Kanban, Tasks)
  with `obsidian://show-plugin?id=…` deep-links. A TLDR table clarifies
  which plugin combinations unlock which tool namespaces.

### Changed

- **MCP handshake version is now sourced from `package.json`** instead
  of a hardcoded `3.0.0` literal in `src/server/create-server.ts`.
  Handshake and npm now agree.
- **`undici` added as a direct dependency** (`^6.21.0`) so the Node
  TLS path can use `Agent` without relying on Node internals.
- **MCP config example** now includes `"type": "stdio"` (required by
  Claude Desktop / Cursor / VSCode / Antigravity; optional on Claude
  Code which infers transport) and `OBSIDIAN_API_VERIFY_TLS: "false"`
  so the example matches what users actually need to paste for the
  Local-REST-API self-signed cert flow.
- **Bun badge** bumped `1.2+` → `1.3+` (Bun 1.3.13 is current;
  `engines.bun` in `package.json` stays at the working floor of
  `1.2.15` so existing Bun 1.2.x users aren't broken).
- **Client list** updated: Windsurf → **Antigravity** (Google's AI
  IDE, successor to Windsurf as of March 2026).

## [0.1.2] — 2026-04-23

Release-body + badge work. No source or tool-surface changes; this
release exists to exercise the full CI pipeline with the VT verdict
table and live badge now on `main`.

### Added

- **Per-file VirusTotal verdicts in the release body** — every
  `.mcpb` bundle now shows as a row in a markdown table with
  verdict (✅ Clean / ⚠ N malicious / ⚠ N suspicious), engines
  clean / total, a link to the permanent
  `https://www.virustotal.com/gui/file/<sha256>` report, and the
  truncated SHA-256. Full SHA-256 list in a collapsible
  `<details>` block for byte-level verification.
- **Hard gate**: the workflow fails (`exit 1`) if any bundle has
  `malicious > 0`, blocking `npm-publish` (which `needs: [virustotal]`).
- **Live VirusTotal shields.io endpoint badge** —
  `.github/badges/virustotal.json` is updated by CI after every
  release via the GitHub Contents API. Badge flips between
  `clean · N/N bundles · vX.Y.Z`, `suspicious ⚠`, and
  `malicious detection ⚠` with matching colors. Clicking opens the
  latest release with the full verdict table.

### Changed

- **README badges** — dropped the premature `npm downloads` badge
  (the package was brand-new) and added a GitHub-release version
  badge alongside npm-version for quick release discovery.
- **`CI` label** on the Actions workflow badge (was `release`) to
  disambiguate from the new GitHub-release badge.

### Fixed

- **Release-body VT links were temporary** — the VT action emitted
  `/gui/file-analysis/<id>/detection` URLs that 404 with "The page
  you navigated to does not exist" once analysis completes. All
  links now point at the permanent hash-based report page.
- **`update_release_body: true` was a silent no-op on `push: tags`
  triggers** — the action only fires on `release: published`. Now
  bypassed by writing the body ourselves via `gh release edit
  --notes-file`.

## [0.1.1] — 2026-04-23

CI pipeline hardening + action upgrades. No source or tool-surface
changes from 0.1.0 — this release exists to verify the full release
pipeline (all 5 `.mcpb` cross-platform bundles, VirusTotal scan
attached to the release body, npm Trusted Publishing) end-to-end.

### Changed

- **`actions/upload-artifact` v5 → v7** — native Node 24, silences the
  Node 20 deprecation warning.
- **`actions/download-artifact` v5 → v8** — same reason, and the v8
  default path handling avoided the nested `release/release/*.mcpb`
  quirk that had made VT's glob miss files in 0.1.0.
- **`softprops/action-gh-release` v2 → v3**.

### Fixed

- **VirusTotal `files:` pattern** — the action's input goes through
  `glob.sync()`, not a regex engine. The previous
  `release/.*\.mcpb$` pattern matched zero files. Switched to a real
  glob `release/*.mcpb`.
- **VT-as-no-op silently succeeded** — the workflow now explicitly
  fails when `ghaction-virustotal` emits an empty `analysis` output,
  so a mis-configured scan never ships unnoticed.
- **`npm-publish` is now idempotent** — re-tagging an already-
  published version no longer fails the workflow. The publish step
  probes `npm view kobsidian-mcp@<version>` first and exits cleanly
  if the version already exists on npm.

[Unreleased]: https://github.com/bezata/kObsidian/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/bezata/kObsidian/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/bezata/kObsidian/compare/v0.1.0...v0.1.1

## [0.1.0] — 2026-04-23

Initial public release. kObsidian lands on npm as `kobsidian-mcp@0.1.0`
with cross-platform `.mcpb` bundles attached to the GitHub release, a
`server.json` for the MCP Registry, and a `smithery.yaml` for the
Smithery catalog.

### Runtime

- Bun + strict TypeScript ESM, `@modelcontextprotocol/sdk@1.29.0`,
  Zod v4, Hono (for Streamable HTTP).
- MCP protocol version `2025-11-25` with `2025-03-26` fallback when
  the HTTP header is absent; present-but-unsupported versions return
  400 JSON-RPC errors.
- Both transports: stdio (Node-target build with shebang — works with
  `npx -y kobsidian-mcp` on any Node 20+ runtime) and Streamable HTTP
  (Hono on `Bun.serve`) with CORS preflight, origin 403, and optional
  bearer auth.

### Tool surface

- **90 MCP tools** across 12 namespaces: `notes.*` (16), `tags.*` (6),
  `links.*` (8), `stats.*` (2), `tasks.*` (5), `dataview.*` (13),
  `mermaid.*` (3), `marp.*` (5), `kanban.*` (5), `templates.*` +
  `canvas.*` (10), `workspace.*` + `commands.*` (9), `wiki.*` (7).
- **Client-safety annotations** on 80+ tools: 47 `readOnlyHint`,
  6 `destructiveHint`, 12 `idempotentHint`, 16 `openWorldHint`.
- Structured output on every tool via Zod `outputSchema` +
  `structuredContent` return.
- **MCP resources** — 3 static URIs
  (`kobsidian://wiki/{index,log,schema}`) and 1 template
  (`kobsidian://wiki/page/{+path}`) whose list callback enumerates
  every Sources / Concepts / Entities page, including nested
  subfolders.
- **MCP prompts** — `ingest-source`, `answer-from-wiki`,
  `health-check-wiki` for clients that don't consume the `skills/`
  files.

### LLM Wiki layer (the headline feature)

Implements [Andrej Karpathy's **LLM Wiki**](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
idea — a persistent, compounding knowledge base the LLM maintains for
you.

- **7 `wiki.*` tools**: `init`, `ingest`, `logAppend`, `indexRebuild`,
  `query`, `lint`, `summaryMerge`.
- **Canonical Zod frontmatter contracts** for source / concept / entity
  pages (`src/schema/wiki.ts`).
- **The `proposedEdits` contract** — `wiki.ingest` creates exactly one
  file (the Sources page) and appends one file (`log.md`), then
  returns a `proposedEdits` array the agent applies via existing
  `notes.*` tools. Every cross-reference write is visible in the
  transcript.
- **Greppable log** — `## [YYYY-MM-DD] <op> | <title>` format lets
  `grep '^## \[' wiki/log.md | tail -5` work as a recent-activity
  query.
- **Recursive category walks** — `wiki/Sources/papers/nested.md` and
  any subfolder structure appears in index rebuild, query, lint, and
  the resource template.
- **9 `KOBSIDIAN_WIKI_*` env vars** for folder names, index/log/schema
  filenames, and stale threshold. Every tool also accepts a per-call
  `wikiRoot` override.

### Claude Code skills

Four skills at `skills/` trigger on natural language:
`wiki-bootstrap`, `wiki-ingest`, `wiki-query`, `wiki-lint`.

### Distribution

- **npm**: `kobsidian-mcp` — Node-target build with
  `#!/usr/bin/env node` shebang, `files` allowlist limited to `dist/`
  + manifests + README + CHANGELOG + LICENSE, `prepublishOnly`
  runs typecheck + lint + test + build.
- **.mcpb** (Claude Desktop drag-and-drop) — cross-platform binaries
  compiled with `bun build --compile` for darwin × {x64, arm64},
  linux × {x64, arm64}, and windows-x64; packaged with a minimal
  zero-dep ZIP writer (`scripts/make-mcpb.mjs`).
- **MCP Registry** — `server.json` at repo root with
  `io.github.bezata/kobsidian-mcp` identifier, stdio transport, and
  the three OBSIDIAN\_\* env-var contract.
- **Smithery** — `smithery.yaml` declaring stdio transport + 3-field
  `configSchema` so Smithery generates the install UI automatically.

### Release pipeline (`.github/workflows/release.yml`)

- Matrix build of 5 cross-platform `kobsidian` binaries, each wrapped
  into a `.mcpb` bundle and attached to the GitHub release.
- **npm Trusted Publishing (OIDC)** — no long-lived `NPM_TOKEN`
  stored in the repo. GitHub Actions mints a short-lived OIDC token
  and the npm CLI exchanges it for a one-time publish token scoped
  to this exact workflow file. Provenance attestations are automatic.
- **VirusTotal scan** via
  [`crazy-max/ghaction-virustotal@v4`](https://github.com/crazy-max/ghaction-virustotal)
  on every `.mcpb` asset. `npm-publish` waits for the scan to
  succeed — if VirusTotal ever flags a real detection, the package
  doesn't go to npm.
- Pinned to `actions/checkout@v6`, `actions/setup-node@v6`, Node 24.

### Security

- Origin allowlist + 403 on mismatch (prevents DNS-rebinding from
  non-whitelisted web pages), CORS preflight on `OPTIONS /mcp`,
  optional bearer auth, `MCP-Protocol-Version` validation.
- SDK floor mitigates `CVE-2026-0621` (UriTemplate ReDoS) and
  `GHSA-345p-7cg4-v4c7` (cross-client response leak).
- Every `.mcpb` release asset gets a public VirusTotal analysis link
  in the release body — install-time trust without trusting the
  maintainer.

### Docs

- **`README.md`** — centered hero with badges, ASCII architecture
  diagram, LLM-wiki loop diagram, 4 install tabs, 3 concrete example
  flows (personal research wiki · engineering ADRs · codebase wiki),
  full env-var reference.
- **`docs/`** — `architecture.md`, `wiki.md`, `examples.md`,
  `tools.md`, `SECURITY.md`, plus `TESTING.md`, `ENVIRONMENT.md`,
  `MIGRATION.md`.

### Tests

- 14 Vitest files, 56 tests: domain modules, wiki flows, HTTP
  compliance (CORS preflight / protocol version / origin 403),
  resource + prompt integration, full stdio E2E.

[0.1.0]: https://github.com/bezata/kObsidian/releases/tag/v0.1.0
