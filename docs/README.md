# kObsidian Documentation

Deeper reading, grouped by what you want to do.

## Translations

- **简体中文:** [i18n/zh-CN/README.md](i18n/zh-CN/README.md)
- **日本語:** [i18n/ja/README.md](i18n/ja/README.md)
- **한국어:** [i18n/ko/README.md](i18n/ko/README.md)

## Per-vault configuration (v0.3.7)

Create `.kobsidian.json` at the vault root to customize that vault's wiki. For example:

```json
{
  "wiki": {
    "root": "wiki",
    "sourcesDir": "Sources",
    "staleDays": 90,
    "headings": {
      "indexSources": "Sources"
    }
  }
}
```

You can also configure `conceptsDir`, `entitiesDir`, `indexFile`, `logFile`, `schemaFile`, and all five wiki headings. See the [configuration schema](kobsidian.config.schema.json) for every field. Precedence is per-call argument → vault config file → `KOBSIDIAN_WIKI_*` environment variables → built-in defaults. `KOBSIDIAN_VAULT_CONFIG_FILE` overrides the config file path; `vault.current` reports the effective configuration or its error. Changes are read on subsequent calls; malformed JSON and unknown keys produce explicit errors.

The file is optional, so existing vaults keep their defaults. Changing directory or filename settings does not move existing wiki content; align them with your vault layout. In v0.3.7, `notes.edit` with `after-heading` inserts at the top of the section, joins an existing list, and preserves spacing before paragraphs and headings. `after-heading` and `after-block` also avoid adding a second trailing newline.

## MCP client compatibility

Since v0.3.5, tool input and output schemas use **JSON Schema 2020-12** across
stdio and stateless Streamable HTTP. This fixes the draft-07 schema marker
that caused Claude Code to reject tool discovery in [issue #35](https://github.com/bezata/kObsidian/issues/35).

Since v0.3.6, union-shaped tools such as `notes.create` and `notes.edit`
advertise a flat object schema with visible fields and an `enum` selector,
instead of root-level `oneOf` / `anyOf`. This lets clients discover every
variant. The original Zod schemas still enforce variant-specific requirements
on calls and validate structured outputs.

Use v0.3.6 or later to get both fixes, then restart or reconnect your MCP
client so it refreshes the tool list. No vault migration or new environment
variable is required. Regression coverage includes schema shape checks and
real stdio / stateless HTTP round trips; see [TESTING.md](TESTING.md) and the
[release history](../CHANGELOG.md).

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
