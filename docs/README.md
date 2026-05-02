# kObsidian Documentation

Deeper reading, grouped by what you want to do.

## Translations

- **简体中文:** [i18n/zh-CN/README.md](i18n/zh-CN/README.md)
- **日本語:** [i18n/ja/README.md](i18n/ja/README.md)
- **한국어:** [i18n/ko/README.md](i18n/ko/README.md)

## Workspaces (multi-vault)

- **[WORKSPACES.md](WORKSPACES.md)** — the only Obsidian MCP with in-session
  vault switching (`vault.list` / `vault.select` / …). Discovery sources,
  precedence chain, security gating, HTTP caveats.

## Architecture

- **[architecture.md](architecture.md)** — the request → tools → domain → vault
  pipeline, module responsibility map, LLM-Wiki loop diagram.

## LLM Wiki

- **[wiki.md](wiki.md)** — what the wiki layer is, why the `proposedEdits`
  contract exists, log format, lint categories, how a typical session flows.
- **[examples.md](examples.md)** — three worked examples end-to-end:
  personal research wiki, engineering ADR archive, codebase knowledge
  base (design docs + RFCs + post-mortems).

## Tools, resources, prompts

- **[tools.md](tools.md)** — 62 tools grouped by namespace, annotation
  summary, pointer to the generated [`tool-inventory.json`](tool-inventory.json).

## Security

- **[SECURITY.md](SECURITY.md)** — Origin / CORS, bearer auth, VirusTotal
  scan links on each release, env-var hygiene.

## Operational

- **[TESTING.md](TESTING.md)** — local checks (`typecheck`, `test`, `lint`,
  `build`, `inventory`), coverage areas.
- **[ENVIRONMENT.md](ENVIRONMENT.md)** — every env var (OBSIDIAN_*,
  KOBSIDIAN_HTTP_*, KOBSIDIAN_WIKI_*) with defaults and when they matter.
- **[MIGRATION.md](MIGRATION.md)** — upgrade notes from earlier versions
  (tool-name renames, etc.).

---

New contributor? Read in this order: [architecture](architecture.md) →
[wiki](wiki.md) → [examples](examples.md) → [tools](tools.md) →
[TESTING](TESTING.md).
