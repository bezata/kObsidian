import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { obsidianConfigCandidates } from "../src/domain/vaults.js";

// Path.join uses OS-native separators (\ on Windows, / on POSIX). The tests
// feed mocked platforms into obsidianConfigCandidates, but the implementation
// under test still calls Node's path.join against the host runner's OS. We
// compose expectations via path.join too so the tests work identically on
// Windows, macOS, and Linux runners.
const J = path.join;

// These tests verify the platform-path resolution logic by feeding
// mocked `{platform, home, env}` directly into `obsidianConfigCandidates`.
// That avoids the need for actual macOS / Linux runners to prove the
// paths are correct — the real CI matrix (ci.yml) then confirms the
// resulting code still compiles + runs on each OS.

const macHome = "/Users/alice";
const linuxHome = "/home/carol";
const winHome = "C:\\Users\\Gaming";

describe("obsidianConfigCandidates — macOS", () => {
  it("returns the Application Support path", () => {
    const out = obsidianConfigCandidates({
      platform: "darwin",
      home: macHome,
      env: {},
    });
    expect(out).toEqual([J(macHome, "Library/Application Support/obsidian/obsidian.json")]);
  });

  it("ignores XDG_CONFIG_HOME on darwin (XDG is Linux-only here)", () => {
    const out = obsidianConfigCandidates({
      platform: "darwin",
      home: macHome,
      env: { XDG_CONFIG_HOME: "/irrelevant" },
    });
    expect(out).toEqual([J(macHome, "Library/Application Support/obsidian/obsidian.json")]);
  });
});

describe("obsidianConfigCandidates — Windows", () => {
  it("uses APPDATA when set", () => {
    const out = obsidianConfigCandidates({
      platform: "win32",
      home: winHome,
      env: { APPDATA: "C:\\Users\\Gaming\\AppData\\Roaming" },
    });
    expect(out).toHaveLength(1);
    // node's path.join on win32 produces backslash-separated output when
    // running on Windows, and POSIX slashes when running on Linux/mac.
    // Don't assert the exact slash style — assert the suffix only.
    expect(
      out[0]?.endsWith("obsidian/obsidian.json") || out[0]?.endsWith("obsidian\\obsidian.json"),
    ).toBe(true);
    expect(out[0]).toContain("AppData");
    expect(out[0]).toContain("Roaming");
  });

  it("falls back to home/AppData/Roaming when APPDATA is unset", () => {
    const out = obsidianConfigCandidates({
      platform: "win32",
      home: winHome,
      env: {},
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("AppData");
    expect(out[0]).toContain("Roaming");
    expect(out[0]).toContain("Gaming");
  });
});

describe("obsidianConfigCandidates — Linux", () => {
  it("prefers XDG_CONFIG_HOME when set, then falls back to ~/.config then flatpak then snap", () => {
    const out = obsidianConfigCandidates({
      platform: "linux",
      home: linuxHome,
      env: { XDG_CONFIG_HOME: "/xdg/config" },
    });
    expect(out).toEqual([
      J("/xdg/config", "obsidian/obsidian.json"),
      J(linuxHome, ".config/obsidian/obsidian.json"),
      J(linuxHome, ".var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json"),
      J(linuxHome, "snap/obsidian/current/.config/obsidian/obsidian.json"),
    ]);
  });

  it("omits the XDG entry when XDG_CONFIG_HOME is unset", () => {
    const out = obsidianConfigCandidates({
      platform: "linux",
      home: linuxHome,
      env: {},
    });
    expect(out).toEqual([
      J(linuxHome, ".config/obsidian/obsidian.json"),
      J(linuxHome, ".var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json"),
      J(linuxHome, "snap/obsidian/current/.config/obsidian/obsidian.json"),
    ]);
  });

  it("omits empty XDG_CONFIG_HOME", () => {
    const out = obsidianConfigCandidates({
      platform: "linux",
      home: linuxHome,
      env: { XDG_CONFIG_HOME: "" },
    });
    expect(out).toEqual([
      J(linuxHome, ".config/obsidian/obsidian.json"),
      J(linuxHome, ".var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json"),
      J(linuxHome, "snap/obsidian/current/.config/obsidian/obsidian.json"),
    ]);
  });
});

describe("obsidianConfigCandidates — escape hatch", () => {
  it("KOBSIDIAN_OBSIDIAN_CONFIG overrides everything on every platform", () => {
    for (const platform of ["darwin", "win32", "linux"] as const) {
      const out = obsidianConfigCandidates({
        platform,
        home: "/irrelevant",
        env: { KOBSIDIAN_OBSIDIAN_CONFIG: "/explicit/path/obsidian.json" },
      });
      expect(out).toEqual(["/explicit/path/obsidian.json"]);
    }
  });

  it("ignores empty-string override", () => {
    const out = obsidianConfigCandidates({
      platform: "darwin",
      home: macHome,
      env: { KOBSIDIAN_OBSIDIAN_CONFIG: "" },
    });
    expect(out).toEqual([J(macHome, "Library/Application Support/obsidian/obsidian.json")]);
  });
});
