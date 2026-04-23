import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const READ_ONLY: ToolAnnotations = { readOnlyHint: true };
export const DESTRUCTIVE: ToolAnnotations = { destructiveHint: true };
export const IDEMPOTENT: ToolAnnotations = { idempotentHint: true };
export const READ_ONLY_IDEMPOTENT: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
};
export const OPEN_WORLD: ToolAnnotations = { openWorldHint: true };
export const READ_ONLY_OPEN_WORLD: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: true,
};
export const DESTRUCTIVE_OPEN_WORLD: ToolAnnotations = {
  destructiveHint: true,
  openWorldHint: true,
};
export const IDEMPOTENT_DESTRUCTIVE: ToolAnnotations = {
  idempotentHint: true,
  destructiveHint: true,
};

export const looseObjectSchema = z.object({}).passthrough();
export const mutationResultSchema = z
  .object({
    changed: z.boolean(),
    target: z.string(),
    summary: z.string(),
  })
  .passthrough();
export const listResultSchema = z
  .object({
    total: z.number().int().nonnegative(),
    items: z.array(looseObjectSchema),
  })
  .passthrough();
