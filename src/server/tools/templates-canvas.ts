import { z } from "zod";
import {
  createNoteFromTemplater,
  insertTemplaterTemplate,
  renderTemplaterTemplate,
} from "../../domain/api-tools.js";
import {
  addCanvasEdge,
  addCanvasNode,
  createCanvas,
  getCanvasNodeConnections,
  parseCanvas,
  removeCanvasNode,
} from "../../domain/canvas.js";
import { createNoteFromTemplate, expandTemplate, listTemplates } from "../../domain/templates.js";
import { canvasPathSchema, notePathSchema, positiveIntSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  DESTRUCTIVE,
  IDEMPOTENT,
  OPEN_WORLD,
  READ_ONLY,
  READ_ONLY_OPEN_WORLD,
  listResultSchema,
  looseObjectSchema,
  mutationResultSchema,
} from "../tool-schemas.js";

export const templateAndCanvasTools: ToolDefinition[] = [
  {
    name: "templates.expand",
    title: "Expand Template",
    description: "Expand filesystem template variables into content.",
    inputSchema: z.object({
      templatePath: notePathSchema,
      variables: z.record(z.string(), z.string()).optional(),
      filename: z.string().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: (context, args) =>
      expandTemplate(context, args as Parameters<typeof expandTemplate>[1]),
  },
  {
    name: "templates.createNote",
    title: "Create Note From Template",
    description: "Create a note from a filesystem template.",
    inputSchema: z.object({
      templatePath: notePathSchema,
      targetPath: notePathSchema,
      variables: z.record(z.string(), z.string()).optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      createNoteFromTemplate(context, args as Parameters<typeof createNoteFromTemplate>[1]),
  },
  {
    name: "templates.list",
    title: "List Templates",
    description: "List markdown templates in a folder.",
    inputSchema: z.object({
      templateFolder: z.string().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: (context, args) => listTemplates(context, args as Parameters<typeof listTemplates>[1]),
  },
  {
    name: "templates.renderTemplater",
    title: "Render Templater Template",
    description: "Render a Templater template via the Obsidian API.",
    inputSchema: z.object({ templateFile: z.string().min(1), targetFile: z.string().optional() }),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: (context, args) =>
      renderTemplaterTemplate(context, args as Parameters<typeof renderTemplaterTemplate>[1]),
  },
  {
    name: "templates.createNoteTemplater",
    title: "Create Note From Templater",
    description: "Create a note from a Templater template via the Obsidian API.",
    inputSchema: z.object({
      templateFile: z.string().min(1),
      targetFile: z.string().min(1),
      openFile: z.boolean().optional(),
    }),
    outputSchema: looseObjectSchema,
    annotations: OPEN_WORLD,
    handler: (context, args) =>
      createNoteFromTemplater(context, args as Parameters<typeof createNoteFromTemplater>[1]),
  },
  {
    name: "templates.insertTemplater",
    title: "Insert Templater Template",
    description: "Insert a Templater template into the active note.",
    inputSchema: z.object({ templateFile: z.string().min(1), activeFile: z.boolean().optional() }),
    outputSchema: looseObjectSchema,
    annotations: OPEN_WORLD,
    handler: (context, args) =>
      insertTemplaterTemplate(context, args as Parameters<typeof insertTemplaterTemplate>[1]),
  },
  {
    name: "canvas.create",
    title: "Create Canvas",
    description: "Create a new empty Obsidian canvas (.canvas) file.",
    inputSchema: z.object({
      filePath: canvasPathSchema,
      overwrite: z.boolean().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => createCanvas(context, args as Parameters<typeof createCanvas>[1]),
  },
  {
    name: "canvas.parse",
    title: "Parse Canvas",
    description: "Parse an Obsidian canvas file.",
    inputSchema: z.object({ filePath: z.string().min(1), vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: (context, args) => parseCanvas(context, args as Parameters<typeof parseCanvas>[1]),
  },
  {
    name: "canvas.addNode",
    title: "Add Canvas Node",
    description: "Add a text or file node to an Obsidian canvas.",
    inputSchema: z.object({
      filePath: z.string().min(1),
      nodeType: z.enum(["text", "file"]),
      content: z.string().min(1),
      x: z.number(),
      y: z.number(),
      width: positiveIntSchema.optional(),
      height: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT,
    handler: (context, args) => addCanvasNode(context, args as Parameters<typeof addCanvasNode>[1]),
  },
  {
    name: "canvas.addEdge",
    title: "Add Canvas Edge",
    description: "Connect two nodes in a canvas.",
    inputSchema: z.object({
      filePath: z.string().min(1),
      fromNode: z.string().min(1),
      toNode: z.string().min(1),
      label: z.string().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT,
    handler: (context, args) => addCanvasEdge(context, args as Parameters<typeof addCanvasEdge>[1]),
  },
  {
    name: "canvas.removeNode",
    title: "Remove Canvas Node",
    description: "Remove a node and its edges from a canvas.",
    inputSchema: z.object({
      filePath: z.string().min(1),
      nodeId: z.string().min(1),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    annotations: DESTRUCTIVE,
    handler: (context, args) =>
      removeCanvasNode(context, args as Parameters<typeof removeCanvasNode>[1]),
  },
  {
    name: "canvas.connections",
    title: "Canvas Node Connections",
    description: "Get incoming and outgoing edges for a canvas node.",
    inputSchema: z.object({
      filePath: z.string().min(1),
      nodeId: z.string().min(1),
      vaultPath: z.string().optional(),
    }),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: (context, args) =>
      getCanvasNodeConnections(context, args as Parameters<typeof getCanvasNodeConnections>[1]),
  },
];
