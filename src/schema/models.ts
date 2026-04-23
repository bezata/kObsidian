import { z } from "zod";

export const noteMetadataSchema = z.object({
  created: z.string().datetime().optional(),
  modified: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  frontmatter: z.record(z.string(), z.unknown()).default({}),
});

export const noteSchema = z.object({
  path: z.string(),
  content: z.string(),
  metadata: noteMetadataSchema,
});

export const searchResultSchema = z.object({
  path: z.string(),
  score: z.number(),
  matches: z.array(z.string()).default([]),
  context: z.string().optional(),
});

export const backlinkSchema = z.object({
  sourcePath: z.string(),
  linkText: z.string(),
  context: z.string().optional(),
});

export const taskSchema = z.object({
  content: z.string().min(1),
  status: z.enum(["incomplete", "completed"]),
  priority: z.enum(["highest", "high", "normal", "low", "lowest"]).default("normal"),
  dueDate: z.iso.date().optional(),
  scheduledDate: z.iso.date().optional(),
  startDate: z.iso.date().optional(),
  doneDate: z.iso.date().optional(),
  createdDate: z.iso.date().optional(),
  recurrence: z.string().optional(),
  lineNumber: z.number().int().positive().optional(),
  sourceFile: z.string(),
  tags: z.array(z.string()).default([]),
});

export const dataviewFieldSchema = z.object({
  scope: z.enum(["page", "list", "task"]).default("page"),
  key: z.string(),
  value: z.unknown(),
  canonicalKey: z.string(),
  lineNumber: z.number().int().positive(),
  syntaxType: z.enum(["frontmatter", "full-line", "bracket", "paren"]),
  sourceFile: z.string(),
  valueType: z.enum(["string", "number", "boolean", "date", "link", "list"]),
  listItemLineNumber: z.number().int().positive().optional(),
  taskLineNumber: z.number().int().positive().optional(),
});

export const sourceSpanSchema = z.object({
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
});

export const fencedCodeBlockSchema = z.object({
  id: z.string(),
  language: z.string(),
  infoString: z.string(),
  raw: z.string(),
  content: z.string(),
  span: sourceSpanSchema,
  contentSpan: sourceSpanSchema,
});

export const mermaidBlockSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  raw: z.string(),
  body: z.string(),
  diagramKind: z.string().optional(),
  frontmatter: z
    .object({
      raw: z.string(),
      data: z.record(z.string(), z.unknown()),
    })
    .optional(),
  directives: z.array(z.string()),
  span: sourceSpanSchema,
  contentSpan: sourceSpanSchema,
});

export const marpSlideSchema = z.object({
  id: z.string(),
  index: z.number().int().nonnegative(),
  raw: z.string(),
  body: z.string(),
  separator: z.enum(["---", "___", "***"]).optional(),
  directives: z.record(z.string(), z.unknown()),
  span: sourceSpanSchema,
});

export const marpDeckSchema = z.object({
  filePath: z.string(),
  frontmatter: z.record(z.string(), z.unknown()),
  isMarpDeck: z.boolean(),
  slides: z.array(marpSlideSchema),
  totalSlides: z.number().int().nonnegative(),
  directives: z.record(z.string(), z.unknown()),
});
