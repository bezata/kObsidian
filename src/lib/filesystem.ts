import { promises as fs } from "node:fs";
import path from "node:path";
import { AppError } from "./errors.js";
import { isMarkdownPath, toVaultRelativePath } from "./paths.js";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readUtf8(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new AppError("not_found", `Unable to read file: ${filePath}`, { cause: error });
  }
}

export async function writeUtf8(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

export async function walkMarkdownFiles(vaultRoot: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && isMarkdownPath(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  await walk(path.resolve(vaultRoot));
  files.sort((left, right) =>
    toVaultRelativePath(vaultRoot, left).localeCompare(toVaultRelativePath(vaultRoot, right)),
  );
  return files;
}
