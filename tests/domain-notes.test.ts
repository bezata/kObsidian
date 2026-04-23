import { describe, expect, it } from "vitest";
import { createNote, listNotes, readNote, searchNotes } from "../src/domain/notes.js";
import { addTags, searchByTag } from "../src/domain/tags.js";
import { makeContext, makeTempVault } from "./helpers.js";

describe("notes domain", () => {
  it("reads and searches notes from the filesystem vault", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    const note = await readNote(context, { path: "note1.md" });
    expect(note.path).toBe("note1.md");
    expect(note.content).toContain("# Note 1");

    const results = await searchNotes(context, { query: "AI" });
    expect(results.total).toBeGreaterThan(0);
    expect(results.items.some((item) => item.path === "note1.md")).toBe(true);
  });

  it("creates notes and finds them by tag", async () => {
    const vault = await makeTempVault();
    const context = makeContext(vault);

    await createNote(context, {
      path: "Projects/new-note.md",
      content: "# New Note\n\nHello world",
    });
    await addTags(context, { path: "Projects/new-note.md", tags: ["project", "active"] });

    const notes = await listNotes(context, { directory: "Projects", recursive: true });
    expect(notes.items.some((item) => item.path === "Projects/new-note.md")).toBe(true);

    const tagged = await searchByTag(context, { tag: "project" });
    expect(tagged.items.some((item) => item.file === "Projects/new-note.md")).toBe(true);
  });
});
