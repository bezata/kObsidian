import { type AppEnv, getEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { ObsidianApiClient } from "../lib/obsidian-api-client.js";
import type { VaultRecord } from "../schema/vaults.js";
import type { DiscoverResult } from "./vaults.js";

export type SessionState = {
  /**
   * The vault set by `vault.select`. Slots in between the per-call argument
   * and the startup env default in `requireVaultPath`'s precedence chain.
   * Null when no vault.select has been made — behaviour collapses to the
   * pre-v0.3.0 `arg > env > error` flow.
   */
  activeVault: VaultRecord | null;
};

export type VaultCache = {
  /** Milliseconds since epoch of the last successful discovery refresh. */
  lastRefreshedAt: number;
  /** Most recent discovery result, or null when discovery hasn't run yet. */
  result: DiscoverResult | null;
};

export type DomainContext = {
  env: AppEnv;
  api: ObsidianApiClient;
  session: SessionState;
  vaults: VaultCache;
};

export function createDomainContext(env: AppEnv = getEnv()): DomainContext {
  return {
    env,
    api: new ObsidianApiClient({
      baseUrl: env.OBSIDIAN_API_URL,
      apiKey: env.OBSIDIAN_REST_API_KEY,
      verifyTls: env.OBSIDIAN_API_VERIFY_TLS,
    }),
    session: { activeVault: null },
    vaults: { lastRefreshedAt: 0, result: null },
  };
}

export function requireVaultPath(context: DomainContext, vaultPath?: string): string {
  const resolved =
    vaultPath ?? context.session.activeVault?.path ?? context.env.OBSIDIAN_VAULT_PATH;
  if (!resolved) {
    throw new AppError(
      "invalid_argument",
      "Vault path is required. Set OBSIDIAN_VAULT_PATH, call vault.select, or pass vaultPath.",
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
