import { AppError } from "../lib/errors.js";
import { type DomainContext, requireApiConfigured } from "./context.js";

async function apiJson<T>(
  context: DomainContext,
  pathname: string,
  init?: RequestInit,
): Promise<T> {
  const api = requireApiConfigured(context);
  return api.request<T>(pathname, init);
}

function normalizeCommandsResponse(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }

  if (
    typeof result === "object" &&
    result &&
    "commands" in result &&
    Array.isArray(result.commands)
  ) {
    return result.commands as Array<Record<string, unknown>>;
  }

  throw new AppError("unavailable", "Unexpected Obsidian commands response shape");
}

export async function executeDataviewQuery(context: DomainContext, args: { query: string }) {
  if (!/^(LIST|TABLE|TASK|CALENDAR)\b/i.test(args.query.trim())) {
    throw new AppError("invalid_argument", `Invalid DQL query: ${args.query}`);
  }
  const api = requireApiConfigured(context);
  const result = await api.request<unknown>("/search/", {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.olrapi.dataview.dql+txt",
    },
    body: args.query,
  });
  return { query: args.query, results: result };
}

export async function listNotesByTagDql(
  context: DomainContext,
  args: { tag: string; whereClause?: string; sortBy?: string; limit?: number },
) {
  const tag = args.tag.startsWith("#") ? args.tag : `#${args.tag}`;
  const query = [
    "LIST",
    `FROM ${tag}`,
    args.whereClause ? `WHERE ${args.whereClause}` : "",
    args.sortBy ? `SORT ${args.sortBy}` : "",
    args.limit ? `LIMIT ${args.limit}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return executeDataviewQuery(context, { query });
}

export async function listNotesByFolderDql(
  context: DomainContext,
  args: { folder: string; whereClause?: string; sortBy?: string; limit?: number },
) {
  const query = [
    "LIST",
    `FROM "${args.folder}"`,
    args.whereClause ? `WHERE ${args.whereClause}` : "",
    args.sortBy ? `SORT ${args.sortBy}` : "",
    args.limit ? `LIMIT ${args.limit}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return executeDataviewQuery(context, { query });
}

export async function tableQueryDql(
  context: DomainContext,
  args: {
    fields: string[];
    fromClause?: string;
    whereClause?: string;
    sortBy?: string;
    limit?: number;
  },
) {
  if (args.fields.length === 0) {
    throw new AppError("invalid_argument", "TABLE queries require at least one field");
  }
  const query = [
    `TABLE ${args.fields.join(", ")}`,
    args.fromClause ? `FROM ${args.fromClause}` : "",
    args.whereClause ? `WHERE ${args.whereClause}` : "",
    args.sortBy ? `SORT ${args.sortBy}` : "",
    args.limit ? `LIMIT ${args.limit}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return executeDataviewQuery(context, { query });
}

export async function renderTemplaterTemplate(
  context: DomainContext,
  args: { templateFile: string; targetFile?: string },
) {
  const result = await apiJson<unknown>(context, "/templater/execute/", {
    method: "POST",
    body: JSON.stringify({
      templatePath: args.templateFile,
      targetPath: args.targetFile ?? args.templateFile,
    }),
  });
  return { templateFile: args.templateFile, targetFile: args.targetFile, renderedContent: result };
}

export async function createNoteFromTemplater(
  context: DomainContext,
  args: { templateFile: string; targetFile: string; openFile?: boolean },
) {
  const result = await apiJson<unknown>(context, "/templater/execute/", {
    method: "POST",
    body: JSON.stringify({
      templatePath: args.templateFile,
      targetPath: args.targetFile,
      open: args.openFile ?? false,
    }),
  });
  return {
    templateFile: args.templateFile,
    targetFile: args.targetFile,
    openFile: args.openFile ?? false,
    result,
  };
}

export async function insertTemplaterTemplate(
  context: DomainContext,
  args: { templateFile: string; activeFile?: boolean },
) {
  const commandResult = await executeCommand(context, {
    commandId: "templater-obsidian:insert-templater",
    args: { template: args.templateFile, active: args.activeFile ?? true },
  });
  return {
    templateFile: args.templateFile,
    activeFile: args.activeFile ?? true,
    result: commandResult.result,
  };
}

export async function getActiveFile(context: DomainContext) {
  const result = await apiJson<unknown>(context, "/active/", { method: "GET" });
  return { activeFile: result };
}

export async function openFile(
  context: DomainContext,
  args: { filePath: string; newPane?: boolean },
) {
  const encodedPath = args.filePath.split("/").map(encodeURIComponent).join("/");
  const result = await apiJson<unknown>(
    context,
    `/open/${encodedPath}?newLeaf=${String(args.newPane ?? false)}`,
    { method: "POST" },
  );
  return { filePath: args.filePath, newPane: args.newPane ?? false, result };
}

export async function executeCommand(
  context: DomainContext,
  args: { commandId: string; args?: Record<string, unknown> },
) {
  const encodedCommand = args.commandId.split("/").map(encodeURIComponent).join("/");
  const result = await apiJson<unknown>(context, `/commands/${encodedCommand}/`, {
    method: "POST",
    ...(args.args ? { body: JSON.stringify(args.args) } : {}),
  });
  return { commandId: args.commandId, args: args.args, result };
}

export async function listCommands(context: DomainContext) {
  const result = await apiJson<unknown>(context, "/commands/", {
    method: "GET",
  });
  const items = normalizeCommandsResponse(result);
  return { items, total: items.length };
}

export async function searchCommands(context: DomainContext, args: { query: string }) {
  const commands = await listCommands(context);
  const query = args.query.toLowerCase();
  const items = commands.items.filter(
    (command) =>
      String(command.id ?? "")
        .toLowerCase()
        .includes(query) ||
      String(command.name ?? "")
        .toLowerCase()
        .includes(query),
  );
  return { query: args.query, items, total: items.length };
}

export async function closeActiveFile(context: DomainContext) {
  return executeCommand(context, { commandId: "app:close-active-file" });
}

export async function navigateBack(context: DomainContext) {
  return executeCommand(context, { commandId: "app:go-back" });
}

export async function navigateForward(context: DomainContext) {
  return executeCommand(context, { commandId: "app:go-forward" });
}

export async function toggleEditMode(context: DomainContext) {
  return executeCommand(context, { commandId: "markdown:toggle-preview" });
}
