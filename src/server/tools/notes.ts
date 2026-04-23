import { z } from "zod";
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
import {
  folderPathSchema,
  mergeStrategySchema,
  notePathSchema,
  positiveIntSchema,
} from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import { listResultSchema, looseObjectSchema, mutationResultSchema } from "../tool-schemas.js";

export const noteTools: ToolDefinition[] = [
  {
    name: "notes.read",
    title: "Read Note",
    description: "Read a note from the vault with parsed metadata.",
    inputSchema: z.object({ path: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    handler: (context, args) => readNote(context, args as Parameters<typeof readNote>[1]),
  },
  {
    name: "notes.create",
    title: "Create Note",
    description: "Create a new note using filesystem-first behavior.",
    inputSchema: z.object({
      path: notePathSchema,
      content: z.string(),
      overwrite: z.boolean().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => createNote(context, args as Parameters<typeof createNote>[1]),
  },
  {
    name: "notes.update",
    title: "Update Note",
    description: "Update an existing note, replacing or appending content.",
    inputSchema: z.object({
      path: notePathSchema,
      content: z.string(),
      createIfNotExists: z.boolean().optional(),
      mergeStrategy: mergeStrategySchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => updateNote(context, args as Parameters<typeof updateNote>[1]),
  },
  {
    name: "notes.delete",
    title: "Delete Note",
    description: "Delete a note from the vault.",
    inputSchema: z.object({ path: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => deleteNote(context, args as Parameters<typeof deleteNote>[1]),
  },
  {
    name: "notes.search",
    title: "Search Notes",
    description: "Search notes by text with lightweight support for tag: and path: filters.",
    inputSchema: z.object({
      query: z.string().min(1),
      contextLength: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    handler: (context, args) => searchNotes(context, args as Parameters<typeof searchNotes>[1]),
  },
  {
    name: "notes.searchByDate",
    title: "Search Notes By Date",
    description: "List notes by created or modified date.",
    inputSchema: z.object({
      dateType: z.enum(["created", "modified"]).optional(),
      daysAgo: positiveIntSchema.optional(),
      operator: z.enum(["within", "exactly"]).optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    handler: (context, args) => searchByDate(context, args as Parameters<typeof searchByDate>[1]),
  },
  {
    name: "notes.list",
    title: "List Notes",
    description: "List notes in the vault or a folder.",
    inputSchema: z.object({
      directory: folderPathSchema,
      recursive: z.boolean().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    handler: (context, args) => listNotes(context, args as Parameters<typeof listNotes>[1]),
  },
  {
    name: "notes.listFolders",
    title: "List Folders",
    description: "List folders in the vault.",
    inputSchema: z.object({
      directory: folderPathSchema,
      recursive: z.boolean().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    handler: (context, args) => listFolders(context, args as Parameters<typeof listFolders>[1]),
  },
  {
    name: "notes.move",
    title: "Move Note",
    description: "Move a note and optionally update links that reference it.",
    inputSchema: z.object({
      sourcePath: notePathSchema,
      destinationPath: notePathSchema,
      updateLinks: z.boolean().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => moveNote(context, args as Parameters<typeof moveNote>[1]),
  },
  {
    name: "notes.createFolder",
    title: "Create Folder",
    description: "Create a folder in the vault.",
    inputSchema: z.object({ folderPath: z.string().min(1), vaultPath: z.string().optional() }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => createFolder(context, args as Parameters<typeof createFolder>[1]),
  },
  {
    name: "notes.moveFolder",
    title: "Move Folder",
    description: "Move a folder and optionally update links inside the vault.",
    inputSchema: z.object({
      sourceFolder: z.string().min(1),
      destinationFolder: z.string().min(1),
      updateLinks: z.boolean().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => moveFolder(context, args as Parameters<typeof moveFolder>[1]),
  },
  {
    name: "notes.info",
    title: "Note Info",
    description:
      "Get note metadata and lightweight statistics without loading the result into a client-specific schema.",
    inputSchema: z.object({ path: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    handler: (context, args) => getNoteInfo(context, args as Parameters<typeof getNoteInfo>[1]),
  },
  {
    name: "notes.insertAfterHeading",
    title: "Insert After Heading",
    description: "Insert content immediately after a markdown heading.",
    inputSchema: z.object({
      filePath: notePathSchema,
      heading: z.string().min(1),
      content: z.string(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      insertAfterHeading(context, args as Parameters<typeof insertAfterHeading>[1]),
  },
  {
    name: "notes.insertAfterBlock",
    title: "Insert After Block",
    description: "Insert content after a block reference.",
    inputSchema: z.object({
      filePath: notePathSchema,
      blockId: z.string().min(1),
      content: z.string(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      insertAfterBlock(context, args as Parameters<typeof insertAfterBlock>[1]),
  },
  {
    name: "notes.updateFrontmatter",
    title: "Update Frontmatter",
    description: "Create or update a frontmatter field.",
    inputSchema: z.object({
      filePath: notePathSchema,
      field: z.string().min(1),
      value: z.unknown(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      updateFrontmatterField(context, args as Parameters<typeof updateFrontmatterField>[1]),
  },
  {
    name: "notes.append",
    title: "Append To Note",
    description: "Append content to the end of a note.",
    inputSchema: z.object({
      filePath: notePathSchema,
      content: z.string(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => appendToNote(context, args as Parameters<typeof appendToNote>[1]),
  },
];
