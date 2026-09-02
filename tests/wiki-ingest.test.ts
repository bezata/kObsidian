import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ingestSource } from "../src/domain/wiki/ingest.js";
import { initWiki } from "../src/domain/wiki/init.js";
import { parseFrontmatter } from "../src/lib/frontmatter.js";
import { makeContext, makeTempVault } from "./helpers.js";

async function readVaultFile(vault: string, rel: string): Promise<string> {
  return fs.readFile(path.join(vault, rel), "utf8");
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

describe("wiki.ingest", () => {
  it("creates a Sources page with canonical frontmatter and appends a log entry", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});

    const result = await ingestSource(context, {
      title: "As We May Think",
      content: "Memex-style personal knowledge base essay.",
      sourceType: "paper",
      url: "https://example.com/memex",
      author: "Vannevar Bush",
      tags: ["memex", "knowledge-base"],
      summary: "Memex concept from 1945; associative trails between documents.",
      confidence: "high",
      ingestedAt: "2026-04-23",
      relatedConcepts: ["Memex", "Associative Trails"],
      relatedEntities: ["Vannevar Bush"],
    });

    expect(result.changed).toBe(true);
    expect(result.sourcePage).toBe("wiki/Sources/as-we-may-think.md");
    expect(result.slug).toBe("as-we-may-think");

    const raw = await readVaultFile(vault, "wiki/Sources/as-we-may-think.md");
    const parsed = parseFrontmatter(raw);
    expect(parsed.data.type).toBe("source");
    expect(parsed.data.source_type).toBe("paper");
    expect(parsed.data.url).toBe("https://example.com/memex");
    expect(parsed.data.ingested_at).toBe("2026-04-23");
    expect(parsed.data.tags).toEqual(["memex", "knowledge-base"]);
    expect(parsed.data.confidence).toBe("high");
    expect(parsed.content).toContain("## TL;DR");
    expect(parsed.content).toContain("## Key Points");

    const log = await readVaultFile(vault, "wiki/log.md");
    expect(log).toContain("## [2026-04-23] ingest | As We May Think");
    expect(log).toContain("[[wiki/Sources/as-we-may-think.md]]");
  });

  it("returns proposedEdits: createStub for missing concepts, insertAfterHeading for existing ones", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      `---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: Bush's trail-based knowledge machine.\n---\n\n## Definition\n\n## Discussion\n\n## Related\n`,
      "utf8",
    );

    const result = await ingestSource(context, {
      title: "As We May Think",
      content: "Memex paper.",
      sourceType: "paper",
      summary: "The memex paper.",
      ingestedAt: "2026-04-23",
      relatedConcepts: ["Memex", "Associative Trails"],
    });

    const proposals = result.proposedEdits;
    const memex = proposals.find((p) => p.path === "wiki/Concepts/memex.md");
    const trails = proposals.find((p) => p.path === "wiki/Concepts/associative-trails.md");
    expect(memex?.operation).toBe("insertAfterHeading");
    expect(memex?.heading).toBe("Discussion");
    expect(memex?.suggestedContent).toContain("[[wiki/Sources/as-we-may-think.md");
    expect(trails?.operation).toBe("createStub");
    expect(trails?.suggestedContent).toContain("type: concept");

    const hasIndexProposal = proposals.some(
      (p) => p.path === "wiki/index.md" && p.operation === "insertAfterHeading",
    );
    expect(hasIndexProposal).toBe(true);
  });

  it("rejects duplicate slugs with conflict", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await ingestSource(context, {
      title: "Duplicate",
      content: "first",
      sourceType: "note",
      summary: "first",
      ingestedAt: "2026-04-23",
    });

    await expect(
      ingestSource(context, {
        title: "Duplicate",
        content: "second",
        sourceType: "note",
        summary: "second",
        ingestedAt: "2026-04-23",
      }),
    ).rejects.toThrow(/already exists/);
  });

  it("uses sourcePath: embeds raw-source wikilink and includes source_path in frontmatter", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(
      path.join(vault, "clipped-article.md"),
      "# Clipped article\n\nBody text.",
      "utf8",
    );

    const result = await ingestSource(context, {
      title: "Clipped article",
      sourcePath: "clipped-article.md",
      sourceType: "article",
      summary: "Article clipped into the vault.",
      ingestedAt: "2026-04-23",
    });

    const raw = await readVaultFile(vault, result.sourcePage);
    const parsed = parseFrontmatter(raw);
    expect(parsed.data.source_path).toBe("clipped-article.md");
    expect(parsed.content).toContain("[[clipped-article.md]]");
  });

  it("targets configured headings and scaffolds stubs with them (issue #39)", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault, {
      KOBSIDIAN_WIKI_INDEX_SOURCES_HEADING: "Fontes",
      KOBSIDIAN_WIKI_CONCEPT_PAGE_HEADING: "Discussão",
      KOBSIDIAN_WIKI_ENTITY_PAGE_HEADING: "Fatos Notáveis",
    });
    await initWiki(context, {});
    expect(await readVaultFile(vault, "wiki/index.md")).toContain("## Fontes");
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: s.\n---\n\n## Definição\n\n## Discussão\n\n## Relacionados\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(vault, "wiki", "Entities", "vannevar-bush.md"),
      "---\ntype: entity\nkind: person\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: s.\n---\n\n## Visão Geral\n\n## Fatos Notáveis\n\n## Relacionados\n",
      "utf8",
    );

    const result = await ingestSource(context, {
      title: "As We May Think",
      content: "Memex paper.",
      sourceType: "paper",
      summary: "The memex paper.",
      ingestedAt: "2026-04-23",
      relatedConcepts: ["Memex", "Trilhas Associativas"],
      relatedEntities: ["Vannevar Bush"],
    });

    const byPath = new Map(result.proposedEdits.map((p) => [p.path, p]));
    expect(byPath.get("wiki/index.md")).toMatchObject({
      operation: "insertAfterHeading",
      heading: "Fontes",
    });
    expect(byPath.get("wiki/Concepts/memex.md")).toMatchObject({
      operation: "insertAfterHeading",
      heading: "Discussão",
    });
    expect(byPath.get("wiki/Entities/vannevar-bush.md")).toMatchObject({
      operation: "insertAfterHeading",
      heading: "Fatos Notáveis",
    });
    expect(byPath.get("wiki/Concepts/trilhas-associativas.md")?.suggestedContent).toContain(
      "## Discussão",
    );
  });

  it("lets per-call heading overrides win over env", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault, { KOBSIDIAN_WIKI_CONCEPT_PAGE_HEADING: "Discussão" });
    await initWiki(context, {});
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: s.\n---\n\n## Notes\n",
      "utf8",
    );
    await fs.writeFile(path.join(vault, "wiki", "index.md"), "# Índice\n\n## Fontes\n", "utf8");

    const result = await ingestSource(context, {
      title: "Override",
      content: "body",
      sourceType: "note",
      summary: "s",
      ingestedAt: "2026-04-23",
      relatedConcepts: ["Memex", "Novo"],
      indexHeading: "Fontes",
      conceptHeading: "Notes",
    });

    const byPath = new Map(result.proposedEdits.map((p) => [p.path, p]));
    expect(byPath.get("wiki/index.md")).toMatchObject({
      operation: "insertAfterHeading",
      heading: "Fontes",
    });
    expect(byPath.get("wiki/Concepts/memex.md")).toMatchObject({
      operation: "insertAfterHeading",
      heading: "Notes",
    });
    expect(byPath.get("wiki/Concepts/novo.md")?.suggestedContent).toContain("## Notes");
  });

  it("degrades to append when the target heading is missing so proposals stay applicable", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(path.join(vault, "wiki", "index.md"), "# Índice\n\n## Fontes\n", "utf8");
    await fs.writeFile(
      path.join(vault, "wiki", "Concepts", "memex.md"),
      "---\ntype: concept\naliases: []\nrelated: []\nsources: []\nupdated: 2026-01-01\nsummary: s.\n---\n\n## Discussão\n",
      "utf8",
    );

    const result = await ingestSource(context, {
      title: "Fallback",
      content: "body",
      sourceType: "note",
      summary: "s",
      ingestedAt: "2026-04-23",
      relatedConcepts: ["Memex"],
    });

    const byPath = new Map(result.proposedEdits.map((p) => [p.path, p]));
    expect(byPath.get("wiki/index.md")?.operation).toBe("append");
    expect(byPath.get("wiki/index.md")?.heading).toBeUndefined();
    expect(byPath.get("wiki/index.md")?.reason).toContain("Heading 'Sources' was not found");
    expect(byPath.get("wiki/Concepts/memex.md")?.operation).toBe("append");
    expect(byPath.get("wiki/Concepts/memex.md")?.reason).toContain(
      "Heading 'Discussion' was not found",
    );
  });

  it("anchors on count-suffixed index headings written by includeCounts", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});
    await fs.writeFile(
      path.join(vault, "wiki", "index.md"),
      "# Wiki Index\n\n## Sources (2)\n\n- a\n- b\n\n## Concepts (0)\n",
      "utf8",
    );

    const result = await ingestSource(context, {
      title: "Counted",
      content: "body",
      sourceType: "note",
      summary: "s",
      ingestedAt: "2026-04-23",
    });

    const index = result.proposedEdits.find((p) => p.path === "wiki/index.md");
    expect(index).toMatchObject({ operation: "insertAfterHeading", heading: "Sources (2)" });
  });

  it("auto-initializes the wiki if missing", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    await ingestSource(context, {
      title: "Fresh ingest",
      content: "body",
      sourceType: "note",
      summary: "one-line",
      ingestedAt: "2026-04-23",
    });

    expect(await exists(path.join(vault, "wiki/Sources/fresh-ingest.md"))).toBe(true);
    expect(await exists(path.join(vault, "wiki/log.md"))).toBe(true);
  });
});
