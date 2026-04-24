import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PACKAGE_VERSION } from "../config/package-version.js";
import { type DomainContext, createDomainContext } from "../domain/context.js";
import { toAppError } from "../lib/errors.js";
import { ok } from "../lib/results.js";
import { registerWikiPrompts } from "./prompts.js";
import { toolRegistry } from "./registry.js";
import { registerWikiResources } from "./resources.js";
import type { ToolDefinition } from "./tool-definition.js";

function buildDescription(tool: ToolDefinition): string {
  if (!tool.inputExamples || tool.inputExamples.length === 0) {
    return tool.description;
  }
  const examples = tool.inputExamples
    .map(
      (ex, i) =>
        `Example ${i + 1} — ${ex.description}:\n\`\`\`json\n${JSON.stringify(ex.input, null, 2)}\n\`\`\``,
    )
    .join("\n\n");
  return `${tool.description}\n\nExamples:\n\n${examples}`;
}

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
      version: PACKAGE_VERSION,
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
        description: buildDescription(tool),
        inputSchema: tool.inputSchema ?? z.object({}),
        outputSchema: tool.outputSchema,
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
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
