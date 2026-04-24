import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import { createDomainContext, requireVaultPath } from "../src/domain/context.js";
import { vaultTools } from "../src/server/tools/vaults.js";

// Helper: grab a tool handler by name so we can exercise it directly
// (same surface the MCP registerTool wraps at runtime).
function tool(name: string) {
  const t = vaultTools.find((tool) => tool.name === name);
  if (!t) throw new Error(`tool ${name} not found`);
  return t;
}

async function mkTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "kobsidian-vaults-"));
}

// Build a domain context with the legacy host env stripped out (the
// maintainer's Windows shell may have OBSIDIAN_VAULT_PATH / named vars set)
// and our own test values layered in.
function ctxWith(envOverrides: Record<string, string | undefined>) {
  const clean: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(clean)) {
    if (key.startsWith("OBSIDIAN_VAULT_") && key !== "OBSIDIAN_VAULT_PATH") {
      delete clean[key];
    }
  }
  const env = getEnv({
    ...clean,
    KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
    // Disable obsidian.json discovery in tests so we don't pick up the
    // maintainer's real vaults and pollute expectations.
    KOBSIDIAN_VAULT_DISCOVERY: "off",
    ...envOverrides,
  } as NodeJS.ProcessEnv);
  return createDomainContext(env);
}

describe("vault.list / vault.current / vault.select / vault.reset", () => {
  let vaultA: string;
  let vaultB: string;
  let tempRoot: string;

  beforeAll(async () => {
    tempRoot = await mkTempDir();
    vaultA = path.join(tempRoot, "vault-a");
    vaultB = path.join(tempRoot, "vault-b");
    await fs.mkdir(vaultA, { recursive: true });
    await fs.mkdir(vaultB, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("vault.list returns default + named env vars when discovery is off", async () => {
    const ctx = ctxWith({
      OBSIDIAN_VAULT_PATH: vaultA,
      OBSIDIAN_VAULT_SCRATCH: vaultB,
    });
    const result = (await tool("vault.list").handler(ctx, {})) as {
      total: number;
      items: Array<{ id: string; name: string; path: string; isDefault: boolean; source: string }>;
      obsidianConfigPath: string | null;
    };
    expect(result.total).toBe(2);
    expect(result.obsidianConfigPath).toBeNull();
    const ids = result.items.map((r) => r.id).sort();
    expect(ids).toEqual(["default", "env:scratch"]);
    const defaultItem = result.items.find((r) => r.id === "default");
    expect(defaultItem?.isDefault).toBe(true);
    expect(defaultItem?.path).toBe(vaultA);
  });

  it("vault.current reports env-default when nothing is selected", async () => {
    const ctx = ctxWith({ OBSIDIAN_VAULT_PATH: vaultA });
    const result = (await tool("vault.current").handler(ctx, {})) as {
      reason: string;
      active: { path: string } | null;
      envDefault: { path: string } | null;
    };
    expect(result.reason).toBe("env-default");
    expect(result.active?.path).toBe(vaultA);
    expect(result.envDefault?.path).toBe(vaultA);
  });

  it("vault.select by name flips the active vault; requireVaultPath picks it up", async () => {
    const ctx = ctxWith({
      OBSIDIAN_VAULT_PATH: vaultA,
      OBSIDIAN_VAULT_SCRATCH: vaultB,
    });

    // Baseline: filesystem tools resolve to vaultA.
    expect(requireVaultPath(ctx)).toBe(vaultA);

    const select = (await tool("vault.select").handler(ctx, { name: "scratch" })) as {
      changed: boolean;
      active: { path: string; isActive: boolean };
      previous: unknown;
    };
    expect(select.changed).toBe(true);
    expect(select.active.path).toBe(vaultB);
    expect(select.active.isActive).toBe(true);

    // After select: filesystem tools resolve to vaultB.
    expect(requireVaultPath(ctx)).toBe(vaultB);

    // Explicit per-call arg STILL wins over the session selection.
    expect(requireVaultPath(ctx, vaultA)).toBe(vaultA);
  });

  it("vault.select by ad-hoc path accepts unregistered directories", async () => {
    const ctx = ctxWith({ OBSIDIAN_VAULT_PATH: vaultA });
    const freshVault = path.join(tempRoot, "fresh");
    await fs.mkdir(freshVault, { recursive: true });
    const select = (await tool("vault.select").handler(ctx, { path: freshVault })) as {
      active: { path: string; id: string };
    };
    expect(select.active.path).toBe(path.resolve(freshVault));
    expect(select.active.id.startsWith("path:")).toBe(true);
    expect(requireVaultPath(ctx)).toBe(path.resolve(freshVault));
  });

  it("vault.reset clears the selection and falls back to env default", async () => {
    const ctx = ctxWith({
      OBSIDIAN_VAULT_PATH: vaultA,
      OBSIDIAN_VAULT_SCRATCH: vaultB,
    });
    await tool("vault.select").handler(ctx, { name: "scratch" });
    expect(requireVaultPath(ctx)).toBe(vaultB);

    const reset = (await tool("vault.reset").handler(ctx, {})) as {
      changed: boolean;
      previous: { path: string } | null;
    };
    expect(reset.changed).toBe(true);
    expect(reset.previous?.path).toBe(vaultB);
    expect(requireVaultPath(ctx)).toBe(vaultA);

    // Second reset is a no-op.
    const reset2 = (await tool("vault.reset").handler(ctx, {})) as { changed: boolean };
    expect(reset2.changed).toBe(false);
  });

  it("vault.select rejects a denied vault (allow/deny gating)", async () => {
    const ctx = ctxWith({
      OBSIDIAN_VAULT_PATH: vaultA,
      OBSIDIAN_VAULT_SCRATCH: vaultB,
      KOBSIDIAN_VAULT_DENY: "scratch",
    });
    await expect(tool("vault.select").handler(ctx, { name: "scratch" })).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("vault.select rejects a non-existent path", async () => {
    const ctx = ctxWith({ OBSIDIAN_VAULT_PATH: vaultA });
    await expect(
      tool("vault.select").handler(ctx, { path: path.join(tempRoot, "nope") }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("vault.select Zod rejects providing two of {id, name, path}", async () => {
    const ctx = ctxWith({ OBSIDIAN_VAULT_PATH: vaultA });
    await expect(tool("vault.select").handler(ctx, { name: "a", path: vaultA })).rejects.toThrow();
  });
});
