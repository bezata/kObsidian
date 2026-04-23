import { z } from "zod";
import {
  executeDataviewQuery,
  listNotesByFolderDql,
  listNotesByTagDql,
  tableQueryDql,
} from "../../domain/api-tools.js";
import {
  addDataviewField,
  extractDataviewFieldsFromFile,
  readDataviewIndex,
  readDataviewJsBlocks,
  readDataviewQueryBlocks,
  removeDataviewField,
  searchByDataviewField,
  updateDataviewJsBlock,
  updateDataviewQueryBlock,
} from "../../domain/dataview.js";
import { notePathSchema, positiveIntSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import { listResultSchema, looseObjectSchema, mutationResultSchema } from "../tool-schemas.js";

export const dataviewTools: ToolDefinition[] = [
  {
    name: "dataview.index.read",
    title: "Read Dataview Index",
    description: "Read page, list-item, task, DQL, and DataviewJS metadata from a note.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      readDataviewIndex(context, args as Parameters<typeof readDataviewIndex>[1]),
  },
  {
    name: "dataview.fields.extract",
    title: "Extract Dataview Fields",
    description: "Extract scoped Dataview fields from a note.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: listResultSchema,
    handler: (context, args) =>
      extractDataviewFieldsFromFile(
        context,
        args as Parameters<typeof extractDataviewFieldsFromFile>[1],
      ),
  },
  {
    name: "dataview.fields.search",
    title: "Search Dataview Fields",
    description: "Search notes by Dataview field key and optional value.",
    inputSchema: z.object({
      key: z.string().min(1),
      value: z.unknown().optional(),
      valueType: z.enum(["string", "number", "boolean", "date", "link", "list"]).optional(),
      scope: z.enum(["page", "list", "task", "all"]).optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      searchByDataviewField(context, args as Parameters<typeof searchByDataviewField>[1]),
  },
  {
    name: "dataview.fields.add",
    title: "Add Dataview Field",
    description: "Insert a Dataview field into a note.",
    inputSchema: z.object({
      filePath: notePathSchema,
      key: z.string().min(1),
      value: z.unknown(),
      syntaxType: z.enum(["full-line", "bracket", "paren"]).optional(),
      insertAt: z.enum(["start", "end", "afterFrontmatter"]).optional(),
      scope: z.enum(["page", "list", "task"]).optional(),
      lineNumber: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      addDataviewField(context, args as Parameters<typeof addDataviewField>[1]),
  },
  {
    name: "dataview.fields.remove",
    title: "Remove Dataview Field",
    description: "Remove a Dataview field from a note.",
    inputSchema: z.object({
      filePath: notePathSchema,
      key: z.string().min(1),
      lineNumber: positiveIntSchema.optional(),
      scope: z.enum(["page", "list", "task", "all"]).optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      removeDataviewField(context, args as Parameters<typeof removeDataviewField>[1]),
  },
  {
    name: "dataview.query.read",
    title: "Read Dataview Query Blocks",
    description: "Extract fenced dataview DQL blocks from a note.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: listResultSchema,
    handler: (context, args) =>
      readDataviewQueryBlocks(context, args as Parameters<typeof readDataviewQueryBlocks>[1]),
  },
  {
    name: "dataview.query.update",
    title: "Update Dataview Query Block",
    description: "Replace one fenced dataview DQL block source-preservingly.",
    inputSchema: z.object({
      filePath: notePathSchema,
      source: z.string(),
      blockId: z.string().optional(),
      index: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      updateDataviewQueryBlock(context, args as Parameters<typeof updateDataviewQueryBlock>[1]),
  },
  {
    name: "dataview.js.read",
    title: "Read DataviewJS Blocks",
    description: "Extract fenced dataviewjs blocks from a note without executing them.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: listResultSchema,
    handler: (context, args) =>
      readDataviewJsBlocks(context, args as Parameters<typeof readDataviewJsBlocks>[1]),
  },
  {
    name: "dataview.js.update",
    title: "Update DataviewJS Block",
    description: "Replace one fenced dataviewjs block source-preservingly.",
    inputSchema: z.object({
      filePath: notePathSchema,
      source: z.string(),
      blockId: z.string().optional(),
      index: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      updateDataviewJsBlock(context, args as Parameters<typeof updateDataviewJsBlock>[1]),
  },
  {
    name: "dataview.query",
    title: "Run Dataview Query",
    description: "Execute a Dataview Query Language (DQL) query through the Obsidian API.",
    inputSchema: z.object({ query: z.string().min(1) }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      executeDataviewQuery(context, args as Parameters<typeof executeDataviewQuery>[1]),
  },
  {
    name: "dataview.listByTag",
    title: "List Notes By Tag (DQL)",
    description: "Run a DQL LIST query for a tag.",
    inputSchema: z.object({
      tag: z.string().min(1),
      whereClause: z.string().optional(),
      sortBy: z.string().optional(),
      limit: positiveIntSchema.optional(),
    }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      listNotesByTagDql(context, args as Parameters<typeof listNotesByTagDql>[1]),
  },
  {
    name: "dataview.listByFolder",
    title: "List Notes By Folder (DQL)",
    description: "Run a DQL LIST query for a folder.",
    inputSchema: z.object({
      folder: z.string().min(1),
      whereClause: z.string().optional(),
      sortBy: z.string().optional(),
      limit: positiveIntSchema.optional(),
    }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      listNotesByFolderDql(context, args as Parameters<typeof listNotesByFolderDql>[1]),
  },
  {
    name: "dataview.table",
    title: "Table Query (DQL)",
    description: "Run a DQL TABLE query.",
    inputSchema: z.object({
      fields: z.array(z.string().min(1)).min(1),
      fromClause: z.string().optional(),
      whereClause: z.string().optional(),
      sortBy: z.string().optional(),
      limit: positiveIntSchema.optional(),
    }),
    outputSchema: looseObjectSchema,
    handler: (context, args) => tableQueryDql(context, args as Parameters<typeof tableQueryDql>[1]),
  },
];
