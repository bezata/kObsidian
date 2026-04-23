import path from "node:path";
import { readUtf8, walkMarkdownFiles } from "../lib/filesystem.js";
import {
  EMBED_PATTERN,
  LINK_BLOCK_PATTERN,
  LINK_SECTION_PATTERN,
  MARKDOWN_LINK_PATTERN,
  WIKILINK_PATTERN,
} from "../lib/patterns.js";
import { type DomainContext, requireVaultPath } from "./context.js";

type ExtractedLink = {
  path: string;
  displayText: string;
  type: "wiki" | "markdown";
  header?: string;
};

export function extractLinksFromContent(content: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];

  for (const match of content.matchAll(WIKILINK_PATTERN)) {
    const rawPath = (match[1] ?? "").trim();
    const alias = match[2]?.trim();
    if (!rawPath) {
      continue;
    }
    const [notePath = rawPath, header] = rawPath.split("#", 2);
    links.push({
      path: notePath.endsWith(".md") ? notePath : `${notePath}.md`,
      displayText: alias || notePath,
      type: "wiki",
      ...(header ? { header } : {}),
    });
  }

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const href = (match[2] ?? "").trim();
    if (!href || /^(https?|ftp|mailto):/.test(href) || href.startsWith("#")) {
      continue;
    }
    links.push({
      path: href,
      displayText: (match[1] ?? "").trim(),
      type: "markdown",
    });
  }

  return links;
}

function getLinkContext(content: string, start: number, end: number, contextLength = 100): string {
  const sliceStart = Math.max(0, start - Math.floor(contextLength / 2));
  const sliceEnd = Math.min(content.length, end + Math.floor(contextLength / 2));
  return `${sliceStart > 0 ? "..." : ""}${content.slice(sliceStart, sliceEnd).trim()}${sliceEnd < content.length ? "..." : ""}`;
}

function normalizeLinkTarget(linkPath: string): string {
  const cleaned = linkPath.replaceAll("\\", "/").replace(/^\.\//, "");
  return cleaned.endsWith(".md") ? cleaned : `${cleaned}.md`;
}

async function collectNoteIndex(vaultRoot: string) {
  const byRelative = new Map<string, string>();
  const byStem = new Map<string, string>();
  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const relativePath = path.relative(vaultRoot, absolutePath).replaceAll("\\", "/");
    byRelative.set(relativePath, relativePath);
    byStem.set(path.basename(relativePath, path.extname(relativePath)), relativePath);
  }
  return { byRelative, byStem };
}

function resolveIndexedLink(
  linkPath: string,
  index: Awaited<ReturnType<typeof collectNoteIndex>>,
): string | undefined {
  const normalized = normalizeLinkTarget(linkPath);
  return (
    index.byRelative.get(normalized) ??
    index.byRelative.get(normalized.replace(/\.md$/, "")) ??
    index.byStem.get(path.basename(normalized, ".md"))
  );
}

export async function getBacklinks(
  context: DomainContext,
  args: { path: string; includeContext?: boolean; contextLength?: number; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const index = await collectNoteIndex(vaultRoot);
  const target = resolveIndexedLink(args.path, index) ?? normalizeLinkTarget(args.path);
  const backlinks: Array<{
    sourcePath: string;
    linkText: string;
    linkType: string;
    context?: string;
  }> = [];
  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const relativePath = path.relative(vaultRoot, absolutePath).replaceAll("\\", "/");
    if (relativePath === target) {
      continue;
    }
    const content = await readUtf8(absolutePath);
    for (const match of content.matchAll(WIKILINK_PATTERN)) {
      const linkedPath = match[1]?.split("#", 1)[0] ?? "";
      const resolved = resolveIndexedLink(linkedPath, index);
      if (resolved !== target) {
        continue;
      }
      backlinks.push({
        sourcePath: relativePath,
        linkText: match[2] ?? linkedPath,
        linkType: "wiki",
        ...(args.includeContext !== false
          ? {
              context: getLinkContext(
                content,
                match.index ?? 0,
                (match.index ?? 0) + match[0].length,
                args.contextLength ?? 100,
              ),
            }
          : {}),
      });
    }
    for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
      const href = match[2] ?? "";
      const resolved = resolveIndexedLink(href, index);
      if (resolved !== target) {
        continue;
      }
      backlinks.push({
        sourcePath: relativePath,
        linkText: match[1] ?? href,
        linkType: "markdown",
        ...(args.includeContext !== false
          ? {
              context: getLinkContext(
                content,
                match.index ?? 0,
                (match.index ?? 0) + match[0].length,
                args.contextLength ?? 100,
              ),
            }
          : {}),
      });
    }
  }
  backlinks.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  return { targetNote: target, items: backlinks, total: backlinks.length };
}

export async function getOutgoingLinks(
  context: DomainContext,
  args: { path: string; checkValidity?: boolean; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const index = await collectNoteIndex(vaultRoot);
  const absolutePath = path.join(vaultRoot, args.path);
  const content = await readUtf8(absolutePath);
  const items = extractLinksFromContent(content).map((link) => ({
    ...link,
    ...(args.checkValidity ? { exists: Boolean(resolveIndexedLink(link.path, index)) } : {}),
  }));
  return { sourceNote: args.path, items, total: items.length };
}

export async function findBrokenLinks(
  context: DomainContext,
  args: { directory?: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const index = await collectNoteIndex(vaultRoot);
  const items: Array<{
    sourcePath: string;
    brokenLink: string;
    linkText: string;
    linkType: string;
  }> = [];

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const relativePath = path.relative(vaultRoot, absolutePath).replaceAll("\\", "/");
    if (args.directory && !relativePath.startsWith(args.directory.replaceAll("\\", "/"))) {
      continue;
    }
    const content = await readUtf8(absolutePath);
    for (const link of extractLinksFromContent(content)) {
      if (resolveIndexedLink(link.path, index)) {
        continue;
      }
      items.push({
        sourcePath: relativePath,
        brokenLink: link.path,
        linkText: link.displayText,
        linkType: link.type,
      });
    }
  }

  return {
    directory: args.directory ?? "/",
    items,
    total: items.length,
    affectedNotes: new Set(items.map((item) => item.sourcePath)).size,
  };
}

export function extractAllLinkTypes(content: string) {
  const wikilinks = Array.from(content.matchAll(WIKILINK_PATTERN), (match) => match[1] ?? "").map(
    (target) => target.split("#")[0] ?? target,
  );
  const markdownLinks = Array.from(
    content.matchAll(MARKDOWN_LINK_PATTERN),
    (match) => match[2] ?? "",
  ).filter((href) => href && !/^(https?|ftp|mailto):/.test(href));
  const embeds = Array.from(content.matchAll(EMBED_PATTERN), (match) => match[1] ?? "");
  const sectionLinks = Array.from(content.matchAll(LINK_SECTION_PATTERN), (match) => ({
    note: match[1] ?? "",
    section: match[2] ?? "",
  }));
  const blockLinks = Array.from(content.matchAll(LINK_BLOCK_PATTERN), (match) => ({
    note: match[1] ?? "",
    block: match[2] ?? "",
  }));
  return {
    wikilinks,
    markdownLinks,
    embeds,
    sectionLinks,
    blockLinks,
    allLinks: Array.from(new Set([...wikilinks, ...markdownLinks, ...embeds])),
  };
}

export async function getLinkGraph(context: DomainContext, args: { vaultPath?: string }) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const index = await collectNoteIndex(vaultRoot);
  const graph: Record<
    string,
    {
      outlinks: string[];
      inlinks: string[];
      linkTypes: { wikilinks: number; markdownLinks: number; embeds: number };
    }
  > = {};

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const relativePath = path.relative(vaultRoot, absolutePath).replaceAll("\\", "/");
    const content = await readUtf8(absolutePath);
    const links = extractAllLinkTypes(content);
    graph[relativePath] = {
      outlinks: [],
      inlinks: [],
      linkTypes: {
        wikilinks: links.wikilinks.length,
        markdownLinks: links.markdownLinks.length,
        embeds: links.embeds.length,
      },
    };
  }

  for (const [sourcePath, data] of Object.entries(graph)) {
    const content = await readUtf8(path.join(vaultRoot, sourcePath));
    for (const link of extractAllLinkTypes(content).allLinks) {
      const target = resolveIndexedLink(link, index);
      if (!target) {
        continue;
      }
      if (!data.outlinks.includes(target)) {
        data.outlinks.push(target);
      }
      graph[target] ??= {
        outlinks: [],
        inlinks: [],
        linkTypes: { wikilinks: 0, markdownLinks: 0, embeds: 0 },
      };
      if (!graph[target].inlinks.includes(sourcePath)) {
        graph[target].inlinks.push(sourcePath);
      }
    }
  }

  return { graph, total: Object.keys(graph).length };
}

export async function findOrphanedNotes(context: DomainContext, args: { vaultPath?: string }) {
  const graph = (await getLinkGraph(context, args)).graph;
  const items = Object.entries(graph)
    .filter(([, value]) => value.inlinks.length === 0 && value.outlinks.length === 0)
    .map(([filePath]) => ({ filePath, inlinkCount: 0, outlinkCount: 0 }));
  return { items, total: items.length };
}

export async function findHubNotes(
  context: DomainContext,
  args: { minOutlinks?: number; vaultPath?: string },
) {
  const graph = (await getLinkGraph(context, args)).graph;
  const minOutlinks = args.minOutlinks ?? 5;
  const items = Object.entries(graph)
    .filter(([, value]) => value.outlinks.length >= minOutlinks)
    .map(([filePath, value]) => ({
      filePath,
      outlinkCount: value.outlinks.length,
      inlinkCount: value.inlinks.length,
      outlinks: value.outlinks,
    }))
    .sort(
      (left, right) =>
        right.outlinkCount - left.outlinkCount || left.filePath.localeCompare(right.filePath),
    );
  return { minOutlinks, items, total: items.length };
}

export async function analyzeLinkHealth(context: DomainContext, args: { vaultPath?: string }) {
  const graphResult = await getLinkGraph(context, args);
  const brokenLinks = await findBrokenLinks(context, args);
  const totalNotes = graphResult.total;
  const totalLinks = Object.values(graphResult.graph).reduce(
    (sum, value) => sum + value.outlinks.length,
    0,
  );
  const orphanedNotes = Object.values(graphResult.graph).filter(
    (value) => value.inlinks.length === 0 && value.outlinks.length === 0,
  ).length;
  const notesWithNoInlinks = Object.values(graphResult.graph).filter(
    (value) => value.inlinks.length === 0,
  ).length;
  const notesWithNoOutlinks = Object.values(graphResult.graph).filter(
    (value) => value.outlinks.length === 0,
  ).length;

  return {
    totalNotes,
    totalLinks,
    orphanedNotes,
    notesWithNoInlinks,
    notesWithNoOutlinks,
    brokenLinksCount: brokenLinks.total,
    averageOutlinksPerNote: Number((totalNotes > 0 ? totalLinks / totalNotes : 0).toFixed(2)),
    averageInlinksPerNote: Number(
      (totalNotes > 0
        ? Object.values(graphResult.graph).reduce((sum, value) => sum + value.inlinks.length, 0) /
          totalNotes
        : 0
      ).toFixed(2),
    ),
    linkDensityScore: Number((totalNotes > 0 ? totalLinks / totalNotes : 0).toFixed(2)),
  };
}

export async function getNoteConnections(
  context: DomainContext,
  args: { noteName: string; depth?: number; vaultPath?: string },
) {
  const graph = (await getLinkGraph(context, args)).graph;
  const notePath = Object.keys(graph).find(
    (candidate) =>
      candidate === normalizeLinkTarget(args.noteName) ||
      path.basename(candidate, ".md") === path.basename(args.noteName, ".md"),
  );
  if (!notePath) {
    throw new Error(`Note not found: ${args.noteName}`);
  }
  const depth = args.depth ?? 1;
  const connections: Record<string, { depth: number; inlinks: string[]; outlinks: string[] }> = {};
  const visited = new Set<string>();

  function explore(currentPath: string, currentDepth: number) {
    if (currentDepth > depth || visited.has(currentPath)) {
      return;
    }
    visited.add(currentPath);
    const current = graph[currentPath];
    if (!current) {
      return;
    }
    connections[currentPath] = {
      depth: currentDepth,
      inlinks: current.inlinks,
      outlinks: current.outlinks,
    };
    for (const outlink of current.outlinks) {
      explore(outlink, currentDepth + 1);
    }
  }

  for (const outlink of graph[notePath]?.outlinks ?? []) {
    explore(outlink, 1);
  }

  return {
    note: notePath,
    directInlinks: graph[notePath]?.inlinks ?? [],
    directOutlinks: graph[notePath]?.outlinks ?? [],
    directInlinkCount: graph[notePath]?.inlinks.length ?? 0,
    directOutlinkCount: graph[notePath]?.outlinks.length ?? 0,
    connectionDepth: depth,
    totalConnectionsExplored: Object.keys(connections).length,
    connections,
  };
}
