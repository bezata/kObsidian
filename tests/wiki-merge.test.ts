import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initWiki } from "../src/domain/wiki/init.js";
import { mergeSummary } from "../src/domain/wiki/merge.js";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { makeContext, makeTempVault } from "./helpers.js";

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

describe("wiki.summaryMerge", () => {
  it("creates a concept page with canonical frontmatter when missing", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});

    const result = await mergeSummary(context, {
      targetPath: "wiki/Concepts/memex.md",
      newSection: "Bush described the memex as a trail-making machine.",
      pageType: "concept",
      summary: "Memex, an associative trail machine.",
      aliases: ["memex machine"],
      citationSource: "wiki/Sources/as-we-may-think.md",
    });

    expect(result.created).toBe(true);
    expect(await exists(path.join(vault, "wiki", "Concepts", "memex.md"))).toBe(true);
    const raw = await fs.readFile(path.join(vault, "wiki", "Concepts", "memex.md"), "utf8");
    const parsed = parseFrontmatter(raw);
    expect(parsed.data.type).toBe("concept");
    expect(parsed.data.aliases).toEqual(["memex machine"]);
    expect(parsed.data.summary).toContain("associative trail");
    expect(parsed.content).toContain("Bush described the memex as a trail-making machine.");
    expect(parsed.content).toContain("[[wiki/Sources/as-we-may-think.md]]");
  });

  it("creates an entity page with the requested kind when missing", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});

    const result = await mergeSummary(context, {
      targetPath: "wiki/Entities/vannevar-bush.md",
      newSection: "American engineer.",
      pageType: "entity",
      entityKind: "person",
      summary: "Engineer behind the memex idea.",
    });
    expect(result.created).toBe(true);
    const raw = await fs.readFile(path.join(vault, "wiki", "Entities", "vannevar-bush.md"), "utf8");
    const parsed = parseFrontmatter(raw);
    expect(parsed.data.type).toBe("entity");
    expect(parsed.data.kind).toBe("person");
  });

  it("appends under Discussion on an existing concept page and bumps updated", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2020-01-01\nsummary: Trail-machine.\n---\n\n## Definition\n\n## Discussion\n\nExisting content.\n\n## Related\n",
      "utf8",
    );

    const result = await mergeSummary(context, {
      targetPath: "wiki/Concepts/memex.md",
      newSection: "Added insight about trails.",
      pageType: "concept",
      citationSource: "wiki/Sources/another.md",
      citationQuote: "The memex is a trail-builder, not a database.",
    });

    expect(result.created).toBe(false);
    const raw = await fs.readFile(path.join(vault, "wiki", "Concepts", "memex.md"), "utf8");
    expect(raw).toContain("Added insight about trails.");
    expect(raw).toContain("The memex is a trail-builder, not a database.");
    expect(raw).toContain("[[wiki/Sources/another.md]]");
    const parsed = parseFrontmatter(raw);
    const updatedField = parsed.data.updated;
    const updatedStr =
      updatedField instanceof Date ? updatedField.toISOString().slice(0, 10) : updatedField;
    expect(updatedStr).not.toBe("2020-01-01");
  });

  it("honors a custom heading override", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: s.\n---\n\n## Definition\n\ndef text\n\n## Discussion\n\n",
      "utf8",
    );

    await mergeSummary(context, {
      targetPath: "wiki/Concepts/memex.md",
      newSection: "Under definition",
      pageType: "concept",
      heading: "Definition",
    });
    const raw = await fs.readFile(path.join(vault, "wiki", "Concepts", "memex.md"), "utf8");
    const defIdx = raw.indexOf("## Definition");
    const discIdx = raw.indexOf("## Discussion");
    const underIdx = raw.indexOf("Under definition");
    expect(underIdx).toBeGreaterThan(defIdx);
    expect(underIdx).toBeLessThan(discIdx);
  });
});
