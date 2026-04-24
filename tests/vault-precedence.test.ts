import { describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import { createDomainContext, requireVaultPath } from "../src/domain/context.js";
import type { VaultRecord } from "../src/schema/vaults.js";

function ctx(envPath: string | undefined, sessionPath: string | null) {
  const env = getEnv({
    ...process.env,
    OBSIDIAN_VAULT_PATH: envPath,
    KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
    // Isolate from host env — avoid namedVaults leaking in from the
    // maintainer's Windows shell.
    ...Object.fromEntries(
      Object.keys(process.env)
        .filter((k) => k.startsWith("OBSIDIAN_VAULT_") && k !== "OBSIDIAN_VAULT_PATH")
        .map((k) => [k, undefined]),
    ),
  } as NodeJS.ProcessEnv);
  const context = createDomainContext(env);
  if (sessionPath) {
    const record: VaultRecord = {
      id: "session",
      name: "session",
      path: sessionPath,
      isDefault: false,
      isActive: true,
      source: "env-named",
      exists: true,
    };
    context.session.activeVault = record;
  }
  return context;
}

// The precedence contract is: arg > session > env > error.
// These tests cover all 8 combinations of (arg, session, env) set/unset.
// This locks in the "no session → identical to v0.2.5" invariant.

describe("requireVaultPath precedence (arg > session > env > throw)", () => {
  it("1. arg + session + env → arg wins", () => {
    const c = ctx("/env", "/session");
    expect(requireVaultPath(c, "/arg")).toBe("/arg");
  });

  it("2. arg + session, no env → arg wins", () => {
    const c = ctx(undefined, "/session");
    expect(requireVaultPath(c, "/arg")).toBe("/arg");
  });

  it("3. arg + env, no session → arg wins", () => {
    const c = ctx("/env", null);
    expect(requireVaultPath(c, "/arg")).toBe("/arg");
  });

  it("4. arg only → arg wins", () => {
    const c = ctx(undefined, null);
    expect(requireVaultPath(c, "/arg")).toBe("/arg");
  });

  it("5. session + env, no arg → session wins", () => {
    const c = ctx("/env", "/session");
    expect(requireVaultPath(c)).toBe("/session");
  });

  it("6. session only → session wins", () => {
    const c = ctx(undefined, "/session");
    expect(requireVaultPath(c)).toBe("/session");
  });

  it("7. env only → env wins (v0.2.5 baseline behaviour)", () => {
    const c = ctx("/env", null);
    expect(requireVaultPath(c)).toBe("/env");
  });

  it("8. nothing set → invalid_argument", () => {
    const c = ctx(undefined, null);
    expect(() => requireVaultPath(c)).toThrow();
    try {
      requireVaultPath(c);
    } catch (err) {
      expect(err).toMatchObject({ code: "invalid_argument" });
    }
  });
});

describe("requireVaultPath — context without session (pre-v0.3.0 shape)", () => {
  it("still works when session.activeVault is null (identity with v0.2.5)", () => {
    const c = ctx("/env", null);
    // Equivalent to how every existing call in the domain layer looks.
    expect(requireVaultPath(c, undefined)).toBe("/env");
    expect(requireVaultPath(c, "/override")).toBe("/override");
  });
});
