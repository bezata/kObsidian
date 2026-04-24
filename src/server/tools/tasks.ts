import {
  createTask,
  getTaskStatistics,
  searchTasks,
  toggleTaskStatus,
  updateTaskMetadata,
} from "../../domain/tasks.js";
import {
  type TasksCreateArgs,
  type TasksSearchArgs,
  type TasksStatsArgs,
  type TasksToggleArgs,
  type TasksUpdateMetadataArgs,
  tasksCreateArgsSchema,
  tasksSearchArgsSchema,
  tasksStatsArgsSchema,
  tasksToggleArgsSchema,
  tasksUpdateMetadataArgsSchema,
} from "../../schema/tasks.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  ADDITIVE,
  IDEMPOTENT_ADDITIVE,
  READ_ONLY,
  listResultSchema,
  looseObjectSchema,
  mutationResultSchema,
} from "../tool-schemas.js";

export const taskTools: ToolDefinition[] = [
  {
    name: "tasks.search",
    title: "Search Tasks",
    description:
      "Scan the vault for Tasks-plugin-style markdown task lines (`- [ ]` / `- [x]`) and filter by status, priority, due date range, recurrence, or tag. Result items include the task text, source file, line number, status, and parsed metadata — enough to locate and further manipulate each task via `tasks.toggle` or `tasks.updateMetadata`. `sortBy` controls ordering; `limit` caps the result count. Read-only. For vault-wide counts without per-task detail, use `tasks.stats`.",
    inputSchema: tasksSearchArgsSchema,
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = tasksSearchArgsSchema.parse(rawArgs) as TasksSearchArgs;
      return searchTasks(context, args);
    },
  },
  {
    name: "tasks.create",
    title: "Create Task",
    description:
      "Append a new task line to a note. The task is written in Tasks-plugin format: `- [ ] <content> {metadata emojis}`. Optional metadata (`priority`, `dueDate`, `scheduledDate`, `startDate`, `doneDate`, `createdDate`, `recurrence`) is encoded as the plugin's convention emojis (🔺⏫📅⏳🛫✅➕🔁). Returns the standard mutation envelope with the 1-based `lineNumber` where the task was inserted.",
    inputSchema: tasksCreateArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = tasksCreateArgsSchema.parse(rawArgs) as TasksCreateArgs;
      return createTask(context, args);
    },
    inputExamples: [
      {
        description: "Append a simple task with a due date",
        input: {
          filePath: "Tasks.md",
          content: "Write the v0.3.0 migration doc",
          dueDate: "2026-05-01",
        },
      },
      {
        description: "Append a high-priority weekly recurring task",
        input: {
          filePath: "Tasks.md",
          content: "Weekly review",
          priority: "high",
          recurrence: "every week on Sunday",
        },
      },
    ],
  },
  {
    name: "tasks.toggle",
    title: "Toggle Task Status",
    description:
      "Flip a task line between `[ ]` and `[x]` in place, identified by `sourceFile` and 1-based `lineNumber`. When marking a task done, a `✅ YYYY-MM-DD` date is stamped into the line (default today; override with `doneDate`). Fails if the target line is not a task checkbox. Use `tasks.search` to find the right `sourceFile`/`lineNumber` pair.",
    inputSchema: tasksToggleArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = tasksToggleArgsSchema.parse(rawArgs) as TasksToggleArgs;
      return toggleTaskStatus(context, args);
    },
  },
  {
    name: "tasks.updateMetadata",
    title: "Update Task Metadata",
    description:
      "Update a task's dates, priority, or recurrence expression in place without touching the task body text. Identified by `sourceFile` + 1-based `lineNumber`. Pass only the fields you want to change. Idempotent — re-running with identical inputs converges on the same line. Fails if the target line is not a task.",
    inputSchema: tasksUpdateMetadataArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT_ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = tasksUpdateMetadataArgsSchema.parse(rawArgs) as TasksUpdateMetadataArgs;
      return updateTaskMetadata(context, args);
    },
  },
  {
    name: "tasks.stats",
    title: "Task Statistics",
    description:
      "Return aggregate task statistics for the whole vault: total tasks, incomplete count, completed count, overdue count (due date passed and still incomplete), upcoming counts by horizon (today/this-week/next-week), and per-priority breakdown. Read-only. Use `tasks.search` to get the individual task records.",
    inputSchema: tasksStatsArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = tasksStatsArgsSchema.parse(rawArgs) as TasksStatsArgs;
      return getTaskStatistics(context, args);
    },
  },
];
