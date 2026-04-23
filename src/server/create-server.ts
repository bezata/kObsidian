import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type DomainContext, createDomainContext } from "../domain/context.js";
import { toAppError } from "../lib/errors.js";
import { ok } from "../lib/results.js";
import { registerWikiPrompts } from "./prompts.js";
import { toolRegistry } from "./registry.js";
import { registerWikiResources } from "./resources.js";

function getSummary(result: unknown): string | undefined {
  if (
    typeof result === "object" &&
    result &&
    "summary" in result &&
    typeof result.summary === "string"
  ) {
    return result.summary;
  }
  return undefined;
}

function formatErrorMessage(error: { code: string; message: string }): string {
  return `${error.code}: ${error.message}`;
}

export function createServer(context: DomainContext = createDomainContext()) {
  const server = new McpServer(
    {
      name: "kobsidian",
      version: "3.0.0",
      title: "kObsidian",
    },
    {
      capabilities: {
        logging: {},
        resources: { listChanged: false },
        prompts: { listChanged: false },
        tools: { listChanged: false },
      },
    },
  );

  for (const tool of toolRegistry) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema ?? z.object({}),
        outputSchema: tool.outputSchema,
      },
      async (args) => {
        try {
          const result = (await tool.handler(context, args)) as Record<string, unknown>;
          return ok(result, getSummary(result) ?? `${tool.title} completed`);
        } catch (error) {
          const appError = toAppError(error);
          throw new Error(formatErrorMessage(appError));
        }
      },
    );
  }

  registerWikiResources(server, context);
  registerWikiPrompts(server);

  return server;
}
