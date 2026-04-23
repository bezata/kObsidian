import { z } from "zod";
import {
  analyzeLinkHealth,
  findBrokenLinks,
  findHubNotes,
  findOrphanedNotes,
  getBacklinks,
  getLinkGraph,
  getNoteConnections,
  getOutgoingLinks,
} from "../../domain/links.js";
import { notePathSchema, positiveIntSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import { listResultSchema, looseObjectSchema } from "../tool-schemas.js";

export const linkTools: ToolDefinition[] = [
  {
    name: "links.backlinks",
    title: "Get Backlinks",
    description: "Find notes that link to a target note.",
    inputSchema: z.object({
      path: notePathSchema,
      includeContext: z.boolean().optional(),
      contextLength: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    handler: (context, args) => getBacklinks(context, args as Parameters<typeof getBacklinks>[1]),
  },
  {
    name: "links.outgoing",
    title: "Get Outgoing Links",
    description: "Extract links referenced by a note.",
    inputSchema: z.object({
      path: notePathSchema,
      checkValidity: z.boolean().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    handler: (context, args) =>
      getOutgoingLinks(context, args as Parameters<typeof getOutgoingLinks>[1]),
  },
  {
    name: "links.broken",
    title: "Find Broken Links",
    description: "Find broken note links in the vault or a folder.",
    inputSchema: z.object({ directory: z.string().optional(), vaultPath: z.string().optional() }),
    outputSchema: listResultSchema,
    handler: (context, args) =>
      findBrokenLinks(context, args as Parameters<typeof findBrokenLinks>[1]),
  },
  {
    name: "links.graph",
    title: "Get Link Graph",
    description: "Build the vault link graph.",
    inputSchema: z.object({ vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    handler: (context, args) => getLinkGraph(context, args as Parameters<typeof getLinkGraph>[1]),
  },
  {
    name: "links.orphaned",
    title: "Find Orphaned Notes",
    description: "Find notes with no incoming or outgoing links.",
    inputSchema: z.object({ vaultPath: z.string().optional() }),
    outputSchema: listResultSchema,
    handler: (context, args) =>
      findOrphanedNotes(context, args as Parameters<typeof findOrphanedNotes>[1]),
  },
  {
    name: "links.hubs",
    title: "Find Hub Notes",
    description: "Find notes with many outgoing links.",
    inputSchema: z.object({
      minOutlinks: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    handler: (context, args) => findHubNotes(context, args as Parameters<typeof findHubNotes>[1]),
  },
  {
    name: "links.health",
    title: "Analyze Link Health",
    description: "Summarize link density and broken-link metrics.",
    inputSchema: z.object({ vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      analyzeLinkHealth(context, args as Parameters<typeof analyzeLinkHealth>[1]),
  },
  {
    name: "links.connections",
    title: "Get Note Connections",
    description: "Explore direct and multi-hop note connections.",
    inputSchema: z.object({
      noteName: z.string().min(1),
      depth: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      getNoteConnections(context, args as Parameters<typeof getNoteConnections>[1]),
  },
];
