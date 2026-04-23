import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ingestSource } from "../src/domain/wiki/ingest.js";
import { initWiki } from "../src/domain/wiki/init.js";
import { queryWiki } from "../src/domain/wiki/query.js";
import { makeContext, makeTempVault } from "./helpers.js";

describe("wiki.query", () => {
  it("ranks pages by filename, aliases, tags, and body", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      `---\ntype: concept\naliases: [\"Memex\", \"memex machine\"]\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: Bush's trail-based knowledge machine.\n---\n\nDiscussion about the memex.`,
      "utf8",
    );
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "hypertext.md"),
      `---\ntype: concept\naliases: [\"hypertext\"]\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: Linked text.\n---\n\nSomeone once wrote about a memex too.`,
      "utf8",
    );
    await fs.writeFile(
      path.join(vault, "wiki", "Entities", "vannevar-bush.md"),
      "---\ntype: entity\nkind: person\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: Engineer.\ntags: [memex]\n---\n\nHe wrote about knowledge.",
      "utf8",
    );

    const result = await queryWiki(context, { topic: "memex" });
    expect(result.total).toBeGreaterThan(0);
    const top = result.topPages[0];
    expect(top?.path).toBe("wiki/Concepts/memex.md");
    expect(top?.score).toBeGreaterThan(0);
    expect(top?.matchedOn).toContain("filename");
    const paths = result.topPages.map((p) => p.path);
    expect(paths).toContain("wiki/Entities/vannevar-bush.md");
    expect(paths).toContain("wiki/Concepts/hypertext.md");
    const byPath = Object.fromEntries(result.topPages.map((p) => [p.path, p]));
    expect(byPath["wiki/Entities/vannevar-bush.md"]?.matchedOn).toContain("tag");
    expect(byPath["wiki/Concepts/hypertext.md"]?.matchedOn).toContain("body");
  });

  it("respects limit", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    for (let i = 0; i < 6; i++) {
      await ingestSource(context, {
        title: `Memex source ${i}`,
        content: "body about memex",
        sourceType: "note",
        summary: "memex",
        ingestedAt: "2026-04-20",
      });
    }
    const result = await queryWiki(context, { topic: "memex", limit: 3 });
    expect(result.topPages.length).toBeLessThanOrEqual(3);
  });

  it("returns empty topPages when nothing matches", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    const result = await queryWiki(context, { topic: "nonexistent-topic-xyz" });
    expect(result.topPages).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("only searches inside the configured wiki root", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    // This note is outside the wiki/ folder — should be ignored.
    await fs.writeFile(path.join(vault, "memex-elsewhere.md"), "memex memex memex", "utf8");
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      `---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: Bush's idea.\n---\n\nThe memex.`,
      "utf8",
    );

    const result = await queryWiki(context, { topic: "memex" });
    expect(result.topPages.every((page) => page.path.startsWith("wiki/"))).toBe(true);
  });
});
