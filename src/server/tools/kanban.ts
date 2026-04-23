import { z } from "zod";
import {
  addKanbanCard,
  getKanbanStatistics,
  moveKanbanCard,
  parseKanbanBoard,
  toggleKanbanCard,
} from "../../domain/kanban.js";
import { notePathSchema } from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import { looseObjectSchema, mutationResultSchema } from "../tool-schemas.js";

export const kanbanTools: ToolDefinition[] = [
  {
    name: "kanban.parse",
    title: "Parse Kanban Board",
    description: "Parse a markdown Kanban board file.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      parseKanbanBoard(context, args as Parameters<typeof parseKanbanBoard>[1]),
  },
  {
    name: "kanban.addCard",
    title: "Add Kanban Card",
    description: "Add a card to a Kanban column.",
    inputSchema: z.object({
      filePath: notePathSchema,
      columnName: z.string().min(1),
      cardText: z.string().min(1),
      status: z.enum(["incomplete", "completed"]).optional(),
      dueDate: z.iso.date().optional(),
      position: z.enum(["start", "end"]).optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => addKanbanCard(context, args as Parameters<typeof addKanbanCard>[1]),
  },
  {
    name: "kanban.moveCard",
    title: "Move Kanban Card",
    description: "Move a card between Kanban columns.",
    inputSchema: z.object({
      filePath: notePathSchema,
      cardText: z.string().min(1),
      fromColumn: z.string().min(1),
      toColumn: z.string().min(1),
      position: z.enum(["start", "end"]).optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      moveKanbanCard(context, args as Parameters<typeof moveKanbanCard>[1]),
  },
  {
    name: "kanban.toggleCard",
    title: "Toggle Kanban Card",
    description: "Toggle a Kanban card complete/incomplete.",
    inputSchema: z.object({
      filePath: notePathSchema,
      cardText: z.string().min(1),
      columnName: z.string().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      toggleKanbanCard(context, args as Parameters<typeof toggleKanbanCard>[1]),
  },
  {
    name: "kanban.stats",
    title: "Kanban Statistics",
    description: "Get card counts and completion rates for a Kanban board.",
    inputSchema: z.object({ filePath: notePathSchema, vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    handler: (context, args) =>
      getKanbanStatistics(context, args as Parameters<typeof getKanbanStatistics>[1]),
  },
];
