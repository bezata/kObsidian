# Workspaces — multi-vault for Obsidian MCP

> **The only Obsidian MCP server that lets an LLM discover and switch
> between your Obsidian vaults in-session.** No restart, no config edit,
> no per-tool `vaultPath` threading. Added in v0.3.0.

---

## Why this matters

Other Obsidian MCP servers are hard-wired to a single vault path at
startup. If you have a "Work" vault and a "Personal" vault, you either
run two server processes, restart one with a different env var, or
manually thread absolute paths through every tool call.

kObsidian's **`vault.*` namespace** closes that gap:

- `vault.list` — enumerate every vault kObsidian can see
- `vault.current` — show which vault the next filesystem tool will hit
- `vault.select` — switch the active vault for the rest of the session
- `vault.reset` — go back to the default

Every existing filesystem tool (`notes.*`, `tags.*`, `dataview.*`,
`blocks.*`, `canvas.*`, `kanban.*`, `marp.*`, `templates.*`, `tasks.*`,
`links.*`, `wiki.*`, `stats.vault`) transparently respects the
selection. No migration. No breaking changes.

---

## 60-second tour (from the LLM's side)

```
You:  "Switch to my Work vault and show me this week's journal entries."

LLM:  vault.list {}
      → { items: [
          { id: "default",           name: "Personal",  isActive: true,  source: "env-default" },
          { id: "env:work",          name: "work",      isActive: false, source: "env-named" },
          { id: "58f115bd2c2febd2",  name: "Archive",   isActive: false, source: "obsidian-app",
            lastOpened: "2026-04-21T18:09:13.677Z" },
        ] }

      vault.select { name: "work" }
      → { changed: true, active: { name: "work", path: "/Users/me/Work" } }

      notes.list { since: "2026-04-19" }
      → (now hits /Users/me/Work, not /Users/me/Personal)
```

From here on every filesystem tool resolves to the Work vault until you
`vault.reset` or restart the server. `workspace.*` and `commands.*`
tools still bridge to whichever vault the live Obsidian process has
open (they're tied to the Local REST API, not the filesystem
selection) — `vault.current` surfaces that distinction in its
`obsidianLiveInstance` field.

---

## How kObsidian discovers vaults

Three sources, merged + deduplicated by canonical path:

| Source | Status | How to enable |
|---|---|---|
| `OBSIDIAN_VAULT_PATH` | **Documented, stable** — the default, unchanged since v0.1. | Set the env var. |
| `OBSIDIAN_VAULT_<NAME>=path` | **Documented, stable** — new in v0.3.0. Any number of named extras. Suffix lowercases to the vault name. | `OBSIDIAN_VAULT_WORK=/Users/me/Work`, `OBSIDIAN_VAULT_PERSONAL=/Users/me/Personal`, etc. |
| `obsidian.json` | **EXPERIMENTAL** — parses Obsidian's own vault registry. Zero config: if you've opened a vault in Obsidian, kObsidian can see it. The file format is internal to Obsidian and undocumented; stable in practice since v1.0 but could change without notice. | `KOBSIDIAN_VAULT_DISCOVERY=on` (default). Set `off` to opt out entirely. |

**If you want zero dependency on Obsidian internals** — just use the
env-var sources and set `KOBSIDIAN_VAULT_DISCOVERY=off`. Your
configuration is then fully documented and predictable.

### `obsidian.json` paths per OS

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/obsidian/obsidian.json` |
| Windows | `%APPDATA%\obsidian\obsidian.json` |
| Linux (native) | `$XDG_CONFIG_HOME/obsidian/obsidian.json` → `~/.config/obsidian/obsidian.json` |
| Linux (Flatpak) | `~/.var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json` |
| Linux (Snap) | `~/snap/obsidian/current/.config/obsidian/obsidian.json` |
| Portable / WSL | Set `KOBSIDIAN_OBSIDIAN_CONFIG=/absolute/path/obsidian.json` |

Parse failures are surfaced via `vault.list`'s `obsidianConfigError`
response field. They never crash the server.

---

## Precedence chain

```
requireVaultPath(context, args.vaultPath):
    args.vaultPath                        // per-call override — highest
    ?? context.session.activeVault?.path  // set by vault.select (new in v0.3.0)
    ?? context.env.OBSIDIAN_VAULT_PATH    // startup default — unchanged
    ?? throw AppError("invalid_argument")
```

The v0.3.0 change is strictly additive. If you never call
`vault.select`, the middle slot is empty and the chain collapses to
v0.2.5's `arg > env > error` exactly.

**Explicit per-call `vaultPath` always wins.** If you pass `vaultPath`
to a tool, it beats the session selection every time. This lets you
script batch operations that touch multiple vaults without having to
`select` / `reset` around each call.

---

## Security / operator gating

When you give an LLM multi-vault powers, you might want to bound what
it can see or switch to:

| Var | Effect |
|---|---|
| `KOBSIDIAN_VAULT_ALLOW=Work,Personal` | Allowlist — names or absolute paths, comma-separated. Non-matching vaults are filtered out of `vault.list` entirely and rejected by `vault.select` with `unauthorized`. |
| `KOBSIDIAN_VAULT_DENY=secrets,/Users/me/Archive/Medical` | Denylist — applied after the allowlist. Useful for hiding sensitive vaults even if they're in Obsidian's registry. |
| `KOBSIDIAN_VAULT_DISCOVERY=off` | Hard-disable `obsidian.json` parsing. Only env-var-configured vaults will appear. |

**`OBSIDIAN_VAULT_PATH` is never filtered by allow/deny.** The
operator's blessed default always stays reachable — otherwise a typo
in a deny rule could lock your own server out of the vault it's
supposed to run against.

`vault.select` distinguishes two error classes for clean UX:

- **`not_found`** — the vault doesn't exist (bad `id`/`name`/`path`, or missing from the registry).
- **`unauthorized`** — the vault exists but is blocked by operator gating.

---

## HTTP transport caveat

The current HTTP transport shares one `DomainContext` across concurrent
clients, so a session-active vault selected by one client is visible to
all others. In practice every kObsidian HTTP deployment today is
single-client (the Local REST API bridge binds to `127.0.0.1`), so this
is acceptable.

If you run a multi-client HTTP setup and want strict isolation, pass
`vaultPath` on every tool call and skip `vault.select`. Per-
`Mcp-Session-Id` scoping is on the roadmap for a future v0.3.x.

---

## Related docs

- [`../CHANGELOG.md`](../CHANGELOG.md) — v0.3.0 release notes
- [`ENVIRONMENT.md`](ENVIRONMENT.md) — full env-var reference
- [`MIGRATION.md`](MIGRATION.md) — upgrading from v0.2.5
- [`tools.md`](tools.md) — complete tool surface (66 tools, 16 namespaces)
