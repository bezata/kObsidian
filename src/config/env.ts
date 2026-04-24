import { z } from "zod";

const envSchema = z.object({
  OBSIDIAN_VAULT_PATH: z.string().min(1).optional(),
  OBSIDIAN_API_URL: z.string().url().default("https://127.0.0.1:27124"),
  OBSIDIAN_API_VERIFY_TLS: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .default("false")
    .transform((value) => value === true || value === "true"),
  OBSIDIAN_REST_API_KEY: z.string().min(1).optional(),
  KOBSIDIAN_HTTP_HOST: z.string().default("127.0.0.1"),
  KOBSIDIAN_HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  KOBSIDIAN_HTTP_BEARER_TOKEN: z.string().min(1).optional(),
  KOBSIDIAN_ALLOWED_ORIGINS: z.string().default("http://localhost,http://127.0.0.1"),
  KOBSIDIAN_PROTOCOL_VERSION: z.string().default("2025-11-25"),
  KOBSIDIAN_WIKI_ROOT: z.string().default("wiki"),
  KOBSIDIAN_WIKI_SOURCES_DIR: z.string().default("Sources"),
  KOBSIDIAN_WIKI_CONCEPTS_DIR: z.string().default("Concepts"),
  KOBSIDIAN_WIKI_ENTITIES_DIR: z.string().default("Entities"),
  KOBSIDIAN_WIKI_INDEX_FILE: z.string().default("index.md"),
  KOBSIDIAN_WIKI_LOG_FILE: z.string().default("log.md"),
  KOBSIDIAN_WIKI_SCHEMA_FILE: z.string().default("wiki-schema.md"),
  KOBSIDIAN_WIKI_STALE_DAYS: z.coerce.number().int().min(1).max(3650).default(180),
  KOBSIDIAN_VAULT_DISCOVERY: z
    .enum(["on", "off"])
    .default("on")
    .describe(
      "When `off`, kObsidian skips parsing Obsidian's obsidian.json registry — `vault.list` only returns explicit env-var entries.",
    ),
  KOBSIDIAN_VAULT_ALLOW: z
    .string()
    .optional()
    .describe(
      "Comma-separated allowlist (names or absolute paths) restricting which vaults appear in vault.list and are selectable. Unset = allow all. OBSIDIAN_VAULT_PATH is never filtered.",
    ),
  KOBSIDIAN_VAULT_DENY: z
    .string()
    .optional()
    .describe(
      "Comma-separated denylist (names or absolute paths). Applied after allowlist. OBSIDIAN_VAULT_PATH is never filtered.",
    ),
  KOBSIDIAN_OBSIDIAN_CONFIG: z
    .string()
    .optional()
    .describe(
      "Explicit path to Obsidian's obsidian.json. Escape hatch for portable installs, WSL, or non-standard locations.",
    ),
});

export type AppEnv = z.infer<typeof envSchema> & {
  allowedOrigins: Set<string>;
  /**
   * Named vaults parsed from `OBSIDIAN_VAULT_<NAME>=path` env vars. Keys are
   * the lowercased suffix; values are the vault path verbatim (not
   * validated as a directory here — that happens at discovery time).
   */
  namedVaults: Record<string, string>;
};

const NAMED_VAULT_PREFIX = "OBSIDIAN_VAULT_";
const NAMED_VAULT_RESERVED = new Set(["OBSIDIAN_VAULT_PATH"]);

function extractNamedVaults(source: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(source)) {
    if (!key.startsWith(NAMED_VAULT_PREFIX)) continue;
    if (NAMED_VAULT_RESERVED.has(key)) continue;
    if (typeof rawValue !== "string" || rawValue.length === 0) continue;
    const suffix = key.slice(NAMED_VAULT_PREFIX.length);
    if (suffix.length === 0) continue;
    result[suffix.toLowerCase()] = rawValue;
  }
  return result;
}

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.parse(source);
  return {
    ...parsed,
    allowedOrigins: new Set(
      parsed.KOBSIDIAN_ALLOWED_ORIGINS.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
    namedVaults: extractNamedVaults(source),
  };
}
