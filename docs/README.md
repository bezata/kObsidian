# kObsidian Documentation

Deeper reading, grouped by what you want to do.

## Architecture

- **[architecture.md](architecture.md)** — the request → tools → domain → vault
  pipeline, module responsibility map, LLM-Wiki loop diagram.

## LLM Wiki

- **[wiki.md](wiki.md)** — what the wiki layer is, why the `proposedEdits`
  contract exists, log format, lint categories, how a typical session flows.

## Tools, resources, prompts

- **[tools.md](tools.md)** — 90 tools grouped by namespace, annotation
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
[wiki](wiki.md) → [tools](tools.md) → [TESTING](TESTING.md).
