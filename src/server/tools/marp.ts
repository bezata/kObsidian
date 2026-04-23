import { z } from "zod";
import {
  listMarpSlides,
  readMarpDeck,
  readMarpSlide,
  updateMarpFrontmatter,
  updateMarpSlide,
} from "../../domain/marp.js";
import { notePathSchema, positiveIntSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import { listResultSchema, looseObjectSchema, mutationResultSchema } from "../tool-schemas.js";

export const marpTools: ToolDefinition[] = [
  {
    name: "marp.deck.read",
    title: "Read Marp Deck",
    description: "Read Marp deck frontmatter, slides, directives, and source spans.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    handler: (context, args) => readMarpDeck(context, args as Parameters<typeof readMarpDeck>[1]),
  },
  {
    name: "marp.slides.list",
    title: "List Marp Slides",
    description: "List Marp slides with separator and directive metadata.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: listResultSchema,
    handler: (context, args) =>
      listMarpSlides(context, args as Parameters<typeof listMarpSlides>[1]),
  },
  {
    name: "marp.slides.read",
    title: "Read Marp Slide",
    description: "Read one Marp slide source-preservingly.",
    inputSchema: z.object({
      filePath: notePathSchema,
      slideId: z.string().optional(),
      index: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: looseObjectSchema,
    handler: (context, args) => readMarpSlide(context, args as Parameters<typeof readMarpSlide>[1]),
  },
  {
    name: "marp.slides.update",
    title: "Update Marp Slide",
    description: "Replace one Marp slide body without rewriting neighboring slides.",
    inputSchema: z.object({
      filePath: notePathSchema,
      source: z.string(),
      slideId: z.string().optional(),
      index: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      updateMarpSlide(context, args as Parameters<typeof updateMarpSlide>[1]),
  },
  {
    name: "marp.frontmatter.update",
    title: "Update Marp Frontmatter",
    description: "Update selected Marp deck frontmatter fields while preserving unrelated source.",
    inputSchema: z.object({
      filePath: notePathSchema,
      fields: z.record(z.string(), z.unknown()),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      updateMarpFrontmatter(context, args as Parameters<typeof updateMarpFrontmatter>[1]),
  },
];
