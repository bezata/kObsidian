import { z } from "zod";
import {
  closeActiveFile,
  executeCommand,
  getActiveFile,
  listCommands,
  navigateBack,
  navigateForward,
  openFile,
  searchCommands,
  toggleEditMode,
} from "../../domain/api-tools.js";
import { notePathSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  ADDITIVE_OPEN_WORLD,
  DESTRUCTIVE_OPEN_WORLD,
  READ_ONLY_OPEN_WORLD,
  listResultSchema,
  looseObjectSchema,
} from "../tool-schemas.js";

const emptyArgsSchema = z.object({}).strict();

export const apiTools: ToolDefinition[] = [
  {
    name: "workspace.activeFile",
    title: "Get Active File",
    description:
      "Return information about the file currently open and focused in Obsidian — its path, modification time, and whether it's in edit or preview mode. Read-only. Requires the Local REST API plugin (OBSIDIAN_API_URL/OBSIDIAN_REST_API_KEY). Use this to orient the agent before issuing other workspace-level mutations.",
    inputSchema: emptyArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: (context) => getActiveFile(context),
  },
  {
    name: "workspace.openFile",
    title: "Open File In Obsidian",
    description:
      "Open a vault-relative note path in the live Obsidian UI. `newPane:true` opens in a split; otherwise the current pane is reused. Requires the Local REST API plugin. This tool mutates the UI but does not touch file contents.",
    inputSchema: z
      .object({
        filePath: notePathSchema.describe("Vault-relative path of the note to open."),
        newPane: z
          .boolean()
          .optional()
          .describe("Open in a new split pane instead of the current one. Defaults to false."),
      })
      .strict(),
    outputSchema: looseObjectSchema,
    annotations: ADDITIVE_OPEN_WORLD,
    handler: (context, args) => openFile(context, args as Parameters<typeof openFile>[1]),
  },
  {
    name: "workspace.closeActiveFile",
    title: "Close Active File",
    description:
      "Close the currently active file in Obsidian. Does not affect file contents — only the UI. Requires the Local REST API plugin.",
    inputSchema: emptyArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: ADDITIVE_OPEN_WORLD,
    handler: (context) => closeActiveFile(context),
  },
  {
    name: "workspace.navigate",
    title: "Navigate Obsidian History",
    description:
      "Navigate the Obsidian back/forward file history, like the arrow buttons in the top-left. `direction:'back'` = back one step; `direction:'forward'` = forward one step. No-op when the stack is empty in the given direction. Requires the Local REST API plugin.",
    inputSchema: z
      .object({
        direction: z
          .enum(["back", "forward"])
          .describe("Which way to step in the Obsidian file-history stack."),
      })
      .strict(),
    outputSchema: looseObjectSchema,
    annotations: ADDITIVE_OPEN_WORLD,
    handler: (context, rawArgs) => {
      const args = rawArgs as { direction: "back" | "forward" };
      return args.direction === "back" ? navigateBack(context) : navigateForward(context);
    },
  },
  {
    name: "workspace.toggleEditMode",
    title: "Toggle Edit Mode",
    description:
      "Toggle the active file between edit (source) and preview (reading) mode in Obsidian. Requires the Local REST API plugin.",
    inputSchema: emptyArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: ADDITIVE_OPEN_WORLD,
    handler: (context) => toggleEditMode(context),
  },
  {
    name: "commands.execute",
    title: "Execute Obsidian Command",
    description:
      "Execute an Obsidian command by its internal id (as returned by `commands.list`). `args` is an optional argument map passed to the command (most built-in commands take no arguments). Requires the Local REST API plugin. Destructive — the effect depends entirely on what the command does, so verify the command id before calling.",
    inputSchema: z
      .object({
        commandId: z
          .string()
          .min(1)
          .describe("Command identifier, e.g. `editor:save-file` or `command-palette:open`."),
        args: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Optional map of command arguments. Most commands accept none."),
      })
      .strict(),
    outputSchema: looseObjectSchema,
    annotations: DESTRUCTIVE_OPEN_WORLD,
    handler: (context, args) =>
      executeCommand(context, args as Parameters<typeof executeCommand>[1]),
  },
  {
    name: "commands.list",
    title: "List Or Search Obsidian Commands",
    description:
      "List Obsidian commands. With no `query`, returns every registered command (both built-in and plugin-provided). With a `query` string, returns commands whose id or display name matches — substring match, case-insensitive. Read-only. Use this to discover command ids before calling `commands.execute`. Requires the Local REST API plugin.",
    inputSchema: z
      .object({
        query: z
          .string()
          .optional()
          .describe("Substring to match against command id or name. Omit to list all commands."),
      })
      .strict(),
    outputSchema: listResultSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: (context, rawArgs) => {
      const args = rawArgs as { query?: string };
      if (args.query && args.query.length > 0) {
        return searchCommands(context, { query: args.query });
      }
      return listCommands(context);
    },
  },
];
