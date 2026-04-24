import { z } from "zod";
import { notePathSchema, tagSchema, tagsSchema } from "./primitives.js";

export const tagModifyOpSchema = z
  .enum(["add", "remove", "replace", "merge"])
  .describe(
    [
      "The mutation to apply to the note's frontmatter `tags` field:",
      "- `add`     — union existing + incoming (duplicates dropped).",
      "- `remove`  — drop any incoming tag that currently exists.",
      "- `replace` — overwrite the tag list entirely with `tags`.",
      "- `merge`   — alias for `add` (kept for naming clarity; behaves identically).",
    ].join(" "),
  );
export type TagModifyOp = z.infer<typeof tagModifyOpSchema>;

export const tagsModifyArgsSchema = z
  .object({
    path: notePathSchema.describe("Vault-relative note path to mutate."),
    op: tagModifyOpSchema,
    tags: tagsSchema.describe(
      "Tags to add/remove/replace with. Leading `#` is stripped automatically. Max 50 per call.",
    ),
    vaultPath: z.string().optional(),
  })
  .strict()
  .describe("Arguments for `tags.modify`.");
export type TagsModifyArgs = z.input<typeof tagsModifyArgsSchema>;

export const tagsSearchArgsSchema = z
  .object({
    tag: tagSchema.describe("Tag to find. Leading `#` is stripped."),
    vaultPath: z.string().optional(),
  })
  .strict()
  .describe("Arguments for `tags.search`.");
export type TagsSearchArgs = z.input<typeof tagsSearchArgsSchema>;

export const tagsAnalyzeArgsSchema = z
  .object({
    path: notePathSchema.describe("Vault-relative note path to analyze."),
    vaultPath: z.string().optional(),
  })
  .strict()
  .describe("Arguments for `tags.analyze`.");
export type TagsAnalyzeArgs = z.input<typeof tagsAnalyzeArgsSchema>;

export const tagsListArgsSchema = z
  .object({
    includeCounts: z
      .boolean()
      .optional()
      .describe("When true, each entry carries `{tag, count}`; otherwise just `tag`."),
    sortBy: z
      .enum(["name", "count"])
      .optional()
      .describe("Sort order for returned tags. `count` requires `includeCounts: true`."),
    vaultPath: z.string().optional(),
  })
  .strict()
  .describe("Arguments for `tags.list`.");
export type TagsListArgs = z.input<typeof tagsListArgsSchema>;

export const tagsModifyOutputSchema = z
  .object({
    changed: z.boolean(),
    target: z.string(),
    summary: z.string(),
    op: tagModifyOpSchema,
    tagsBefore: z.array(z.string()).optional(),
    tagsAfter: z.array(z.string()).describe("The full tag list after the mutation."),
  })
  .passthrough();

export const tagsSearchOutputSchema = z
  .object({
    tag: z.string().describe("The normalized tag that was searched (leading `#` stripped)."),
    total: z.number().int().nonnegative(),
    items: z.array(
      z
        .object({
          file: z.string(),
          absolutePath: z.string(),
          tagLocations: z.object({
            frontmatter: z
              .boolean()
              .describe("True if the tag appears in the note's frontmatter `tags` list."),
            inline: z
              .boolean()
              .describe("True if the tag appears as an inline `#tag` in the body."),
          }),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const tagsAnalyzeOutputSchema = z
  .object({
    path: z.string(),
    frontmatterTags: z.array(z.string()),
    inlineTags: z.array(z.string()),
    allTags: z.array(z.string()).describe("Union of frontmatter and inline tags, de-duplicated."),
  })
  .passthrough();

export const tagsListOutputSchema = z
  .object({
    total: z.number().int().nonnegative(),
    items: z.array(
      z
        .object({
          tag: z.string(),
          count: z.number().int().nonnegative().optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
