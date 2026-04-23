import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { type AppEnv, getEnv } from "../config/env.js";
import { type DomainContext, createDomainContext } from "../domain/context.js";
import { createServer } from "./create-server.js";

const SUPPORTED_PROTOCOL_VERSIONS: ReadonlySet<string> = new Set([
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
  "2025-11-25",
]);

const PROTOCOL_VERSION_FALLBACK = "2025-03-26";

const CORS_ALLOW_METHODS = "POST, GET, DELETE, OPTIONS";
const CORS_ALLOW_HEADERS =
  "authorization, content-type, accept, mcp-session-id, mcp-protocol-version, last-event-id";
const CORS_EXPOSE_HEADERS = "mcp-session-id, mcp-protocol-version";
const CORS_MAX_AGE = "86400";

function corsHeadersFor(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Expose-Headers": CORS_EXPOSE_HEADERS,
    "Access-Control-Max-Age": CORS_MAX_AGE,
    Vary: "Origin",
  };
}

function validateOrigin(env: AppEnv, origin: string | null): Response | undefined {
  if (!origin) return undefined;
  if (!env.allowedOrigins.has(origin)) {
    return new Response("Forbidden origin", { status: 403 });
  }
  return undefined;
}

function validateBearer(env: AppEnv, header: string | null): Response | undefined {
  if (!env.KOBSIDIAN_HTTP_BEARER_TOKEN) return undefined;
  if (header !== `Bearer ${env.KOBSIDIAN_HTTP_BEARER_TOKEN}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return undefined;
}

function validateProtocolVersion(
  header: string | null,
): { version: string; error?: undefined } | { version?: undefined; error: Response } {
  if (!header) return { version: PROTOCOL_VERSION_FALLBACK };
  const trimmed = header.trim();
  if (SUPPORTED_PROTOCOL_VERSIONS.has(trimmed)) return { version: trimmed };
  return {
    error: new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: `Unsupported MCP-Protocol-Version: ${trimmed}. Supported: ${[...SUPPORTED_PROTOCOL_VERSIONS].join(", ")}`,
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    ),
  };
}

function withCors(response: Response, origin: string | null): Response {
  const cors = corsHeadersFor(origin);
  if (Object.keys(cors).length === 0) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function createHttpApp(
  env: AppEnv = getEnv(),
  context: DomainContext = createDomainContext(env),
) {
  const app = new Hono();

  app.options("/mcp", (requestContext) => {
    const origin = requestContext.req.header("origin") ?? null;
    const originResponse = validateOrigin(env, origin);
    if (originResponse) return originResponse;
    return new Response(null, { status: 204, headers: corsHeadersFor(origin) });
  });

  app.all("/mcp", async (requestContext) => {
    const origin = requestContext.req.header("origin") ?? null;
    const originResponse = validateOrigin(env, origin);
    if (originResponse) return originResponse;

    const bearerResponse = validateBearer(env, requestContext.req.header("authorization") ?? null);
    if (bearerResponse) return withCors(bearerResponse, origin);

    const protocol = validateProtocolVersion(
      requestContext.req.header("mcp-protocol-version") ?? null,
    );
    if (protocol.error) return withCors(protocol.error, origin);

    const server = createServer(context);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    try {
      const response = await transport.handleRequest(requestContext.req.raw);
      return withCors(response, origin);
    } finally {
      await transport.close();
      await server.close();
    }
  });

  app.notFound(() => new Response("Not found", { status: 404 }));
  return app;
}
