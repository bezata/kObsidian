import { promises as fs } from "node:fs";
import { getFrontmatterTags, parseFrontmatter } from "../lib/frontmatter.js";
import { TAG_PATTERN } from "../lib/patterns.js";

export type NoteMetadata = {
  created?: string;
  modified?: string;
  tags: string[];
  aliases: string[];
  frontmatter: Record<string, unknown>;
};

export async function readNoteMetadata(filePath: string, content: string): Promise<NoteMetadata> {
  const parsed = parseFrontmatter(content);
  const stats = await fs.stat(filePath);
  const aliases = extractAliases(parsed.data);
  const tags = Array.from(
    new Set([...getFrontmatterTags(parsed.data), ...extractInlineTags(parsed.content)]),
  );

  return {
    created: stats.birthtime?.toISOString(),
    modified: stats.mtime.toISOString(),
    tags,
    aliases,
    frontmatter: parsed.data,
  };
}

export function extractAliases(frontmatter: Record<string, unknown>): string[] {
  const aliases = frontmatter.aliases ?? frontmatter.alias;
  if (Array.isArray(aliases)) {
    return aliases.filter((value): value is string => typeof value === "string");
  }
  if (typeof aliases === "string") {
    return [aliases];
  }
  return [];
}

export function extractInlineTags(content: string): string[] {
  return Array.from(content.matchAll(TAG_PATTERN), (match) => match[1]).filter(
    (tag): tag is string => typeof tag === "string" && tag.length > 0,
  );
}
