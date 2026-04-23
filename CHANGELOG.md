# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/bezata/kObsidian/compare/v0.1.1...HEAD
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
