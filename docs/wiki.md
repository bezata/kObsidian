# LLM Wiki

> The tedious part of maintaining a knowledge base is not the reading or the
> thinking — it's the bookkeeping. Humans abandon wikis because the maintenance
> burden grows faster than the value. LLMs don't get bored.

kObsidian layers a **persistent, compounding knowledge base** on top of the
vault primitives. You curate sources. The LLM does the cross-referencing, the
log-keeping, the indexing, and the lint.

## The three layers

```
┌────────────────────────────────────────────────────────────┐
│ 1. Raw sources (immutable to the LLM)                      │
│    Whatever you drop into the vault: Web-Clipper markdown, │
│    pasted notes, papers, transcripts. Lives anywhere.      │
└────────────────────┬───────────────────────────────────────┘
                     │ reads
                     ▼
┌────────────────────────────────────────────────────────────┐
│ 2. The wiki (LLM-maintained)                               │
│    wiki/Sources/    — per-source summary pages             │
│    wiki/Concepts/   — topic / idea pages                   │
│    wiki/Entities/   — people / places / orgs / works       │
│    wiki/index.md    — categorized catalog                  │
│    wiki/log.md      — chronological log                    │
│    wiki/wiki-schema.md — vault-local copy of this contract │
└────────────────────┬───────────────────────────────────────┘
                     │ reads; sometimes writes
                     ▼
┌────────────────────────────────────────────────────────────┐
│ 3. Schema (this file + wiki-schema.md inside each vault)   │
│    Contract the LLM follows to keep the wiki consistent.   │
└────────────────────────────────────────────────────────────┘
```

## The loop

```
          ┌─────────────────── user drops a source ───────────────────┐
          │                                                           │
          ▼                                                           │
   ┌──────────────┐   creates   ┌────────────────────────────┐        │
   │ wiki.ingest  │ ──────────► │ wiki/Sources/<slug>.md      │        │
   │              │             │ (canonical frontmatter +    │        │
   │              │ appends     │  TL;DR / Key Points skele-  │        │
   │              │ ──────────► │  ton + raw-source wikilink) │        │
   │              │             └─────────────────────────────┘        │
   │              │ appends                                            │
   │              │ ──────────► wiki/log.md                            │
   │              │                                                    │
   │              │ returns                                            │
   │              │ proposedEdits                                      │
   └──────┬───────┘                                                    │
          │                                                            │
          ▼                                                            │
   ┌────────────────────────────────────────────────────────────┐      │
   │  LLM applies each proposedEdit via existing notes.* tools  │      │
   │   • createStub         → notes.create                      │      │
   │   • insertAfterHeading → notes.insertAfterHeading          │      │
   │   • append             → notes.append                      │      │
   │  Updates concept/entity pages, adds index entry, …         │      │
   └────────────────────────────────────────────────────────────┘      │
                                                                       │
   Later — any of:                                                     │
   ┌────────────────────────────┐    ┌─────────────────────────────┐   │
   │ wiki.query "memex"         │    │ wiki.lint                   │   │
   │ → ranked top pages         │    │ → {orphans, brokenLinks,    │   │
   │ → notes.read on each       │    │    stale, missingPages,     │   │
   │ → synthesize with cita-    │    │    tagSingletons,           │   │
   │   tions, offer to file     │    │    indexMismatch}           │   │
   │   back via summaryMerge    │    │ → agent proposes fixes      │   │
   └────────────────────────────┘    └─────────────────────────────┘   │
                                                                       │
   ┌────────────────────────────────────────────────────────────────┐  │
   │ wiki.summaryMerge — add cited section to concept/entity page  │  │
   │   creates the page with canonical frontmatter if missing      │  │
   └────────────────────────────────────────────────────────────────┘  │
                                                                       │
   ┌────────────────────────────────────────────────────────────────┐  │
   │ wiki.indexRebuild — regenerate index.md grouped by category   │──┘
   └────────────────────────────────────────────────────────────────┘
```

## Frontmatter contracts (Zod-validated)

### Source — `wiki/Sources/<slug>.md`

```yaml
type: source
source_type: article | paper | note | transcript | other
title: string
url?: string
author?: string
ingested_at: YYYY-MM-DD
tags: string[]
confidence?: low | medium | high
summary: one-line string
```

### Concept — `wiki/Concepts/<slug>.md`

```yaml
type: concept
aliases: string[]
related: string[]      # names / wikilinks of other concepts
sources: string[]      # wikilinks to Sources pages
updated: YYYY-MM-DD
summary: one-line string
```

### Entity — `wiki/Entities/<slug>.md`

```yaml
type: entity
kind: person | place | org | work | other
aliases: string[]
related: string[]
sources: string[]
updated: YYYY-MM-DD
summary: one-line string
```

## The `proposedEdits` contract (the key design decision)

`wiki.ingest` **never rewrites cross-references blindly**. It writes exactly
one file (the Sources page) + appends one file (`log.md`), and returns a
`proposedEdits` array the agent walks through.

```ts
type ProposedEdit = {
  path: string;            // vault-relative target
  operation: "createStub" | "insertAfterHeading" | "append";
  heading?: string;        // for insertAfterHeading
  suggestedContent: string;
  reason: string;          // human-readable rationale
};
```

Why: LLM-generated entity extractions are wrong often enough that blind
writes across 10+ files are a foot-gun. The agent applies each proposal
with existing `notes.update` / `notes.insertAfterHeading` / `notes.create`
tools — so every wiki-adjacent write is reviewable and visible in the
transcript.

## Log format (greppable on purpose)

```
## [2026-04-23] ingest | Vannevar Bush — As We May Think

Memex-style personal knowledge base paper.

- [[wiki/Sources/as-we-may-think.md]]

## [2026-04-24] query | memex vs hypertext

## [2026-04-25] lint | 3 broken links, 1 orphan
```

Every entry opens with `## [YYYY-MM-DD] <op> | <title>`, so:

```bash
grep '^## \[' wiki/log.md | tail -5   # last 5 activities
grep '^## \[' wiki/log.md | grep ' ingest | '  # all ingests
```

`op` is one of `ingest | query | lint | note | decision | merge`. The agent
decides which based on what it just did.

## Lint categories

| Finding | Signal | Typical fix |
|---|---|---|
| **orphans** | Wiki page with no inbound AND no outbound wikilinks | Link it into a concept, or delete |
| **brokenLinks** | Wikilink target doesn't resolve | Find the rename; fix or remove the link |
| **stale** | `ingested_at` or `updated` older than `KOBSIDIAN_WIKI_STALE_DAYS` (default 180) | Tag `needs-refresh` or re-ingest |
| **missingPages** | Wikilink points inside `wiki/Concepts/` or `wiki/Entities/` but the target file doesn't exist | Scaffold the stub with the `proposedEdits` pattern |
| **tagSingletons** | Tag used by exactly one page | Merge with a close tag, or remove |
| **indexMismatch** | Wiki page missing from `index.md`, OR `index.md` links to a deleted page | Run `wiki.indexRebuild` |

`wiki.lint` is read-only — it proposes, never applies. The agent runs fixes
through whatever combination of `notes.*` + `wiki.*` tools fits.

## Configuration

Every field under the wiki root is overridable via env var, and every tool
accepts a per-call `wikiRoot` override:

| Env var | Default |
|---|---|
| `KOBSIDIAN_WIKI_ROOT` | `wiki` |
| `KOBSIDIAN_WIKI_SOURCES_DIR` | `Sources` |
| `KOBSIDIAN_WIKI_CONCEPTS_DIR` | `Concepts` |
| `KOBSIDIAN_WIKI_ENTITIES_DIR` | `Entities` |
| `KOBSIDIAN_WIKI_INDEX_FILE` | `index.md` |
| `KOBSIDIAN_WIKI_LOG_FILE` | `log.md` |
| `KOBSIDIAN_WIKI_SCHEMA_FILE` | `wiki-schema.md` |
| `KOBSIDIAN_WIKI_STALE_DAYS` | `180` |

## MCP resources + prompts (for non-Claude-Code clients)

Any MCP client sees the wiki as URI-addressable resources:

- `kobsidian://wiki/index` — `wiki/index.md`
- `kobsidian://wiki/log` — `wiki/log.md`
- `kobsidian://wiki/schema` — `wiki/wiki-schema.md`
- `kobsidian://wiki/page/{+path}` — any page; the template's list
  callback enumerates every Sources / Concepts / Entities page
  (including subfolders like `Sources/papers/…`).

Plus three server-side prompts that mirror the Claude Code skills at
`skills/`:

- `ingest-source` — wraps `wiki.ingest` + the `proposedEdits` loop
- `answer-from-wiki` — wraps `wiki.query` + cited synthesis
- `health-check-wiki` — wraps `wiki.lint` + triaged fix proposals

## Related reading

- **LLM Wiki pattern** — [Andrej Karpathy](https://github.com/karpathy).
  The key insight: maintenance cost is what kills wikis, and maintenance
  is exactly the kind of work LLMs are excellent at. kObsidian is one
  concrete implementation of the idea: filesystem-first, TypeScript,
  MCP-native, and strictly human-in-the-loop for cross-reference edits
  via `proposedEdits`.
- **Vannevar Bush, ["As We May Think" (1945)](https://www.theatlantic.com/magazine/archive/1945/07/as-we-may-think/303881/)**
  — the Memex is the ancestor of this pattern: private, curated, with
  associative trails between documents as the primary artifact.
