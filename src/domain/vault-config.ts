import { readFileSync, statSync } from "node:fs";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { resolveVaultPath } from "../lib/paths.js";
import type { DomainContext } from "./context.js";

const nonEmpty = z.string().min(1);

export const vaultWikiHeadingsConfigSchema = z
  .object({
    indexSources: nonEmpty.optional().describe("index.md section listing source pages."),
    indexConcepts: nonEmpty.optional().describe("index.md section listing concept pages."),
    indexEntities: nonEmpty.optional().describe("index.md section listing entity pages."),
    conceptPage: nonEmpty
      .optional()
      .describe(
        "Concept-page heading that receives wiki.ingest citations / summaryMerge sections.",
      ),
    entityPage: nonEmpty
      .optional()
      .describe("Entity-page heading that receives wiki.ingest citations / summaryMerge sections."),
  })
  .strict();

export const vaultWikiConfigSchema = z
  .object({
    root: nonEmpty.optional().describe("Wiki directory under the vault (default `wiki`)."),
    sourcesDir: nonEmpty
      .optional()
      .describe("Per-source summary pages directory (default `Sources`)."),
    conceptsDir: nonEmpty.optional().describe("Concept pages directory (default `Concepts`)."),
    entitiesDir: nonEmpty.optional().describe("Entity pages directory (default `Entities`)."),
    indexFile: nonEmpty.optional().describe("Catalog filename (default `index.md`)."),
    logFile: nonEmpty.optional().describe("Log filename (default `log.md`)."),
    schemaFile: nonEmpty.optional().describe("Seed schema filename (default `wiki-schema.md`)."),
    staleDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .optional()
      .describe("wiki.lint stale-page threshold in days (default 180)."),
    headings: vaultWikiHeadingsConfigSchema.optional(),
  })
  .strict();

/**
 * Shape of the per-vault config file (`.kobsidian.json` at the vault root by
 * default). Every field is optional; anything set here beats the matching
 * `KOBSIDIAN_WIKI_*` env var, and a per-call tool argument beats both. Unknown
 * keys are rejected so typos surface instead of silently doing nothing.
 */
export const vaultConfigSchema = z
  .object({
    $schema: z.string().optional(),
    wiki: vaultWikiConfigSchema.optional(),
  })
  .strict();

export type VaultConfig = z.infer<typeof vaultConfigSchema>;
export type VaultWikiConfig = NonNullable<VaultConfig["wiki"]>;

const EMPTY_CONFIG: VaultConfig = {};
const cache = new Map<string, { mtimeMs: number; size: number; config: VaultConfig }>();

export function vaultConfigFileName(context: DomainContext): string {
  return context.env.KOBSIDIAN_VAULT_CONFIG_FILE;
}

export function vaultConfigPath(context: DomainContext, vaultRoot: string): string {
  return resolveVaultPath(vaultRoot, vaultConfigFileName(context));
}

export function vaultConfigExists(context: DomainContext, vaultRoot: string): boolean {
  const stat = statSync(vaultConfigPath(context, vaultRoot), { throwIfNoEntry: false });
  return Boolean(stat?.isFile());
}

/**
 * Read and validate the vault's config file. Synchronous so the many
 * call-sites that resolve wiki paths stay synchronous; the file is tiny and the
 * parsed result is cached by mtime + size, so repeated calls cost one `stat`.
 * A missing file is not an error; a malformed one is, because silently
 * ignoring it would make a localized vault look misconfigured for no reason.
 */
export function loadVaultConfig(context: DomainContext, vaultRoot: string): VaultConfig {
  const file = vaultConfigPath(context, vaultRoot);
  const stat = statSync(file, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) {
    cache.delete(file);
    return EMPTY_CONFIG;
  }

  const cached = cache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.config;
  }

  const name = vaultConfigFileName(context);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new AppError("invalid_argument", `Could not parse ${name} (${file}) as JSON: ${reason}`);
  }

  const result = vaultConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map(
        (issue) => `${issue.path.length > 0 ? issue.path.join(".") : "<root>"}: ${issue.message}`,
      )
      .join("; ");
    throw new AppError("invalid_argument", `Invalid ${name} (${file}): ${issues}`);
  }

  cache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, config: result.data });
  return result.data;
}

export function vaultWikiConfig(context: DomainContext, vaultRoot: string): VaultWikiConfig {
  return loadVaultConfig(context, vaultRoot).wiki ?? {};
}
