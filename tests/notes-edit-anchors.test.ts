import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { insertAfterHeading } from "../src/domain/smart-insert.js";
import { createServer } from "../src/server/create-server.js";
import { makeContext, makeTempVault } from "./helpers.js";

async function connect(vault: string) {
  const server = createServer(makeContext(vault));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "anchor-test", version: "1.0.0" }, { capabilities: {} });
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as Array<{ type: string; text?: string }>;
  return content.map((item) => item.text ?? "").join("\n");
}

describe("notes.edit anchors (issue #38 follow-up)", () => {
  it("reports a missing heading as not_found instead of failing output validation", async () => {
    const vault = await makeTempVault();
    await fs.writeFile(path.join(vault, "fontes.md"), "# Página\n\n## Fontes\n\n- existente\n");
    const { client, close } = await connect(vault);

    const missing = await client.callTool({
      name: "notes.edit",
      arguments: { mode: "after-heading", path: "fontes.md", anchor: "Sources", content: "- nova" },
    });
    expect(missing.isError).toBe(true);
    expect(textOf(missing)).toMatch(/^not_found: Heading 'Sources' not found in fontes\.md/);
    expect(textOf(missing)).not.toContain("Output validation");

    const matched = await client.callTool({
      name: "notes.edit",
      arguments: { mode: "after-heading", path: "fontes.md", anchor: "Fontes", content: "- nova" },
    });
    expect(matched.isError).not.toBe(true);
    expect(matched.structuredContent).toMatchObject({ changed: true, target: "fontes.md" });
    expect(await fs.readFile(path.join(vault, "fontes.md"), "utf8")).toBe(
      "# Página\n\n## Fontes\n\n- nova\n- existente\n",
    );

    await close();
  });

  it("reports a missing block id as not_found", async () => {
    const vault = await makeTempVault();
    await fs.writeFile(path.join(vault, "blocks.md"), "# Page\n\nParagraph ^known\n");
    const { client, close } = await connect(vault);

    const missing = await client.callTool({
      name: "notes.edit",
      arguments: { mode: "after-block", path: "blocks.md", anchor: "unknown", content: "x" },
    });
    expect(missing.isError).toBe(true);
    expect(textOf(missing)).toMatch(/^not_found: Block '\^unknown' not found in blocks\.md/);

    const matched = await client.callTool({
      name: "notes.edit",
      arguments: { mode: "after-block", path: "blocks.md", anchor: "known", content: "x" },
    });
    expect(matched.isError).not.toBe(true);
    expect(await fs.readFile(path.join(vault, "blocks.md"), "utf8")).toBe(
      "# Page\n\nParagraph ^known\nx\n",
    );

    await close();
  });
});

async function insertInto(
  vault: string,
  initial: string,
  content: string,
  heading = "Fontes",
): Promise<string> {
  const file = path.join(vault, "placement.md");
  await fs.writeFile(file, initial);
  await insertAfterHeading(makeContext(vault), { filePath: "placement.md", heading, content });
  return fs.readFile(file, "utf8");
}

describe("after-heading placement", () => {
  it("joins an existing list under the heading", async () => {
    const vault = await makeTempVault();
    expect(await insertInto(vault, "## Fontes\n\n- one\n", "- new")).toBe(
      "## Fontes\n\n- new\n- one\n",
    );
  });

  it("keeps a blank line before a paragraph so it is not a lazy continuation", async () => {
    const vault = await makeTempVault();
    expect(await insertInto(vault, "## Fontes\n\nSome text.\n", "- new")).toBe(
      "## Fontes\n\n- new\n\nSome text.\n",
    );
  });

  it("keeps a blank line before the next heading of an empty section", async () => {
    const vault = await makeTempVault();
    expect(await insertInto(vault, "## Definição\n\n## Fontes\n\n## Relacionados\n", "- new")).toBe(
      "## Definição\n\n## Fontes\n\n- new\n\n## Relacionados\n",
    );
  });

  it("handles a heading at end of file and writes the trailing newline exactly once", async () => {
    const vault = await makeTempVault();
    expect(await insertInto(vault, "## Fontes\n", "- new")).toBe("## Fontes\n- new\n");
    expect(await insertInto(vault, "## Fontes\n\n", "- new")).toBe("## Fontes\n\n- new\n");
    expect(await insertInto(vault, "## Fontes", "- new")).toBe("## Fontes\n- new");
  });

  it("inserts directly under a heading that has no blank line", async () => {
    const vault = await makeTempVault();
    expect(await insertInto(vault, "## Fontes\n- one\n", "- new")).toBe(
      "## Fontes\n- new\n- one\n",
    );
  });

  it("normalizes a trailing newline on the inserted content", async () => {
    const vault = await makeTempVault();
    expect(await insertInto(vault, "## Fontes\n\n- one\n", "- new\n")).toBe(
      "## Fontes\n\n- new\n- one\n",
    );
  });

  it("separates a multi-line paragraph insert from an existing list", async () => {
    const vault = await makeTempVault();
    expect(await insertInto(vault, "## Fontes\n\n- one\n", "Intro line.\nSecond line.")).toBe(
      "## Fontes\n\nIntro line.\nSecond line.\n\n- one\n",
    );
  });
});
