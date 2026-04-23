import { describe, expect, it } from "vitest";
import { getEnv } from "../src/config/env.js";
import { createDomainContext } from "../src/domain/context.js";
import { createHttpApp } from "../src/server/http-app.js";
import { makeTempVault } from "./helpers.js";

async function buildApp(extra: Record<string, string> = {}) {
  const vault = await makeTempVault();
  const env = getEnv({
    ...process.env,
    OBSIDIAN_VAULT_PATH: vault,
    KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
    KOBSIDIAN_PROTOCOL_VERSION: "2025-11-25",
    ...extra,
  });
  return createHttpApp(env, createDomainContext(env));
}

describe("HTTP spec compliance", () => {
  it("responds to OPTIONS preflight with CORS headers when origin is allowed", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/mcp", {
        method: "OPTIONS",
        headers: {
          origin: "http://localhost",
          "access-control-request-method": "POST",
          "access-control-request-headers": "authorization, content-type, mcp-protocol-version",
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost");
    expect((res.headers.get("access-control-allow-methods") ?? "").toUpperCase()).toContain("POST");
    expect((res.headers.get("access-control-allow-methods") ?? "").toUpperCase()).toContain(
      "OPTIONS",
    );
    const allowHeaders = (res.headers.get("access-control-allow-headers") ?? "").toLowerCase();
    expect(allowHeaders).toContain("authorization");
    expect(allowHeaders).toContain("mcp-protocol-version");
    expect(allowHeaders).toContain("mcp-session-id");
  });

  it("rejects OPTIONS with disallowed origin", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/mcp", {
        method: "OPTIONS",
        headers: {
          origin: "http://evil.example",
          "access-control-request-method": "POST",
        },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for a POST with an explicit unsupported MCP-Protocol-Version", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/mcp", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "1999-01-01",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { message?: string } };
    expect(body.error?.message ?? "").toMatch(/protocol/i);
  });

  it("accepts a POST missing MCP-Protocol-Version (spec fallback to 2025-03-26)", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/mcp", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        }),
      }),
    );
    expect(res.status).toBeLessThan(500);
    expect(res.status).not.toBe(400);
  });

  it("echoes Access-Control-Allow-Origin on successful POST responses", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/mcp", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-11-25",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        }),
      }),
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost");
  });
});
