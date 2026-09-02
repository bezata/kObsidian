import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
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
    expect(await fs.readFile(path.join(vault, "fontes.md"), "utf8")).toContain(
      "## Fontes\n- nova\n",
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

    await close();
  });
});
