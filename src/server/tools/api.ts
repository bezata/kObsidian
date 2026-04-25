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
      "Open a vault-relative note `filePath` in the live Obsidian UI. `newPane:true` opens it in a new split; default reuses the active pane. UI-only — does not create, modify, or read file contents (use `notes.read` for content). Returns `{ ok: true }` on success; errors when the file does not exist or the Local REST API plugin (OBSIDIAN_API_URL / OBSIDIAN_REST_API_KEY) is unreachable. The opened file targets the live Obsidian process's vault, which may differ from the filesystem session vault — see `vault.current`.",
    inputSchema: z
      .object({
        filePath: notePathSchema.describe(
          "Vault-relative path of the note to open (e.g. `Daily/2026-04-25.md`).",
        ),
        newPane: z
          .boolean()
          .optional()
          .describe(
            "Open in a new split pane instead of reusing the active one. Defaults to false.",
          ),
      })
      .strict(),
    outputSchema: looseObjectSchema,
    annotations: ADDITIVE_OPEN_WORLD,
    inputExamples: [
      {
        description: "Reveal a daily note in the current pane.",
        input: { filePath: "Daily/2026-04-25.md" },
      },
      {
        description: "Open a reference note in a side split.",
        input: { filePath: "wiki/Concepts/grpc.md", newPane: true },
      },
    ],
    handler: (context, args) => openFile(context, args as Parameters<typeof openFile>[1]),
  },
  {
    name: "workspace.closeActiveFile",
    title: "Close Active File",
    description:
      "Close whatever file is currently active in the Obsidian UI. UI-only — does not delete, save, or modify file contents. No-op when no file is active. Returns `{ ok: true }` on success; errors when the Local REST API plugin is unreachable. Use after `workspace.openFile` when you want to dismiss a temporarily-revealed note. Pair with `workspace.activeFile` first if you need to know what was closed.",
    inputSchema: emptyArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: ADDITIVE_OPEN_WORLD,
    inputExamples: [
      {
        description: "Dismiss the currently active pane.",
        input: {},
      },
    ],
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
      "Flip the active file in Obsidian between edit (source) mode and preview (reading) mode. Takes no arguments — always toggles whichever mode is currently active. UI-only: does not modify file contents. No-op when no file is active. Returns `{ ok: true, mode: 'edit' | 'preview' }` reflecting the new mode; errors when the Local REST API plugin is unreachable. Useful when an agent has finished a multi-step edit and wants the user to see the rendered result.",
    inputSchema: emptyArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: ADDITIVE_OPEN_WORLD,
    inputExamples: [
      {
        description: "Flip the active note from edit to preview (or vice versa).",
        input: {},
      },
    ],
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
