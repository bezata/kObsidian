import { promises as fs } from "node:fs";
import path from "node:path";
import { AppError } from "../lib/errors.js";
import {
  ensureDir,
  fileExists,
  readUtf8,
  walkMarkdownFiles,
  writeUtf8,
} from "../lib/filesystem.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import { assertVaultRelativePath, resolveVaultPath, toVaultRelativePath } from "../lib/paths.js";
import { MARKDOWN_LINK_PATTERN, TAG_PATTERN, WIKILINK_PATTERN } from "../lib/patterns.js";
import { type DomainContext, requireVaultPath } from "./context.js";
import { extractInlineTags, readNoteMetadata } from "./metadata.js";

export type ReadNoteArgs = {
  path: string;
  vaultPath?: string;
};

export async function readNote(context: DomainContext, args: ReadNoteArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.path);
  const content = await readUtf8(absolutePath);
  const metadata = await readNoteMetadata(absolutePath, content);

  return {
    path: assertVaultRelativePath(args.path),
    content,
    metadata,
  };
}

export type CreateNoteArgs = {
  path: string;
  content: string;
  overwrite?: boolean;
  vaultPath?: string;
};

export async function createNote(context: DomainContext, args: CreateNoteArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const notePath = assertVaultRelativePath(args.path);
  const absolutePath = resolveVaultPath(vaultRoot, notePath);
  const exists = await fileExists(absolutePath);
  if (exists && !args.overwrite) {
    throw new AppError("conflict", `Note already exists: ${notePath}`);
  }

  await writeUtf8(absolutePath, args.content);
  return {
    changed: true,
    target: notePath,
    created: !exists,
    summary: exists ? `Overwrote ${notePath}` : `Created ${notePath}`,
    note: await readNote(context, { path: notePath, vaultPath: vaultRoot }),
  };
}

export type UpdateNoteArgs = {
  path: string;
  content: string;
  createIfNotExists?: boolean;
  mergeStrategy?: "replace" | "append";
  vaultPath?: string;
};

export async function updateNote(context: DomainContext, args: UpdateNoteArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const notePath = assertVaultRelativePath(args.path);
  const absolutePath = resolveVaultPath(vaultRoot, notePath);
  const exists = await fileExists(absolutePath);
  if (!exists && !args.createIfNotExists) {
    throw new AppError("not_found", `Note not found: ${notePath}`);
  }

  const mergeStrategy = args.mergeStrategy ?? "replace";
  const previous = exists ? await readUtf8(absolutePath) : "";
  const nextContent =
    mergeStrategy === "append" && previous
      ? `${previous.replace(/\s+$/, "")}\n\n${args.content}`
      : args.content;
  await writeUtf8(absolutePath, nextContent);

  return {
    changed: true,
    target: notePath,
    created: !exists,
    summary: `${exists ? "Updated" : "Created"} ${notePath} using ${mergeStrategy}`,
    mergeStrategy,
    note: await readNote(context, { path: notePath, vaultPath: vaultRoot }),
  };
}

export type DeleteNoteArgs = {
  path: string;
  vaultPath?: string;
};

export async function deleteNote(context: DomainContext, args: DeleteNoteArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const notePath = assertVaultRelativePath(args.path);
  const absolutePath = resolveVaultPath(vaultRoot, notePath);
  if (!(await fileExists(absolutePath))) {
    throw new AppError("not_found", `Note not found: ${notePath}`);
  }

  await fs.unlink(absolutePath);
  return {
    changed: true,
    target: notePath,
    deleted: true,
    summary: `Deleted ${notePath}`,
  };
}

function makeSearchContext(
  content: string,
  index: number,
  queryLength: number,
  contextLength: number,
): string {
  const start = Math.max(0, index - Math.floor(contextLength / 2));
  const end = Math.min(content.length, index + queryLength + Math.floor(contextLength / 2));
  return content.slice(start, end).trim();
}

type SearchFilter = {
  rawQuery: string;
  textTerms: string[];
  tag?: string;
  pathPrefix?: string;
};

function parseSearchQuery(query: string): SearchFilter {
  const parts = query.split(/\s+/).filter(Boolean);
  const textTerms: string[] = [];
  let tag: string | undefined;
  let pathPrefix: string | undefined;

  for (const part of parts) {
    if (part.startsWith("tag:#")) {
      tag = part.slice("tag:#".length);
    } else if (part.startsWith("path:")) {
      pathPrefix = part.slice("path:".length).replaceAll("\\", "/");
    } else {
      textTerms.push(part);
    }
  }

  return { rawQuery: query, textTerms, tag, pathPrefix };
}

export type SearchNotesArgs = {
  query: string;
  contextLength?: number;
  vaultPath?: string;
};

export async function searchNotes(context: DomainContext, args: SearchNotesArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const contextLength = args.contextLength ?? 100;
  const filter = parseSearchQuery(args.query);
  const results: Array<{
    path: string;
    score: number;
    matches: string[];
    context?: string;
  }> = [];

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const relativePath = toVaultRelativePath(vaultRoot, absolutePath);
    if (filter.pathPrefix && !relativePath.startsWith(filter.pathPrefix)) {
      continue;
    }

    const content = await readUtf8(absolutePath);
    const parsed = parseFrontmatter(content);
    const tags = new Set([
      ...extractInlineTags(parsed.content),
      ...((parsed.data.tags as string[] | undefined) ?? []),
    ]);
    if (filter.tag && !tags.has(filter.tag)) {
      continue;
    }

    if (filter.textTerms.length === 0) {
      results.push({ path: relativePath, score: 1, matches: [], context: undefined });
      continue;
    }

    const lowerContent = content.toLowerCase();
    const lowerPath = relativePath.toLowerCase();
    const matches: string[] = [];
    let score = 0;
    let firstIndex = -1;
    let matchesAllTerms = true;

    for (const term of filter.textTerms) {
      const lowerTerm = term.toLowerCase();
      const contentIndex = lowerContent.indexOf(lowerTerm);
      const pathIndex = lowerPath.indexOf(lowerTerm);
      const hitIndex = contentIndex >= 0 ? contentIndex : pathIndex;

      if (hitIndex < 0) {
        matchesAllTerms = false;
        break;
      }

      matches.push(term);
      score += pathIndex >= 0 ? 2 : 1;
      if (firstIndex < 0) {
        firstIndex = contentIndex >= 0 ? contentIndex : 0;
      }
    }

    if (!matchesAllTerms) {
      continue;
    }

    results.push({
      path: relativePath,
      score,
      matches,
      context:
        firstIndex >= 0
          ? makeSearchContext(content, firstIndex, matches[0]?.length ?? 0, contextLength)
          : undefined,
    });
  }

  results.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  return {
    query: args.query,
    items: results,
    total: results.length,
  };
}

export type SearchByDateArgs = {
  dateType?: "created" | "modified";
  daysAgo?: number;
  operator?: "within" | "exactly";
  vaultPath?: string;
};

export async function searchByDate(context: DomainContext, args: SearchByDateArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const dateType = args.dateType ?? "modified";
  const daysAgo = args.daysAgo ?? 7;
  const operator = args.operator ?? "within";
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysAgo);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const items: Array<{ path: string; date: string; daysAgo: number }> = [];

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const stats = await fs.stat(absolutePath);
    const stamp = dateType === "created" ? stats.birthtime : stats.mtime;
    const matches =
      operator === "within"
        ? stamp.getTime() >= start.getTime()
        : stamp.getTime() >= start.getTime() && stamp.getTime() < end.getTime();

    if (!matches) {
      continue;
    }

    const diffDays = Math.floor((now.getTime() - stamp.getTime()) / 86_400_000);
    items.push({
      path: toVaultRelativePath(vaultRoot, absolutePath),
      date: stamp.toISOString(),
      daysAgo: diffDays,
    });
  }

  items.sort((left, right) => right.date.localeCompare(left.date));
  return {
    query: `Notes ${dateType} ${operator} ${daysAgo} days ago`,
    items,
    total: items.length,
    filtersApplied: { dateType, daysAgo, operator },
  };
}

export type ListNotesArgs = {
  directory?: string;
  recursive?: boolean;
  vaultPath?: string;
};

export async function listNotes(context: DomainContext, args: ListNotesArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const directory = args.directory?.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "") ?? "";
  const recursive = args.recursive ?? true;
  const startDir = directory ? resolveVaultPath(vaultRoot, directory) : vaultRoot;

  if (!(await fileExists(startDir))) {
    return { directory: directory || "/", recursive, items: [], total: 0 };
  }

  const items: Array<{ path: string; name: string }> = [];
  async function walk(current: string): Promise<void> {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) {
          await walk(fullPath);
        }
        continue;
      }
      if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".markdown"))) {
        items.push({ path: toVaultRelativePath(vaultRoot, fullPath), name: entry.name });
      }
    }
  }
  await walk(startDir);
  items.sort((left, right) => left.path.localeCompare(right.path));
  return { directory: directory || "/", recursive, items, total: items.length };
}

export async function listFolders(context: DomainContext, args: ListNotesArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const directory = args.directory?.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "") ?? "";
  const recursive = args.recursive ?? true;
  const startDir = directory ? resolveVaultPath(vaultRoot, directory) : vaultRoot;

  if (!(await fileExists(startDir))) {
    return { directory: directory || "/", recursive, items: [], total: 0 };
  }

  const items: Array<{ path: string; name: string }> = [];
  async function walk(current: string): Promise<void> {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      items.push({ path: toVaultRelativePath(vaultRoot, fullPath), name: entry.name });
      if (recursive) {
        await walk(fullPath);
      }
    }
  }
  await walk(startDir);
  items.sort((left, right) => left.path.localeCompare(right.path));
  return { directory: directory || "/", recursive, items, total: items.length };
}

async function updateLinksAcrossVault(
  vaultRoot: string,
  sourcePath: string,
  destinationPath: string,
): Promise<number> {
  let changedFiles = 0;
  const sourceBase = path.basename(sourcePath, path.extname(sourcePath));
  const destinationBase = path.basename(destinationPath, path.extname(destinationPath));

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const content = await readUtf8(absolutePath);
    const nextContent = content
      .replaceAll(`[[${sourcePath}]]`, `[[${destinationPath}]]`)
      .replaceAll(`[[${sourceBase}]]`, `[[${destinationBase}]]`)
      .replaceAll(`(${sourcePath})`, `(${destinationPath})`);
    if (nextContent !== content) {
      await writeUtf8(absolutePath, nextContent);
      changedFiles += 1;
    }
  }

  return changedFiles;
}

export type MoveNoteArgs = {
  sourcePath: string;
  destinationPath: string;
  updateLinks?: boolean;
  vaultPath?: string;
};

export async function moveNote(context: DomainContext, args: MoveNoteArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const sourcePath = assertVaultRelativePath(args.sourcePath);
  const destinationPath = assertVaultRelativePath(args.destinationPath);
  const sourceAbsolute = resolveVaultPath(vaultRoot, sourcePath);
  const destinationAbsolute = resolveVaultPath(vaultRoot, destinationPath);
  if (!(await fileExists(sourceAbsolute))) {
    throw new AppError("not_found", `Note not found: ${sourcePath}`);
  }
  if (await fileExists(destinationAbsolute)) {
    throw new AppError("conflict", `Destination already exists: ${destinationPath}`);
  }

  await ensureDir(path.dirname(destinationAbsolute));
  await fs.rename(sourceAbsolute, destinationAbsolute);
  const linksUpdated =
    args.updateLinks === false
      ? 0
      : await updateLinksAcrossVault(vaultRoot, sourcePath, destinationPath);

  return {
    changed: true,
    target: destinationPath,
    summary: `Moved ${sourcePath} to ${destinationPath}`,
    source: sourcePath,
    destination: destinationPath,
    linksUpdated,
  };
}

export type CreateFolderArgs = {
  folderPath: string;
  vaultPath?: string;
};

export async function createFolder(context: DomainContext, args: CreateFolderArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const folderPath = args.folderPath.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!folderPath || folderPath.includes("..") || folderPath.endsWith(".md")) {
    throw new AppError("invalid_argument", `Invalid folder path: ${args.folderPath}`);
  }

  const absolutePath = resolveVaultPath(vaultRoot, folderPath);
  const existed = await fileExists(absolutePath);
  await ensureDir(absolutePath);
  return {
    changed: !existed,
    target: folderPath,
    created: !existed,
    summary: existed ? `Folder already existed: ${folderPath}` : `Created folder ${folderPath}`,
  };
}

export type MoveFolderArgs = {
  sourceFolder: string;
  destinationFolder: string;
  updateLinks?: boolean;
  vaultPath?: string;
};

export async function moveFolder(context: DomainContext, args: MoveFolderArgs) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const sourceFolder = args.sourceFolder.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  const destinationFolder = args.destinationFolder.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  if (!sourceFolder || !destinationFolder || sourceFolder === destinationFolder) {
    throw new AppError("invalid_argument", "Source and destination folders must be different");
  }
  if (destinationFolder.startsWith(`${sourceFolder}/`)) {
    throw new AppError("invalid_argument", "Cannot move a folder inside itself");
  }

  const sourceAbsolute = resolveVaultPath(vaultRoot, sourceFolder);
  const destinationAbsolute = resolveVaultPath(vaultRoot, destinationFolder);
  if (!(await fileExists(sourceAbsolute))) {
    throw new AppError("not_found", `Folder not found: ${sourceFolder}`);
  }
  if (await fileExists(destinationAbsolute)) {
    throw new AppError("conflict", `Destination folder already exists: ${destinationFolder}`);
  }

  const notes = await listNotes(context, {
    directory: sourceFolder,
    recursive: true,
    vaultPath: vaultRoot,
  });
  await ensureDir(path.dirname(destinationAbsolute));
  await fs.rename(sourceAbsolute, destinationAbsolute);
  let linksUpdated = 0;
  if (args.updateLinks !== false) {
    for (const item of notes.items) {
      const relative = item.path.slice(sourceFolder.length).replace(/^\/+/, "");
      linksUpdated += await updateLinksAcrossVault(
        vaultRoot,
        item.path,
        [destinationFolder, relative].filter(Boolean).join("/"),
      );
    }
  }

  return {
    changed: true,
    target: destinationFolder,
    summary: `Moved folder ${sourceFolder} to ${destinationFolder}`,
    source: sourceFolder,
    destination: destinationFolder,
    notesMoved: notes.total,
    linksUpdated,
  };
}

export type NoteInfoArgs = {
  path: string;
  vaultPath?: string;
};

export async function getNoteInfo(context: DomainContext, args: NoteInfoArgs) {
  const note = await readNote(context, args);
  const linkCount =
    Array.from(note.content.matchAll(WIKILINK_PATTERN)).length +
    Array.from(note.content.matchAll(MARKDOWN_LINK_PATTERN)).length;
  return {
    path: note.path,
    exists: true,
    metadata: note.metadata,
    stats: {
      sizeBytes: Buffer.byteLength(note.content, "utf8"),
      wordCount: note.content.split(/\s+/).filter(Boolean).length,
      linkCount,
      tagCount: Array.from(note.content.matchAll(TAG_PATTERN)).length,
    },
  };
}
