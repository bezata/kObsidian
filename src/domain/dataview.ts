import { AppError } from "../lib/errors.js";
import { readUtf8, walkMarkdownFiles, writeUtf8 } from "../lib/filesystem.js";
import { resolveVaultPath, toVaultRelativePath } from "../lib/paths.js";
import {
  DATAVIEW_BRACKET_PATTERN,
  DATAVIEW_FULL_LINE_PATTERN,
  DATAVIEW_PAREN_PATTERN,
  DATE_ISO8601_PATTERN,
  LIST_QUOTED_PATTERN,
  WIKILINK_SINGLE,
} from "../lib/patterns.js";
import { type DomainContext, requireVaultPath } from "./context.js";
import {
  type FencedCodeBlock,
  type SourceSpan,
  parseMarkdownBlocks,
  replaceSourceSpan,
} from "./markdown-blocks.js";

export type DataviewValueType = "string" | "number" | "boolean" | "date" | "link" | "list";
export type DataviewFieldScope = "page" | "list" | "task";
export type DataviewSyntaxType = "frontmatter" | "full-line" | "bracket" | "paren";

export type DataviewField = {
  scope: DataviewFieldScope;
  key: string;
  value: unknown;
  canonicalKey: string;
  lineNumber: number;
  syntaxType: DataviewSyntaxType;
  sourceFile: string;
  valueType: DataviewValueType;
  span?: SourceSpan;
  listItemLineNumber?: number;
  taskLineNumber?: number;
};

export type DataviewSourceBlock = {
  id: string;
  filePath: string;
  raw: string;
  source: string;
  lineNumber: number;
  span: SourceSpan;
  contentSpan: SourceSpan;
};

export function canonicalizeKey(key: string): string {
  return key
    .trim()
    .replace(/^[_*~]+|[_*~]+$/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function detectValueType(value: string): DataviewValueType {
  const trimmed = value.trim();
  if (/^(true|false)$/i.test(trimmed)) {
    return "boolean";
  }
  if (!Number.isNaN(Number(trimmed)) && trimmed !== "") {
    return "number";
  }
  if (DATE_ISO8601_PATTERN.test(trimmed)) {
    return "date";
  }
  if (WIKILINK_SINGLE.test(trimmed)) {
    return "link";
  }
  if (trimmed.includes(",")) {
    return "list";
  }
  return "string";
}

function detectUnknownValueType(value: unknown): DataviewValueType {
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (Array.isArray(value)) {
    return "list";
  }
  if (typeof value === "string") {
    return detectValueType(value);
  }
  return "string";
}

export function parseDataviewValue(value: string, valueType: DataviewValueType): unknown {
  const trimmed = value.trim();
  if (valueType === "boolean") {
    return /^true$/i.test(trimmed);
  }
  if (valueType === "number") {
    return trimmed.includes(".") ? Number.parseFloat(trimmed) : Number.parseInt(trimmed, 10);
  }
  if (valueType === "date") {
    return trimmed.includes("T") ? new Date(trimmed).toISOString() : trimmed;
  }
  if (valueType === "link") {
    return WIKILINK_SINGLE.exec(trimmed)?.[1] ?? trimmed;
  }
  if (valueType === "list") {
    const quoted = Array.from(trimmed.matchAll(LIST_QUOTED_PATTERN), (match) => match[1]).filter(
      Boolean,
    );
    return quoted.length > 0 ? quoted : trimmed.split(",").map((item) => item.trim());
  }
  return trimmed;
}

function clonePattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

function fieldSpanFromMatch(lineStartOffset: number, lineNumber: number, match: RegExpMatchArray) {
  const startOffset = lineStartOffset + (match.index ?? 0);
  return {
    startOffset,
    endOffset: startOffset + match[0].length,
    startLine: lineNumber,
    endLine: lineNumber,
  };
}

function formatUnknownValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return value.map((item) => `"${String(item)}"`).join(", ");
  }
  return String(value);
}

function extractFieldsFromLine(
  lineBody: string,
  sourceFile: string,
  lineNumber: number,
  lineStartOffset: number,
  scope: DataviewFieldScope,
  listItemLineNumber?: number,
  taskLineNumber?: number,
): DataviewField[] {
  const fields: DataviewField[] = [];
  const pushMatch = (
    match: RegExpMatchArray,
    syntaxType: Exclude<DataviewSyntaxType, "frontmatter">,
  ) => {
    const key = match[1]?.trim() ?? "";
    const valueString = match[2]?.trim() ?? "";
    if (!key || !valueString) {
      return;
    }
    const valueType = detectValueType(valueString);
    fields.push({
      scope,
      key,
      value: parseDataviewValue(valueString, valueType),
      canonicalKey: canonicalizeKey(key),
      lineNumber,
      syntaxType,
      sourceFile,
      valueType,
      span: fieldSpanFromMatch(lineStartOffset, lineNumber, match),
      ...(listItemLineNumber ? { listItemLineNumber } : {}),
      ...(taskLineNumber ? { taskLineNumber } : {}),
    });
  };

  if (scope === "page") {
    for (const match of lineBody.matchAll(clonePattern(DATAVIEW_FULL_LINE_PATTERN))) {
      pushMatch(match, "full-line");
    }
  }
  for (const match of lineBody.matchAll(clonePattern(DATAVIEW_BRACKET_PATTERN))) {
    pushMatch(match, "bracket");
  }
  for (const match of lineBody.matchAll(clonePattern(DATAVIEW_PAREN_PATTERN))) {
    pushMatch(match, "paren");
  }
  return fields;
}

function lineNumberForFrontmatterKey(
  rawFrontmatter: string,
  frontmatterStartLine: number,
  key: string,
): number {
  const lines = rawFrontmatter.split(/\r?\n/);
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^\\s*${escaped}\\s*:`);
  const index = lines.findIndex((line) => pattern.test(line));
  return index >= 0 ? frontmatterStartLine + index : frontmatterStartLine;
}

function extractFrontmatterFields(
  content: string,
  sourceFile: string,
  frontmatter: NonNullable<ReturnType<typeof parseMarkdownBlocks>["frontmatter"]>,
): DataviewField[] {
  return Object.entries(frontmatter.data).map(([key, value]) => ({
    scope: "page",
    key,
    value,
    canonicalKey: canonicalizeKey(key),
    lineNumber: lineNumberForFrontmatterKey(frontmatter.raw, frontmatter.startLine, key),
    syntaxType: "frontmatter",
    sourceFile,
    valueType: detectUnknownValueType(value),
    span: {
      startOffset: frontmatter.startOffset,
      endOffset: frontmatter.endOffset,
      startLine: frontmatter.startLine,
      endLine: frontmatter.endLine,
    },
  }));
}

function sourceBlockFromFence(filePath: string, block: FencedCodeBlock): DataviewSourceBlock {
  return {
    id: block.id,
    filePath,
    raw: block.raw,
    source: block.content,
    lineNumber: block.span.startLine,
    span: block.span,
    contentSpan: block.contentSpan,
  };
}

export function buildDataviewIndex(content: string, sourceFile: string) {
  const document = parseMarkdownBlocks(content, sourceFile);
  const pageFields: DataviewField[] = [];
  const listItemFields: DataviewField[] = [];
  const taskFields: DataviewField[] = [];
  const listLines = new Map(document.listItems.map((item) => [item.span.startLine, item]));
  const taskLines = new Map(document.tasks.map((task) => [task.span.startLine, task]));

  if (document.frontmatter) {
    pageFields.push(...extractFrontmatterFields(content, sourceFile, document.frontmatter));
  }

  for (const line of document.lines) {
    const listItem = listLines.get(line.startLine);
    const task = taskLines.get(line.startLine);
    if (task) {
      taskFields.push(
        ...extractFieldsFromLine(
          line.body,
          sourceFile,
          line.startLine,
          line.startOffset,
          "task",
          task.span.startLine,
          task.span.startLine,
        ),
      );
      continue;
    }
    if (listItem) {
      listItemFields.push(
        ...extractFieldsFromLine(
          line.body,
          sourceFile,
          line.startLine,
          line.startOffset,
          "list",
          listItem.span.startLine,
        ),
      );
      continue;
    }

    const insideFrontmatter =
      document.frontmatter &&
      line.startOffset >= document.frontmatter.startOffset &&
      line.endOffset <= document.frontmatter.endOffset;
    const insideFence = document.fencedCodeBlocks.some(
      (block) =>
        line.startOffset >= block.span.startOffset && line.endOffset <= block.span.endOffset,
    );
    if (!insideFrontmatter && !insideFence) {
      pageFields.push(
        ...extractFieldsFromLine(line.body, sourceFile, line.startLine, line.startOffset, "page"),
      );
    }
  }

  const queryBlocks = document.fencedCodeBlocks
    .filter((block) => block.language === "dataview")
    .map((block) => sourceBlockFromFence(sourceFile, block));
  const jsBlocks = document.fencedCodeBlocks
    .filter((block) => block.language === "dataviewjs")
    .map((block) => sourceBlockFromFence(sourceFile, block));

  return {
    filePath: sourceFile,
    pageFields,
    listItemFields,
    taskFields,
    queryBlocks,
    jsBlocks,
  };
}

export function extractDataviewFields(content: string, sourceFile: string): DataviewField[] {
  const index = buildDataviewIndex(content, sourceFile);
  return [...index.pageFields, ...index.listItemFields, ...index.taskFields];
}

export function formatDataviewField(
  key: string,
  value: unknown,
  syntaxType: Exclude<DataviewSyntaxType, "frontmatter"> = "full-line",
): string {
  const formatted = formatUnknownValue(value);
  if (syntaxType === "bracket") {
    return `[${key}:: ${formatted}]`;
  }
  if (syntaxType === "paren") {
    return `(${key}:: ${formatted})`;
  }
  return `${key}:: ${formatted}`;
}

export async function readDataviewIndex(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const content = await readUtf8(absolutePath);
  return buildDataviewIndex(content, args.filePath);
}

export async function extractDataviewFieldsFromFile(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const index = await readDataviewIndex(context, args);
  const items = [...index.pageFields, ...index.listItemFields, ...index.taskFields];
  return { filePath: args.filePath, items, total: items.length };
}

export async function searchByDataviewField(
  context: DomainContext,
  args: {
    key: string;
    value?: unknown;
    valueType?: DataviewValueType;
    scope?: DataviewFieldScope | "all";
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const canonicalKey = canonicalizeKey(args.key);
  const matches: Record<string, DataviewField[]> = {};

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const relativePath = toVaultRelativePath(vaultRoot, absolutePath);
    const content = await readUtf8(absolutePath);
    let fields = extractDataviewFields(content, relativePath).filter(
      (field) => field.canonicalKey === canonicalKey,
    );
    if (args.scope && args.scope !== "all") {
      fields = fields.filter((field) => field.scope === args.scope);
    }
    if (typeof args.value !== "undefined") {
      fields = fields.filter((field) => JSON.stringify(field.value) === JSON.stringify(args.value));
    }
    if (args.valueType) {
      fields = fields.filter((field) => field.valueType === args.valueType);
    }
    if (fields.length > 0) {
      matches[relativePath] = fields;
    }
  }

  const total = Object.values(matches).reduce((count, fields) => count + fields.length, 0);
  return {
    searchKey: args.key,
    canonicalKey,
    scope: args.scope ?? "all",
    matchesByFile: matches,
    totalMatches: total,
    filesWithMatches: Object.keys(matches).length,
  };
}

function findLineSpan(content: string, lineNumber: number): SourceSpan {
  const document = parseMarkdownBlocks(content);
  const line = document.lines.find((candidate) => candidate.startLine === lineNumber);
  if (!line) {
    throw new AppError("not_found", `Line not found: ${lineNumber}`);
  }
  return line;
}

export async function addDataviewField(
  context: DomainContext,
  args: {
    filePath: string;
    key: string;
    value: unknown;
    syntaxType?: Exclude<DataviewSyntaxType, "frontmatter">;
    insertAt?: "start" | "end" | "afterFrontmatter";
    scope?: DataviewFieldScope;
    lineNumber?: number;
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const syntaxType =
    args.syntaxType ?? (args.scope && args.scope !== "page" ? "bracket" : "full-line");
  const existing = await readUtf8(absolutePath).catch(() => "");
  const fieldText = formatDataviewField(args.key, args.value, syntaxType);
  let nextContent: string;

  if (args.scope === "list" || args.scope === "task") {
    if (!args.lineNumber) {
      throw new AppError(
        "invalid_argument",
        "lineNumber is required for list/task Dataview fields",
      );
    }
    const line = findLineSpan(existing, args.lineNumber);
    const lineText = existing.slice(line.startOffset, line.endOffset);
    const eol = lineText.match(/(\r\n|\n|\r)$/)?.[1] ?? "";
    const body = eol ? lineText.slice(0, -eol.length) : lineText;
    nextContent = replaceSourceSpan(existing, line, `${body} ${fieldText}${eol}`);
  } else if (!existing) {
    nextContent = `${fieldText}\n`;
  } else if ((args.insertAt ?? "afterFrontmatter") === "start") {
    nextContent = `${fieldText}\n${existing}`;
  } else if (args.insertAt === "end") {
    nextContent = `${existing.replace(/\s+$/, "")}\n${fieldText}\n`;
  } else {
    const match = existing.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
    nextContent = match
      ? `${existing.slice(0, match[0].length)}${fieldText}\n${existing.slice(match[0].length)}`
      : `${fieldText}\n${existing}`;
  }

  await writeUtf8(absolutePath, nextContent);
  return {
    changed: true,
    target: args.filePath,
    summary: `Added Dataview field ${args.key}`,
    formattedField: fieldText,
    scope: args.scope ?? "page",
  };
}

export async function removeDataviewField(
  context: DomainContext,
  args: {
    filePath: string;
    key: string;
    lineNumber?: number;
    scope?: DataviewFieldScope | "all";
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const content = await readUtf8(absolutePath);
  let fields = extractDataviewFields(content, args.filePath).filter(
    (field) =>
      field.canonicalKey === canonicalizeKey(args.key) &&
      (!args.lineNumber || field.lineNumber === args.lineNumber),
  );
  if (args.scope && args.scope !== "all") {
    fields = fields.filter((field) => field.scope === args.scope);
  }
  if (fields.length === 0) {
    return { changed: false, target: args.filePath, removedKey: args.key, removedCount: 0 };
  }

  let nextContent = content;
  for (const field of [...fields].sort(
    (left, right) => (right.span?.startOffset ?? 0) - (left.span?.startOffset ?? 0),
  )) {
    if (!field.span) {
      continue;
    }
    if (field.syntaxType === "full-line") {
      const line = findLineSpan(nextContent, field.lineNumber);
      nextContent = replaceSourceSpan(nextContent, line, "");
    } else if (field.syntaxType !== "frontmatter") {
      nextContent = replaceSourceSpan(nextContent, field.span, "");
    }
  }

  await writeUtf8(absolutePath, nextContent);
  return {
    changed: true,
    target: args.filePath,
    removedKey: args.key,
    removedCount: fields.length,
  };
}

function selectSourceBlock(blocks: DataviewSourceBlock[], blockId?: string, index?: number) {
  if (blockId) {
    return blocks.find((block) => block.id === blockId);
  }
  if (typeof index === "number") {
    return blocks[index];
  }
  return blocks[0];
}

export async function readDataviewQueryBlocks(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const index = await readDataviewIndex(context, args);
  return { filePath: args.filePath, items: index.queryBlocks, total: index.queryBlocks.length };
}

export async function updateDataviewQueryBlock(
  context: DomainContext,
  args: { filePath: string; source: string; blockId?: string; index?: number; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const content = await readUtf8(absolutePath);
  const block = selectSourceBlock(
    buildDataviewIndex(content, args.filePath).queryBlocks,
    args.blockId,
    args.index,
  );
  if (!block) {
    throw new AppError("not_found", "Dataview query block not found");
  }
  await writeUtf8(absolutePath, replaceSourceSpan(content, block.contentSpan, args.source));
  return {
    changed: true,
    target: args.filePath,
    summary: "Updated Dataview query block",
    blockId: block.id,
  };
}

export async function readDataviewJsBlocks(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const index = await readDataviewIndex(context, args);
  return { filePath: args.filePath, items: index.jsBlocks, total: index.jsBlocks.length };
}

export async function updateDataviewJsBlock(
  context: DomainContext,
  args: { filePath: string; source: string; blockId?: string; index?: number; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const content = await readUtf8(absolutePath);
  const block = selectSourceBlock(
    buildDataviewIndex(content, args.filePath).jsBlocks,
    args.blockId,
    args.index,
  );
  if (!block) {
    throw new AppError("not_found", "DataviewJS block not found");
  }
  await writeUtf8(absolutePath, replaceSourceSpan(content, block.contentSpan, args.source));
  return {
    changed: true,
    target: args.filePath,
    summary: "Updated DataviewJS block",
    blockId: block.id,
  };
}
