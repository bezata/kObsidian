import { z } from "zod";
import {
  notePathSchema,
  optionalDateStringSchema,
  positiveIntSchema,
  tagSchema,
} from "./primitives.js";

export const taskPrioritySchema = z
  .enum(["highest", "high", "normal", "low", "lowest"])
  .describe("Tasks-plugin priority level.");

export const taskStatusSchema = z
  .enum(["incomplete", "completed", "all"])
  .describe("`incomplete` = open tasks `[ ]`; `completed` = done `[x]`; `all` = both.");

export const tasksSearchArgsSchema = z
  .object({
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueBefore: optionalDateStringSchema.describe("Only tasks due strictly before this ISO date."),
    dueAfter: optionalDateStringSchema.describe("Only tasks due strictly after this ISO date."),
    dueWithinDays: positiveIntSchema
      .optional()
      .describe("Only tasks due within N days of today (inclusive)."),
    hasRecurrence: z.boolean().optional().describe("Filter to recurring (or non-recurring) tasks."),
    tag: tagSchema.optional().describe("Only tasks that carry this tag (leading `#` stripped)."),
    sortBy: z
      .enum(["dueDate", "priority", "file", "lineNumber"])
      .optional()
      .describe("Result ordering. Default: file then lineNumber."),
    limit: positiveIntSchema.optional().describe("Cap the number of results. Default: 500."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type TasksSearchArgs = z.input<typeof tasksSearchArgsSchema>;

export const tasksCreateArgsSchema = z
  .object({
    filePath: notePathSchema.describe("Note to append the task to."),
    content: z.string().min(1).describe("Task body text (without the `- [ ]` checkbox)."),
    status: z
      .enum(["incomplete", "completed"])
      .optional()
      .describe("Initial checkbox state. Default `incomplete`."),
    priority: taskPrioritySchema.optional(),
    dueDate: optionalDateStringSchema,
    scheduledDate: optionalDateStringSchema,
    startDate: optionalDateStringSchema,
    doneDate: optionalDateStringSchema,
    createdDate: optionalDateStringSchema,
    recurrence: z
      .string()
      .optional()
      .describe(
        "Tasks-plugin recurrence expression, e.g. `every day`, `every week on Monday`, `every 2 weeks`.",
      ),
    vaultPath: z.string().optional(),
  })
  .strict();
export type TasksCreateArgs = z.input<typeof tasksCreateArgsSchema>;

export const tasksToggleArgsSchema = z
  .object({
    sourceFile: notePathSchema.describe("Note containing the task."),
    lineNumber: positiveIntSchema.describe("1-based line number of the task line."),
    doneDate: optionalDateStringSchema.describe(
      "When marking a task done, stamp this date into the `✅ YYYY-MM-DD` metadata. Defaults to today.",
    ),
    vaultPath: z.string().optional(),
  })
  .strict();
export type TasksToggleArgs = z.input<typeof tasksToggleArgsSchema>;

export const tasksUpdateMetadataArgsSchema = z
  .object({
    sourceFile: notePathSchema,
    lineNumber: positiveIntSchema.describe("1-based line number of the task line to update."),
    priority: taskPrioritySchema.optional(),
    dueDate: optionalDateStringSchema,
    scheduledDate: optionalDateStringSchema,
    startDate: optionalDateStringSchema,
    recurrence: z.string().optional(),
    vaultPath: z.string().optional(),
  })
  .strict();
export type TasksUpdateMetadataArgs = z.input<typeof tasksUpdateMetadataArgsSchema>;

export const tasksStatsArgsSchema = z.object({ vaultPath: z.string().optional() }).strict();
export type TasksStatsArgs = z.input<typeof tasksStatsArgsSchema>;
