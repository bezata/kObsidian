import type { DomainContext } from "../../domain/context.js";
import {
  readDataviewJsBlocks,
  readDataviewQueryBlocks,
  updateDataviewJsBlock,
  updateDataviewQueryBlock,
} from "../../domain/dataview.js";
import { listMermaidBlocks, readMermaidBlock, updateMermaidBlock } from "../../domain/mermaid.js";
import { AppError } from "../../lib/errors.js";
import {
  type BlockLanguage,
  type BlocksListArgs,
  type BlocksReadArgs,
  type BlocksUpdateArgs,
  blockReadOutputSchema,
  blocksListArgsSchema,
  blocksListOutputSchema,
  blocksReadArgsSchema,
  blocksUpdateArgsSchema,
} from "../../schema/blocks.js";
import type { ToolDefinition } from "../tool-definition.js";
import { IDEMPOTENT_DESTRUCTIVE, READ_ONLY, mutationResultSchema } from "../tool-schemas.js";

type ListItem = {
  filePath?: string;
  id?: string;
  index?: number;
  [key: string]: unknown;
};

async function listForLanguage(
  context: DomainContext,
  language: BlockLanguage,
  filePath: string | undefined,
  vaultPath: string | undefined,
): Promise<ListItem[]> {
  if (language === "mermaid") {
    const result = await listMermaidBlocks(context, { filePath, vaultPath });
    return result.items.map((item, index) => ({ ...item, language, index }));
  }

  // Dataview language families only expose per-file readers — when no filePath
  // is given, this is a no-op and the caller should target a specific file.
  // (Cross-vault scanning for Dataview blocks is not implemented in the domain
  // layer today; this mirrors the prior behaviour of dataview.query.read /
  // dataview.js.read, which both required filePath.)
  if (!filePath) {
    return [];
  }

  if (language === "dataview") {
    const result = await readDataviewQueryBlocks(context, { filePath, vaultPath });
    return result.items.map((item, index) => ({
      ...(item as Record<string, unknown>),
      filePath,
      language,
      index,
    }));
  }

  const result = await readDataviewJsBlocks(context, { filePath, vaultPath });
  return result.items.map((item, index) => ({
    ...(item as Record<string, unknown>),
    filePath,
    language,
    index,
  }));
}

export const blocksTools: ToolDefinition[] = [
  {
    name: "blocks.list",
    title: "List Fenced Blocks",
    description:
      "List fenced code blocks of the supported knowledge-base languages (`dataview`, `dataviewjs`, `mermaid`) in a single note or across the vault. Use this to discover what DQL, DataviewJS, or Mermaid blocks exist before reading or updating them. Omit `language` to list blocks of all three types in one call. Vault-wide scanning is only supported for Mermaid; for Dataview languages a `filePath` is required. Returns `{total, items}` where each item carries at minimum `{filePath, language, index, id?}`. Read-only.",
    inputSchema: blocksListArgsSchema,
    outputSchema: blocksListOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = blocksListArgsSchema.parse(rawArgs) as BlocksListArgs;
      const languages: BlockLanguage[] = args.language
        ? [args.language]
        : ["dataview", "dataviewjs", "mermaid"];
      const items: ListItem[] = [];
      for (const language of languages) {
        items.push(...(await listForLanguage(context, language, args.filePath, args.vaultPath)));
      }
      return { total: items.length, items, filePath: args.filePath };
    },
  },
  {
    name: "blocks.read",
    title: "Read Fenced Block",
    description:
      "Read one fenced block's source and language-specific metadata. Locate the block by `blockId` (preferred, stable) or `index` (0-based within the language group in the file; defaults to 0). `language` is required so the tool can dispatch to the correct parser and return the right metadata (Mermaid directives, Dataview DQL parts, etc.). Fails with `not_found` when no block matches the locator. Read-only.",
    inputSchema: blocksReadArgsSchema,
    outputSchema: blockReadOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = blocksReadArgsSchema.parse(rawArgs) as BlocksReadArgs;
      if (args.language === "mermaid") {
        const block = await readMermaidBlock(context, {
          filePath: args.filePath,
          blockId: args.blockId,
          index: args.index,
          vaultPath: args.vaultPath,
        });
        return { ...block, language: args.language };
      }

      const readAll = args.language === "dataview" ? readDataviewQueryBlocks : readDataviewJsBlocks;
      const all = await readAll(context, { filePath: args.filePath, vaultPath: args.vaultPath });
      const items = all.items as Array<{ id?: string; [k: string]: unknown }>;
      const block = args.blockId
        ? items.find((item) => item.id === args.blockId)
        : items[args.index ?? 0];
      if (!block) {
        throw new AppError("not_found", `${args.language} block not found in ${args.filePath}`);
      }
      return { ...block, filePath: args.filePath, language: args.language };
    },
  },
  {
    name: "blocks.update",
    title: "Update Fenced Block",
    description:
      "Replace one fenced block's body source-preservingly — the surrounding fences, language tag, and neighbouring content are untouched. Locate the block by `blockId` or `index`. `language` acts as a guard: if the located block is not of the declared language, the update fails. `source` is the replacement body WITHOUT the surrounding ``` fences. Idempotent — re-running with identical inputs is a no-op on the file contents. Destructive — overwrites the previous block body in place.",
    inputSchema: blocksUpdateArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT_DESTRUCTIVE,
    handler: async (context, rawArgs) => {
      const args = blocksUpdateArgsSchema.parse(rawArgs) as BlocksUpdateArgs;
      const common = {
        filePath: args.filePath,
        source: args.source,
        blockId: args.blockId,
        index: args.index,
        vaultPath: args.vaultPath,
      };
      if (args.language === "mermaid") {
        return updateMermaidBlock(context, common);
      }
      if (args.language === "dataview") {
        return updateDataviewQueryBlock(context, common);
      }
      return updateDataviewJsBlock(context, common);
    },
    inputExamples: [
      {
        description: "Replace the first Mermaid diagram in a note",
        input: {
          filePath: "Diagrams/system-overview.md",
          language: "mermaid",
          index: 0,
          source: "flowchart TD\n  A --> B",
        },
      },
      {
        description: "Update a DQL query block by stable id",
        input: {
          filePath: "Dashboards/Inbox.md",
          language: "dataview",
          blockId: "inbox-open",
          source: "TASK\nFROM #inbox\nWHERE !completed",
        },
      },
    ],
  },
];
