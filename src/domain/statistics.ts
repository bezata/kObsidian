import { promises as fs } from "node:fs";
import { readUtf8, walkMarkdownFiles } from "../lib/filesystem.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import { resolveVaultPath } from "../lib/paths.js";
import {
  HEADING_PATTERN,
  MARKDOWN_LINK_PATTERN,
  TAG_PATTERN,
  WIKILINK_PATTERN,
} from "../lib/patterns.js";
import { type DomainContext, requireVaultPath } from "./context.js";
import { extractAllTags } from "./tags.js";

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`([^`]+)`/g;

export async function getNoteStatistics(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const raw = await readUtf8(absolutePath);
  const parsed = parseFrontmatter(raw);
  const content = parsed.content;
  const contentWithoutCode = content.replace(CODE_BLOCK_PATTERN, "");
  const headings = Array.from(content.matchAll(HEADING_PATTERN), (match) => ({
    level: match[1]?.length ?? 0,
    text: match[2]?.trim() ?? "",
  }));
  const tags = extractAllTags(raw);
  const stats = await fs.stat(absolutePath);
  const wikilinks = Array.from(content.matchAll(WIKILINK_PATTERN), (match) => match[1] ?? "");
  const markdownLinks = Array.from(content.matchAll(MARKDOWN_LINK_PATTERN), (match) => ({
    text: match[1] ?? "",
    href: match[2] ?? "",
  }));

  return {
    filePath: args.filePath,
    wordCount: contentWithoutCode.split(/\s+/).filter(Boolean).length,
    characterCount: raw.length,
    characterCountNoSpaces: raw.replace(/[ \t]/g, "").length,
    lineCount: raw.split(/\r?\n/).length,
    links: {
      wikilinkCount: wikilinks.length,
      wikilinks,
      markdownLinkCount: markdownLinks.length,
      totalLinks: wikilinks.length + markdownLinks.length,
    },
    tags: {
      count: tags.allTags.length,
      uniqueTags: tags.allTags,
      allTags: tags.allTags,
    },
    headings: {
      count: headings.length,
      byLevel: headings.reduce<Record<string, string[]>>((accumulator, heading) => {
        const key = String(heading.level);
        accumulator[key] ??= [];
        accumulator[key].push(heading.text);
        return accumulator;
      }, {}),
      structure: headings.map((heading) => [heading.level, heading.text]),
    },
    code: {
      codeBlocks: Array.from(content.matchAll(CODE_BLOCK_PATTERN)).length,
      inlineCode: Array.from(contentWithoutCode.matchAll(INLINE_CODE_PATTERN)).length,
    },
    file: {
      sizeBytes: stats.size,
      sizeKb: Number((stats.size / 1024).toFixed(2)),
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
    },
  };
}

export async function getVaultStatistics(context: DomainContext, args: { vaultPath?: string }) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  let totalNotes = 0;
  let totalWords = 0;
  let totalLinks = 0;
  const tags = new Set<string>();

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const relativePath = absolutePath.slice(vaultRoot.length + 1).replaceAll("\\", "/");
    const noteStats = await getNoteStatistics(context, {
      filePath: relativePath,
      vaultPath: vaultRoot,
    });
    totalNotes += 1;
    totalWords += noteStats.wordCount;
    totalLinks += noteStats.links.totalLinks;
    for (const tag of noteStats.tags.uniqueTags) {
      tags.add(tag);
    }
  }

  return {
    totalNotes,
    totalWords,
    totalLinks,
    uniqueTags: tags.size,
    allTags: [...tags].sort((left, right) => left.localeCompare(right)),
    avgWordsPerNote: Number((totalNotes > 0 ? totalWords / totalNotes : 0).toFixed(2)),
  };
}
