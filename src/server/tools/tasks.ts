import { z } from "zod";
import {
  createTask,
  getTaskStatistics,
  searchTasks,
  toggleTaskStatus,
  updateTaskMetadata,
} from "../../domain/tasks.js";
import {
  notePathSchema,
  optionalDateStringSchema,
  positiveIntSchema,
  tagSchema,
} from "../../schema/primitives.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  IDEMPOTENT,
  READ_ONLY,
  listResultSchema,
  looseObjectSchema,
  mutationResultSchema,
} from "../tool-schemas.js";

const prioritySchema = z.enum(["highest", "high", "normal", "low", "lowest"]);
const statusSchema = z.enum(["incomplete", "completed", "all"]);

export const taskTools: ToolDefinition[] = [
  {
    name: "tasks.search",
    title: "Search Tasks",
    description: "Search Tasks-plugin style markdown tasks across the vault.",
    inputSchema: z.object({
      status: statusSchema.optional(),
      priority: prioritySchema.optional(),
      dueBefore: optionalDateStringSchema,
      dueAfter: optionalDateStringSchema,
      dueWithinDays: positiveIntSchema.optional(),
      hasRecurrence: z.boolean().optional(),
      tag: tagSchema.optional(),
      sortBy: z.enum(["dueDate", "priority", "file", "lineNumber"]).optional(),
      limit: positiveIntSchema.optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: (context, args) => searchTasks(context, args as Parameters<typeof searchTasks>[1]),
  },
  {
    name: "tasks.create",
    title: "Create Task",
    description: "Append a task line to a note.",
    inputSchema: z.object({
      filePath: notePathSchema,
      content: z.string().min(1),
      status: z.enum(["incomplete", "completed"]).optional(),
      priority: prioritySchema.optional(),
      dueDate: optionalDateStringSchema,
      scheduledDate: optionalDateStringSchema,
      startDate: optionalDateStringSchema,
      doneDate: optionalDateStringSchema,
      createdDate: optionalDateStringSchema,
      recurrence: z.string().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) => createTask(context, args as Parameters<typeof createTask>[1]),
  },
  {
    name: "tasks.toggle",
    title: "Toggle Task",
    description: "Toggle a task complete/incomplete by file and line number.",
    inputSchema: z.object({
      sourceFile: notePathSchema,
      lineNumber: positiveIntSchema,
      doneDate: optionalDateStringSchema,
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    handler: (context, args) =>
      toggleTaskStatus(context, args as Parameters<typeof toggleTaskStatus>[1]),
  },
  {
    name: "tasks.updateMetadata",
    title: "Update Task Metadata",
    description: "Update task dates, priority, or recurrence in place.",
    inputSchema: z.object({
      sourceFile: notePathSchema,
      lineNumber: positiveIntSchema,
      priority: prioritySchema.optional(),
      dueDate: optionalDateStringSchema,
      scheduledDate: optionalDateStringSchema,
      startDate: optionalDateStringSchema,
      recurrence: z.string().optional(),
      vaultPath: z.string().optional(),
    }),
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT,
    handler: (context, args) =>
      updateTaskMetadata(context, args as Parameters<typeof updateTaskMetadata>[1]),
  },
  {
    name: "tasks.stats",
    title: "Task Statistics",
    description: "Get aggregate task statistics for the vault.",
    inputSchema: z.object({ vaultPath: z.string().optional() }),
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: (context, args) =>
      getTaskStatistics(context, args as Parameters<typeof getTaskStatistics>[1]),
  },
];
