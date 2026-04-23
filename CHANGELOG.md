# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **VirusTotal scan on release** — every `.mcpb` bundle attached to a
  GitHub release is scanned by
  [`crazy-max/ghaction-virustotal@v4`](https://github.com/crazy-max/ghaction-virustotal)
  and the analysis links are appended to the release body. Needs the
  `VT_API_KEY` secret set on the repo.
- **Restructured `docs/` directory** with an index
  ([`docs/README.md`](docs/README.md)) and five new guides:
  [`architecture.md`](docs/architecture.md),
  [`wiki.md`](docs/wiki.md),
  [`tools.md`](docs/tools.md),
  [`SECURITY.md`](docs/SECURITY.md), plus the moved-in
  [`TESTING.md`](docs/TESTING.md),
  [`ENVIRONMENT.md`](docs/ENVIRONMENT.md) (was `TEST_ENV_VARS.md`), and
  [`MIGRATION.md`](docs/MIGRATION.md).
- **README rewrite** with real badges (npm version / downloads / license
  / CI status / MCP protocol / Bun / TS / tool count / Smithery /
  Registry / VirusTotal), an ASCII architecture diagram, an LLM-Wiki
  loop diagram, install tabs for every channel, and a full env-var
  reference table.

### Changed

- **Docs moved out of root**: `MIGRATION.md`, `TESTING.md`,
  `TEST_ENV_VARS.md` now live under `docs/` (the last renamed to
  `ENVIRONMENT.md`).
- **`CLAUDE.md` collapsed to a 3-line pointer** to `AGENTS.md` (2026
  vendor-neutral convention) so there's one source of truth for agent
  conventions.
- **Stale `.claude/skills/` reference in `AGENTS.md`** updated to
  `skills/` (moved at repo root in an earlier slice).
- **Release workflow bumped to Node-24-compatible actions**:
  `actions/checkout@v5`, `actions/upload-artifact@v5`,
  `actions/download-artifact@v5`, `actions/setup-node@v5` (Node 24).
  Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"` at the workflow
  level as a safety net for any remaining Node-20-bundled actions
  ahead of GitHub's 2026-06-02 default flip.

## [3.1.0] — 2026-04-23

MCP compliance polish, LLM-Wiki layer, and a proper distribution story
(npm, cross-platform `.mcpb`, Smithery).

### Added

- **LLM Wiki orchestration** — new `wiki.*` namespace with 7 tools:
  - `wiki.init` — scaffold `wiki/{Sources,Concepts,Entities}/` plus
    `index.md`, `log.md`, `wiki-schema.md` (idempotent).
  - `wiki.ingest` — file a source, append a log entry, and return
    `proposedEdits` for the LLM to apply via `notes.*` tools (no blind
    cross-reference writes).
  - `wiki.logAppend` — greppable `## [YYYY-MM-DD] <op> | <title>` log
    entries with optional body + wikilink refs.
  - `wiki.indexRebuild` — regenerate `index.md` grouped by category;
    optional per-category counts.
  - `wiki.query` — rank wiki pages by filename / alias / tag / summary /
    body hits.
  - `wiki.lint` — orphans, broken links, stale sources, missing concept
    pages, tag singletons, and index parity.
  - `wiki.summaryMerge` — add a cited section to a concept/entity page
    (creates the page with canonical frontmatter if missing).
- **Zod frontmatter contracts** for `source` / `concept` / `entity`
  pages (`src/schema/wiki.ts`).
- **9 `KOBSIDIAN_WIKI_*` env vars** covering root, per-category folders,
  index/log/schema filenames, and stale threshold; every wiki tool also
  accepts a per-call `wikiRoot` override.
- **MCP resources** — 3 static URIs (`kobsidian://wiki/{index,log,schema}`)
  and 1 template (`kobsidian://wiki/page/{+path}`) whose list callback
  enumerates every wiki page so clients can browse without tool calls.
- **MCP prompts** — `ingest-source`, `answer-from-wiki`,
  `health-check-wiki` for clients that don't consume Claude Code skills.
- **Claude Code skills pack** at `skills/` — `wiki-bootstrap`,
  `wiki-ingest`, `wiki-query`, `wiki-lint`, each triggered by natural
  language.
- **Tool annotations** on 80 of 90 tools (47 `readOnlyHint`, 6
  `destructiveHint`, 12 `idempotentHint`, 16 `openWorldHint`). Clients
  can now auto-approve read-only calls and prompt more firmly on
  destructive ones. `ToolDefinition` gained an optional `annotations`
  field; `registerTool` passes them through; `docs/tool-inventory.json`
  surfaces them.
- **HTTP spec hardening** (`src/server/http-app.ts`):
  - `OPTIONS /mcp` preflight returns 204 + full CORS headers for
    allowed origins, 403 otherwise.
  - `MCP-Protocol-Version` header: missing → spec fallback to
    `2025-03-26`; present-but-unsupported → 400 with a JSON-RPC error.
  - CORS headers echoed on every POST response.
- **MCP Registry readiness** — `mcpName`, `mcp.protocolVersion` in
  `package.json`, plus a `server.json` manifest at repo root for
  `mcp-publisher publish`.
- **`.mcpb` Desktop Extension bundle** — `manifest.json` declaring
  vault / API URL / REST key as installer-prompted user config, and a
  zero-dep ZIP writer at `scripts/make-mcpb.mjs`.
- **GitHub Actions release workflow** — cross-compiles kObsidian
  binaries for darwin/linux × x64/arm64 and windows-x64, bundles each
  into a `kobsidian-<platform>.mcpb`, attaches them to the GitHub
  release on tag push, and publishes to npm when `NPM_TOKEN` is set.
- **Smithery config** at `smithery.yaml` — stdio transport + 3-field
  `configSchema` so Smithery generates the install UI.
- **npm-ready package** — removed `private: true`, added
  `publishConfig`, `keywords`, author/license/repo metadata, a `files`
  allowlist, and a `prepublishOnly` quality gate
  (typecheck + lint + test + build).
- **Node-target stdio build** with `#!/usr/bin/env node` banner so
  `npx -y kobsidian` works without Bun installed on the consumer.
- 8 new test files (`tests/wiki-*.test.ts`,
  `tests/server-resources-prompts.test.ts`,
  `tests/server-http-compliance.test.ts`) bringing the suite to 56
  tests.

### Changed

- **Recursive category walks** — `walkCategory` (index-rebuild.ts) and
  `listWikiPagesForCategory` (resources.ts) now use
  `walkMarkdownFiles`, so pages nested under
  `wiki/Sources/papers/foo.md` show up in indexing, querying, linting,
  and the `kobsidian://wiki/page/{+path}` resource template.
- **`proposedEditOperationSchema`** in `src/schema/wiki.ts` is the
  single source of truth for the
  `"createStub" | "insertAfterHeading" | "append"` union; the
  `ingest-source` prompt renders option names from
  `schema.options` instead of hand-written literals.
- **`buildWikiPageFrontmatter`** unifies the old
  `buildConceptFrontmatter` / `buildEntityFrontmatter` into one
  `pageType`-keyed builder.
- **Exported from `src/domain/links.ts`**: `collectNoteIndex`,
  `resolveIndexedLink`, `normalizeLinkTarget`, `NoteIndex` — reused by
  `wiki.lint` instead of duplicated.
- **Exported from `src/domain/smart-insert.ts`**: `escapeRegExp` —
  reused by `wiki.summaryMerge`.
- **Parallelized reads** in `wiki.query`, `wiki.lint`, and
  `wiki.indexRebuild` via `Promise.all` — ≈10–50× faster on moderate
  vaults.
- **Dynamic `import()` → static** in `wiki.ingest` for `appendLogEntry`.
- **`wikiRoot: "wiki"` default** lives under the vault, so the wiki is
  cleanly separable from existing notes.
- **`stdio` build now targets Node** (was Bun) for npm consumers; the
  `http` build stays on Bun for `Bun.serve` shorthand.
- **Skills moved** from `.claude/skills/` (gitignored) to `skills/` at
  repo root so they ship with the repo.

### Fixed

- **`wiki.ingest` URL-ref filter** — an inverted filter was silently
  discarding any `url` passed to the ingest log entry. Log now carries
  the URL inline; refs are just the source wikilink.
- **YAML dump of `undefined`** — `renderWithFrontmatter` strips
  undefined keys before handing to gray-matter / js-yaml.
- **Strict-equality dedup** in `wiki.summaryMerge` filters non-string
  entries out of `frontmatter.sources` before checking `.includes`.
- **Windows URL→path** in `scripts/make-mcpb.mjs` via `fileURLToPath`
  (was producing `C:\C:\Users\...` paths).
- **Biome lint respects `.claude/`** — added to `biome.json`
  `files.ignore` so local Claude Code state doesn't break CI.

### Security

- **Origin 403** retained on POST and extended to OPTIONS preflight,
  blocking DNS-rebinding attacks from unallowed origins.
- **`@modelcontextprotocol/sdk@1.29.0`** is comfortably above the
  `1.26.0` floor that addresses the cross-client response-leak
  advisory (GHSA-345p-7cg4-v4c7) and the UriTemplate ReDoS
  (CVE-2026-0621).

## [3.0.0] — 2026-04-23

### Added

- Initial TypeScript + Bun MCP server for Obsidian with 83 tools across
  `notes.*`, `tags.*`, `links.*`, `stats.*`, `tasks.*`, `dataview.*`,
  `mermaid.*`, `marp.*`, `kanban.*`, `templates.*`, `canvas.*`,
  `workspace.*`, `commands.*`.
- Stdio and Streamable HTTP (Hono) transports.
- Filesystem-first domain modules plus an optional REST bridge to the
  Obsidian Local REST API plugin for workspace/command actions.
- Zod v4 input and output schemas with `structuredContent` on every
  tool.
- Vitest fixture-based tests against a temp-vault helper.

[Unreleased]: https://github.com/bezata/kObsidian/compare/v3.1.0...HEAD
[3.1.0]: https://github.com/bezata/kObsidian/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/bezata/kObsidian/releases/tag/v3.0.0
