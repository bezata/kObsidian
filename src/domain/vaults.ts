import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { z } from "zod";
import type { AppEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import type { VaultRecord, VaultSource } from "../schema/vaults.js";

// ---------------------------------------------------------------------------
// obsidian.json path resolution
// ---------------------------------------------------------------------------

// Platform-specific candidate locations for Obsidian's global vault registry.
// Anchored on os.homedir() with an escape-hatch env var for portable installs
// (Obsidian Portable on Windows, non-standard Linux, WSL pointing at the
// Windows-side config, etc.).

type CandidateDeps = {
  platform: NodeJS.Platform;
  home: string;
  env: NodeJS.ProcessEnv;
};

export function obsidianConfigCandidates(deps: CandidateDeps): string[] {
  const override = deps.env.KOBSIDIAN_OBSIDIAN_CONFIG;
  if (override && override.length > 0) {
    return [override];
  }
  const { home } = deps;
  const xdg = deps.env.XDG_CONFIG_HOME;

  switch (deps.platform) {
    case "darwin":
      return [path.join(home, "Library/Application Support/obsidian/obsidian.json")];
    case "win32": {
      const appData =
        deps.env.APPDATA && deps.env.APPDATA.length > 0
          ? deps.env.APPDATA
          : path.join(home, "AppData/Roaming");
      return [path.join(appData, "obsidian/obsidian.json")];
    }
    default: {
      const linux: (string | undefined)[] = [
        xdg && xdg.length > 0 ? path.join(xdg, "obsidian/obsidian.json") : undefined,
        path.join(home, ".config/obsidian/obsidian.json"),
        path.join(home, ".var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json"),
        path.join(home, "snap/obsidian/current/.config/obsidian/obsidian.json"),
      ];
      return linux.filter((p): p is string => typeof p === "string" && p.length > 0);
    }
  }
}

export async function resolveObsidianConfigPath(
  deps: CandidateDeps = {
    platform: process.platform,
    home: os.homedir(),
    env: process.env,
  },
): Promise<string | null> {
  for (const candidate of obsidianConfigCandidates(deps)) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // ENOENT / EACCES / anything else — try the next candidate.
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// obsidian.json parsing (defensive)
// ---------------------------------------------------------------------------

export const obsidianVaultEntrySchema = z
  .object({
    path: z.string().min(1),
    ts: z.number().int().nonnegative().optional(),
    open: z.boolean().optional(),
  })
  .passthrough();

export const obsidianConfigSchema = z
  .object({
    vaults: z.record(z.string(), obsidianVaultEntrySchema).optional(),
  })
  .passthrough();

export type ParsedObsidianConfig = z.infer<typeof obsidianConfigSchema>;

export type ObsidianConfigParse =
  | { ok: true; config: ParsedObsidianConfig }
  | { ok: false; error: string };

export async function parseObsidianConfig(filePath: string): Promise<ObsidianConfigParse> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (err) {
    return { ok: false, error: `read failed: ${(err as Error).message}` };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: `JSON parse failed: ${(err as Error).message}` };
  }

  const parsed = obsidianConfigSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: `shape mismatch: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  }

  return { ok: true, config: parsed.data };
}

// ---------------------------------------------------------------------------
// Vault record construction + merge
// ---------------------------------------------------------------------------

type RawCandidate = {
  id: string;
  name: string;
  path: string;
  source: VaultSource;
  lastOpened?: string;
};

/**
 * Produce a canonical key for dedup: absolute, normalised, case-folded on
 * Windows (NTFS is case-insensitive). On POSIX, preserve case.
 */
function canonicalPath(p: string, platform: NodeJS.Platform = process.platform): string {
  // Obsidian's Windows paths arrive with backslashes; normalise + resolve
  // gives us a canonical form regardless of input slashes.
  const resolved = path.resolve(p);
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

function basename(p: string): string {
  return path.basename(p) || p;
}

function candidatesFromEnvDefault(env: AppEnv): RawCandidate[] {
  if (!env.OBSIDIAN_VAULT_PATH) return [];
  return [
    {
      id: "default",
      name: basename(env.OBSIDIAN_VAULT_PATH),
      path: env.OBSIDIAN_VAULT_PATH,
      source: "env-default",
    },
  ];
}

function candidatesFromEnvNamed(env: AppEnv): RawCandidate[] {
  return Object.entries(env.namedVaults).map(([name, vaultPath]) => ({
    id: `env:${name}`,
    name,
    path: vaultPath,
    source: "env-named" as const,
  }));
}

function candidatesFromObsidianApp(config: ParsedObsidianConfig | null): RawCandidate[] {
  if (!config?.vaults) return [];
  return Object.entries(config.vaults).map(([id, entry]) => ({
    id,
    name: basename(entry.path),
    path: entry.path,
    source: "obsidian-app" as const,
    lastOpened:
      typeof entry.ts === "number" && Number.isFinite(entry.ts)
        ? new Date(entry.ts).toISOString()
        : undefined,
  }));
}

export type MergeInput = {
  env: AppEnv;
  obsidianConfig: ParsedObsidianConfig | null;
  platform?: NodeJS.Platform;
};

/**
 * Merge raw candidates across the three sources, dedup by canonical path,
 * and attach `isDefault` and `exists` flags. `isActive` is not set here —
 * it's applied by `applyActiveFlag` after merging because the session state
 * lives on DomainContext, not in the discovery layer.
 */
export function mergeVaultSources(input: MergeInput): Omit<VaultRecord, "exists" | "isActive">[] {
  const platform = input.platform ?? process.platform;

  // Priority order when the same path appears in multiple sources:
  //   env-default > env-named > obsidian-app
  // — the higher-priority entry keeps its id/name, but we preserve
  // `lastOpened` if an `obsidian-app` sibling has it.
  const sourcePriority: Record<VaultSource, number> = {
    "env-default": 3,
    "env-named": 2,
    "obsidian-app": 1,
  };

  const raw: RawCandidate[] = [
    ...candidatesFromEnvDefault(input.env),
    ...candidatesFromEnvNamed(input.env),
    ...candidatesFromObsidianApp(input.obsidianConfig),
  ];

  const byKey = new Map<string, RawCandidate>();
  const lastOpenedByKey = new Map<string, string>();

  for (const candidate of raw) {
    const key = canonicalPath(candidate.path, platform);
    if (candidate.lastOpened) {
      const existing = lastOpenedByKey.get(key);
      if (!existing || candidate.lastOpened > existing) {
        lastOpenedByKey.set(key, candidate.lastOpened);
      }
    }
    const current = byKey.get(key);
    if (!current || sourcePriority[candidate.source] > sourcePriority[current.source]) {
      byKey.set(key, candidate);
    }
  }

  const defaultKey = input.env.OBSIDIAN_VAULT_PATH
    ? canonicalPath(input.env.OBSIDIAN_VAULT_PATH, platform)
    : null;

  return Array.from(byKey.entries()).map(([key, candidate]) => ({
    id: candidate.id,
    name: candidate.name,
    path: candidate.path,
    isDefault: defaultKey !== null && key === defaultKey,
    source: candidate.source,
    lastOpened: lastOpenedByKey.get(key) ?? candidate.lastOpened,
  }));
}

/**
 * Attach `exists` to every record (fs.stat-based) and the `isActive` flag
 * based on the currently-selected vault id.
 */
export async function finaliseVaultRecords(
  base: Omit<VaultRecord, "exists" | "isActive">[],
  activeVaultId: string | null,
  platform: NodeJS.Platform = process.platform,
): Promise<VaultRecord[]> {
  const activeKey = base.find((v) => v.id === activeVaultId)?.path;
  const activeCanonical = activeKey ? canonicalPath(activeKey, platform) : null;

  return Promise.all(
    base.map(async (record) => {
      let exists = false;
      try {
        const stat = await fs.stat(record.path);
        exists = stat.isDirectory();
      } catch {
        exists = false;
      }
      const recordCanonical = canonicalPath(record.path, platform);
      return {
        ...record,
        exists,
        isActive: activeCanonical !== null && recordCanonical === activeCanonical,
      } satisfies VaultRecord;
    }),
  );
}

// ---------------------------------------------------------------------------
// Allow / deny gating
// ---------------------------------------------------------------------------

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Apply allowlist + denylist to discovered vault records. Matching is
 * case-insensitive on both name and path (normalised). OBSIDIAN_VAULT_PATH
 * is never filtered — it's the operator's explicit default and must remain
 * reachable regardless of allow/deny.
 */
export function applyAllowDeny(
  records: VaultRecord[],
  env: AppEnv,
  platform: NodeJS.Platform = process.platform,
): VaultRecord[] {
  const allow = parseList(env.KOBSIDIAN_VAULT_ALLOW).map((v) => v.toLowerCase());
  const deny = parseList(env.KOBSIDIAN_VAULT_DENY).map((v) => v.toLowerCase());

  if (allow.length === 0 && deny.length === 0) return records;

  const defaultKey = env.OBSIDIAN_VAULT_PATH
    ? canonicalPath(env.OBSIDIAN_VAULT_PATH, platform)
    : null;

  const matches = (record: VaultRecord, patterns: string[]): boolean => {
    const recordKey = canonicalPath(record.path, platform);
    const nameLower = record.name.toLowerCase();
    return patterns.some((p) => {
      // Treat absolute-path-ish patterns as paths; otherwise as names.
      if (path.isAbsolute(p)) {
        return canonicalPath(p, platform) === recordKey;
      }
      return p === nameLower;
    });
  };

  return records.filter((record) => {
    const recordKey = canonicalPath(record.path, platform);
    const isOperatorDefault = defaultKey !== null && recordKey === defaultKey;
    if (isOperatorDefault) return true; // always allowed

    if (allow.length > 0 && !matches(record, allow)) return false;
    if (deny.length > 0 && matches(record, deny)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Selector resolution (used by vault.select)
// ---------------------------------------------------------------------------

export type Selector = { id?: string; name?: string; path?: string };

/**
 * Resolve a selector against the filtered vault list. Returns the matched
 * record OR — when the selector is a `path` not present in the list — a
 * synthesised ad-hoc record (after validating the path exists as a
 * directory). This lets the LLM point at a fresh vault to initialise.
 */
export async function resolveSelector(
  selector: Selector,
  vaults: VaultRecord[],
  platform: NodeJS.Platform = process.platform,
): Promise<VaultRecord> {
  if (selector.id) {
    const match = vaults.find((v) => v.id === selector.id);
    if (!match) {
      throw new AppError("not_found", `No vault with id "${selector.id}"`);
    }
    return match;
  }
  if (selector.name) {
    const wanted = selector.name.toLowerCase();
    const match = vaults.find((v) => v.name.toLowerCase() === wanted);
    if (!match) {
      throw new AppError("not_found", `No vault named "${selector.name}"`);
    }
    return match;
  }
  if (selector.path) {
    if (!path.isAbsolute(selector.path)) {
      throw new AppError("invalid_argument", "`path` must be absolute");
    }
    try {
      const stat = await fs.stat(selector.path);
      if (!stat.isDirectory()) {
        throw new AppError("invalid_argument", `path is not a directory: ${selector.path}`);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError("not_found", `path does not exist: ${selector.path}`);
    }

    const selectorKey = canonicalPath(selector.path, platform);
    const existing = vaults.find((v) => canonicalPath(v.path, platform) === selectorKey);
    if (existing) return existing;

    // Ad-hoc record — not in any registered source, but valid on disk.
    return {
      id: `path:${selectorKey}`,
      name: basename(selector.path),
      path: path.resolve(selector.path),
      isDefault: false,
      isActive: false,
      source: "env-named", // treat as if it were an env-configured vault
      exists: true,
    };
  }
  throw new AppError("invalid_argument", "selector requires exactly one of id, name, path");
}

// ---------------------------------------------------------------------------
// High-level discovery (called by vault.list and on first requireVaultPath
// demand)
// ---------------------------------------------------------------------------

export type DiscoverResult = {
  /** Allow/deny-gated view. This is what vault.list should surface. */
  records: VaultRecord[];
  /**
   * Same records before allow/deny was applied. `vault.select` uses this so
   * it can distinguish "vault doesn't exist" (not_found) from "vault exists
   * but is blocked by operator gating" (unauthorized) — a better error UX
   * than silently collapsing both to not_found.
   */
  ungatedRecords: VaultRecord[];
  obsidianConfigPath: string | null;
  obsidianConfigError?: string;
};

export async function discoverVaults(
  env: AppEnv,
  activeVaultId: string | null,
  deps: Partial<CandidateDeps> = {},
): Promise<DiscoverResult> {
  const resolvedDeps: CandidateDeps = {
    platform: deps.platform ?? process.platform,
    home: deps.home ?? os.homedir(),
    env: deps.env ?? (process.env as NodeJS.ProcessEnv),
  };

  let obsidianConfigPath: string | null = null;
  let obsidianConfig: ParsedObsidianConfig | null = null;
  let obsidianConfigError: string | undefined;

  if (env.KOBSIDIAN_VAULT_DISCOVERY === "on") {
    obsidianConfigPath = await resolveObsidianConfigPath(resolvedDeps);
    if (obsidianConfigPath) {
      const parsed = await parseObsidianConfig(obsidianConfigPath);
      if (parsed.ok) {
        obsidianConfig = parsed.config;
      } else {
        obsidianConfigError = parsed.error;
      }
    }
  }

  const merged = mergeVaultSources({
    env,
    obsidianConfig,
    platform: resolvedDeps.platform,
  });
  const ungatedRecords = await finaliseVaultRecords(merged, activeVaultId, resolvedDeps.platform);
  const records = applyAllowDeny(ungatedRecords, env, resolvedDeps.platform);

  return {
    records,
    ungatedRecords,
    obsidianConfigPath,
    obsidianConfigError,
  };
}
