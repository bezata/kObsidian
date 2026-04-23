import { z } from "zod";

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
