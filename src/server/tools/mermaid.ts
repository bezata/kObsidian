import { z } from "zod";
import { listMermaidBlocks, readMermaidBlock, updateMermaidBlock } from "../../domain/mermaid.js";
import { notePathSchema, positiveIntSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import { listResultSchema, looseObjectSchema, mutationResultSchema } from "../tool-schemas.js";

export const mermaidTools: ToolDefinition[] = [
  {
    name: "mermaid.blocks.list",
    title: "List Mermaid Blocks",
    description: "List fenced Mermaid blocks in a note or across the vault.",
    inputSchema: z.object({
      filePath: notePathSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    handler: (context, args) =>
      listMermaidBlocks(context, args as Parameters<typeof listMermaidBlocks>[1]),
  },
  {
    name: "mermaid.blocks.read",
    title: "Read Mermaid Block",
    description: "Read one Mermaid block with source spans, directives, and config metadata.",
    inputSchema: z.object({
      filePath: notePathSchema,
      blockId: z.string().optional(),
      index: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      readMermaidBlock(context, args as Parameters<typeof readMermaidBlock>[1]),
  },
  {
    name: "mermaid.blocks.update",
    title: "Update Mermaid Block",
    description: "Replace one fenced Mermaid block source-preservingly.",
    inputSchema: z.object({
      filePath: notePathSchema,
      source: z.string(),
      blockId: z.string().optional(),
      index: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      updateMermaidBlock(context, args as Parameters<typeof updateMermaidBlock>[1]),
  },
];
