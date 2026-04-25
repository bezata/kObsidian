# kObsidian — TODO / Roadmap

## Motivation

I built kObsidian for myself first. I needed an MCP server for my Obsidian
vaults that wouldn't lock me into one client, wouldn't require Obsidian
to be running for routine reads, and wouldn't bury my notes behind a
vendor's proprietary sync. Once it worked, I figured the same shape
would help anyone else running an Obsidian-first knowledge stack — so
I'm contributing it back to the open-source community.

This file is the public version of my own backlog. Items move from
here into a tagged release once they're shipped, then get pruned. The
CHANGELOG is the source of truth for what's done; this file is
forward-looking only.

## Roadmap

### v0.4 — Obsidian LiveSync bridge

Free, end-to-end-encrypted vault sync via the community
[**Self-Hosted LiveSync**](https://github.com/vrtmrz/obsidian-livesync)
plugin (`obsidian://show-plugin?id=obsidian-livesync`). LiveSync runs
on the user's own CouchDB / S3 / R2 / WebRTC peer, so the sync layer
is self-hostable with E2E encryption — no proprietary cloud, no
Obsidian Sync subscription. kObsidian will detect a LiveSync-enabled
vault and expose remote-vault tools so an MCP client can reach the
same Obsidian vault from any machine the user owns, via the API +
MCP, without the local Obsidian process being live.

- [ ] Detect LiveSync configuration in the vault (`.obsidian/plugins/obsidian-livesync/data.json`).
- [ ] Surface remote endpoints in `vault.list` with a new `livesync` source flag (alongside `env` / `obsidian-app` / `default`).
- [ ] New `vault.connectLiveSync` for session-time bring-up of a remote vault — wraps the LiveSync replication endpoint, never touches plaintext on the server side.
- [ ] E2E-encrypted read path through the LiveSync chunked store; writes deferred to v0.4.x.
- [ ] Docs: setup with CouchDB on fly.io / IBM Cloudant / Cloudflare R2 / WebRTC peer (mirroring LiveSync's own setup guide).

> Why LiveSync first: it's the only widely adopted Obsidian sync
> solution that is open-source, E2E-encrypted, AND self-hostable
> end-to-end — making it the right primitive to layer MCP on top of.
> Compatibility note: LiveSync explicitly does not co-exist with
> Obsidian Sync or iCloud; that constraint propagates here.

### v0.5 — Cross-semantic vault verification

A `wiki.crossCheck` (working name) tool that reconciles two or more
LiveSync-paired vaults at the **wiki layer**: same Source slugs across
vaults must point to compatible frontmatter, the canonical
`## [YYYY-MM-DD] <op> | <title>` log lines must replay deterministically,
and Concept / Entity pages must converge to the same wiki-link graph
modulo summary text.

The check uses the project's existing **semver discipline** as the
versioning system: every Source / Concept / Entity page gains a
`schema_version: 1` frontmatter field, and the cross-check refuses to
merge across incompatible majors. Bumping the schema major is the
same gate as bumping the package major.

- [ ] Add `schema_version` to canonical Source / Concept / Entity frontmatter (additive, defaults to `1`).
- [ ] `wiki.crossCheck` — diff one wiki tree against another, return divergences grouped by `{page, field, severity}`.
- [ ] Auto-replayable log merge: union of `## [YYYY-MM-DD]` entries, dedupe by `(op, title, date)`, preserve order.
- [ ] Conflict policy: `lastWriteWins` (default) and `manualResolve` (return `proposedEdits` for the agent to apply).
- [ ] Migration tool for pre-`schema_version` vaults — one-pass frontmatter rewrite gated behind an explicit `force:true`.

## Conventions

- Roadmap items follow project semver — anything tagged `vX.Y` lands in that version's CHANGELOG entry on release.
- Larger items get a tracking issue before implementation; this file points to the issue once it exists.
- Done items are removed (the CHANGELOG keeps them).
