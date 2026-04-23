import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rebuildIndex } from "../src/domain/wiki/index-rebuild.js";
import { ingestSource } from "../src/domain/wiki/ingest.js";
import { initWiki } from "../src/domain/wiki/init.js";
import { makeContext, makeTempVault } from "./helpers.js";

async function readIndex(vault: string): Promise<string> {
  return fs.readFile(path.join(vault, "wiki", "index.md"), "utf8");
}

describe("wiki.indexRebuild", () => {
  it("catalogs sources, concepts, and entities under the right headings", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await ingestSource(context, {
      title: "Alpha Paper",
      content: "body",
      sourceType: "paper",
      summary: "Alpha paper summary.",
      ingestedAt: "2026-04-20",
    });
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-04-21\nsummary: Memex, an associative trail machine.\n---\n\nBody.",
      "utf8",
    );
    await fs.writeFile(
      path.join(vault, "wiki", "Entities", "vannevar-bush.md"),
      "---\ntype: entity\nkind: person\naliases: []\nrelated: []\nsources: []\nupdated: 2026-04-22\nsummary: Engineer behind the memex idea.\n---\n\nBody.",
      "utf8",
    );

    const result = await rebuildIndex(context, {});
    expect(result.changed).toBe(true);
    expect(result.counts).toEqual({ sources: 1, concepts: 1, entities: 1 });

    const index = await readIndex(vault);
    expect(index).toContain("# Wiki Index");
    expect(index).toContain("## Sources");
    expect(index).toContain("## Concepts");
    expect(index).toContain("## Entities");
    expect(index).toContain("Alpha Paper");
    expect(index).toContain("Memex, an associative trail machine.");
    expect(index).toContain("Engineer behind the memex idea.");
    expect(index).toContain("wiki/Sources/alpha-paper.md");
    expect(index).toContain("wiki/Concepts/memex.md");
    expect(index).toContain("wiki/Entities/vannevar-bush.md");
  });

  it("shows placeholders when a category is empty", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});

    await rebuildIndex(context, {});
    const index = await readIndex(vault);
    expect(index).toContain("_No sources yet._");
    expect(index).toContain("_No concepts yet._");
    expect(index).toContain("_No entities yet._");
  });

  it("includeCounts:true renders the count next to each heading", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await ingestSource(context, {
      title: "One",
      content: "x",
      sourceType: "note",
      summary: "one",
      ingestedAt: "2026-04-20",
    });
    await ingestSource(context, {
      title: "Two",
      content: "y",
      sourceType: "note",
      summary: "two",
      ingestedAt: "2026-04-20",
    });
    await rebuildIndex(context, { includeCounts: true });
    const index = await readIndex(vault);
    expect(index).toMatch(/## Sources \(2\)/);
    expect(index).toMatch(/## Concepts \(0\)/);
  });

  it("includes pages nested in category subfolders", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.mkdir(path.join(vault, "wiki", "Sources", "papers"), { recursive: true });
    await fs.writeFile(
      path.join(vault, "wiki", "Sources", "papers", "nested-paper.md"),
      "---\ntype: source\nsource_type: paper\ntitle: Nested Paper\ningested_at: 2026-04-22\ntags: []\nsummary: A paper in a subfolder.\n---\n\nBody.",
      "utf8",
    );

    const result = await rebuildIndex(context, {});
    expect(result.counts.sources).toBe(1);
    const index = await readIndex(vault);
    expect(index).toContain("wiki/Sources/papers/nested-paper.md");
    expect(index).toContain("Nested Paper");
  });

  it("sorts entries alphabetically by title", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await ingestSource(context, {
      title: "Banana",
      content: "b",
      sourceType: "note",
      summary: "b",
      ingestedAt: "2026-04-20",
    });
    await ingestSource(context, {
      title: "Apple",
      content: "a",
      sourceType: "note",
      summary: "a",
      ingestedAt: "2026-04-20",
    });
    await rebuildIndex(context, {});
    const index = await readIndex(vault);
    const appleIdx = index.indexOf("Apple");
    const bananaIdx = index.indexOf("Banana");
    expect(appleIdx).toBeGreaterThan(-1);
    expect(appleIdx).toBeLessThan(bananaIdx);
  });
});
