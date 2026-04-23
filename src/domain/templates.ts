import { promises as fs } from "node:fs";
import path from "node:path";
import { AppError } from "../lib/errors.js";
import { ensureDir, fileExists, readUtf8, writeUtf8 } from "../lib/filesystem.js";
import { resolveVaultPath, toVaultRelativePath } from "../lib/paths.js";
import { type DomainContext, requireVaultPath } from "./context.js";

export function expandTemplateVariables(
  templateContent: string,
  variables: Record<string, string> = {},
  filename?: string,
) {
  const now = new Date();
  const builtIns: Record<string, string> = {
    date: now.toISOString().slice(0, 10),
    time: now.toISOString().slice(11, 19),
    datetime: now.toISOString().replace("T", " ").slice(0, 19),
    year: String(now.getUTCFullYear()),
    month: String(now.getUTCMonth() + 1).padStart(2, "0"),
    day: String(now.getUTCDate()).padStart(2, "0"),
  };

  if (filename) {
    builtIns.title = path.basename(filename, path.extname(filename));
  }

  const merged = { ...builtIns, ...variables };
  return templateContent.replace(
    /\{\{([^}]+)\}\}/g,
    (_, name: string) => merged[name.trim()] ?? "",
  );
}

export async function expandTemplate(
  context: DomainContext,
  args: {
    templatePath: string;
    variables?: Record<string, string>;
    filename?: string;
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absoluteTemplatePath = resolveVaultPath(vaultRoot, args.templatePath);
  const raw = await readUtf8(absoluteTemplatePath);
  const expandedContent = expandTemplateVariables(raw, args.variables, args.filename);
  return {
    templatePath: args.templatePath,
    expandedContent,
    variablesUsed: Object.keys(args.variables ?? {}),
  };
}

export async function createNoteFromTemplate(
  context: DomainContext,
  args: {
    templatePath: string;
    targetPath: string;
    variables?: Record<string, string>;
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absoluteTemplatePath = resolveVaultPath(vaultRoot, args.templatePath);
  const absoluteTargetPath = resolveVaultPath(vaultRoot, args.targetPath);
  if (await fileExists(absoluteTargetPath)) {
    throw new AppError("conflict", `Target already exists: ${args.targetPath}`);
  }
  const raw = await readUtf8(absoluteTemplatePath);
  const createdContent = expandTemplateVariables(raw, args.variables, args.targetPath);
  await ensureDir(path.dirname(absoluteTargetPath));
  await writeUtf8(absoluteTargetPath, createdContent);
  return {
    changed: true,
    target: args.targetPath,
    summary: `Created ${args.targetPath} from template ${args.templatePath}`,
    createdContent,
  };
}

export async function listTemplates(
  context: DomainContext,
  args: { templateFolder?: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const folder = args.templateFolder ?? "Templates";
  const absoluteFolder = resolveVaultPath(vaultRoot, folder);
  if (!(await fileExists(absoluteFolder))) {
    throw new AppError("not_found", `Template folder not found: ${folder}`);
  }

  const templates: Array<{
    name: string;
    path: string;
    sizeBytes: number;
    modified: string;
    firstLine: string;
  }> = [];

  async function walk(current: string): Promise<void> {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }
      const content = await readUtf8(fullPath);
      const stats = await fs.stat(fullPath);
      templates.push({
        name: entry.name,
        path: toVaultRelativePath(vaultRoot, fullPath),
        sizeBytes: stats.size,
        modified: stats.mtime.toISOString(),
        firstLine: content.split(/\r?\n/)[0] ?? "",
      });
    }
  }
  await walk(absoluteFolder);

  templates.sort((left, right) => left.path.localeCompare(right.path));
  return {
    templateFolder: folder,
    items: templates,
    total: templates.length,
  };
}
