import {
  appendLogEntry,
  ingestSource,
  initWiki,
  lintWiki,
  mergeSummary,
  queryWiki,
  rebuildIndex,
} from "../../domain/wiki/index.js";
import {
  wikiIndexRebuildArgsSchema,
  wikiIngestArgsSchema,
  wikiInitArgsSchema,
  wikiLintArgsSchema,
  wikiLogAppendArgsSchema,
  wikiQueryArgsSchema,
  wikiSummaryMergeArgsSchema,
} from "../../schema/wiki.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  IDEMPOTENT,
  IDEMPOTENT_DESTRUCTIVE,
  READ_ONLY,
  looseObjectSchema,
  mutationResultSchema,
} from "../tool-schemas.js";

export const wikiTools: ToolDefinition[] = [
  {
    name: "wiki.init",
    title: "Initialize Wiki",
    description:
      "Scaffold the LLM-Wiki layout under the vault: creates `Sources/`, `Concepts/`, `Entities/` folders and seeds `index.md`, `log.md`, and `wiki-schema.md` (the schema reference the agent reads back later). Use this once per vault before calling any other `wiki.*` tool. Idempotent by default — existing files are preserved; pass `force:true` to re-seed `index.md`/`log.md`/`wiki-schema.md` (folders are never deleted). Returns `{ created: string[], skipped: string[] }` so the agent can confirm what changed. Resolves the wiki location from `wikiRoot` arg → `KOBSIDIAN_WIKI_ROOT` env → `wiki/`.",
    inputSchema: wikiInitArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT,
    inputExamples: [
      {
        description: "First-time scaffold in the active vault.",
        input: {},
      },
      {
        description: "Re-seed schema/index/log files in a custom wiki directory.",
        input: { wikiRoot: "knowledge", force: true },
      },
    ],
    handler: (context, args) => initWiki(context, args as Parameters<typeof initWiki>[1]),
  },
  {
    name: "wiki.ingest",
    title: "Ingest Source",
    description:
      "File one new source into the wiki: writes `Sources/<slug>.md` with canonical frontmatter, appends an `ingest` entry to `log.md`, and returns a `proposedEdits` array the agent applies via existing `notes.*` tools (`createStub` → `notes.create`; `insertAfterHeading` / `append` → `notes.edit` with the matching `mode`). Cross-reference writes are deliberately NOT applied here so every edit shows up in the transcript. Provide either `sourcePath` (existing vault note) OR `content` (inline markdown) — never both. Use `wiki.summaryMerge` instead when you want to file a follow-up section into an EXISTING concept/entity page; use `wiki.query` to look something up without writing.",
    inputSchema: wikiIngestArgsSchema,
    outputSchema: mutationResultSchema,
    inputExamples: [
      {
        description:
          "Ingest a paper from inline markdown with two related concepts and one entity.",
        input: {
          title: "In-Context Learning — A Survey",
          content: "# In-Context Learning\n\nA survey of …",
          sourceType: "paper",
          url: "https://arxiv.org/abs/2301.00234",
          tags: ["icl", "prompting"],
          relatedConcepts: ["In-Context Learning", "Few-Shot Prompting"],
          relatedEntities: ["Brown 2020"],
        },
      },
      {
        description: "Ingest an existing vault note as a 'note' source.",
        input: {
          title: "ADR-004 — gRPC for internal service comms",
          sourcePath: "drafts/adr-004.md",
          sourceType: "note",
          tags: ["adr", "architecture"],
        },
      },
    ],
    handler: (context, args) => ingestSource(context, args as Parameters<typeof ingestSource>[1]),
  },
  {
    name: "wiki.logAppend",
    title: "Append Wiki Log Entry",
    description:
      "Append one typed entry to `wiki/log.md` in the canonical format `## [YYYY-MM-DD] <op> | <title>`, optionally followed by a body and a `Refs:` list. The format is chosen so `grep '^## \\[' log.md | tail -20` is a valid 'recent activity' query. Use this when the agent makes a wiki-meaningful action that no other `wiki.*` tool already logs (e.g. a `decision` or `note`); `ingest` and `merge` log themselves. Auto-runs `wiki.init` if the wiki has not been scaffolded yet. Idempotent only in the trivial sense — every call appends a new entry.",
    inputSchema: wikiLogAppendArgsSchema,
    outputSchema: mutationResultSchema,
    inputExamples: [
      {
        description: "Log an architectural decision with two refs.",
        input: {
          op: "decision",
          title: "Adopt gRPC for internal RPC",
          body: "Streaming + typed schemas outweigh the browser-edge tax.",
          refs: ["wiki/Sources/adr-004.md", "wiki/Concepts/grpc.md"],
        },
      },
      {
        description: "Quick freeform note dated today.",
        input: { op: "note", title: "Reviewed orphan pages from last sprint" },
      },
    ],
    handler: (context, args) =>
      appendLogEntry(context, args as Parameters<typeof appendLogEntry>[1]),
  },
  {
    name: "wiki.indexRebuild",
    title: "Rebuild Wiki Index",
    description:
      "Regenerate `wiki/index.md` from a fresh scan of `Sources/`, `Concepts/`, and `Entities/`. Pages are grouped by category and sorted alphabetically; pass `includeCounts:true` to render counts on the section headings (e.g. `## Sources (12)`). Idempotent and destructive — the existing `index.md` body is replaced wholesale, so any hand-edits there are lost. Use after bulk-creating pages outside the wiki tools, or as the cleanup step after `wiki.lint` reports `indexMismatch`. For incremental upkeep on a single source, prefer the `proposedEdits` returned by `wiki.ingest` instead.",
    inputSchema: wikiIndexRebuildArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT_DESTRUCTIVE,
    inputExamples: [
      {
        description: "Plain rebuild.",
        input: {},
      },
      {
        description: "Rebuild with counts on each section heading.",
        input: { includeCounts: true },
      },
    ],
    handler: (context, args) => rebuildIndex(context, args as Parameters<typeof rebuildIndex>[1]),
  },
  {
    name: "wiki.query",
    title: "Query Wiki",
    description:
      "Rank wiki pages by relevance to a free-text `topic`, scanning Sources/Concepts/Entities pages. Hits are weighted in this order: filename match > frontmatter aliases > frontmatter tags > frontmatter summary > body. Returns up to `limit` pages (default 10, max 50) as `{path, type, score, hitFields}` so the agent can drill into the strongest candidates with `notes.read`. Read-only; never writes. Use this for 'what does the wiki know about X?' lookups; use `wiki.lint` instead for whole-vault health audits, and `notes.search` for raw full-text search outside the wiki layout.",
    inputSchema: wikiQueryArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    inputExamples: [
      {
        description: "Top 10 pages relevant to 'memex vs hypertext'.",
        input: { topic: "memex vs hypertext" },
      },
      {
        description: "Top 25 pages on a narrow topic, custom wiki dir.",
        input: { topic: "circuit breaker pattern", limit: 25, wikiRoot: "knowledge" },
      },
    ],
    handler: (context, args) => queryWiki(context, args as Parameters<typeof queryWiki>[1]),
  },
  {
    name: "wiki.lint",
    title: "Lint Wiki",
    description:
      "Read-only health check across the wiki. Returns grouped findings under fixed keys: `orphans` (pages with zero in/out wiki-links), `brokenLinks` (links whose target does not resolve), `staleSources` and `stalePages` (older than `staleDays`, default 180 / `KOBSIDIAN_WIKI_STALE_DAYS`), `missingPages` (concept/entity names referenced from Sources but with no page), `tagSingletons` (tags used by exactly one page — likely typos), and `indexMismatch` (entries in `index.md` that no longer match disk). Each group includes a count plus per-finding details. Never writes. Use periodically; pair the result with `notes.move`/`notes.edit`/`wiki.indexRebuild` to apply fixes.",
    inputSchema: wikiLintArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    inputExamples: [
      {
        description: "Default audit.",
        input: {},
      },
      {
        description: "Stricter staleness threshold (90 days) for an active codebase wiki.",
        input: { staleDays: 90 },
      },
    ],
    handler: (context, args) => lintWiki(context, args as Parameters<typeof lintWiki>[1]),
  },
  {
    name: "wiki.summaryMerge",
    title: "Merge Summary Into Concept Or Entity Page",
    description:
      "Add a cited section to an EXISTING `Concepts/` or `Entities/` page, or create the page with canonical frontmatter if `targetPath` does not exist. The new section is rendered under `heading` (default: `Update YYYY-MM-DD`); `citationSource` adds a `[[wiki-link]]` to the source and pushes it onto the page's `sources:` frontmatter list, and `citationQuote` renders as a blockquote under the citation. On existing pages, `updated:` frontmatter is bumped to today. Use this when filing a follow-up onto a known page; use `wiki.ingest` instead when bringing in a NEW source (which auto-creates `Sources/<slug>.md`). When creating a new entity page, `entityKind` is required.",
    inputSchema: wikiSummaryMergeArgsSchema,
    outputSchema: mutationResultSchema,
    inputExamples: [
      {
        description:
          "Append a 'Notable Facts' section to an existing concept page, citing one source with a quote.",
        input: {
          targetPath: "wiki/Concepts/circuit-breaker.md",
          heading: "Notable Facts",
          newSection: "Adopted by payment-service after the 2026-04-10 cascade incident.",
          citationSource: "wiki/Sources/postmortem-2026-04-10-payment-timeouts-cascade.md",
          citationQuote: "Timeouts in payment-service propagated to order-service within 14s.",
        },
      },
      {
        description: "Create a new entity page for an organization on first reference.",
        input: {
          targetPath: "wiki/Entities/anthropic.md",
          pageType: "entity",
          entityKind: "org",
          newSection: "AI safety lab; publisher of the Model Context Protocol.",
          summary: "AI safety company behind Claude and MCP.",
        },
      },
    ],
    handler: (context, args) => mergeSummary(context, args as Parameters<typeof mergeSummary>[1]),
  },
];
