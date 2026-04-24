import { z } from "zod";
import { notePathSchema, positiveIntSchema } from "./primitives.js";

const deckShape = z.object({
  part: z.literal("deck"),
  filePath: notePathSchema,
  vaultPath: z.string().optional(),
});

const slidesShape = z.object({
  part: z.literal("slides"),
  filePath: notePathSchema,
  vaultPath: z.string().optional(),
});

const slideShape = z.object({
  part: z.literal("slide"),
  filePath: notePathSchema,
  slideId: z
    .string()
    .optional()
    .describe("Stable slide id if the deck uses them. Takes precedence over `index`."),
  index: positiveIntSchema.optional().describe("0-based slide index. Defaults to 0."),
  vaultPath: z.string().optional(),
});

export const marpReadArgsSchema = z
  .discriminatedUnion("part", [deckShape, slidesShape, slideShape])
  .describe(
    "Discriminated union on `part`: `deck` = full deck with frontmatter + slides + directives; `slides` = list of slide summaries (separator and directive metadata); `slide` = one slide's full source (locate via `slideId` or `index`).",
  );
export type MarpReadArgs = z.input<typeof marpReadArgsSchema>;

const slideUpdateShape = z.object({
  part: z.literal("slide"),
  filePath: notePathSchema,
  source: z
    .string()
    .describe("Replacement body for the targeted slide WITHOUT the surrounding `---` separators."),
  slideId: z.string().optional(),
  index: positiveIntSchema.optional(),
  vaultPath: z.string().optional(),
});

const frontmatterUpdateShape = z.object({
  part: z.literal("frontmatter"),
  filePath: notePathSchema,
  fields: z
    .record(z.string(), z.unknown())
    .describe(
      "Map of frontmatter fields to set (or update). Unspecified fields are preserved; pass `null` to a field to unset it.",
    ),
  vaultPath: z.string().optional(),
});

export const marpUpdateArgsSchema = z
  .discriminatedUnion("part", [slideUpdateShape, frontmatterUpdateShape])
  .describe(
    "Discriminated union on `part`: `slide` replaces one slide's body in place; `frontmatter` merges new field values into the deck's frontmatter.",
  );
export type MarpUpdateArgs = z.input<typeof marpUpdateArgsSchema>;

export const marpDeckOutputSchema = z
  .object({
    filePath: z.string(),
    frontmatter: z.record(z.string(), z.unknown()),
    slides: z.array(z.record(z.string(), z.unknown())),
    directives: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const marpSlidesListOutputSchema = z
  .object({
    filePath: z.string(),
    total: z.number().int().nonnegative(),
    items: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

export const marpSlideOutputSchema = z
  .object({
    filePath: z.string(),
    index: z.number().int().nonnegative(),
    source: z.string(),
  })
  .passthrough();
