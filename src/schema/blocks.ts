import { z } from "zod";
import { notePathSchema, positiveIntSchema } from "./primitives.js";

// kObsidian currently understands three fenced-block languages: raw Dataview
// DQL queries (`dataview`), DataviewJS scripts (`dataviewjs`), and Mermaid
// diagrams (`mermaid`). The `blocks.*` tools treat these uniformly — the
// language is a parameter, not a separate tool per language.
export const blockLanguageSchema = z
  .enum(["dataview", "dataviewjs", "mermaid"])
  .describe(
    "Fenced-code-block language. `dataview` = raw DQL query block; `dataviewjs` = inline JavaScript block; `mermaid` = diagram block.",
  );
export type BlockLanguage = z.infer<typeof blockLanguageSchema>;

// A block can be located either by its stable id (`^blockId` anchor or a
// Dataview-injected id) or by its 0-based index within its language group in
// the file. Provide at least one; `blockId` wins when both are supplied.
const blockLocatorShape = {
  blockId: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Stable block identifier (e.g. `^abc123`). Takes precedence over `index` when both are given.",
    ),
  index: positiveIntSchema
    .optional()
    .describe(
      "0-based position of the block within its language group in the file. Use when no blockId is available. Defaults to 0 (the first block).",
    ),
};

export const blocksListArgsSchema = z
  .object({
    filePath: notePathSchema
      .optional()
      .describe(
        "Scope the listing to a single note. Omit to scan the whole vault (slower; useful for discovery).",
      ),
    language: blockLanguageSchema
      .optional()
      .describe("Filter to one language. Omit to list blocks of all supported languages."),
    vaultPath: z
      .string()
      .optional()
      .describe("Override the ambient OBSIDIAN_VAULT_PATH for this call. Rarely needed."),
  })
  .strict()
  .describe("Arguments for `blocks.list`.");
export type BlocksListArgs = z.input<typeof blocksListArgsSchema>;

export const blocksReadArgsSchema = z
  .object({
    filePath: notePathSchema.describe("Path of the note containing the block."),
    language: blockLanguageSchema.describe(
      "Language of the block to read (required so `blocks.read` can dispatch to the correct parser).",
    ),
    ...blockLocatorShape,
    vaultPath: z.string().optional(),
  })
  .strict()
  .describe("Arguments for `blocks.read`.");
export type BlocksReadArgs = z.input<typeof blocksReadArgsSchema>;

export const blocksUpdateArgsSchema = z
  .object({
    filePath: notePathSchema.describe("Path of the note containing the block."),
    language: blockLanguageSchema.describe(
      "Language of the block being updated. Acts as a guard: update fails if the targeted block's real language does not match.",
    ),
    source: z
      .string()
      .describe(
        "Replacement source for the block body, WITHOUT the surrounding ``` fences. Surrounding newlines and indentation are preserved by the tool.",
      ),
    ...blockLocatorShape,
    vaultPath: z.string().optional(),
  })
  .strict()
  .describe("Arguments for `blocks.update`.");
export type BlocksUpdateArgs = z.input<typeof blocksUpdateArgsSchema>;

const blockSummarySchema = z
  .object({
    filePath: z.string().describe("Vault-relative path of the note the block lives in."),
    language: blockLanguageSchema,
    id: z
      .string()
      .optional()
      .describe("Stable id if the block has one (`^blockId` anchor or Dataview-injected)."),
    index: z.number().int().nonnegative().describe("0-based index within its language group."),
  })
  .passthrough()
  .describe(
    "Minimal block summary used in list results. The underlying per-language representation may add more fields (spans, directives, config); see the individual language docs.",
  );

export const blocksListOutputSchema = z
  .object({
    total: z.number().int().nonnegative().describe("Number of blocks returned."),
    items: z.array(blockSummarySchema).describe("The listed blocks."),
    filePath: z
      .string()
      .optional()
      .describe("Echoed from the input when a single-file scope was used."),
  })
  .passthrough();

export const blockReadOutputSchema = z
  .object({
    filePath: z.string(),
    language: blockLanguageSchema,
    id: z.string().optional(),
    source: z.string().describe("The block's body source (without fences)."),
  })
  .passthrough()
  .describe(
    "One block with its full source and any per-language metadata (directives, spans, config).",
  );
