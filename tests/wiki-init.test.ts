import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initWiki } from "../src/domain/wiki/init.js";
import { makeContext, makeTempVault } from "./helpers.js";

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

describe("wiki.init", () => {
  it("scaffolds the default wiki layout", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    const result = await initWiki(context, {});

    expect(result.changed).toBe(true);
    expect(result.created).toEqual(
      expect.arrayContaining([
        "wiki",
        "wiki/Sources",
        "wiki/Concepts",
        "wiki/Entities",
        "wiki/index.md",
        "wiki/log.md",
        "wiki/wiki-schema.md",
      ]),
    );
    for (const rel of [
      "wiki/Sources",
      "wiki/Concepts",
      "wiki/Entities",
      "wiki/index.md",
      "wiki/log.md",
      "wiki/wiki-schema.md",
    ]) {
      expect(await exists(path.join(vault, rel))).toBe(true);
    }
    const index = await fs.readFile(path.join(vault, "wiki", "index.md"), "utf8");
    expect(index).toContain("# Wiki Index");
    const log = await fs.readFile(path.join(vault, "wiki", "log.md"), "utf8");
    expect(log).toContain("# Wiki Log");
    const schema = await fs.readFile(path.join(vault, "wiki", "wiki-schema.md"), "utf8");
    expect(schema).toContain("Wiki Schema");
    expect(schema).toContain("type: source");
  });

  it("is idempotent: rerunning preserves existing content", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(path.join(vault, "wiki", "index.md"), "# Custom index", "utf8");

    const second = await initWiki(context, {});
    expect(second.created).toEqual([]);
    expect(second.changed).toBe(false);
    const index = await fs.readFile(path.join(vault, "wiki", "index.md"), "utf8");
    expect(index).toBe("# Custom index");
  });

  it("honors wikiRoot override", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    const result = await initWiki(context, { wikiRoot: "KB/Brain" });
    expect(result.created).toEqual(
      expect.arrayContaining(["KB/Brain", "KB/Brain/Sources", "KB/Brain/index.md"]),
    );
    expect(await exists(path.join(vault, "KB/Brain/log.md"))).toBe(true);
  });

  it("force:true overwrites seed files but leaves user subpages alone", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(path.join(vault, "wiki", "index.md"), "# Custom index", "utf8");
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "my-idea.md"),
      "---\ntype: concept\n---\nbody",
      "utf8",
    );

    const result = await initWiki(context, { force: true });
    expect(result.changed).toBe(true);
    const index = await fs.readFile(path.join(vault, "wiki", "index.md"), "utf8");
    expect(index).toContain("# Wiki Index");
    const userPage = await fs.readFile(path.join(vault, "wiki", "Concepts", "my-idea.md"), "utf8");
    expect(userPage).toContain("body");
  });
});
