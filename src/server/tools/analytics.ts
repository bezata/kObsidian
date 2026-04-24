import { z } from "zod";
import { getVaultStatistics } from "../../domain/statistics.js";
import type { ToolDefinition } from "../tool-definition.js";
import { READ_ONLY, looseObjectSchema } from "../tool-schemas.js";

export const analyticsTools: ToolDefinition[] = [
  {
    name: "stats.vault",
    title: "Vault Statistics",
    description:
      "Return aggregate statistics for the whole vault: total note count, total word count, total character count, total task count (open and completed), tag usage summary, and file size footprint. Read-only, scans every `.md` file. For per-note statistics use `notes.read` with `include: ['stats']`.",
    inputSchema: z
      .object({
        vaultPath: z.string().optional(),
      })
      .strict(),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: (context, args) =>
      getVaultStatistics(context, args as Parameters<typeof getVaultStatistics>[1]),
  },
];
