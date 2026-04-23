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
  wikiRoot: wikiRootOverrideSchema,
  force: z.boolean().optional(),
  vaultPath: z.string().optional(),
});
export type WikiInitArgs = z.input<typeof wikiInitArgsSchema>;

export const wikiIngestArgsSchema = z
  .object({
    title: z.string().min(1),
    sourcePath: notePathSchema.optional(),
    content: z.string().min(1).optional(),
    sourceType: sourceTypeSchema.default("article"),
    url: z.string().url().optional(),
    author: z.string().min(1).optional(),
    tags: tagsSchema.optional(),
    summary: z.string().min(1).optional(),
    confidence: confidenceSchema.optional(),
    relatedConcepts: z.array(z.string().min(1)).default([]),
    relatedEntities: z.array(z.string().min(1)).default([]),
    slug: z.string().min(1).optional(),
    ingestedAt: dateStringSchema.optional(),
    wikiRoot: wikiRootOverrideSchema,
    vaultPath: z.string().optional(),
  })
  .refine((value) => Boolean(value.sourcePath) || Boolean(value.content), {
    message: "Provide either sourcePath or content to ingest",
    path: ["content"],
  });
export type WikiIngestArgs = z.input<typeof wikiIngestArgsSchema>;

export const logOpSchema = z.enum(["ingest", "query", "lint", "note", "decision", "merge"]);
export type LogOp = z.infer<typeof logOpSchema>;

export const wikiLogAppendArgsSchema = z.object({
  op: logOpSchema,
  title: z.string().min(1),
  body: z.string().optional(),
  refs: z.array(z.string().min(1)).default([]),
  date: dateStringSchema.optional(),
  wikiRoot: wikiRootOverrideSchema,
  vaultPath: z.string().optional(),
});
export type WikiLogAppendArgs = z.input<typeof wikiLogAppendArgsSchema>;

export const wikiIndexRebuildArgsSchema = z.object({
  includeCounts: z.boolean().optional(),
  wikiRoot: wikiRootOverrideSchema,
  vaultPath: z.string().optional(),
});
export type WikiIndexRebuildArgs = z.input<typeof wikiIndexRebuildArgsSchema>;

export const wikiQueryArgsSchema = z.object({
  topic: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
  wikiRoot: wikiRootOverrideSchema,
  vaultPath: z.string().optional(),
});
export type WikiQueryArgs = z.input<typeof wikiQueryArgsSchema>;

export const wikiLintArgsSchema = z.object({
  staleDays: z.number().int().min(1).max(3650).optional(),
  wikiRoot: wikiRootOverrideSchema,
  vaultPath: z.string().optional(),
});
export type WikiLintArgs = z.input<typeof wikiLintArgsSchema>;

export const wikiSummaryMergeArgsSchema = z.object({
  targetPath: notePathSchema,
  newSection: z.string().min(1),
  heading: z.string().min(1).optional(),
  pageType: z.enum(["concept", "entity"]).default("concept"),
  entityKind: entityKindSchema.optional(),
  citationSource: notePathSchema.optional(),
  citationQuote: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  aliases: z.array(z.string().min(1)).optional(),
  wikiRoot: wikiRootOverrideSchema,
  vaultPath: z.string().optional(),
});
export type WikiSummaryMergeArgs = z.input<typeof wikiSummaryMergeArgsSchema>;
