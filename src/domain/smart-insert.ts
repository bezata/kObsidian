import { AppError } from "../lib/errors.js";
import { readUtf8, writeUtf8 } from "../lib/filesystem.js";
import { parseFrontmatter, stringifyFrontmatter } from "../lib/frontmatter.js";
import { resolveVaultPath } from "../lib/paths.js";
import { type DomainContext, requireVaultPath } from "./context.js";

export function headingPattern(heading: string): RegExp {
  return new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\s*$`);
}

export async function insertAfterHeading(
  context: DomainContext,
  args: { filePath: string; heading: string; content: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const original = await readUtf8(absolutePath);
  const lines = original.split(/\r?\n/);
  const pattern = headingPattern(args.heading);
  const index = lines.findIndex((line) => pattern.test(line));
  if (index < 0) {
    throw new AppError(
      "not_found",
      `Heading '${args.heading}' not found in ${args.filePath}. Pass the exact heading text (without leading #s), or use mode:'append'.`,
    );
  }
  lines.splice(index + 1, 0, args.content);
  await writeUtf8(absolutePath, `${lines.join("\n")}${original.endsWith("\n") ? "\n" : ""}`);
  return {
    changed: true,
    target: args.filePath,
    summary: `Inserted content after heading ${args.heading}`,
  };
}

export async function insertAfterBlock(
  context: DomainContext,
  args: { filePath: string; blockId: string; content: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const original = await readUtf8(absolutePath);
  const blockId = args.blockId.startsWith("^") ? args.blockId : `^${args.blockId}`;
  const lines = original.split(/\r?\n/);
  const index = lines.findIndex((line) =>
    new RegExp(`\\s${escapeRegExp(blockId)}\\s*$`).test(line),
  );
  if (index < 0) {
    throw new AppError("not_found", `Block '${blockId}' not found in ${args.filePath}.`);
  }
  lines.splice(index + 1, 0, args.content);
  await writeUtf8(absolutePath, `${lines.join("\n")}${original.endsWith("\n") ? "\n" : ""}`);
  return {
    changed: true,
    target: args.filePath,
    summary: `Inserted content after block ${blockId}`,
  };
}

export async function updateFrontmatterField(
  context: DomainContext,
  args: { filePath: string; field: string; value: unknown; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const original = await readUtf8(absolutePath);
  const parsed = parseFrontmatter(original);
  parsed.data[args.field] = args.value;
  await writeUtf8(absolutePath, stringifyFrontmatter(parsed));
  return {
    changed: true,
    target: args.filePath,
    summary: `Updated frontmatter field ${args.field}`,
  };
}

export async function appendToNote(
  context: DomainContext,
  args: { filePath: string; content: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const original = await readUtf8(absolutePath);
  await writeUtf8(absolutePath, `${original}${args.content}`);
  return { changed: true, target: args.filePath, summary: `Appended content to ${args.filePath}` };
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
