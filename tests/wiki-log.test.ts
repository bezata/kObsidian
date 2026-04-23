import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initWiki } from "../src/domain/wiki/init.js";
import { appendLogEntry } from "../src/domain/wiki/log.js";
import { makeContext, makeTempVault } from "./helpers.js";

async function readLog(vault: string, root = "wiki"): Promise<string> {
  return fs.readFile(path.join(vault, root, "log.md"), "utf8");
}

describe("wiki.logAppend", () => {
  it("appends a greppable ingest entry with a specific date", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});

    const result = await appendLogEntry(context, {
      op: "ingest",
      title: "Vannevar Bush — As We May Think",
      date: "2026-04-23",
      body: "Memex-style personal knowledge base paper.",
      refs: ["wiki/Sources/as-we-may-think.md"],
    });

    expect(result.changed).toBe(true);
    const log = await readLog(vault);
    expect(log).toContain("## [2026-04-23] ingest | Vannevar Bush — As We May Think");
    expect(log).toContain("Memex-style personal knowledge base paper.");
    expect(log).toContain("[[wiki/Sources/as-we-may-think.md]]");
  });

  it("uses today's date when none provided and matches YYYY-MM-DD", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});

    await appendLogEntry(context, { op: "query", title: "memex pattern" });
    const log = await readLog(vault);
    expect(log).toMatch(/## \[\d{4}-\d{2}-\d{2}\] query \| memex pattern/);
  });

  it("preserves order across multiple appends", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, {});

    await appendLogEntry(context, { op: "ingest", title: "A", date: "2026-01-01" });
    await appendLogEntry(context, { op: "lint", title: "B", date: "2026-01-02" });
    await appendLogEntry(context, { op: "query", title: "C", date: "2026-01-03" });

    const log = await readLog(vault);
    const idxA = log.indexOf("ingest | A");
    const idxB = log.indexOf("lint | B");
    const idxC = log.indexOf("query | C");
    expect(idxA).toBeGreaterThan(-1);
    expect(idxA).toBeLessThan(idxB);
    expect(idxB).toBeLessThan(idxC);
  });

  it("initializes log.md if the wiki hasn't been init'd yet", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    await appendLogEntry(context, { op: "note", title: "first entry", date: "2026-04-23" });
    const log = await readLog(vault);
    expect(log).toContain("## [2026-04-23] note | first entry");
  });

  it("honors wikiRoot override", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);
    await initWiki(context, { wikiRoot: "KB" });

    await appendLogEntry(context, {
      op: "decision",
      title: "use KB/",
      date: "2026-04-23",
      wikiRoot: "KB",
    });
    const log = await fs.readFile(path.join(vault, "KB", "log.md"), "utf8");
    expect(log).toContain("## [2026-04-23] decision | use KB/");
  });
});
