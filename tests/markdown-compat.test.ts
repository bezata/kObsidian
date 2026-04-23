import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addDataviewField,
  readDataviewIndex,
  updateDataviewJsBlock,
} from "../src/domain/dataview.js";
import {
  listMarpSlides,
  readMarpDeck,
  updateMarpFrontmatter,
  updateMarpSlide,
} from "../src/domain/marp.js";
import { listMermaidBlocks, updateMermaidBlock } from "../src/domain/mermaid.js";
import { makeContext, makeTempVault } from "./helpers.js";

describe("markdown compatibility domains", () => {
  it("indexes Dataview page, list, task, query, and js metadata", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    const target = path.join(vault, "compat.md");
    await fs.writeFile(
      target,
      [
        "---",
        "status: active",
        "---",
        "# Compatibility",
        "owner:: team",
        "- List row [area:: docs]",
        "- [ ] Ship this [due:: 2026-04-30]",
        "```dataview",
        "TASK FROM #project",
        "```",
        "```dataviewjs",
        "dv.list([1, 2])",
        "```",
        "",
      ].join("\n"),
      "utf8",
    );

    const index = await readDataviewIndex(context, { filePath: "compat.md" });
    expect(index.pageFields.map((field) => field.key)).toEqual(["status", "owner"]);
    expect(index.listItemFields.map((field) => field.key)).toEqual(["area"]);
    expect(index.taskFields.map((field) => field.key)).toEqual(["due"]);
    expect(index.queryBlocks).toHaveLength(1);
    expect(index.jsBlocks).toHaveLength(1);

    await addDataviewField(context, {
      filePath: "compat.md",
      scope: "task",
      lineNumber: 7,
      key: "priority",
      value: "high",
    });
    const withTaskField = await fs.readFile(target, "utf8");
    expect(withTaskField).toContain("- [ ] Ship this [due:: 2026-04-30] [priority:: high]");

    await updateDataviewJsBlock(context, {
      filePath: "compat.md",
      source: "dv.paragraph('updated')\n",
    });
    const updated = await fs.readFile(target, "utf8");
    expect(updated).toContain("TASK FROM #project");
    expect(updated).toContain("dv.paragraph('updated')");
  });

  it("updates Mermaid blocks without touching neighboring markdown", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    const target = path.join(vault, "diagrams.md");
    await fs.writeFile(
      target,
      [
        "# Diagrams",
        "before",
        "```mermaid",
        "---",
        "title: Original",
        "---",
        '%%{init: {"theme": "dark"}}%%',
        "flowchart LR",
        "  A --> B",
        "```",
        "after",
        "",
      ].join("\n"),
      "utf8",
    );

    const listed = await listMermaidBlocks(context, { filePath: "diagrams.md" });
    expect(listed.total).toBe(1);
    expect(listed.items[0]?.diagramKind).toBe("flowchart");
    expect(listed.items[0]?.frontmatter?.data.title).toBe("Original");

    await updateMermaidBlock(context, {
      filePath: "diagrams.md",
      source: "sequenceDiagram\n  Alice->>Bob: Hi\n",
    });
    const updated = await fs.readFile(target, "utf8");
    expect(updated).toContain("# Diagrams\nbefore\n```mermaid\nsequenceDiagram");
    expect(updated).toContain("```\nafter\n");
  });

  it("parses and updates Marp decks source-preservingly", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    const target = path.join(vault, "slides.md");
    await fs.writeFile(
      target,
      [
        "---",
        "marp: true",
        "theme: default",
        "---",
        "# Slide 1",
        "",
        "<!-- color: red -->",
        "",
        "---",
        "",
        "<!-- _color: blue -->",
        "# Slide 2",
        "",
      ].join("\n"),
      "utf8",
    );

    const deck = await readMarpDeck(context, { filePath: "slides.md" });
    expect(deck.isMarpDeck).toBe(true);
    expect(deck.totalSlides).toBe(2);
    expect(deck.slides[1]?.separator).toBe("---");

    const slides = await listMarpSlides(context, { filePath: "slides.md" });
    expect(slides.items[1]?.inheritedDirectives.color).toBe("blue");

    await updateMarpSlide(context, {
      filePath: "slides.md",
      index: 1,
      source: "\n# Slide 2 updated\n",
    });
    await updateMarpFrontmatter(context, {
      filePath: "slides.md",
      fields: { paginate: true },
    });
    const updated = await fs.readFile(target, "utf8");
    expect(updated).toContain("theme: default");
    expect(updated).toContain("paginate: true");
    expect(updated).toContain("# Slide 1");
    expect(updated).toContain("---\n\n# Slide 2 updated");
  });
});
