import path from "node:path";
import { fileExists, readUtf8, walkMarkdownFiles } from "../../lib/filesystem.js";
import { getFrontmatterTags, parseFrontmatter } from "../../lib/frontmatter.js";
import { toVaultRelativePath } from "../../lib/paths.js";
import type { WikiLintArgs } from "../../schema/wiki.js";
import type { DomainContext } from "../context.js";
import {
  type NoteIndex,
  collectNoteIndex,
  extractLinksFromContent,
  normalizeLinkTarget,
  resolveIndexedLink,
} from "../links.js";
import { type WikiPaths, classifyWikiPath, isInsideWiki, resolveWikiPaths } from "./paths.js";

type OrphanFinding = { path: string; reason: string };
type BrokenLinkFinding = { sourcePath: string; brokenLink: string; displayText: string };
type StaleFinding = { path: string; kind: string; ageDays: number; dateField: string };
type MissingPageFinding = {
  sourcePath: string;
  target: string;
  suggestedKind: "source" | "concept" | "entity";
};
type TagSingletonFinding = { tag: string; page: string };
type IndexMismatch = {
  missingFromIndex: string[];
  staleEntries: string[];
};

export type WikiLintFindings = {
  orphans: OrphanFinding[];
  brokenLinks: BrokenLinkFinding[];
  stale: StaleFinding[];
  missingPages: MissingPageFinding[];
  tagSingletons: TagSingletonFinding[];
  indexMismatch: IndexMismatch;
};

type WikiFile = {
  absolute: string;
  relative: string;
  classification: ReturnType<typeof classifyWikiPath>;
  content: string;
  frontmatter: Record<string, unknown>;
  body: string;
};

function coerceDateString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function ageInDays(dateIso: string): number {
  const parsed = Date.parse(dateIso);
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - parsed) / 86_400_000);
}

async function loadWikiFiles(paths: WikiPaths): Promise<WikiFile[]> {
  if (!(await fileExists(paths.rootAbsolute))) return [];
  const absolutes = await walkMarkdownFiles(paths.rootAbsolute);
  const files = await Promise.all(
    absolutes.map(async (absolute): Promise<WikiFile | null> => {
      const relative = toVaultRelativePath(paths.vaultRoot, absolute);
      if (!isInsideWiki(paths, relative)) return null;
      const classification = classifyWikiPath(paths, relative);
      if (classification === "schema") return null;
      const content = await readUtf8(absolute);
      const parsed = parseFrontmatter(content);
      return {
        absolute,
        relative,
        classification,
        content,
        frontmatter: parsed.data,
        body: parsed.content,
      };
    }),
  );
  return files.filter((file): file is WikiFile => file !== null);
}

async function readIndexLinkTargets(paths: WikiPaths): Promise<Set<string>> {
  const targets = new Set<string>();
  if (!(await fileExists(paths.indexAbsolute))) return targets;
  const content = await readUtf8(paths.indexAbsolute);
  for (const link of extractLinksFromContent(content)) {
    if (link.type !== "wiki") continue;
    targets.add(normalizeLinkTarget(link.path));
  }
  return targets;
}

function classifyMissingTarget(
  paths: WikiPaths,
  target: string,
): MissingPageFinding["suggestedKind"] {
  if (target.startsWith(`${paths.conceptsRelative}/`)) return "concept";
  if (target.startsWith(`${paths.entitiesRelative}/`)) return "entity";
  if (target.startsWith(`${paths.sourcesRelative}/`)) return "source";
  return "concept";
}

export async function lintWiki(context: DomainContext, args: WikiLintArgs) {
  const paths = resolveWikiPaths(context, args);
  const staleDays = args.staleDays ?? context.env.KOBSIDIAN_WIKI_STALE_DAYS;
  const noteIndex: NoteIndex = await collectNoteIndex(paths.vaultRoot);

  const wikiFiles = await loadWikiFiles(paths);
  const wikiPages = wikiFiles.filter(
    (file) =>
      file.classification === "source" ||
      file.classification === "concept" ||
      file.classification === "entity",
  );

  const pagePaths = new Set(wikiPages.map((file) => file.relative));
  const inlinks = new Map<string, Set<string>>();
  const outlinks = new Map<string, Set<string>>();
  for (const page of wikiPages) {
    inlinks.set(page.relative, new Set());
    outlinks.set(page.relative, new Set());
  }

  const brokenLinks: BrokenLinkFinding[] = [];
  const missingPages: MissingPageFinding[] = [];

  for (const file of wikiFiles) {
    const sourceOutlinks = outlinks.get(file.relative);
    for (const link of extractLinksFromContent(file.content)) {
      if (link.type !== "wiki") continue;
      const normalized = normalizeLinkTarget(link.path);
      const resolved = resolveIndexedLink(normalized, noteIndex);
      if (!resolved) {
        brokenLinks.push({
          sourcePath: file.relative,
          brokenLink: normalized,
          displayText: link.displayText,
        });
        if (isInsideWiki(paths, normalized)) {
          missingPages.push({
            sourcePath: file.relative,
            target: normalized,
            suggestedKind: classifyMissingTarget(paths, normalized),
          });
        }
        continue;
      }
      if (pagePaths.has(resolved) && sourceOutlinks) {
        sourceOutlinks.add(resolved);
        inlinks.get(resolved)?.add(file.relative);
      }
    }
  }

  const orphans: OrphanFinding[] = [];
  for (const page of wikiPages) {
    const inCount = inlinks.get(page.relative)?.size ?? 0;
    const outCount = outlinks.get(page.relative)?.size ?? 0;
    if (inCount === 0 && outCount === 0) {
      orphans.push({ path: page.relative, reason: "No inbound or outbound wiki links" });
    }
  }

  const stale: StaleFinding[] = [];
  for (const page of wikiPages) {
    const dateField = page.classification === "source" ? "ingested_at" : "updated";
    const dateValue = coerceDateString(page.frontmatter[dateField]);
    if (!dateValue) continue;
    const age = ageInDays(dateValue);
    if (age > staleDays) {
      stale.push({ path: page.relative, kind: page.classification, ageDays: age, dateField });
    }
  }

  const tagPages = new Map<string, string[]>();
  for (const page of wikiPages) {
    for (const tag of getFrontmatterTags(page.frontmatter)) {
      const list = tagPages.get(tag) ?? [];
      list.push(page.relative);
      tagPages.set(tag, list);
    }
  }
  const tagSingletons: TagSingletonFinding[] = [];
  for (const [tag, pagesWithTag] of tagPages.entries()) {
    if (pagesWithTag.length === 1 && pagesWithTag[0]) {
      tagSingletons.push({ tag, page: pagesWithTag[0] });
    }
  }
  tagSingletons.sort((left, right) => left.tag.localeCompare(right.tag));

  const indexTargets = await readIndexLinkTargets(paths);
  const missingFromIndex: string[] = [];
  for (const page of wikiPages) {
    const normalized = normalizeLinkTarget(page.relative);
    const stem = path.basename(page.relative, ".md");
    const inIndex =
      indexTargets.has(normalized) ||
      indexTargets.has(stem) ||
      indexTargets.has(page.relative) ||
      indexTargets.has(`${page.relative.replace(/\.md$/, "")}`);
    if (!inIndex) missingFromIndex.push(page.relative);
  }
  const staleEntries: string[] = [];
  for (const target of indexTargets) {
    if (!resolveIndexedLink(target, noteIndex)) staleEntries.push(target);
  }

  const findings: WikiLintFindings = {
    orphans,
    brokenLinks,
    stale,
    missingPages,
    tagSingletons,
    indexMismatch: { missingFromIndex, staleEntries },
  };

  const totals = {
    orphans: orphans.length,
    brokenLinks: brokenLinks.length,
    stale: stale.length,
    missingPages: missingPages.length,
    tagSingletons: tagSingletons.length,
    indexMissingFromIndex: missingFromIndex.length,
    indexStaleEntries: staleEntries.length,
    all:
      orphans.length +
      brokenLinks.length +
      stale.length +
      missingPages.length +
      tagSingletons.length +
      missingFromIndex.length +
      staleEntries.length,
  };

  const summary =
    totals.all === 0
      ? `Wiki clean (${wikiPages.length} pages scanned)`
      : `Wiki lint: ${totals.all} findings across ${wikiPages.length} pages`;

  return {
    changed: false,
    target: paths.rootRelative,
    summary,
    pagesScanned: wikiPages.length,
    staleDays,
    totals,
    findings,
  };
}
