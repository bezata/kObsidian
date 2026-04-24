import { z } from "zod";
import {
  dateStringSchema,
  folderPathSchema,
  notePathSchema,
  positiveIntSchema,
} from "./primitives.js";

export const notesReadArgsSchema = z
  .object({
    path: notePathSchema.describe("Vault-relative note path."),
    include: z
      .array(z.enum(["content", "metadata", "stats"]))
      .default(["content", "metadata"])
      .describe(
        "Which sections to return. `content` = full body; `metadata` = parsed frontmatter and basic info; `stats` = word count, character count, heading count, link count, task count. Omit to get content + metadata.",
      ),
    vaultPath: z.string().optional(),
  })
  .strict();
export type NotesReadArgs = z.input<typeof notesReadArgsSchema>;

export const notesReadOutputSchema = z
  .object({
    path: z.string(),
    content: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    stats: z
      .object({
        words: z.number().int().nonnegative().optional(),
        characters: z.number().int().nonnegative().optional(),
        headings: z.number().int().nonnegative().optional(),
        links: z.number().int().nonnegative().optional(),
        tasks: z.number().int().nonnegative().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const createNoteShape = z.object({
  kind: z.literal("note"),
  path: notePathSchema,
  content: z.string().describe("Initial body. Use an empty string for a blank note."),
  ifExists: z
    .enum(["error", "replace", "skip"])
    .optional()
    .describe(
      "`error` (default) = fail if the note already exists; `replace` = overwrite; `skip` = no-op when the note exists.",
    ),
  vaultPath: z.string().optional(),
});

const createFolderShape = z.object({
  kind: z.literal("folder"),
  path: z
    .string()
    .min(1)
    .describe("Vault-relative folder path. Intermediate folders are created as needed."),
  vaultPath: z.string().optional(),
});

export const notesCreateArgsSchema = z
  .discriminatedUnion("kind", [createNoteShape, createFolderShape])
  .describe(
    "Discriminated union on `kind`. `note` creates a markdown note (`.md`); `folder` creates a directory. Use `kind:'folder'` when the target should be a directory, not a file.",
  );
export type NotesCreateArgs = z.input<typeof notesCreateArgsSchema>;

const editReplaceShape = z.object({
  mode: z.literal("replace"),
  path: notePathSchema,
  content: z.string().describe("Replacement body for the entire note."),
  vaultPath: z.string().optional(),
});

const editAppendShape = z.object({
  mode: z.literal("append"),
  path: notePathSchema,
  content: z.string(),
  vaultPath: z.string().optional(),
});

const editPrependShape = z.object({
  mode: z.literal("prepend"),
  path: notePathSchema,
  content: z.string(),
  vaultPath: z.string().optional(),
});

const editAfterHeadingShape = z.object({
  mode: z.literal("after-heading"),
  path: notePathSchema,
  content: z.string(),
  anchor: z
    .string()
    .min(1)
    .describe(
      "Heading text (without the leading `#`s) to insert after. Matches the first heading in the note that has this exact text.",
    ),
  vaultPath: z.string().optional(),
});

const editAfterBlockShape = z.object({
  mode: z.literal("after-block"),
  path: notePathSchema,
  content: z.string(),
  anchor: z
    .string()
    .min(1)
    .describe("Block id (without the `^` prefix) to insert after. Obsidian block refs only."),
  vaultPath: z.string().optional(),
});

export const notesEditArgsSchema = z
  .discriminatedUnion("mode", [
    editReplaceShape,
    editAppendShape,
    editPrependShape,
    editAfterHeadingShape,
    editAfterBlockShape,
  ])
  .describe(
    "Discriminated union on `mode`. `replace` overwrites the whole note body; `append` adds to the end; `prepend` adds to the start (after frontmatter); `after-heading` inserts after a heading (anchor = heading text, no `#`); `after-block` inserts after a block reference (anchor = block id, no `^`).",
  );
export type NotesEditArgs = z.input<typeof notesEditArgsSchema>;

export const notesFrontmatterArgsSchema = z
  .object({
    path: notePathSchema,
    set: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Map of frontmatter fields to set. Values overwrite any existing entry."),
    unset: z.array(z.string()).optional().describe("Field names to delete from the frontmatter."),
    strategy: z
      .enum(["merge", "replace"])
      .default("merge")
      .describe(
        "`merge` (default) = combine with existing frontmatter; `replace` = overwrite the whole frontmatter block with `set` (ignores existing unspecified fields).",
      ),
    vaultPath: z.string().optional(),
  })
  .strict()
  .refine((value) => Boolean(value.set) || Boolean(value.unset?.length), {
    message: "Provide `set` or `unset` (or both)",
  });
export type NotesFrontmatterArgs = z.input<typeof notesFrontmatterArgsSchema>;

export const notesDeleteArgsSchema = z
  .object({
    path: notePathSchema,
    vaultPath: z.string().optional(),
  })
  .strict();
export type NotesDeleteArgs = z.input<typeof notesDeleteArgsSchema>;

const moveNoteShape = z.object({
  kind: z.literal("note"),
  from: notePathSchema.describe("Current note path."),
  to: notePathSchema.describe("Target note path."),
  updateLinks: z
    .boolean()
    .optional()
    .describe("Rewrite wiki/markdown links that point at `from` to point at `to`. Default true."),
  vaultPath: z.string().optional(),
});

const moveFolderShape = z.object({
  kind: z.literal("folder"),
  from: z.string().min(1).describe("Current folder path."),
  to: z.string().min(1).describe("Target folder path."),
  updateLinks: z.boolean().optional(),
  vaultPath: z.string().optional(),
});

export const notesMoveArgsSchema = z
  .discriminatedUnion("kind", [moveNoteShape, moveFolderShape])
  .describe(
    "Discriminated union on `kind`. `note` moves a single note; `folder` moves a directory and every note beneath it. `updateLinks:true` rewrites references vault-wide.",
  );
export type NotesMoveArgs = z.input<typeof notesMoveArgsSchema>;

export const notesListArgsSchema = z
  .object({
    folder: folderPathSchema.describe("Optional folder to scope the listing."),
    include: z
      .enum(["notes", "folders", "both"])
      .default("notes")
      .describe("What to list — markdown notes, folders, or both (returns items tagged by kind)."),
    recursive: z.boolean().optional().describe("Recurse into subfolders. Default false."),
    since: dateStringSchema
      .optional()
      .describe("Only include items dated on or after this ISO date."),
    until: dateStringSchema
      .optional()
      .describe("Only include items dated on or before this ISO date."),
    dateField: z
      .enum(["created", "modified"])
      .optional()
      .describe("Which date the `since`/`until` filter applies to. Defaults to `modified`."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type NotesListArgs = z.input<typeof notesListArgsSchema>;

export const notesSearchArgsSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .describe(
        "Free-text search query. Supports lightweight `tag:foo` and `path:Journal/` filters in the query string.",
      ),
    contextLength: positiveIntSchema
      .optional()
      .describe("Characters of context to return around each match. Defaults to 80."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type NotesSearchArgs = z.input<typeof notesSearchArgsSchema>;
