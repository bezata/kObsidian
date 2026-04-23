import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { addCanvasEdge, addCanvasNode, parseCanvas } from "../src/domain/canvas.js";
import { addKanbanCard, getKanbanStatistics, parseKanbanBoard } from "../src/domain/kanban.js";
import { getBacklinks } from "../src/domain/links.js";
import { makeContext, makeTempVault } from "./helpers.js";

describe("links, kanban, and canvas", () => {
  it("finds backlinks in the sample vault", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    const backlinks = await getBacklinks(context, { path: "note1.md" });
    expect(backlinks.total).toBeGreaterThan(0);
    expect(backlinks.items.some((item) => item.sourcePath === "note2.md")).toBe(true);
  });

  it("parses kanban boards and canvas files", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    const kanbanPath = path.join(vault, "board.md");
    await fs.writeFile(kanbanPath, "## To Do\n\n- [ ] Write tests\n", "utf8");
    await addKanbanCard(context, {
      filePath: "board.md",
      columnName: "To Do",
      cardText: "Ship release",
    });

    const board = await parseKanbanBoard(context, { filePath: "board.md" });
    expect(board.totalCards).toBe(2);
    const kanbanStats = await getKanbanStatistics(context, { filePath: "board.md" });
    expect(kanbanStats.totalCards).toBe(2);

    const canvasPath = path.join(vault, "diagram.canvas");
    await fs.writeFile(canvasPath, JSON.stringify({ nodes: [], edges: [] }, null, 2), "utf8");
    const first = await addCanvasNode(context, {
      filePath: "diagram.canvas",
      nodeType: "text",
      content: "Hello",
      x: 10,
      y: 20,
    });
    const second = await addCanvasNode(context, {
      filePath: "diagram.canvas",
      nodeType: "text",
      content: "World",
      x: 50,
      y: 60,
    });
    await addCanvasEdge(context, {
      filePath: "diagram.canvas",
      fromNode: String(first.nodeId),
      toNode: String(second.nodeId),
    });
    const canvas = await parseCanvas(context, { filePath: "diagram.canvas" });
    expect(canvas.nodeCount).toBe(2);
    expect(canvas.edgeCount).toBe(1);
  });
});
