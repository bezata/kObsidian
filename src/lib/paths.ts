import path from "node:path";
import { AppError } from "./errors.js";

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

export function sanitizeNotePath(input: string): string {
  const trimmed = input.trim().replace(/^[/\\]+|[/\\]+$/g, "");
  if (!trimmed) {
    throw new AppError("invalid_argument", "Path cannot be empty");
  }

  const normalized = trimmed.replaceAll("\\", "/");
  if (!MARKDOWN_EXTENSIONS.has(path.extname(normalized).toLowerCase())) {
    return `${normalized}.md`;
  }
  return normalized;
}

export function assertVaultRelativePath(input: string): string {
  const normalized = input.trim().replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("..") ||
    normalized.length > 255
  ) {
    throw new AppError("invalid_argument", `Invalid vault-relative path: ${input}`);
  }
  return normalized;
}

export function resolveVaultPath(vaultRoot: string, vaultRelativePath: string): string {
  const absoluteVaultRoot = path.resolve(vaultRoot);
  const safeRelative = assertVaultRelativePath(vaultRelativePath);
  const resolved = path.resolve(absoluteVaultRoot, safeRelative);
  const relative = path.relative(absoluteVaultRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new AppError("invalid_argument", `Path escapes vault root: ${vaultRelativePath}`);
  }

  return resolved;
}

export function toVaultRelativePath(vaultRoot: string, absolutePath: string): string {
  return path.relative(path.resolve(vaultRoot), absolutePath).replaceAll("\\", "/");
}

export function isMarkdownPath(filePath: string): boolean {
  return MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}
