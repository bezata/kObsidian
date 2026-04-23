import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import { createDomainContext } from "../src/domain/context.js";
import { ingestSource } from "../src/domain/wiki/ingest.js";
import { initWiki } from "../src/domain/wiki/init.js";
import { createServer } from "../src/server/create-server.js";
import { makeTempVault } from "./helpers.js";

async function connectedClient(vault: string) {
  const context = createDomainContext(
    getEnv({
      ...process.env,
      OBSIDIAN_VAULT_PATH: vault,
      KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
    }),
  );
  const server = createServer(context);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client(
    { name: "wiki-resources-client", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(clientTransport);
  return {
    client,
    server,
    context,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe("MCP resources + prompts", () => {
  it("lists the three static wiki resources", async () => {
    const vault = await makeTempVault();
    const { client, close } = await connectedClient(vault);
    try {
      const { resources } = await client.listResources();
      const uris = resources.map((r) => r.uri);
      expect(uris).toEqual(
        expect.arrayContaining([
          "kobsidian://wiki/index",
          "kobsidian://wiki/log",
          "kobsidian://wiki/schema",
        ]),
      );
    } finally {
      await close();
    }
  });

  it("reads a static wiki resource after init", async () => {
    const vault = await makeTempVault();
    const { client, context, close } = await connectedClient(vault);
    try {
      await initWiki(context, {});
      const result = await client.readResource({ uri: "kobsidian://wiki/index" });
      const first = result.contents[0];
      expect(first?.mimeType).toBe("text/markdown");
      const text = first && "text" in first ? first.text : "";
      expect(text).toContain("# Wiki Index");
    } finally {
      await close();
    }
  });

  it("exposes a resource template for wiki pages and lists ingested sources", async () => {
    const vault = await makeTempVault();
    const { client, context, close } = await connectedClient(vault);
    try {
      await initWiki(context, {});
      await ingestSource(context, {
        title: "Sample Source",
        content: "Body",
        sourceType: "article",
        summary: "Sample summary.",
        ingestedAt: "2026-04-23",
      });
      const templates = await client.listResourceTemplates();
      expect(templates.resourceTemplates.some((t) => t.uriTemplate.includes("{"))).toBe(true);

      const listed = await client.listResources();
      const uris = listed.resources.map((r) => r.uri);
      expect(uris.some((u) => u.includes("sample-source"))).toBe(true);

      const page = await client.readResource({
        uri: "kobsidian://wiki/page/Sources/sample-source.md",
      });
      const pageFirst = page.contents[0];
      const pageText = pageFirst && "text" in pageFirst ? pageFirst.text : "";
      expect(pageText).toContain("Sample Source");
    } finally {
      await close();
    }
  });

  it("exposes three wiki prompts", async () => {
    const vault = await makeTempVault();
    const { client, close } = await connectedClient(vault);
    try {
      const { prompts } = await client.listPrompts();
      const names = prompts.map((p) => p.name);
      expect(names).toEqual(
        expect.arrayContaining(["ingest-source", "answer-from-wiki", "health-check-wiki"]),
      );
    } finally {
      await close();
    }
  });

  it("returns a filled ingest-source prompt with messages", async () => {
    const vault = await makeTempVault();
    const { client, close } = await connectedClient(vault);
    try {
      const result = await client.getPrompt({
        name: "ingest-source",
        arguments: {
          title: "As We May Think",
          content: "Bush 1945 essay describing the memex.",
          sourceType: "paper",
        },
      });
      expect(result.messages.length).toBeGreaterThan(0);
      const first = result.messages[0];
      const text = first?.content.type === "text" ? first.content.text : "";
      expect(text).toContain("wiki.ingest");
      expect(text).toContain("As We May Think");
    } finally {
      await close();
    }
  });
});
