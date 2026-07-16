import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import { createDomainContext } from "../src/domain/context.js";
import { createHttpApp } from "../src/server/http-app.js";
import { toolRegistry } from "../src/server/registry.js";
import { makeTempVault } from "./helpers.js";

const CLIENT_INFO = { name: "kobsidian-compatibility-test", version: "1.0.0" };

async function assertContentFidelity(client: Client, vault: string, prefix: string) {
  const pathName = `${prefix}-content.md`;
  const initial = "# Compatibility";
  const appended = [
    "",
    "",
    "Unicode: İstanbul 🦥",
    'Quoted: "hello"',
    String.raw`Windows path: C:\Users\name\note.md`,
    String.raw`Literal escape: \n`,
    "Tab:\tend",
  ].join("\n");
  const expected = `${initial}${appended}`;

  const created = await client.callTool({
    name: "notes.create",
    arguments: { kind: "note", path: pathName, content: initial },
  });
  expect(created.isError).not.toBe(true);

  const edited = await client.callTool({
    name: "notes.edit",
    arguments: { mode: "append", path: pathName, content: appended },
  });
  expect(edited.isError).not.toBe(true);

  expect(await fs.readFile(path.join(vault, pathName), "utf8")).toBe(expected);

  const read = await client.callTool({
    name: "notes.read",
    arguments: { path: pathName, include: ["content"] },
  });
  expect(read.structuredContent).toMatchObject({ path: pathName, content: expected });

  const literalPath = `${prefix}-literal-escape.md`;
  const literalBackslashN = String.raw`\n\n[[link]]`;
  await client.callTool({
    name: "notes.create",
    arguments: { kind: "note", path: literalPath, content: initial },
  });
  await client.callTool({
    name: "notes.edit",
    arguments: { mode: "append", path: literalPath, content: literalBackslashN },
  });

  const literalContent = await fs.readFile(path.join(vault, literalPath), "utf8");
  expect(literalContent).toBe(`${initial}${literalBackslashN}`);
  expect(
    [...literalContent.slice(initial.length, initial.length + 2)].map((char) =>
      char.codePointAt(0),
    ),
  ).toEqual([92, 110]);
}

describe("MCP transport compatibility", () => {
  it("preserves JSON string content over a real stdio transport", async () => {
    const vault = await makeTempVault();
    const transport = new StdioClientTransport({
      command: "bun",
      args: ["run", "src/server/stdio.ts"],
      cwd: process.cwd(),
      env: {
        ...getDefaultEnvironment(),
        OBSIDIAN_VAULT_PATH: vault,
        KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
      },
    });
    const client = new Client(CLIENT_INFO, { capabilities: {} });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools).toHaveLength(toolRegistry.length);
      await assertContentFidelity(client, vault, "stdio");
    } finally {
      await client.close();
    }
  }, 15_000);

  it("preserves JSON string content over Streamable HTTP", async () => {
    const vault = await makeTempVault();
    const env = getEnv({
      ...process.env,
      OBSIDIAN_VAULT_PATH: vault,
      KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
    });
    const app = createHttpApp(env, createDomainContext(env));
    const transport = new StreamableHTTPClientTransport(new URL("http://localhost/mcp"), {
      fetch: async (input, init) =>
        app.fetch(
          new Request(
            typeof input === "string" || input instanceof URL ? input.toString() : input,
            init,
          ),
        ),
      requestInit: { headers: { origin: "http://localhost" } },
    });
    const client = new Client(CLIENT_INFO, { capabilities: {} });

    try {
      await client.connect(transport);
      await assertContentFidelity(client, vault, "http");
    } finally {
      await client.close();
    }
  });
});
