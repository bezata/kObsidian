import path from "node:path";
import { readUtf8, walkMarkdownFiles } from "../../lib/filesystem.js";
import { getFrontmatterTags, parseFrontmatter } from "../../lib/frontmatter.js";
import { toVaultRelativePath } from "../../lib/paths.js";
import type { WikiQueryArgs } from "../../schema/wiki.js";
import type { DomainContext } from "../context.js";
import { type WikiPaths, classifyWikiPath, isInsideWiki, resolveWikiPaths } from "./paths.js";

export type WikiQueryMatch = {
  path: string;
  title: string;
  summary: string;
  kind: "source" | "concept" | "entity" | "other";
  score: number;
  matchedOn: string[];
  excerpt?: string;
};

const FILENAME_WEIGHT = 5;
const ALIAS_WEIGHT = 4;
const TITLE_WEIGHT = 3;
const TAG_WEIGHT = 3;
const SUMMARY_WEIGHT = 2;
const BODY_WEIGHT = 1;
const EXCERPT_RADIUS = 60;

function stringArrayFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : ""))
      .filter((v) => v.trim().length > 0)
      .map((v) => v.trim());
  }
  return [];
}

function scoreAgainst(
  lowerQuery: string,
  candidate: string | undefined,
  weight: number,
): { matched: boolean; score: number } {
  if (!candidate) return { matched: false, score: 0 };
  if (candidate.toLowerCase().includes(lowerQuery)) {
    return { matched: true, score: weight };
  }
  return { matched: false, score: 0 };
}

function buildExcerpt(content: string, query: string): string | undefined {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return undefined;
  const start = Math.max(0, idx - EXCERPT_RADIUS);
  const end = Math.min(content.length, idx + query.length + EXCERPT_RADIUS);
  return `${start > 0 ? "…" : ""}${content.slice(start, end).trim()}${end < content.length ? "…" : ""}`;
}

async function scorePage(
  paths: WikiPaths,
  absolutePath: string,
  relative: string,
  lowerQuery: string,
): Promise<WikiQueryMatch | null> {
  const raw = await readUtf8(absolutePath);
  const parsed = parseFrontmatter(raw);
  const stem = path.basename(relative, path.extname(relative));
  const frontmatterData = parsed.data;
  const aliases = stringArrayFromUnknown(frontmatterData.aliases);
  const tags = getFrontmatterTags(frontmatterData);
  const title =
    typeof frontmatterData.title === "string" && frontmatterData.title.trim().length > 0
      ? frontmatterData.title.trim()
      : stem;
  const summary = typeof frontmatterData.summary === "string" ? frontmatterData.summary.trim() : "";

  const matchedOn: string[] = [];
  let score = 0;

  const stemScore = scoreAgainst(lowerQuery, stem, FILENAME_WEIGHT);
  if (stemScore.matched) {
    matchedOn.push("filename");
    score += stemScore.score;
  }

  const titleScore = scoreAgainst(lowerQuery, title, TITLE_WEIGHT);
  if (titleScore.matched && !matchedOn.includes("filename")) {
    matchedOn.push("title");
    score += titleScore.score;
  }

  for (const alias of aliases) {
    if (alias.toLowerCase().includes(lowerQuery)) {
      if (!matchedOn.includes("alias")) matchedOn.push("alias");
      score += ALIAS_WEIGHT;
      break;
    }
  }

  for (const tag of tags) {
    if (tag.toLowerCase().includes(lowerQuery)) {
      if (!matchedOn.includes("tag")) matchedOn.push("tag");
      score += TAG_WEIGHT;
      break;
    }
  }

  const summaryScore = scoreAgainst(lowerQuery, summary, SUMMARY_WEIGHT);
  if (summaryScore.matched) {
    matchedOn.push("summary");
    score += summaryScore.score;
  }

  const bodyScore = scoreAgainst(lowerQuery, parsed.content, BODY_WEIGHT);
  if (bodyScore.matched) {
    matchedOn.push("body");
    score += bodyScore.score;
  }

  if (score === 0) return null;

  const kindRaw = classifyWikiPath(paths, relative);
  const kind: WikiQueryMatch["kind"] =
    kindRaw === "source" || kindRaw === "concept" || kindRaw === "entity" ? kindRaw : "other";

  const excerpt = buildExcerpt(parsed.content, lowerQuery);

  return {
    path: relative,
    title,
    summary,
    kind,
    score,
    matchedOn,
    ...(excerpt ? { excerpt } : {}),
  };
}

export async function queryWiki(context: DomainContext, args: WikiQueryArgs) {
  const paths = resolveWikiPaths(context, args);
  const lowerQuery = args.topic.trim().toLowerCase();
  if (!lowerQuery) {
    return { topic: args.topic, topPages: [], total: 0 };
  }

  const candidates: Array<{ absolute: string; relative: string }> = [];
  for (const absolutePath of await walkMarkdownFiles(paths.rootAbsolute)) {
    const relative = toVaultRelativePath(paths.vaultRoot, absolutePath);
    if (!isInsideWiki(paths, relative)) continue;
    const classification = classifyWikiPath(paths, relative);
    if (classification === "index" || classification === "log" || classification === "schema") {
      continue;
    }
    candidates.push({ absolute: absolutePath, relative });
  }
  const scored = await Promise.all(
    candidates.map((candidate) =>
      scorePage(paths, candidate.absolute, candidate.relative, lowerQuery),
    ),
  );
  const matches: WikiQueryMatch[] = scored.filter(
    (match): match is WikiQueryMatch => match !== null,
  );

  matches.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));
  const limit = args.limit ?? 10;
  return {
    topic: args.topic,
    limit,
    total: matches.length,
    topPages: matches.slice(0, limit),
  };
}
