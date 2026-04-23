import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";
import { type AppEnv, getEnv } from "../config/env.js";
import { type DomainContext, createDomainContext } from "../domain/context.js";
import { createServer } from "./create-server.js";

function validateOrigin(env: AppEnv, origin: string | null): Response | undefined {
  if (!origin) {
    return undefined;
  }
  if (!env.allowedOrigins.has(origin)) {
    return new Response("Forbidden origin", { status: 403 });
  }
  return undefined;
}

function validateBearer(env: AppEnv, header: string | null): Response | undefined {
  if (!env.KOBSIDIAN_HTTP_BEARER_TOKEN) {
    return undefined;
  }
  if (header !== `Bearer ${env.KOBSIDIAN_HTTP_BEARER_TOKEN}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return undefined;
}

export function createHttpApp(
  env: AppEnv = getEnv(),
  context: DomainContext = createDomainContext(env),
) {
  const app = new Hono();

  app.all("/mcp", async (requestContext) => {
    const originResponse = validateOrigin(env, requestContext.req.header("origin") ?? null);
    if (originResponse) {
      return originResponse;
    }

    const bearerResponse = validateBearer(env, requestContext.req.header("authorization") ?? null);
    if (bearerResponse) {
      return bearerResponse;
    }

    const server = createServer(context);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    try {
      return await transport.handleRequest(requestContext.req.raw);
    } finally {
      await transport.close();
      await server.close();
    }
  });

  app.notFound(() => new Response("Not found", { status: 404 }));
  return app;
}
