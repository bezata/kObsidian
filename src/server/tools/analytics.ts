import { z } from "zod";
import { getNoteStatistics, getVaultStatistics } from "../../domain/statistics.js";
import { notePathSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import { READ_ONLY, looseObjectSchema } from "../tool-schemas.js";

export const analyticsTools: ToolDefinition[] = [
  {
    name: "stats.note",
    title: "Note Statistics",
    description: "Get statistics for a single note.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: (context, args) =>
      getNoteStatistics(context, args as Parameters<typeof getNoteStatistics>[1]),
  },
  {
    name: "stats.vault",
    title: "Vault Statistics",
    description: "Get aggregate statistics for the whole vault.",
    inputSchema: z.object({ vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: (context, args) =>
      getVaultStatistics(context, args as Parameters<typeof getVaultStatistics>[1]),
  },
];
