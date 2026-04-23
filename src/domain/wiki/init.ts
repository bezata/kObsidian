import { ensureDir, fileExists, writeUtf8 } from "../../lib/filesystem.js";
import type { WikiInitArgs } from "../../schema/wiki.js";
import type { DomainContext } from "../context.js";
import { resolveWikiPaths } from "./paths.js";

const INDEX_SEED = `# Wiki Index

Auto-generated catalog of wiki pages. Run \`wiki.indexRebuild\` to refresh.

## Sources

_No sources yet._

## Concepts

_No concepts yet._

## Entities

_No entities yet._
`;

const LOG_SEED = `# Wiki Log

Append-only, chronological record of wiki activity. Entries use the convention
\`## [YYYY-MM-DD] <op> | <title>\` so recent activity is greppable with
\`grep '^## \\[' log.md | tail -5\`.
`;

const SCHEMA_SEED = `# Wiki Schema

This vault follows the kObsidian "LLM Wiki" pattern. Treat this file as the
source of truth for conventions in this wiki; update it as the wiki evolves.

## Layout

- \`Sources/\` — per-source summary pages, one per ingested item.
- \`Concepts/\` — topic / idea pages (LLM-maintained).
- \`Entities/\` — people, places, orgs, works.
- \`index.md\` — catalog, grouped by category (rebuild with \`wiki.indexRebuild\`).
- \`log.md\` — chronological append-only log of ingest / query / lint actions.

## Frontmatter contracts

### Source (\`Sources/<slug>.md\`)

\`\`\`yaml
type: source
source_type: article | paper | note | transcript | other
title: string
url?: string
author?: string
ingested_at: YYYY-MM-DD
tags: string[]
confidence?: low | medium | high
summary: one-line string
\`\`\`

### Concept (\`Concepts/<slug>.md\`)

\`\`\`yaml
type: concept
aliases: string[]
related: string[]      # names / wikilinks of other concepts
sources: string[]      # wikilinks to Sources pages
updated: YYYY-MM-DD
summary: one-line string
\`\`\`

### Entity (\`Entities/<slug>.md\`)

\`\`\`yaml
type: entity
kind: person | place | org | work | other
aliases: string[]
related: string[]
sources: string[]
updated: YYYY-MM-DD
summary: one-line string
\`\`\`

## Operations

- **Ingest** (\`wiki.ingest\`) — file a source: scaffold summary page, append a log
  entry, return proposed cross-reference edits for the LLM to apply via
  \`notes.update\`.
- **Query** (\`wiki.query\`) — rank wiki pages for a topic (filename + alias +
  tag + backlink + fulltext), then drill into best candidates with
  \`notes.read\`.
- **Lint** (\`wiki.lint\`) — orphans, broken links, stale sources, missing
  concept pages, tag drift, index/log parity.
- **Log** (\`wiki.logAppend\`) — typed entry:
  \`## [YYYY-MM-DD] <op> | <title>\` + optional body + wikilink refs.
- **Merge** (\`wiki.summaryMerge\`) — add a cited section to an existing concept
  or entity page; creates the page with canonical frontmatter if missing.

## Why this shape

The wiki is a compounding artifact. The LLM does the bookkeeping humans abandon
— cross-references, tag hygiene, log maintenance — and the human curates
sources and asks questions. This file documents the contract both sides rely on.
`;

export async function initWiki(context: DomainContext, args: WikiInitArgs) {
  const paths = resolveWikiPaths(context, args);
  const force = args.force ?? false;
  const created: string[] = [];

  const folders: Array<{ absolute: string; relative: string }> = [
    { absolute: paths.rootAbsolute, relative: paths.rootRelative },
    { absolute: paths.sourcesAbsolute, relative: paths.sourcesRelative },
    { absolute: paths.conceptsAbsolute, relative: paths.conceptsRelative },
    { absolute: paths.entitiesAbsolute, relative: paths.entitiesRelative },
  ];

  for (const { absolute, relative } of folders) {
    if (await fileExists(absolute)) continue;
    await ensureDir(absolute);
    created.push(relative);
  }

  const seeds: Array<{ absolute: string; relative: string; content: string }> = [
    { absolute: paths.indexAbsolute, relative: paths.indexRelative, content: INDEX_SEED },
    { absolute: paths.logAbsolute, relative: paths.logRelative, content: LOG_SEED },
    { absolute: paths.schemaAbsolute, relative: paths.schemaRelative, content: SCHEMA_SEED },
  ];

  for (const seed of seeds) {
    const existed = await fileExists(seed.absolute);
    if (existed && !force) continue;
    await writeUtf8(seed.absolute, seed.content);
    if (!existed) created.push(seed.relative);
  }

  const changed = created.length > 0 || force;
  return {
    changed,
    target: paths.rootRelative,
    summary:
      created.length > 0
        ? `Initialized wiki at ${paths.rootRelative} (${created.length} new)`
        : force
          ? `Re-seeded wiki at ${paths.rootRelative}`
          : `Wiki at ${paths.rootRelative} already initialized`,
    created,
    wikiRoot: paths.rootRelative,
    force,
  };
}
