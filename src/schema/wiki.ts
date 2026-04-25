import { z } from "zod";
import { dateStringSchema, notePathSchema, tagsSchema } from "./primitives.js";

export const sourceTypeSchema = z.enum(["article", "paper", "note", "transcript", "other"]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const confidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const entityKindSchema = z.enum(["person", "place", "org", "work", "other"]);
export type EntityKind = z.infer<typeof entityKindSchema>;

export const wikiPageTypeSchema = z.enum(["source", "concept", "entity"]);
export type WikiPageType = z.infer<typeof wikiPageTypeSchema>;

export const proposedEditOperationSchema = z.enum(["createStub", "insertAfterHeading", "append"]);
export type ProposedEditOperation = z.infer<typeof proposedEditOperationSchema>;

export const sourceFrontmatterSchema = z.object({
  type: z.literal("source"),
  source_type: sourceTypeSchema,
  title: z.string().min(1),
  url: z.string().url().optional(),
  author: z.string().min(1).optional(),
  ingested_at: dateStringSchema,
  tags: tagsSchema.default([]),
  confidence: confidenceSchema.optional(),
  summary: z.string().min(1),
});
export type SourceFrontmatter = z.infer<typeof sourceFrontmatterSchema>;

export const conceptFrontmatterSchema = z.object({
  type: z.literal("concept"),
  aliases: z.array(z.string().min(1)).default([]),
  related: z.array(z.string().min(1)).default([]),
  sources: z.array(z.string().min(1)).default([]),
  updated: dateStringSchema,
  summary: z.string().min(1),
});
export type ConceptFrontmatter = z.infer<typeof conceptFrontmatterSchema>;

export const entityFrontmatterSchema = z.object({
  type: z.literal("entity"),
  kind: entityKindSchema,
  aliases: z.array(z.string().min(1)).default([]),
  related: z.array(z.string().min(1)).default([]),
  sources: z.array(z.string().min(1)).default([]),
  updated: dateStringSchema,
  summary: z.string().min(1),
});
export type EntityFrontmatter = z.infer<typeof entityFrontmatterSchema>;

const wikiRootOverrideSchema = z.string().min(1).optional();

export const wikiInitArgsSchema = z.object({
  wikiRoot: wikiRootOverrideSchema.describe(
    "Per-call override for the wiki directory under the vault. Defaults to KOBSIDIAN_WIKI_ROOT (env), then 'wiki'.",
  ),
  force: z
    .boolean()
    .optional()
    .describe(
      "Re-seed index.md, log.md, and wiki-schema.md even if they already exist. Folders are never deleted. Defaults to false (idempotent).",
    ),
  vaultPath: z
    .string()
    .optional()
    .describe(
      "Per-call vault override. Wins over the session-active vault and OBSIDIAN_VAULT_PATH for this call only.",
    ),
});
export type WikiInitArgs = z.input<typeof wikiInitArgsSchema>;

export const wikiIngestArgsSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .describe(
        "Human-readable title of the source. Used for the page H1, the index entry, and the log entry.",
      ),
    sourcePath: notePathSchema
      .optional()
      .describe(
        "Vault-relative path of an existing note to ingest as the source body. Provide this OR `content`, not both.",
      ),
    content: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Inline markdown body for the source. Use when you do not already have a note in the vault. Provide this OR `sourcePath`.",
      ),
    sourceType: sourceTypeSchema
      .default("article")
      .describe("Source kind written to frontmatter: article | paper | note | transcript | other."),
    url: z
      .string()
      .url()
      .optional()
      .describe("Canonical URL of the source, if any. Stored in frontmatter."),
    author: z.string().min(1).optional().describe("Source author for frontmatter."),
    tags: tagsSchema
      .optional()
      .describe("Tag list (without leading '#') stored on the Sources page."),
    summary: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Short prose summary written to frontmatter. Auto-generated from the body if omitted.",
      ),
    confidence: confidenceSchema
      .optional()
      .describe("Subjective confidence in the source: low | medium | high."),
    relatedConcepts: z
      .array(z.string().min(1))
      .default([])
      .describe(
        "Concept page names to cross-reference. Each becomes a `createStub` proposed edit if the concept page does not exist yet.",
      ),
    relatedEntities: z
      .array(z.string().min(1))
      .default([])
      .describe(
        "Entity page names (people / places / orgs / works) to cross-reference. Same proposedEdits behavior as relatedConcepts.",
      ),
    slug: z
      .string()
      .min(1)
      .optional()
      .describe("Override the auto-derived slug used as the Sources/<slug>.md filename."),
    ingestedAt: dateStringSchema
      .optional()
      .describe("YYYY-MM-DD override for the ingestion date. Defaults to today."),
    wikiRoot: wikiRootOverrideSchema.describe(
      "Per-call wiki directory override (defaults to KOBSIDIAN_WIKI_ROOT or 'wiki').",
    ),
    vaultPath: z
      .string()
      .optional()
      .describe("Per-call vault override; wins over session and env."),
  })
  .refine((value) => Boolean(value.sourcePath) || Boolean(value.content), {
    message: "Provide either sourcePath or content to ingest",
    path: ["content"],
  });
export type WikiIngestArgs = z.input<typeof wikiIngestArgsSchema>;

export const logOpSchema = z.enum(["ingest", "query", "lint", "note", "decision", "merge"]);
export type LogOp = z.infer<typeof logOpSchema>;

export const wikiLogAppendArgsSchema = z.object({
  op: logOpSchema.describe(
    "Log entry kind: ingest | query | lint | note | decision | merge. Becomes the `<op>` token in `## [YYYY-MM-DD] <op> | <title>`.",
  ),
  title: z
    .string()
    .min(1)
    .describe("One-line title for the entry. Becomes the `<title>` token in the heading."),
  body: z
    .string()
    .optional()
    .describe("Optional markdown body written under the heading. Omit for a heading-only entry."),
  refs: z
    .array(z.string().min(1))
    .default([])
    .describe(
      "Optional list of vault-relative paths or wiki-link targets rendered as a `Refs:` list under the entry.",
    ),
  date: dateStringSchema
    .optional()
    .describe("YYYY-MM-DD override for the entry date. Defaults to today."),
  wikiRoot: wikiRootOverrideSchema.describe("Per-call wiki directory override."),
  vaultPath: z.string().optional().describe("Per-call vault override."),
});
export type WikiLogAppendArgs = z.input<typeof wikiLogAppendArgsSchema>;

export const wikiIndexRebuildArgsSchema = z.object({
  includeCounts: z
    .boolean()
    .optional()
    .describe(
      "When true, append per-category counts (e.g. `Sources (12)`) to each section heading. Defaults to false.",
    ),
  wikiRoot: wikiRootOverrideSchema.describe("Per-call wiki directory override."),
  vaultPath: z.string().optional().describe("Per-call vault override."),
});
export type WikiIndexRebuildArgs = z.input<typeof wikiIndexRebuildArgsSchema>;

export const wikiQueryArgsSchema = z.object({
  topic: z
    .string()
    .min(1)
    .describe(
      "Free-text topic. Tokenized and matched against page filename, frontmatter aliases, frontmatter tags, summary, and body — in that order, with descending weight.",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Max ranked pages to return. Default 10, hard cap 50."),
  wikiRoot: wikiRootOverrideSchema.describe("Per-call wiki directory override."),
  vaultPath: z.string().optional().describe("Per-call vault override."),
});
export type WikiQueryArgs = z.input<typeof wikiQueryArgsSchema>;

export const wikiLintArgsSchema = z.object({
  staleDays: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .optional()
    .describe(
      "Threshold in days for the 'stale' finding category (Sources whose `ingested_at` is older than this; Concepts/Entities whose `updated` is older). Defaults to KOBSIDIAN_WIKI_STALE_DAYS or 180.",
    ),
  wikiRoot: wikiRootOverrideSchema.describe("Per-call wiki directory override."),
  vaultPath: z.string().optional().describe("Per-call vault override."),
});
export type WikiLintArgs = z.input<typeof wikiLintArgsSchema>;

export const wikiSummaryMergeArgsSchema = z.object({
  targetPath: notePathSchema.describe(
    "Vault-relative path of the concept or entity page to merge into. Created with canonical frontmatter if it does not exist.",
  ),
  newSection: z
    .string()
    .min(1)
    .describe(
      "Markdown body of the new section to insert. Will be wrapped under `heading` (or appended after the existing one).",
    ),
  heading: z
    .string()
    .min(1)
    .optional()
    .describe(
      "H2 heading text for the new section (e.g. 'Notable Facts'). Defaults to a timestamped 'Update YYYY-MM-DD' heading.",
    ),
  pageType: z
    .enum(["concept", "entity"])
    .default("concept")
    .describe(
      "Page type used when creating a missing target page. Picks the matching frontmatter schema.",
    ),
  entityKind: entityKindSchema
    .optional()
    .describe(
      "Required only when creating a missing entity page. One of person | place | org | work | other.",
    ),
  citationSource: notePathSchema
    .optional()
    .describe(
      "Vault-relative path to a Sources/<slug>.md page. Rendered as a `[[wiki-link]]` citation under the new section and added to the page's `sources:` frontmatter list.",
    ),
  citationQuote: z
    .string()
    .min(1)
    .optional()
    .describe("Optional pull-quote from the source rendered as a blockquote under the citation."),
  summary: z
    .string()
    .min(1)
    .optional()
    .describe("Set or replace the page's frontmatter `summary` field."),
  aliases: z
    .array(z.string().min(1))
    .optional()
    .describe("Set or replace the page's frontmatter `aliases` list."),
  wikiRoot: wikiRootOverrideSchema.describe("Per-call wiki directory override."),
  vaultPath: z.string().optional().describe("Per-call vault override."),
});
export type WikiSummaryMergeArgs = z.input<typeof wikiSummaryMergeArgsSchema>;
