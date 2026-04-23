import { z } from "zod";
import { readNote } from "../../domain/notes.js";
import {
  addTags,
  extractAllTags,
  listTags,
  removeTags,
  searchByTag,
  updateTags,
} from "../../domain/tags.js";
import { notePathSchema, tagSchema, tagsSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  READ_ONLY,
  listResultSchema,
  looseObjectSchema,
  mutationResultSchema,
} from "../tool-schemas.js";

export const tagTools: ToolDefinition[] = [
  {
    name: "tags.analyze",
    title: "Analyze Tags",
    description: "Extract frontmatter and inline tags from a note.",
    inputSchema: z.object({ path: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: async (context, args) => {
      const note = await readNote(context, args as { path: string; vaultPath?: string });
      return { path: note.path, ...extractAllTags(note.content) };
    },
  },
  {
    name: "tags.add",
    title: "Add Tags",
    description: "Add tags to a note frontmatter block.",
    inputSchema: z.object({
      path: notePathSchema,
      tags: tagsSchema,
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => addTags(context, args as Parameters<typeof addTags>[1]),
  },
  {
    name: "tags.update",
    title: "Update Tags",
    description: "Replace or merge a note's frontmatter tags.",
    inputSchema: z.object({
      path: notePathSchema,
      tags: tagsSchema,
      merge: z.boolean().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => updateTags(context, args as Parameters<typeof updateTags>[1]),
  },
  {
    name: "tags.remove",
    title: "Remove Tags",
    description: "Remove tags from frontmatter.",
    inputSchema: z.object({
      path: notePathSchema,
      tags: tagsSchema,
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => removeTags(context, args as Parameters<typeof removeTags>[1]),
  },
  {
    name: "tags.search",
    title: "Search By Tag",
    description: "Find notes that contain a tag in frontmatter or inline content.",
    inputSchema: z.object({ tag: tagSchema, vaultPath: z.string().optional() }),
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: (context, args) => searchByTag(context, args as Parameters<typeof searchByTag>[1]),
  },
  {
    name: "tags.list",
    title: "List Tags",
    description: "List unique tags used across the vault.",
    inputSchema: z.object({
      includeCounts: z.boolean().optional(),
      sortBy: z.enum(["name", "count"]).optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: (context, args) => listTags(context, args as Parameters<typeof listTags>[1]),
  },
];
