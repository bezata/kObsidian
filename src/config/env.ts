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
});

export type AppEnv = z.infer<typeof envSchema> & {
  allowedOrigins: Set<string>;
};

export function getEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.parse(source);
  return {
    ...parsed,
    allowedOrigins: new Set(
      parsed.KOBSIDIAN_ALLOWED_ORIGINS.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  };
}
