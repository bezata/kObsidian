# Security

kObsidian is a **local** MCP server that reads and writes your Obsidian
vault. Treat it like any other CLI tool that has filesystem access: run
it from trusted sources, and keep secrets out of repos.

## Transport-level protections

### stdio

No network surface. Process is launched by the MCP client directly,
inherits env vars, reads JSON-RPC from stdin and writes to stdout.
`console.error` is used for diagnostics (stdout is reserved for framing).

### Streamable HTTP (Hono)

- **Origin check** — `KOBSIDIAN_ALLOWED_ORIGINS` is an allowlist. Any
  request with a present-but-disallowed `Origin` header gets **403**
  immediately. This blocks DNS-rebinding attacks from arbitrary web
  pages.
- **CORS preflight** — `OPTIONS /mcp` returns 204 + full `Access-Control-*`
  headers for allowed origins, 403 otherwise. `Access-Control-Allow-Origin`
  is also echoed on every successful POST.
- **Bearer auth** — if `KOBSIDIAN_HTTP_BEARER_TOKEN` is set, requests
  without `Authorization: Bearer …` get **401**. If it's unset, HTTP is
  open to anyone on the allowed origins (intended for local-only
  deployments).
- **MCP-Protocol-Version** — header is validated. Missing → spec
  fallback to `2025-03-26`. Present and unsupported → **400** with a
  JSON-RPC error message listing supported versions
  (2024-11-05 / 2025-03-26 / 2025-06-18 / 2025-11-25).

## Supply-chain hygiene

### VirusTotal scan on every release

The `Release` workflow uploads each `kobsidian-<platform>.mcpb` bundle
to VirusTotal via
[`crazy-max/ghaction-virustotal@v4`](https://github.com/crazy-max/ghaction-virustotal)
and appends the analysis links to the GitHub release body. Any user
installing from a GitHub release can click through to the public
VirusTotal report for their platform's bundle before running it.

### npm Trusted Publishing (OIDC)

Releases to npm use **Trusted Publishing** — no long-lived `NPM_TOKEN`
secret is stored in this repo. On every tag push, GitHub Actions mints
a short-lived OIDC token (`id-token: write`) and the npm CLI exchanges
it for a one-time publish token scoped to exactly this workflow.
Provenance attestations are automatic.

The trust relationship is established once with:

```bash
# run locally in the repo, authenticated with your npm web session
npm trust github --file .github/workflows/release.yml --repo bezata/kObsidian
```

This records "npm publishes of `kobsidian-mcp` coming from
`bezata/kObsidian` via `.github/workflows/release.yml` are trusted."
Any other fork, branch, or workflow file cannot publish — the OIDC
audience claim won't match.

### Pinned SDK version

`@modelcontextprotocol/sdk` is pinned at `1.29.0` in the `dependencies`
block — above the `1.26.0` floor that addresses:

- `CVE-2026-0621` — UriTemplate ReDoS
- `GHSA-345p-7cg4-v4c7` — cross-client response leak

### Biome + TypeScript strict

`bun run lint` runs Biome on every commit (local hook + CI). TypeScript
`strict: true` is enforced; `bun run typecheck` is green before `npm
publish` (via `prepublishOnly`).

## Env-var hygiene

These env vars are **sensitive** — never commit them:

- `OBSIDIAN_REST_API_KEY` — bearer key for the Obsidian Local REST API
  plugin.
- `KOBSIDIAN_HTTP_BEARER_TOKEN` — your own chosen bearer token for the
  Streamable HTTP transport.

`.env` and `.env.*` are in `.gitignore`. Keep them out of the vault
itself too — never put a vault directory inside a repo without
`.gitignore` already covering secrets.

## MCP-specific notes

### Tool annotations are hints, not security boundaries

`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
are advisory. The server enforces its own checks (e.g.,
`assertVaultRelativePath` for every path argument) — annotations are
for clients to improve UX, not for access control.

### `wiki.ingest` never writes cross-references blindly

The `proposedEdits` return contract means agents don't silently touch
10+ files during an ingest. Every cross-reference edit goes through a
visible `notes.*` call. This is by design — see
[wiki.md#the-proposededits-contract](wiki.md#the-proposededits-contract-the-key-design-decision).

### Tool poisoning / shadowing

Descriptions, titles, and annotations come from this repo's source —
not from external servers. If you use a multi-server MCP gateway in
front of kObsidian, pin the kObsidian tool schemas on approval; never
trust descriptions that change between sessions.

## Reporting a vulnerability

Open a private security advisory on the repo:
<https://github.com/bezata/kObsidian/security/advisories/new>.

If that's not an option, email the maintainer at
<behzatcnacle@gmail.com> with "kObsidian security" in the subject.
