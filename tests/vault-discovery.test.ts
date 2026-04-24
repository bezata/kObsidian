import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import {
  applyAllowDeny,
  mergeVaultSources,
  parseObsidianConfig,
  resolveSelector,
} from "../src/domain/vaults.js";
import type { VaultRecord } from "../src/schema/vaults.js";

const fixturesRoot = path.resolve(process.cwd(), "tests", "fixtures", "obsidian");

function fx(name: string): string {
  return path.join(fixturesRoot, name);
}

function buildEnv(overrides: Record<string, string | undefined> = {}) {
  return getEnv({
    ...process.env,
    // Clear vars that would otherwise leak from the host env and pollute
    // expectations. This is important because process.env on the maintainer's
    // Windows machine carries real OBSIDIAN_VAULT_PATH / named vars.
    OBSIDIAN_VAULT_PATH: undefined,
    KOBSIDIAN_VAULT_ALLOW: undefined,
    KOBSIDIAN_VAULT_DENY: undefined,
    KOBSIDIAN_VAULT_DISCOVERY: "on",
    KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
    ...overrides,
    // Strip any host-set OBSIDIAN_VAULT_* that would sneak into namedVaults.
    ...Object.fromEntries(
      Object.keys(process.env)
        .filter((k) => k.startsWith("OBSIDIAN_VAULT_") && k !== "OBSIDIAN_VAULT_PATH")
        .map((k) => [k, undefined]),
    ),
  } as NodeJS.ProcessEnv);
}

// ---------------------------------------------------------------------------
// parseObsidianConfig — fixture round-trip
// ---------------------------------------------------------------------------

describe("parseObsidianConfig", () => {
  it("parses the macOS fixture", async () => {
    const result = await parseObsidianConfig(fx("macos-real.json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.config.vaults ?? {})).toHaveLength(2);
      expect(result.config.vaults?.a1b2c3d4e5f60708?.path).toBe("/Users/alice/Documents/Personal");
    }
  });

  it("parses the Windows fixture with escaped backslashes", async () => {
    const result = await parseObsidianConfig(fx("windows-real.json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.vaults?.["58f115bd2c2febd2"]?.path).toBe(
        "C:\\Users\\Gaming\\Documents\\gansai",
      );
    }
  });

  it("parses the Linux fixture", async () => {
    const result = await parseObsidianConfig(fx("linux-real.json"));
    expect(result.ok).toBe(true);
  });

  it("handles valid JSON with no `vaults` key", async () => {
    const result = await parseObsidianConfig(fx("no-vaults.json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.vaults).toBeUndefined();
    }
  });

  it("handles an empty `vaults` object", async () => {
    const result = await parseObsidianConfig(fx("empty-vaults.json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.config.vaults ?? {})).toHaveLength(0);
    }
  });

  it("tolerates unknown top-level + per-vault keys", async () => {
    const result = await parseObsidianConfig(fx("with-unknown-keys.json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.vaults?.abc123def456abcd?.path).toBe("/Users/dan/Obsidian/Journal");
    }
  });

  it("returns a structured error on malformed JSON, never throws", async () => {
    const result = await parseObsidianConfig(fx("malformed.json"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JSON parse failed");
    }
  });

  it("returns a structured error on a missing file", async () => {
    const result = await parseObsidianConfig(fx("does-not-exist.json"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("read failed");
    }
  });
});

// ---------------------------------------------------------------------------
// mergeVaultSources — precedence, dedup, lastOpened preservation
// ---------------------------------------------------------------------------

describe("mergeVaultSources", () => {
  it("produces no records when no sources are set", () => {
    const out = mergeVaultSources({
      env: buildEnv(),
      obsidianConfig: null,
      platform: "linux",
    });
    expect(out).toHaveLength(0);
  });

  it("env-default alone produces one record with id='default'", () => {
    const out = mergeVaultSources({
      env: buildEnv({ OBSIDIAN_VAULT_PATH: "/vaults/main" }),
      obsidianConfig: null,
      platform: "linux",
    });
    expect(out).toEqual([
      expect.objectContaining({
        id: "default",
        name: "main",
        path: "/vaults/main",
        source: "env-default",
        isDefault: true,
      }),
    ]);
  });

  it("named env vars surface as `env:<name>` records", () => {
    const out = mergeVaultSources({
      env: buildEnv({
        OBSIDIAN_VAULT_WORK: "/vaults/work",
        OBSIDIAN_VAULT_PERSONAL: "/vaults/personal",
      }),
      obsidianConfig: null,
      platform: "linux",
    });
    const ids = out.map((r) => r.id).sort();
    expect(ids).toEqual(["env:personal", "env:work"]);
  });

  it("merges obsidian.json entries with env entries", () => {
    const out = mergeVaultSources({
      env: buildEnv({ OBSIDIAN_VAULT_PATH: "/vaults/default" }),
      obsidianConfig: {
        vaults: {
          hex1: { path: "/vaults/other", ts: 1000 },
        },
      },
      platform: "linux",
    });
    expect(out).toHaveLength(2);
    const byId = new Map(out.map((r) => [r.id, r]));
    expect(byId.get("default")?.isDefault).toBe(true);
    expect(byId.get("hex1")?.source).toBe("obsidian-app");
    expect(byId.get("hex1")?.lastOpened).toBe(new Date(1000).toISOString());
  });

  it("dedupes by canonical path, preferring env-default > env-named > obsidian-app", () => {
    const sharedPath = "/vaults/shared";
    const out = mergeVaultSources({
      env: buildEnv({
        OBSIDIAN_VAULT_PATH: sharedPath,
        OBSIDIAN_VAULT_ALIAS: sharedPath,
      }),
      obsidianConfig: {
        vaults: {
          hex1: { path: sharedPath, ts: 5000 },
        },
      },
      platform: "linux",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("default"); // env-default wins
    expect(out[0]?.source).toBe("env-default");
    // But lastOpened from the obsidian-app sibling is preserved.
    expect(out[0]?.lastOpened).toBe(new Date(5000).toISOString());
  });

  it("case-folds paths on Windows for dedup", () => {
    const out = mergeVaultSources({
      env: buildEnv({ OBSIDIAN_VAULT_PATH: "C:\\Users\\Me\\Vault" }),
      obsidianConfig: {
        vaults: {
          hex1: { path: "c:\\users\\me\\vault", ts: 1 },
        },
      },
      platform: "win32",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.source).toBe("env-default");
  });

  it("does NOT case-fold on POSIX", () => {
    const out = mergeVaultSources({
      env: buildEnv({ OBSIDIAN_VAULT_PATH: "/Vaults/Main" }),
      obsidianConfig: {
        vaults: {
          hex1: { path: "/vaults/main", ts: 1 },
        },
      },
      platform: "linux",
    });
    expect(out).toHaveLength(2); // different paths on case-sensitive FS
  });

  it("omits lastOpened when ts is absent", () => {
    const out = mergeVaultSources({
      env: buildEnv(),
      obsidianConfig: { vaults: { hex1: { path: "/v" } } },
      platform: "linux",
    });
    expect(out[0]?.lastOpened).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// applyAllowDeny — allowlist/denylist with the OBSIDIAN_VAULT_PATH invariant
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<VaultRecord>): VaultRecord {
  return {
    id: overrides.id ?? "default",
    name: overrides.name ?? "default",
    path: overrides.path ?? "/v",
    isDefault: overrides.isDefault ?? false,
    isActive: overrides.isActive ?? false,
    source: overrides.source ?? "env-default",
    exists: overrides.exists ?? true,
    lastOpened: overrides.lastOpened,
  };
}

describe("applyAllowDeny", () => {
  it("passes through when both lists are empty", () => {
    const env = buildEnv();
    const records = [makeRecord({ path: "/a", name: "a" })];
    expect(applyAllowDeny(records, env, "linux")).toEqual(records);
  });

  it("allowlist filters by name (case-insensitive)", () => {
    const env = buildEnv({ KOBSIDIAN_VAULT_ALLOW: "Work,Personal" });
    const records = [
      makeRecord({ id: "1", name: "work", path: "/vaults/work" }),
      makeRecord({ id: "2", name: "scratch", path: "/vaults/scratch" }),
    ];
    const out = applyAllowDeny(records, env, "linux");
    expect(out.map((r) => r.name)).toEqual(["work"]);
  });

  it("allowlist filters by absolute path", () => {
    const env = buildEnv({ KOBSIDIAN_VAULT_ALLOW: "/vaults/work" });
    const records = [
      makeRecord({ id: "1", name: "work", path: "/vaults/work" }),
      makeRecord({ id: "2", name: "scratch", path: "/vaults/scratch" }),
    ];
    const out = applyAllowDeny(records, env, "linux");
    expect(out.map((r) => r.name)).toEqual(["work"]);
  });

  it("denylist removes matching entries", () => {
    const env = buildEnv({ KOBSIDIAN_VAULT_DENY: "secrets" });
    const records = [
      makeRecord({ id: "1", name: "work", path: "/vaults/work" }),
      makeRecord({ id: "2", name: "secrets", path: "/vaults/secrets" }),
    ];
    const out = applyAllowDeny(records, env, "linux");
    expect(out.map((r) => r.name)).toEqual(["work"]);
  });

  it("OBSIDIAN_VAULT_PATH is never filtered out even when denied explicitly", () => {
    const env = buildEnv({
      OBSIDIAN_VAULT_PATH: "/vaults/main",
      KOBSIDIAN_VAULT_DENY: "main,/vaults/main",
    });
    const records = [
      makeRecord({
        id: "default",
        name: "main",
        path: "/vaults/main",
        isDefault: true,
      }),
    ];
    const out = applyAllowDeny(records, env, "linux");
    expect(out).toHaveLength(1);
  });

  it("OBSIDIAN_VAULT_PATH survives even when missing from allowlist", () => {
    const env = buildEnv({
      OBSIDIAN_VAULT_PATH: "/vaults/main",
      KOBSIDIAN_VAULT_ALLOW: "work",
    });
    const records = [
      makeRecord({
        id: "default",
        name: "main",
        path: "/vaults/main",
        isDefault: true,
      }),
      makeRecord({ id: "1", name: "work", path: "/vaults/work" }),
      makeRecord({ id: "2", name: "other", path: "/vaults/other" }),
    ];
    const out = applyAllowDeny(records, env, "linux");
    const names = out.map((r) => r.name).sort();
    expect(names).toEqual(["main", "work"]);
  });
});

// ---------------------------------------------------------------------------
// resolveSelector — id / name / path branches + ad-hoc-path support
// ---------------------------------------------------------------------------

describe("resolveSelector", () => {
  it("finds by id", async () => {
    const vaults = [
      makeRecord({ id: "hex1", name: "a", path: "/a" }),
      makeRecord({ id: "hex2", name: "b", path: "/b" }),
    ];
    const out = await resolveSelector({ id: "hex2" }, vaults, "linux");
    expect(out.path).toBe("/b");
  });

  it("returns not_found when id is unknown", async () => {
    await expect(resolveSelector({ id: "missing" }, [], "linux")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("finds by name (case-insensitive)", async () => {
    const vaults = [makeRecord({ id: "h", name: "Personal", path: "/p" })];
    const out = await resolveSelector({ name: "personal" }, vaults, "linux");
    expect(out.path).toBe("/p");
  });

  it("rejects non-absolute path", async () => {
    await expect(resolveSelector({ path: "relative/path" }, [], "linux")).rejects.toThrow(
      /must be absolute/,
    );
  });

  it("rejects path to a file (not a directory)", async () => {
    const fixture = fx("macos-real.json"); // exists but is a file, not a dir
    await expect(resolveSelector({ path: fixture }, [], "linux")).rejects.toThrow(
      /not a directory/,
    );
  });

  it("returns existing record when path matches one in the list", async () => {
    const fixture = fixturesRoot; // the fixtures dir exists
    const vaults = [makeRecord({ id: "hex1", name: "fixtures", path: fixture, isDefault: true })];
    const out = await resolveSelector({ path: fixture }, vaults, process.platform);
    expect(out.id).toBe("hex1"); // returned the existing record, not a synthesised one
  });

  it("synthesises an ad-hoc record when the path isn't registered", async () => {
    const out = await resolveSelector(
      { path: fixturesRoot },
      [], // empty registry
      process.platform,
    );
    expect(out.path).toBe(path.resolve(fixturesRoot));
    expect(out.id).toMatch(/^path:/);
    expect(out.exists).toBe(true);
  });
});
