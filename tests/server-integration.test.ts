import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import { createDomainContext } from "../src/domain/context.js";
import { createServer } from "../src/server/create-server.js";
import { createHttpApp } from "../src/server/http-app.js";
import { makeTempVault } from "./helpers.js";

describe("server integration", () => {
  it("registers tools and serves them over in-memory MCP transport", async () => {
    const vault = await makeTempVault();
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

    const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === "notes.read")).toBe(true);

    const result = await client.callTool({
      name: "notes.read",
      arguments: { path: "note1.md" },
    });
    expect(result.structuredContent).toMatchObject({ path: "note1.md" });

    await client.close();
    await server.close();
  });

  it("serves the MCP endpoint over Streamable HTTP with Hono", async () => {
    const vault = await makeTempVault();
    const env = getEnv({
      ...process.env,
      OBSIDIAN_VAULT_PATH: vault,
      KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
    });
    const app = createHttpApp(env, createDomainContext(env));

    const client = new Client({ name: "http-test-client", version: "1.0.0" }, { capabilities: {} });
    const transport = new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      fetch: async (input, init) =>
        app.fetch(
          new Request(
            typeof input === "string" || input instanceof URL ? input.toString() : input,
            init,
          ),
        ),
      requestInit: {
        headers: {
          origin: "http://localhost",
        },
      },
    });

    await client.connect(transport);
    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === "tags.list")).toBe(true);
    await client.close();
  });

  it("exposes wiki.* tools end-to-end and walks the ingest → lint flow", async () => {
    const vault = await makeTempVault();
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
    const client = new Client({ name: "wiki-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(clientTransport);

    const tools = await client.listTools();
    const wikiNames = tools.tools.map((t) => t.name).filter((n) => n.startsWith("wiki."));
    expect(wikiNames).toEqual(
      expect.arrayContaining([
        "wiki.init",
        "wiki.ingest",
        "wiki.logAppend",
        "wiki.indexRebuild",
        "wiki.query",
        "wiki.lint",
        "wiki.summaryMerge",
      ]),
    );

    const init = await client.callTool({ name: "wiki.init", arguments: {} });
    expect(init.structuredContent).toMatchObject({ target: "wiki" });

    const ingest = await client.callTool({
      name: "wiki.ingest",
      arguments: {
        title: "Memex Paper",
        content: "Memex content.",
        sourceType: "paper",
        summary: "Memex concept introduced.",
        ingestedAt: "2026-04-23",
        relatedConcepts: ["Memex"],
      },
    });
    expect(ingest.structuredContent).toMatchObject({
      sourcePage: "wiki/Sources/memex-paper.md",
      proposedEditCount: 2,
    });

    const lint = await client.callTool({ name: "wiki.lint", arguments: {} });
    expect(lint.structuredContent).toHaveProperty("findings");

    await client.close();
    await server.close();
  });
});
