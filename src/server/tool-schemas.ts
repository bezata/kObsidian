import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// MCP 2025-11-25 spec defaults are: readOnlyHint=false, destructiveHint=true,
// idempotentHint=false, openWorldHint=true. Setting all four explicitly on every
// tool prevents wrong-default leakage and gives Glama/clients a full behavior
// profile to grade on.

export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const READ_ONLY_OPEN_WORLD: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export const ADDITIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

export const ADDITIVE_OPEN_WORLD: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

export const IDEMPOTENT_ADDITIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const IDEMPOTENT_DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

export const DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

export const DESTRUCTIVE_OPEN_WORLD: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

// Legacy aliases retained for source-compat during the v0.3.0 consolidation pass.
// `IDEMPOTENT` is semantically equivalent to `IDEMPOTENT_ADDITIVE`; prefer the
// newer name in any new or rewritten tool. Remove once every tool file has been
// migrated.
export const IDEMPOTENT: ToolAnnotations = IDEMPOTENT_ADDITIVE;
export const READ_ONLY_IDEMPOTENT: ToolAnnotations = READ_ONLY;
export const OPEN_WORLD: ToolAnnotations = ADDITIVE_OPEN_WORLD;

// Generic result schemas used by tools that still return freeform or ad-hoc JSON.
// Per-namespace schemas live in `src/schema/<namespace>.ts` and should be
// preferred — Glama rates tools with specific output schemas higher than those
// using the generic passthrough shape below.

export const looseObjectSchema = z
  .object({})
  .passthrough()
  .describe("Freeform object. The specific shape depends on the tool; see the tool description.");

export const mutationResultSchema = z
  .object({
    changed: z
      .boolean()
      .describe("True if the tool altered vault state on this call; false if it was a no-op."),
    target: z.string().describe("The path or identifier the tool acted on."),
    summary: z.string().describe("Short human-readable summary of what happened."),
  })
  .passthrough()
  .describe(
    "Standard mutation envelope. Individual tools may attach additional fields (e.g. `created`, `appended`, `before`/`after` counts) — those are documented in the tool description.",
  );

export const listResultSchema = z
  .object({
    total: z.number().int().nonnegative().describe("Number of items in `items`."),
    items: z
      .array(looseObjectSchema)
      .describe("List of result items; per-item shape depends on the tool."),
  })
  .passthrough()
  .describe("Standard list envelope used by list/search tools.");
