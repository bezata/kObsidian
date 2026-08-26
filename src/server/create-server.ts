import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { PACKAGE_VERSION } from "../config/package-version.js";
import { type DomainContext, createDomainContext } from "../domain/context.js";
import { toAppError } from "../lib/errors.js";
import { ok } from "../lib/results.js";
import { registerWikiPrompts } from "./prompts.js";
import { toolRegistry } from "./registry.js";
import { registerWikiResources } from "./resources.js";
import type { ToolDefinition } from "./tool-definition.js";

// Filesystem-scoped tool namespaces. Any tool whose name starts with one of
// these gets a session-active-vault note appended to its description at
// registration time, so the LLM knows the precedence chain (per-call
// vaultPath > vault.select > OBSIDIAN_VAULT_PATH) without us having to
// hand-edit every tool description.
const FILESYSTEM_NAMESPACES = [
  "notes.",
  "tags.",
  "dataview.",
  "blocks.",
  "canvas.",
  "kanban.",
  "marp.",
  "templates.",
  "tasks.",
  "links.",
  "wiki.",
  "stats.vault",
];

const SESSION_VAULT_NOTE =
  "Operates on the session-active vault (see `vault.current` — selectable via `vault.select`) unless an explicit `vaultPath` argument is passed, which always wins.";

// Tools that bridge to the live Obsidian process via the Local REST API.
// They target whichever vault Obsidian itself has open, and are NOT affected
// by vault.select (which only changes filesystem-tool routing).
const LIVE_OBSIDIAN_NAMESPACES = ["workspace.", "commands."];

const LIVE_OBSIDIAN_NOTE =
  "Targets the vault the live Obsidian process has open via the Local REST API. Not affected by `vault.select` — that only changes filesystem-tool routing.";

function targetsFilesystemVault(name: string): boolean {
  return FILESYSTEM_NAMESPACES.some((prefix) => name.startsWith(prefix));
}

function targetsLiveObsidian(name: string): boolean {
  return LIVE_OBSIDIAN_NAMESPACES.some((prefix) => name.startsWith(prefix));
}

function buildDescription(tool: ToolDefinition): string {
  let description = tool.description;
  if (targetsFilesystemVault(tool.name)) {
    description = `${description}\n\n${SESSION_VAULT_NOTE}`;
  } else if (targetsLiveObsidian(tool.name)) {
    description = `${description}\n\n${LIVE_OBSIDIAN_NOTE}`;
  }
  if (!tool.inputExamples || tool.inputExamples.length === 0) {
    return description;
  }
  const examples = tool.inputExamples
    .map(
      (ex, i) =>
        `Example ${i + 1} — ${ex.description}:\n\`\`\`json\n${JSON.stringify(ex.input, null, 2)}\n\`\`\``,
    )
    .join("\n\n");
  return `${description}\n\nExamples:\n\n${examples}`;
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

const JSON_SCHEMA_2020_12_URI = "https://json-schema.org/draft/2020-12/schema";

function toMcpObjectSchema(schema: z.ZodTypeAny, io: "input" | "output"): Tool["inputSchema"] {
  const jsonSchema = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
  });

  if (jsonSchema.type !== undefined && jsonSchema.type !== "object") {
    throw new Error(`MCP ${io} schemas must describe objects (got ${jsonSchema.type})`);
  }

  // MCP requires an object-shaped root. Discriminated unions naturally emit
  // only `oneOf`/`anyOf`, so add the object constraint without changing their
  // branches.
  return {
    ...jsonSchema,
    $schema: JSON_SCHEMA_2020_12_URI,
    type: "object",
  } as Tool["inputSchema"];
}

function protocolToolDefinition(tool: ToolDefinition): Tool {
  return {
    name: tool.name,
    title: tool.title,
    description: buildDescription(tool),
    inputSchema: tool.inputSchema
      ? toMcpObjectSchema(tool.inputSchema, "input")
      : {
          $schema: JSON_SCHEMA_2020_12_URI,
          type: "object",
          properties: {},
          additionalProperties: false,
        },
    ...(tool.outputSchema ? { outputSchema: toMcpObjectSchema(tool.outputSchema, "output") } : {}),
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
    execution: { taskSupport: "forbidden" },
  };
}

function zodErrorMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? ` at ${issue.path.join(".")}` : "";
      return `${issue.message}${path}`;
    })
    .join("; ");
}

function toolError(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function registerTools(server: McpServer, context: DomainContext): void {
  const definitions = toolRegistry.map(protocolToolDefinition);
  const toolsByName = new Map(toolRegistry.map((tool) => [tool.name, tool]));

  // @modelcontextprotocol/sdk 1.30 still converts Zod v4 schemas to draft-07
  // inside McpServer.registerTool. Claude Code now requires JSON Schema
  // 2020-12 for outputSchema, so register the two tool protocol handlers on
  // the underlying server while retaining Zod validation here.
  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: definitions,
  }));

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = toolsByName.get(request.params.name);
    if (!tool) {
      return toolError(`invalid_argument: Tool not found: ${request.params.name}`);
    }

    try {
      const input = tool.inputSchema
        ? await tool.inputSchema.safeParseAsync(request.params.arguments ?? {})
        : { success: true as const, data: request.params.arguments ?? {} };
      if (!input.success) {
        return toolError(
          `invalid_argument: Input validation error for ${tool.name}: ${zodErrorMessage(input.error)}`,
        );
      }

      const result = await tool.handler(context, input.data);
      if (typeof result !== "object" || result === null || Array.isArray(result)) {
        return toolError(`internal: Tool ${tool.name} returned a non-object result`);
      }

      if (tool.outputSchema) {
        const output = await tool.outputSchema.safeParseAsync(result);
        if (!output.success) {
          return toolError(
            `internal: Output validation error for ${tool.name}: ${zodErrorMessage(output.error)}`,
          );
        }
      }

      const structuredContent = result as Record<string, unknown>;
      return ok(structuredContent, getSummary(structuredContent) ?? `${tool.title} completed`);
    } catch (error) {
      return toolError(formatErrorMessage(toAppError(error)));
    }
  });
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

  registerTools(server, context);

  registerWikiResources(server, context);
  registerWikiPrompts(server);

  return server;
}
