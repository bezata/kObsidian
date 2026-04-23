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
  DESTRUCTIVE_OPEN_WORLD,
  OPEN_WORLD,
  READ_ONLY_OPEN_WORLD,
  listResultSchema,
  looseObjectSchema,
} from "../tool-schemas.js";

export const apiTools: ToolDefinition[] = [
  {
    name: "workspace.activeFile",
    title: "Get Active File",
    description: "Get the currently active file in Obsidian.",
    inputSchema: z.object({}),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: (context) => getActiveFile(context),
  },
  {
    name: "workspace.openFile",
    title: "Open File",
    description: "Open a file in Obsidian.",
    inputSchema: z.object({ filePath: notePathSchema, newPane: z.boolean().optional() }),
    outputSchema: looseObjectSchema,
    annotations: OPEN_WORLD,
    handler: (context, args) => openFile(context, args as Parameters<typeof openFile>[1]),
  },
  {
    name: "workspace.closeActiveFile",
    title: "Close Active File",
    description: "Close the active file in Obsidian.",
    inputSchema: z.object({}),
    outputSchema: looseObjectSchema,
    annotations: OPEN_WORLD,
    handler: (context) => closeActiveFile(context),
  },
  {
    name: "workspace.navigateBack",
    title: "Navigate Back",
    description: "Go back in Obsidian history.",
    inputSchema: z.object({}),
    outputSchema: looseObjectSchema,
    annotations: OPEN_WORLD,
    handler: (context) => navigateBack(context),
  },
  {
    name: "workspace.navigateForward",
    title: "Navigate Forward",
    description: "Go forward in Obsidian history.",
    inputSchema: z.object({}),
    outputSchema: looseObjectSchema,
    annotations: OPEN_WORLD,
    handler: (context) => navigateForward(context),
  },
  {
    name: "workspace.toggleEditMode",
    title: "Toggle Edit Mode",
    description: "Toggle edit/preview mode in Obsidian.",
    inputSchema: z.object({}),
    outputSchema: looseObjectSchema,
    annotations: OPEN_WORLD,
    handler: (context) => toggleEditMode(context),
  },
  {
    name: "commands.execute",
    title: "Execute Command",
    description: "Execute an Obsidian command by ID.",
    inputSchema: z.object({
      commandId: z.string().min(1),
      args: z.record(z.string(), z.unknown()).optional(),
    }),
    outputSchema: looseObjectSchema,
    annotations: DESTRUCTIVE_OPEN_WORLD,
    handler: (context, args) =>
      executeCommand(context, args as Parameters<typeof executeCommand>[1]),
  },
  {
    name: "commands.list",
    title: "List Commands",
    description: "List all available Obsidian commands.",
    inputSchema: z.object({}),
    outputSchema: listResultSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: (context) => listCommands(context),
  },
  {
    name: "commands.search",
    title: "Search Commands",
    description: "Search Obsidian commands by ID or name.",
    inputSchema: z.object({ query: z.string().min(1) }),
    outputSchema: listResultSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: (context, args) =>
      searchCommands(context, args as Parameters<typeof searchCommands>[1]),
  },
];
