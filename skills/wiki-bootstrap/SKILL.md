---
name: wiki-bootstrap
description: Initialize the kObsidian LLM Wiki in the current vault. Use when the user says "set up a wiki", "start a knowledge base", "init the wiki", "bootstrap kobsidian wiki", or similar. Scaffolds wiki/{Sources,Concepts,Entities}/ and seeds index.md, log.md, wiki-schema.md.
---

# Wiki Bootstrap

You are scaffolding an LLM Wiki on top of an Obsidian vault using the
`kobsidian` MCP server. The vault becomes a compounding knowledge base:
sources flow in, the wiki holds summaries, cross-references, and an index,
and the LLM does the bookkeeping.

## When to use

- The user asks to "set up a wiki", "initialize the knowledge base",
  "start tracking X in a wiki", or "bootstrap this vault".
- The user is new to kObsidian and wants the recommended layout.
- `wiki.lint` reports the wiki is missing, or `wiki.query` returns nothing
  because the wiki doesn't exist yet.

## Steps

1. **Confirm vault context.** Call `notes.list` (or `stats.vault` if
   available) with no directory to verify we're operating on the right
   vault and to get a sense of existing content.

2. **Run `wiki.init`.** With no arguments for defaults (`wiki/` root,
   standard folder / file names). If the user specified a custom root,
   pass `wikiRoot: "<their-name>"`. The tool is idempotent — rerunning is
   safe.

3. **Show the layout.** Read `wiki/wiki-schema.md` back and summarize the
   conventions to the user in 3-5 lines: the three page types, the log
   format, and that the wiki is owned by the LLM (they curate sources,
   you do the bookkeeping).

4. **Offer the next step.** Prompt the user to drop their first source
   (clipped article, pasted notes, a URL they want to summarize) so you
   can ingest it with the `wiki-ingest` skill.

## What not to do

- Do NOT overwrite existing `index.md` / `log.md` / `wiki-schema.md` content
  without `force: true` + explicit user permission.
- Do NOT create scaffolding outside the wiki root; everything lives under
  `wiki/`.
- Do NOT invent alternate layouts (flat folders, category prefixes, etc.).
  If the user wants a different shape, use env vars or `wikiRoot` override.
