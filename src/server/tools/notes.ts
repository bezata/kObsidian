import type { DomainContext } from "../../domain/context.js";
import {
  createFolder,
  createNote,
  deleteNote,
  getNoteInfo,
  listFolders,
  listNotes,
  moveFolder,
  moveNote,
  readNote,
  searchByDate,
  searchNotes,
  updateNote,
} from "../../domain/notes.js";
import {
  appendToNote,
  insertAfterBlock,
  insertAfterHeading,
  updateFrontmatterField,
} from "../../domain/smart-insert.js";
import { getNoteStatistics } from "../../domain/statistics.js";
import { AppError } from "../../lib/errors.js";
import {
  type NotesCreateArgs,
  type NotesDeleteArgs,
  type NotesEditArgs,
  type NotesFrontmatterArgs,
  type NotesListArgs,
  type NotesMoveArgs,
  type NotesReadArgs,
  type NotesSearchArgs,
  notesCreateArgsSchema,
  notesDeleteArgsSchema,
  notesEditArgsSchema,
  notesFrontmatterArgsSchema,
  notesListArgsSchema,
  notesMoveArgsSchema,
  notesReadArgsSchema,
  notesReadOutputSchema,
  notesSearchArgsSchema,
} from "../../schema/notes.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  ADDITIVE,
  DESTRUCTIVE,
  IDEMPOTENT_ADDITIVE,
  IDEMPOTENT_DESTRUCTIVE,
  READ_ONLY,
  listResultSchema,
  mutationResultSchema,
} from "../tool-schemas.js";

async function handleEdit(context: DomainContext, args: NotesEditArgs) {
  if (args.mode === "replace") {
    return updateNote(context, {
      path: args.path,
      content: args.content,
      mergeStrategy: "replace",
      vaultPath: args.vaultPath,
    });
  }
  if (args.mode === "append") {
    return appendToNote(context, {
      filePath: args.path,
      content: args.content,
      vaultPath: args.vaultPath,
    });
  }
  if (args.mode === "prepend") {
    // No dedicated prepend domain fn — compose via read+replace.
    const existing = await readNote(context, { path: args.path, vaultPath: args.vaultPath });
    return updateNote(context, {
      path: args.path,
      content: `${args.content}${existing.content.startsWith("\n") ? "" : "\n"}${existing.content}`,
      mergeStrategy: "replace",
      vaultPath: args.vaultPath,
    });
  }
  if (args.mode === "after-heading") {
    return insertAfterHeading(context, {
      filePath: args.path,
      heading: args.anchor,
      content: args.content,
      vaultPath: args.vaultPath,
    });
  }
  return insertAfterBlock(context, {
    filePath: args.path,
    blockId: args.anchor,
    content: args.content,
    vaultPath: args.vaultPath,
  });
}

export const noteTools: ToolDefinition[] = [
  {
    name: "notes.read",
    title: "Read Note",
    description:
      "Read a note and return any combination of its body, parsed frontmatter metadata, and lightweight statistics. `include` selects which sections to return — default is `['content', 'metadata']`. Ask for `['stats']` alone when you only need word/character/heading/link/task counts and want to skip loading the full body. Read-only. Fails with `not_found` when `path` does not exist.",
    inputSchema: notesReadArgsSchema,
    outputSchema: notesReadOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = notesReadArgsSchema.parse(rawArgs) as NotesReadArgs;
      const include = args.include ?? ["content", "metadata"];
      const wantContent = include.includes("content");
      const wantMetadata = include.includes("metadata");
      const wantStats = include.includes("stats");

      const result: Record<string, unknown> = { path: args.path };

      if (wantContent || wantMetadata) {
        const note = await readNote(context, { path: args.path, vaultPath: args.vaultPath });
        if (wantContent) {
          result.content = note.content;
        }
        if (wantMetadata) {
          const { content: _c, ...rest } = note as typeof note & { content: string };
          result.metadata = rest;
        }
      } else {
        // Metadata-only still uses getNoteInfo as a cheap read.
        const info = await getNoteInfo(context, { path: args.path, vaultPath: args.vaultPath });
        result.metadata = info;
      }

      if (wantStats) {
        result.stats = await getNoteStatistics(context, {
          filePath: args.path,
          vaultPath: args.vaultPath,
        });
      }

      return result;
    },
  },
  {
    name: "notes.create",
    title: "Create Note Or Folder",
    description:
      "Create a new note or folder in the vault. `kind:'note'` creates a markdown note at `path` with the given `content`; `ifExists` controls collision behavior (`error` = fail, default; `replace` = overwrite; `skip` = no-op). `kind:'folder'` creates a directory at `path` (intermediate folders are created automatically; idempotent — re-creating an existing folder is a no-op). Returns the standard mutation envelope.",
    inputSchema: notesCreateArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = notesCreateArgsSchema.parse(rawArgs) as NotesCreateArgs;
      if (args.kind === "folder") {
        return createFolder(context, { folderPath: args.path, vaultPath: args.vaultPath });
      }
      return createNote(context, {
        path: args.path,
        content: args.content,
        overwrite: args.ifExists === "replace",
        vaultPath: args.vaultPath,
      });
    },
    inputExamples: [
      {
        description: "Create a new note, failing if it exists",
        input: { kind: "note", path: "Journal/2026-04-24.md", content: "# Today\n" },
      },
      {
        description: "Ensure a folder exists (idempotent)",
        input: { kind: "folder", path: "Projects/Alpha/Reports" },
      },
    ],
  },
  {
    name: "notes.edit",
    title: "Edit Note",
    description:
      "Mutate the body of an existing note. The `mode` field selects how `content` is applied: `replace` overwrites the whole note; `append` adds to the end; `prepend` adds after the frontmatter (or at the top if none); `after-heading` inserts after the first heading whose text matches `anchor` (no leading `#`); `after-block` inserts after the block reference `^anchor`. Fails if the note does not exist — use `notes.create` first. `replace` mode is idempotent-destructive; the others are additive.",
    inputSchema: notesEditArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = notesEditArgsSchema.parse(rawArgs) as NotesEditArgs;
      return handleEdit(context, args);
    },
    inputExamples: [
      {
        description: "Append a new journal entry to the end of today's note",
        input: {
          mode: "append",
          path: "Journal/2026-04-24.md",
          content: "\n## Afternoon\n\nFinished the tool consolidation.",
        },
      },
      {
        description: "Insert content after a specific heading",
        input: {
          mode: "after-heading",
          path: "Projects/Alpha.md",
          anchor: "Open questions",
          content: "- Do we need to bump the Zod major?\n",
        },
      },
      {
        description: "Insert after a block reference",
        input: {
          mode: "after-block",
          path: "Notes/idea.md",
          anchor: "idea-1",
          content: "Follow-up thought …",
        },
      },
    ],
  },
  {
    name: "notes.frontmatter",
    title: "Edit Frontmatter",
    description:
      "Set or unset fields in a note's YAML frontmatter. `set` is a map of `{field: value}` pairs to write; `unset` is a list of field names to delete. `strategy:'merge'` (default) leaves unspecified fields untouched; `strategy:'replace'` overwrites the entire frontmatter block with `set` (any field not in `set` is dropped). At least one of `set` or `unset` is required. Idempotent — re-running with the same arguments converges on the same frontmatter state.",
    inputSchema: notesFrontmatterArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT_ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = notesFrontmatterArgsSchema.parse(rawArgs) as NotesFrontmatterArgs;
      const results: Array<{ changed: boolean }> = [];
      if (args.set) {
        for (const [field, value] of Object.entries(args.set)) {
          const res = await updateFrontmatterField(context, {
            filePath: args.path,
            field,
            value,
            vaultPath: args.vaultPath,
          });
          results.push(res as { changed: boolean });
        }
      }
      if (args.unset) {
        for (const field of args.unset) {
          const res = await updateFrontmatterField(context, {
            filePath: args.path,
            field,
            value: undefined,
            vaultPath: args.vaultPath,
          });
          results.push(res as { changed: boolean });
        }
      }
      const changed = results.some((r) => r.changed);
      return {
        changed,
        target: args.path,
        summary: `Frontmatter ${changed ? "updated" : "unchanged"}`,
        setKeys: args.set ? Object.keys(args.set) : [],
        unsetKeys: args.unset ?? [],
        strategy: args.strategy ?? "merge",
      };
    },
    inputExamples: [
      {
        description: "Set two fields, merging with existing frontmatter",
        input: {
          path: "Projects/Alpha.md",
          set: { status: "in-progress", owner: "behzat" },
        },
      },
      {
        description: "Remove a field",
        input: { path: "Projects/Alpha.md", unset: ["draft"] },
      },
    ],
  },
  {
    name: "notes.delete",
    title: "Delete Note",
    description:
      "Delete a note from the vault. Destructive — the file is removed from disk. Fails with `not_found` when the path does not exist. There is no undo; use with care. For folders, call `notes.move` to an archive location instead (folder deletion is not exposed as a tool to avoid accidental cascading deletes).",
    inputSchema: notesDeleteArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: DESTRUCTIVE,
    handler: async (context, rawArgs) => {
      const args = notesDeleteArgsSchema.parse(rawArgs) as NotesDeleteArgs;
      return deleteNote(context, args);
    },
  },
  {
    name: "notes.move",
    title: "Move Note Or Folder",
    description:
      "Move a note or folder to a new path. `kind:'note'` moves a single `.md` file; `kind:'folder'` moves a directory and every note beneath it. When `updateLinks:true` (the default), wiki and markdown links elsewhere in the vault that reference the moved path are rewritten to point at the new location. Destructive — overwrites or replaces existing content at the destination. Fails when the source does not exist.",
    inputSchema: notesMoveArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT_DESTRUCTIVE,
    handler: async (context, rawArgs) => {
      const args = notesMoveArgsSchema.parse(rawArgs) as NotesMoveArgs;
      if (args.kind === "folder") {
        return moveFolder(context, {
          sourceFolder: args.from,
          destinationFolder: args.to,
          updateLinks: args.updateLinks,
          vaultPath: args.vaultPath,
        });
      }
      return moveNote(context, {
        sourcePath: args.from,
        destinationPath: args.to,
        updateLinks: args.updateLinks,
        vaultPath: args.vaultPath,
      });
    },
  },
  {
    name: "notes.list",
    title: "List Notes And Folders",
    description:
      "List notes and/or folders in the vault, optionally scoped to a `folder` and filtered by creation/modification date. `include` selects what to return (`notes`, `folders`, or `both`). `recursive:true` descends into subfolders. `since`/`until` (ISO dates) combined with `dateField` (`created` or `modified`, default `modified`) narrow the result by date. Read-only.",
    inputSchema: notesListArgsSchema,
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = notesListArgsSchema.parse(rawArgs) as NotesListArgs;
      const include = args.include ?? "notes";

      if ((args.since || args.until) && include !== "folders") {
        // Date-filtered listing goes through searchByDate.
        const items = await searchByDate(context, {
          dateType: args.dateField ?? "modified",
          daysAgo: computeDaysAgo(args.since, args.until),
          operator: "within",
          vaultPath: args.vaultPath,
        });
        return items;
      }

      if (include === "folders") {
        return listFolders(context, {
          directory: args.folder,
          recursive: args.recursive,
          vaultPath: args.vaultPath,
        });
      }

      if (include === "both") {
        const [notes, folders] = await Promise.all([
          listNotes(context, {
            directory: args.folder,
            recursive: args.recursive,
            vaultPath: args.vaultPath,
          }),
          listFolders(context, {
            directory: args.folder,
            recursive: args.recursive,
            vaultPath: args.vaultPath,
          }),
        ]);
        const notesItems = (notes.items as unknown[]).map((item) => ({
          ...(item as Record<string, unknown>),
          kind: "note",
        }));
        const folderItems = (folders.items as unknown[]).map((item) => ({
          ...(item as Record<string, unknown>),
          kind: "folder",
        }));
        return {
          total: notesItems.length + folderItems.length,
          items: [...notesItems, ...folderItems],
        };
      }

      return listNotes(context, {
        directory: args.folder,
        recursive: args.recursive,
        vaultPath: args.vaultPath,
      });
    },
  },
  {
    name: "notes.search",
    title: "Search Notes",
    description:
      "Full-text search across every note in the vault. The `query` supports plain text and lightweight prefix filters: `tag:foo` restricts to notes carrying `#foo`, and `path:Journal/` restricts to notes under a folder. `contextLength` controls how many characters of surrounding context are returned per match (default 80). Read-only. For pure tag or date filtering, `tags.search` and `notes.list` are faster.",
    inputSchema: notesSearchArgsSchema,
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = notesSearchArgsSchema.parse(rawArgs) as NotesSearchArgs;
      return searchNotes(context, args);
    },
  },
];

function computeDaysAgo(since?: string, until?: string): number {
  const reference = since ?? until;
  if (!reference) {
    throw new AppError("invalid_argument", "since or until required for date-filtered listing");
  }
  const then = new Date(reference).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
  return diff;
}
