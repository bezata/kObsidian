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
import { looseObjectSchema, mutationResultSchema } from "../tool-schemas.js";

export const wikiTools: ToolDefinition[] = [
  {
    name: "wiki.init",
    title: "Initialize Wiki",
    description:
      "Scaffold the wiki layout: Sources/, Concepts/, Entities/ folders plus seed index.md, log.md, and wiki-schema.md. Idempotent; use force:true to re-seed index/log/schema files.",
    inputSchema: wikiInitArgsSchema,
    outputSchema: mutationResultSchema,
    handler: (context, args) => initWiki(context, args as Parameters<typeof initWiki>[1]),
  },
  {
    name: "wiki.ingest",
    title: "Ingest Source",
    description:
      "File a new source into the wiki: create Sources/<slug>.md with canonical frontmatter, append a log entry, and return proposedEdits for index + related concept/entity pages for the LLM to apply via notes.update.",
    inputSchema: wikiIngestArgsSchema,
    outputSchema: mutationResultSchema,
    handler: (context, args) => ingestSource(context, args as Parameters<typeof ingestSource>[1]),
  },
  {
    name: "wiki.logAppend",
    title: "Append Wiki Log Entry",
    description:
      "Append a typed chronological entry to the wiki log using the convention '## [YYYY-MM-DD] <op> | <title>'. Initializes the wiki if needed.",
    inputSchema: wikiLogAppendArgsSchema,
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      appendLogEntry(context, args as Parameters<typeof appendLogEntry>[1]),
  },
  {
    name: "wiki.indexRebuild",
    title: "Rebuild Wiki Index",
    description:
      "Regenerate the wiki index.md from the current state of Sources/, Concepts/, and Entities/. Groups entries by category; supports optional per-category counts.",
    inputSchema: wikiIndexRebuildArgsSchema,
    outputSchema: mutationResultSchema,
    handler: (context, args) => rebuildIndex(context, args as Parameters<typeof rebuildIndex>[1]),
  },
  {
    name: "wiki.query",
    title: "Query Wiki",
    description:
      "Rank wiki pages relevant to a topic using filename, alias, tag, summary and body hits. Returns the top pages so the LLM can drill in with notes.read.",
    inputSchema: wikiQueryArgsSchema,
    outputSchema: looseObjectSchema,
    handler: (context, args) => queryWiki(context, args as Parameters<typeof queryWiki>[1]),
  },
  {
    name: "wiki.lint",
    title: "Lint Wiki",
    description:
      "Health-check the wiki: orphans, broken links, stale sources, missing concept pages, singleton tags, and index.md parity. Read-only; returns grouped findings with totals.",
    inputSchema: wikiLintArgsSchema,
    outputSchema: looseObjectSchema,
    handler: (context, args) => lintWiki(context, args as Parameters<typeof lintWiki>[1]),
  },
  {
    name: "wiki.summaryMerge",
    title: "Merge Summary Into Concept Or Entity Page",
    description:
      "Add a cited section into an existing concept or entity page (or create the page with canonical frontmatter if missing). Bumps 'updated' on existing pages.",
    inputSchema: wikiSummaryMergeArgsSchema,
    outputSchema: mutationResultSchema,
    handler: (context, args) => mergeSummary(context, args as Parameters<typeof mergeSummary>[1]),
  },
];
