import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addDataviewField,
  extractDataviewFieldsFromFile,
  searchByDataviewField,
} from "../src/domain/dataview.js";
import {
  createTask,
  getTaskStatistics,
  searchTasks,
  toggleTaskStatus,
} from "../src/domain/tasks.js";
import { makeContext, makeTempVault } from "./helpers.js";

describe("tasks and dataview", () => {
  it("creates, searches, and toggles tasks", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    await createTask(context, {
      filePath: "todo.md",
      content: "Ship TypeScript port #urgent",
      priority: "high",
      dueDate: "2026-04-30",
    });

    const tasks = await searchTasks(context, { tag: "urgent" });
    expect(tasks.total).toBeGreaterThan(0);
    const task = tasks.items[0];
    expect(task?.content).toContain("Ship TypeScript port");

    await toggleTaskStatus(context, {
      sourceFile: "todo.md",
      lineNumber: 1,
      doneDate: "2026-04-22",
    });

    const stats = await getTaskStatistics(context, {});
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.completed).toBeGreaterThan(0);
  });

  it("extracts and searches dataview fields", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    const target = path.join(vault, "dataview.md");
    await fs.writeFile(target, "# Example\nstatus:: active\n[priority:: high]\n", "utf8");

    await addDataviewField(context, {
      filePath: "dataview.md",
      key: "project",
      value: "kobsidian",
      syntaxType: "full-line",
    });

    const extracted = await extractDataviewFieldsFromFile(context, { filePath: "dataview.md" });
    expect(extracted.total).toBe(3);

    const searched = await searchByDataviewField(context, { key: "status", value: "active" });
    expect(searched.totalMatches).toBeGreaterThan(0);
    expect(Object.keys(searched.matchesByFile)).toContain("dataview.md");
  });
});
