import path from "node:path";
import { AppError } from "../../lib/errors.js";
import { resolveVaultPath } from "../../lib/paths.js";
import { type DomainContext, requireVaultPath } from "../context.js";

export type WikiPaths = {
  vaultRoot: string;
  rootRelative: string;
  rootAbsolute: string;
  sourcesDirName: string;
  conceptsDirName: string;
  entitiesDirName: string;
  indexFileName: string;
  logFileName: string;
  schemaFileName: string;
  sourcesRelative: string;
  conceptsRelative: string;
  entitiesRelative: string;
  indexRelative: string;
  logRelative: string;
  schemaRelative: string;
  sourcesAbsolute: string;
  conceptsAbsolute: string;
  entitiesAbsolute: string;
  indexAbsolute: string;
  logAbsolute: string;
  schemaAbsolute: string;
};

export type ResolveWikiPathsArgs = {
  wikiRoot?: string;
  vaultPath?: string;
};

function sanitizeWikiRoot(raw: string): string {
  const trimmed = raw
    .replaceAll("\\", "/")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    throw new AppError("invalid_argument", "Wiki root cannot be empty");
  }
  if (trimmed.includes("..")) {
    throw new AppError("invalid_argument", "Wiki root must not contain path traversal");
  }
  return trimmed;
}

export function resolveWikiPaths(
  context: DomainContext,
  args: ResolveWikiPathsArgs = {},
): WikiPaths {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const rootRelative = sanitizeWikiRoot(args.wikiRoot ?? context.env.KOBSIDIAN_WIKI_ROOT);
  const rootAbsolute = resolveVaultPath(vaultRoot, rootRelative);

  const sourcesDirName = context.env.KOBSIDIAN_WIKI_SOURCES_DIR;
  const conceptsDirName = context.env.KOBSIDIAN_WIKI_CONCEPTS_DIR;
  const entitiesDirName = context.env.KOBSIDIAN_WIKI_ENTITIES_DIR;
  const indexFileName = context.env.KOBSIDIAN_WIKI_INDEX_FILE;
  const logFileName = context.env.KOBSIDIAN_WIKI_LOG_FILE;
  const schemaFileName = context.env.KOBSIDIAN_WIKI_SCHEMA_FILE;

  const join = (...parts: string[]) => parts.join("/");

  return {
    vaultRoot,
    rootRelative,
    rootAbsolute,
    sourcesDirName,
    conceptsDirName,
    entitiesDirName,
    indexFileName,
    logFileName,
    schemaFileName,
    sourcesRelative: join(rootRelative, sourcesDirName),
    conceptsRelative: join(rootRelative, conceptsDirName),
    entitiesRelative: join(rootRelative, entitiesDirName),
    indexRelative: join(rootRelative, indexFileName),
    logRelative: join(rootRelative, logFileName),
    schemaRelative: join(rootRelative, schemaFileName),
    sourcesAbsolute: path.join(rootAbsolute, sourcesDirName),
    conceptsAbsolute: path.join(rootAbsolute, conceptsDirName),
    entitiesAbsolute: path.join(rootAbsolute, entitiesDirName),
    indexAbsolute: path.join(rootAbsolute, indexFileName),
    logAbsolute: path.join(rootAbsolute, logFileName),
    schemaAbsolute: path.join(rootAbsolute, schemaFileName),
  };
}

export function isInsideWiki(paths: WikiPaths, vaultRelativePath: string): boolean {
  const normalized = vaultRelativePath.replaceAll("\\", "/");
  return normalized === paths.rootRelative || normalized.startsWith(`${paths.rootRelative}/`);
}

export function classifyWikiPath(
  paths: WikiPaths,
  vaultRelativePath: string,
): "source" | "concept" | "entity" | "index" | "log" | "schema" | "other" {
  const normalized = vaultRelativePath.replaceAll("\\", "/");
  if (normalized === paths.indexRelative) return "index";
  if (normalized === paths.logRelative) return "log";
  if (normalized === paths.schemaRelative) return "schema";
  if (normalized.startsWith(`${paths.sourcesRelative}/`)) return "source";
  if (normalized.startsWith(`${paths.conceptsRelative}/`)) return "concept";
  if (normalized.startsWith(`${paths.entitiesRelative}/`)) return "entity";
  return "other";
}

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    throw new AppError("invalid_argument", "Cannot generate slug from input");
  }
  return normalized.slice(0, 80);
}

export function todayIso(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
