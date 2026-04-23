import { type AppEnv, getEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { ObsidianApiClient } from "../lib/obsidian-api-client.js";

export type DomainContext = {
  env: AppEnv;
  api: ObsidianApiClient;
};

export function createDomainContext(env: AppEnv = getEnv()): DomainContext {
  return {
    env,
    api: new ObsidianApiClient({
      baseUrl: env.OBSIDIAN_API_URL,
      apiKey: env.OBSIDIAN_REST_API_KEY,
      verifyTls: env.OBSIDIAN_API_VERIFY_TLS,
    }),
  };
}

export function requireVaultPath(context: DomainContext, vaultPath?: string): string {
  const resolved = vaultPath ?? context.env.OBSIDIAN_VAULT_PATH;
  if (!resolved) {
    throw new AppError(
      "invalid_argument",
      "Vault path is required. Set OBSIDIAN_VAULT_PATH or pass vaultPath.",
    );
  }
  return resolved;
}

export function requireApiConfigured(context: DomainContext): ObsidianApiClient {
  if (!context.api.isConfigured) {
    throw new AppError("unavailable", "OBSIDIAN_REST_API_KEY is not configured");
  }
  return context.api;
}
