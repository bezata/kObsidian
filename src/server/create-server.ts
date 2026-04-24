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
