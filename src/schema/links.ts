import { z } from "zod";
import { notePathSchema, positiveIntSchema } from "./primitives.js";

export const linksBacklinksArgsSchema = z
  .object({
    path: notePathSchema.describe("Vault-relative path of the note whose inbound links we want."),
    includeContext: z
      .boolean()
      .optional()
      .describe("When true, each result carries a snippet of surrounding text for each backlink."),
    contextLength: positiveIntSchema
      .optional()
      .describe("Characters of context per hit. Default 80."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type LinksBacklinksArgs = z.input<typeof linksBacklinksArgsSchema>;

export const linksOutgoingArgsSchema = z
  .object({
    path: notePathSchema,
    checkValidity: z
      .boolean()
      .optional()
      .describe("When true, each outgoing link is flagged `valid` or broken."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type LinksOutgoingArgs = z.input<typeof linksOutgoingArgsSchema>;

export const linksBrokenArgsSchema = z
  .object({
    directory: z
      .string()
      .optional()
      .describe("Optional folder to scope the scan. Omit to scan the whole vault."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type LinksBrokenArgs = z.input<typeof linksBrokenArgsSchema>;

export const linksGraphArgsSchema = z
  .object({
    vaultPath: z.string().optional(),
  })
  .strict();
export type LinksGraphArgs = z.input<typeof linksGraphArgsSchema>;

export const linksOrphanedArgsSchema = z.object({ vaultPath: z.string().optional() }).strict();
export type LinksOrphanedArgs = z.input<typeof linksOrphanedArgsSchema>;

export const linksHubsArgsSchema = z
  .object({
    minOutlinks: positiveIntSchema
      .optional()
      .describe("Minimum outgoing-link count for a note to qualify as a hub. Default 10."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type LinksHubsArgs = z.input<typeof linksHubsArgsSchema>;

export const linksHealthArgsSchema = z.object({ vaultPath: z.string().optional() }).strict();
export type LinksHealthArgs = z.input<typeof linksHealthArgsSchema>;

export const linksConnectionsArgsSchema = z
  .object({
    noteName: z
      .string()
      .min(1)
      .describe("Name or path of the starting note. Basename match is fine."),
    depth: positiveIntSchema
      .optional()
      .describe("Traversal depth (hops). Default 2. Higher values quickly blow up result size."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type LinksConnectionsArgs = z.input<typeof linksConnectionsArgsSchema>;
