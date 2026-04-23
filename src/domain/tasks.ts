import path from "node:path";
import { AppError } from "../lib/errors.js";
import { readUtf8, walkMarkdownFiles, writeUtf8 } from "../lib/filesystem.js";
import { resolveVaultPath, toVaultRelativePath } from "../lib/paths.js";
import {
  TAG_PATTERN,
  TASK_CHECKBOX_PATTERN,
  TASK_CREATED_PATTERN,
  TASK_DONE_PATTERN,
  TASK_DUE_DATE_PATTERN,
  TASK_PRIORITY_PATTERN,
  TASK_RECURRENCE_PATTERN,
  TASK_SCHEDULED_PATTERN,
  TASK_START_PATTERN,
} from "../lib/patterns.js";
import { type DomainContext, requireVaultPath } from "./context.js";

export type TaskPriority = "highest" | "high" | "normal" | "low" | "lowest";
export type TaskStatus = "incomplete" | "completed";

export type TaskRecord = {
  content: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  scheduledDate?: string;
  startDate?: string;
  doneDate?: string;
  createdDate?: string;
  recurrence?: string;
  lineNumber: number;
  sourceFile: string;
  tags: string[];
};

const PRIORITY_TO_EMOJI: Record<Exclude<TaskPriority, "normal">, string> = {
  highest: "⏫",
  high: "🔼",
  low: "🔽",
  lowest: "⏬",
};

const EMOJI_TO_PRIORITY: Record<string, TaskPriority> = Object.fromEntries(
  Object.entries(PRIORITY_TO_EMOJI).map(([priority, emoji]) => [emoji, priority]),
) as Record<string, TaskPriority>;

function parseDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value;
}

export function parseTaskLine(
  line: string,
  lineNumber: number,
  sourceFile: string,
): TaskRecord | null {
  const checkbox = line.match(TASK_CHECKBOX_PATTERN);
  if (!checkbox) {
    return null;
  }

  const status: TaskStatus = checkbox[1]?.toLowerCase() === "x" ? "completed" : "incomplete";
  let remaining = checkbox[2]?.trim() ?? "";
  const task: TaskRecord = {
    content: remaining,
    status,
    priority: "normal",
    lineNumber,
    sourceFile,
    tags: [],
  };

  const extractRightmost = (pattern: RegExp) => {
    const match = remaining.match(pattern);
    if (!match || typeof match.index !== "number") {
      return undefined;
    }
    remaining = remaining.slice(0, match.index).trimEnd();
    return match[1];
  };

  task.doneDate = parseDate(extractRightmost(TASK_DONE_PATTERN));
  task.dueDate = parseDate(extractRightmost(TASK_DUE_DATE_PATTERN));
  task.scheduledDate = parseDate(extractRightmost(TASK_SCHEDULED_PATTERN));
  task.startDate = parseDate(extractRightmost(TASK_START_PATTERN));
  task.createdDate = parseDate(extractRightmost(TASK_CREATED_PATTERN));

  const priorityMatch = remaining.match(TASK_PRIORITY_PATTERN);
  if (priorityMatch && typeof priorityMatch.index === "number") {
    task.priority = EMOJI_TO_PRIORITY[priorityMatch[1] ?? ""] ?? "normal";
    remaining = remaining.slice(0, priorityMatch.index).trimEnd();
  }

  const recurrence = extractRightmost(TASK_RECURRENCE_PATTERN);
  if (recurrence) {
    task.recurrence = recurrence.trim();
  }

  task.tags = Array.from(remaining.matchAll(TAG_PATTERN), (match) => match[1]).filter(
    (tag): tag is string => typeof tag === "string" && tag.length > 0,
  );
  task.content = remaining.trim();
  return task;
}

export function formatTaskLine(task: TaskRecord): string {
  const parts = [task.content];
  if (task.priority !== "normal") {
    parts.push(PRIORITY_TO_EMOJI[task.priority]);
  }
  if (task.startDate) {
    parts.push(`🛫 ${task.startDate}`);
  }
  if (task.scheduledDate) {
    parts.push(`⏳ ${task.scheduledDate}`);
  }
  if (task.dueDate) {
    parts.push(`📅 ${task.dueDate}`);
  }
  if (task.doneDate) {
    parts.push(`✅ ${task.doneDate}`);
  }
  if (task.createdDate) {
    parts.push(`➕ ${task.createdDate}`);
  }
  if (task.recurrence) {
    parts.push(`🔁 ${task.recurrence}`);
  }
  return `- [${task.status === "completed" ? "x" : " "}] ${parts.join(" ")}`;
}

export async function scanVaultForTasks(vaultRoot: string): Promise<TaskRecord[]> {
  const tasks: TaskRecord[] = [];
  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const relativePath = toVaultRelativePath(vaultRoot, absolutePath);
    const content = await readUtf8(absolutePath);
    for (const [index, line] of content.split(/\r?\n/).entries()) {
      const task = parseTaskLine(line, index + 1, relativePath);
      if (task) {
        tasks.push(task);
      }
    }
  }
  return tasks;
}

function priorityRank(priority: TaskPriority): number {
  return { highest: 0, high: 1, normal: 2, low: 3, lowest: 4 }[priority];
}

export async function searchTasks(
  context: DomainContext,
  args: {
    status?: TaskStatus | "all";
    priority?: TaskPriority;
    dueBefore?: string;
    dueAfter?: string;
    dueWithinDays?: number;
    hasRecurrence?: boolean;
    tag?: string;
    sortBy?: "dueDate" | "priority" | "file" | "lineNumber";
    limit?: number;
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  let tasks = await scanVaultForTasks(vaultRoot);
  const today = new Date().toISOString().slice(0, 10);

  if (args.status && args.status !== "all") {
    tasks = tasks.filter((task) => task.status === args.status);
  }
  if (args.priority) {
    tasks = tasks.filter((task) => task.priority === args.priority);
  }
  if (args.dueBefore) {
    const dueBefore = args.dueBefore;
    tasks = tasks.filter((task) => task.dueDate && task.dueDate < dueBefore);
  }
  if (args.dueAfter) {
    const dueAfter = args.dueAfter;
    tasks = tasks.filter((task) => task.dueDate && task.dueDate > dueAfter);
  }
  if (typeof args.dueWithinDays === "number") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + args.dueWithinDays);
    const cutoffString = cutoff.toISOString().slice(0, 10);
    tasks = tasks.filter(
      (task) => task.dueDate && task.dueDate >= today && task.dueDate <= cutoffString,
    );
  }
  if (typeof args.hasRecurrence === "boolean") {
    tasks = tasks.filter((task) => Boolean(task.recurrence) === args.hasRecurrence);
  }
  if (args.tag) {
    const searchTag = args.tag.replace(/^#/, "");
    tasks = tasks.filter((task) => task.tags.includes(searchTag));
  }

  const sortBy = args.sortBy ?? "dueDate";
  tasks.sort((left, right) => {
    if (sortBy === "priority") {
      return (
        priorityRank(left.priority) - priorityRank(right.priority) ||
        left.sourceFile.localeCompare(right.sourceFile)
      );
    }
    if (sortBy === "file") {
      return left.sourceFile.localeCompare(right.sourceFile) || left.lineNumber - right.lineNumber;
    }
    if (sortBy === "lineNumber") {
      return left.lineNumber - right.lineNumber || left.sourceFile.localeCompare(right.sourceFile);
    }
    return (
      (left.dueDate ?? "9999-99-99").localeCompare(right.dueDate ?? "9999-99-99") ||
      left.sourceFile.localeCompare(right.sourceFile)
    );
  });

  const limit = args.limit ?? 100;
  return { items: tasks.slice(0, limit), total: tasks.length, filtersApplied: { ...args, sortBy } };
}

export async function createTask(
  context: DomainContext,
  args: {
    filePath: string;
    content: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
    scheduledDate?: string;
    startDate?: string;
    doneDate?: string;
    createdDate?: string;
    recurrence?: string;
    append?: boolean;
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const existing = (await readUtf8(absolutePath).catch(() => "")) ?? "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const task: TaskRecord = {
    content: args.content,
    status: args.status ?? "incomplete",
    priority: args.priority ?? "normal",
    dueDate: args.dueDate,
    scheduledDate: args.scheduledDate,
    startDate: args.startDate,
    doneDate: args.doneDate,
    createdDate: args.createdDate,
    recurrence: args.recurrence,
    lineNumber: lines.length + 1,
    sourceFile: args.filePath,
    tags: Array.from(args.content.matchAll(TAG_PATTERN), (match) => match[1]).filter(
      (tag): tag is string => typeof tag === "string" && tag.length > 0,
    ),
  };
  const line = formatTaskLine(task);
  const nextContent = existing ? `${existing.replace(/\s+$/, "")}\n${line}\n` : `${line}\n`;
  await writeUtf8(absolutePath, nextContent);
  return {
    changed: true,
    target: args.filePath,
    summary: `Added task to ${args.filePath}`,
    task: {
      ...task,
      lineNumber: nextContent.split(/\r?\n/).findIndex((candidate) => candidate === line) + 1,
    },
  };
}

async function updateTaskLineInFile(
  vaultRoot: string,
  task: TaskRecord,
  lineUpdater: (current: TaskRecord) => TaskRecord,
): Promise<TaskRecord> {
  const absolutePath = resolveVaultPath(vaultRoot, task.sourceFile);
  const content = await readUtf8(absolutePath);
  const lines = content.split(/\r?\n/);
  const currentLine = lines[task.lineNumber - 1];
  const parsed = parseTaskLine(currentLine ?? "", task.lineNumber, task.sourceFile);
  if (!parsed) {
    throw new AppError("not_found", `Task line not found at ${task.sourceFile}:${task.lineNumber}`);
  }
  const updated = lineUpdater(parsed);
  lines[task.lineNumber - 1] = formatTaskLine(updated);
  await writeUtf8(absolutePath, `${lines.join("\n")}\n`);
  return updated;
}

export async function toggleTaskStatus(
  context: DomainContext,
  args: { sourceFile: string; lineNumber: number; doneDate?: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const updated = await updateTaskLineInFile(
    vaultRoot,
    {
      content: "",
      status: "incomplete",
      priority: "normal",
      lineNumber: args.lineNumber,
      sourceFile: args.sourceFile,
      tags: [],
    },
    (task) => ({
      ...task,
      status: task.status === "completed" ? "incomplete" : "completed",
      doneDate:
        task.status === "completed"
          ? undefined
          : (args.doneDate ?? new Date().toISOString().slice(0, 10)),
    }),
  );
  return {
    changed: true,
    target: `${args.sourceFile}:${args.lineNumber}`,
    summary: `Toggled task status in ${args.sourceFile}`,
    task: updated,
  };
}

export async function updateTaskMetadata(
  context: DomainContext,
  args: {
    sourceFile: string;
    lineNumber: number;
    priority?: TaskPriority;
    dueDate?: string;
    scheduledDate?: string;
    startDate?: string;
    recurrence?: string;
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const updated = await updateTaskLineInFile(
    vaultRoot,
    {
      content: "",
      status: "incomplete",
      priority: "normal",
      lineNumber: args.lineNumber,
      sourceFile: args.sourceFile,
      tags: [],
    },
    (task) => ({
      ...task,
      priority: args.priority ?? task.priority,
      dueDate: args.dueDate ?? task.dueDate,
      scheduledDate: args.scheduledDate ?? task.scheduledDate,
      startDate: args.startDate ?? task.startDate,
      recurrence: args.recurrence ?? task.recurrence,
    }),
  );
  return {
    changed: true,
    target: `${args.sourceFile}:${args.lineNumber}`,
    summary: `Updated task metadata in ${args.sourceFile}`,
    task: updated,
  };
}

export async function getTaskStatistics(context: DomainContext, args: { vaultPath?: string }) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const tasks = await scanVaultForTasks(vaultRoot);
  const completed = tasks.filter((task) => task.status === "completed").length;
  const incomplete = tasks.length - completed;
  const recurring = tasks.filter((task) => Boolean(task.recurrence)).length;
  const overdue = tasks.filter(
    (task) =>
      task.status === "incomplete" &&
      task.dueDate &&
      task.dueDate < new Date().toISOString().slice(0, 10),
  ).length;
  const byPriority = tasks.reduce<Record<TaskPriority, number>>(
    (accumulator, task) => {
      accumulator[task.priority] += 1;
      return accumulator;
    },
    { highest: 0, high: 0, normal: 0, low: 0, lowest: 0 },
  );

  return {
    total: tasks.length,
    completed,
    incomplete,
    recurring,
    overdue,
    completionRate: Number((tasks.length > 0 ? (completed / tasks.length) * 100 : 0).toFixed(1)),
    byPriority,
  };
}
