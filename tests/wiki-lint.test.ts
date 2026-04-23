import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rebuildIndex } from "../src/domain/wiki/index-rebuild.js";
import { initWiki } from "../src/domain/wiki/init.js";
import { lintWiki } from "../src/domain/wiki/lint.js";
import { makeContext, makeTempVault } from "./helpers.js";

async function writeFile(vault: string, rel: string, content: string) {
  const full = path.join(vault, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

describe("wiki.lint", () => {
  it("flags orphan pages under wiki/", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await writeFile(
      vault,
      "wiki/Concepts/orphan-idea.md",
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-04-20\nsummary: Orphan.\n---\n\nNothing here.\n",
    );

    const result = await lintWiki(context, {});
    const paths = result.findings.orphans.map((f) => f.path);
    expect(paths).toContain("wiki/Concepts/orphan-idea.md");
  });

  it("flags broken wikilinks originating inside wiki/", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await writeFile(
      vault,
      "wiki/Concepts/has-broken.md",
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-04-20\nsummary: Has broken.\n---\n\nSee [[wiki/Concepts/does-not-exist.md]].\n",
    );

    const result = await lintWiki(context, {});
    const broken = result.findings.brokenLinks;
    expect(broken.some((b) => b.brokenLink.includes("does-not-exist"))).toBe(true);
  });

  it("flags stale sources based on staleDays", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await writeFile(
      vault,
      "wiki/Sources/old-news.md",
      "---\ntype: source\nsource_type: article\ntitle: Old News\ningested_at: 2020-01-01\ntags: [stale]\nsummary: stale.\n---\n\nBody [[wiki/Concepts/something.md]].\n",
    );

    const result = await lintWiki(context, { staleDays: 30 });
    const stale = result.findings.stale;
    expect(stale.some((s) => s.path === "wiki/Sources/old-news.md")).toBe(true);
  });

  it("flags missing concept pages for wikilinks that have no target", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await writeFile(
      vault,
      "wiki/Sources/mentions-unknown.md",
      "---\ntype: source\nsource_type: article\ntitle: Mentions Unknown\ningested_at: 2026-04-20\ntags: []\nsummary: refs unknown concept.\n---\n\nDiscusses [[wiki/Concepts/unknown-concept.md]].\n",
    );

    const result = await lintWiki(context, {});
    const missing = result.findings.missingPages;
    expect(missing.some((m) => m.target.includes("unknown-concept"))).toBe(true);
  });

  it("flags tag singletons", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await writeFile(
      vault,
      "wiki/Sources/alpha.md",
      "---\ntype: source\nsource_type: article\ntitle: Alpha\ningested_at: 2026-04-20\ntags: [only-here]\nsummary: s.\n---\n\nBody.\n",
    );
    await writeFile(
      vault,
      "wiki/Sources/beta.md",
      "---\ntype: source\nsource_type: article\ntitle: Beta\ningested_at: 2026-04-20\ntags: [used-twice]\nsummary: s.\n---\n\nBody.\n",
    );
    await writeFile(
      vault,
      "wiki/Sources/gamma.md",
      "---\ntype: source\nsource_type: article\ntitle: Gamma\ningested_at: 2026-04-20\ntags: [used-twice]\nsummary: s.\n---\n\nBody.\n",
    );

    const result = await lintWiki(context, {});
    const singles = result.findings.tagSingletons.map((t) => t.tag);
    expect(singles).toContain("only-here");
    expect(singles).not.toContain("used-twice");
  });

  it("flags wiki pages missing from index.md", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await writeFile(
      vault,
      "wiki/Concepts/unlinked-page.md",
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-04-20\nsummary: Unlinked.\n---\n\nBody.\n",
    );
    // index.md intentionally not rebuilt

    const result = await lintWiki(context, {});
    const notInIndex = result.findings.indexMismatch.missingFromIndex;
    expect(notInIndex).toContain("wiki/Concepts/unlinked-page.md");
  });

  it("returns a summary count across categories", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await writeFile(
      vault,
      "wiki/Concepts/orphan.md",
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-04-20\nsummary: s.\n---\n\nBody.\n",
    );
    await rebuildIndex(context, {});

    const result = await lintWiki(context, {});
    expect(typeof result.totals.orphans).toBe("number");
    expect(typeof result.totals.brokenLinks).toBe("number");
    expect(typeof result.totals.stale).toBe("number");
    expect(typeof result.totals.missingPages).toBe("number");
    expect(typeof result.totals.tagSingletons).toBe("number");
    expect(result.totals.all).toBe(
      result.totals.orphans +
        result.totals.brokenLinks +
        result.totals.stale +
        result.totals.missingPages +
        result.totals.tagSingletons +
        result.totals.indexMissingFromIndex +
        result.totals.indexStaleEntries,
    );
  });
});
