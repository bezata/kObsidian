import { fileExists, readUtf8, writeUtf8 } from "../../lib/filesystem.js";
import { parseFrontmatter, stringifyFrontmatter } from "../../lib/frontmatter.js";
import { resolveVaultPath } from "../../lib/paths.js";
import type { WikiSummaryMergeArgs } from "../../schema/wiki.js";
import type { DomainContext } from "../context.js";
import { escapeRegExp } from "../smart-insert.js";
import { initWiki } from "./init.js";
import { resolveWikiPaths, todayIso } from "./paths.js";
import { conceptBodySkeleton, entityBodySkeleton, renderWithFrontmatter } from "./schema.js";

const DEFAULT_HEADING: Record<"concept" | "entity", string> = {
  concept: "Discussion",
  entity: "Notable Facts",
};

function formatNewSection(
  body: string,
  args: { citationSource?: string; citationQuote?: string },
): string {
  const parts: string[] = ["", body.trim()];
  if (args.citationQuote?.trim()) {
    parts.push("", `> ${args.citationQuote.trim()}`);
  }
  if (args.citationSource) {
    parts.push("", `— [[${args.citationSource}]]`);
  }
  return parts.join("\n");
}

function insertAfterHeadingInContent(content: string, heading: string, block: string): string {
  const lines = content.split(/\r?\n/);
  const pattern = new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\s*$`);
  const idx = lines.findIndex((line) => pattern.test(line));
  if (idx < 0) {
    return `${content.replace(/\s+$/, "")}\n\n## ${heading}\n${block}\n`;
  }
  lines.splice(idx + 1, 0, block);
  return lines.join("\n");
}

function buildWikiPageFrontmatter(args: {
  pageType: "concept" | "entity";
  entityKind?: string;
  summary?: string;
  aliases?: string[];
  citationSource?: string;
  updated: string;
}): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: args.pageType,
    aliases: args.aliases ?? [],
    related: [],
    sources: args.citationSource ? [`[[${args.citationSource}]]`] : [],
    updated: args.updated,
    summary: args.summary ?? "Created via wiki.summaryMerge.",
  };
  if (args.pageType === "entity") {
    base.kind = args.entityKind ?? "other";
  }
  return base;
}

export async function mergeSummary(context: DomainContext, args: WikiSummaryMergeArgs) {
  const paths = resolveWikiPaths(context, args);
  if (!(await fileExists(paths.rootAbsolute))) {
    await initWiki(context, { wikiRoot: args.wikiRoot, vaultPath: args.vaultPath });
  }

  const absolute = resolveVaultPath(paths.vaultRoot, args.targetPath);
  const updated = todayIso();
  const pageType = args.pageType ?? "concept";
  const heading = args.heading ?? DEFAULT_HEADING[pageType];
  const block = formatNewSection(args.newSection, {
    citationSource: args.citationSource,
    citationQuote: args.citationQuote,
  });

  const existed = await fileExists(absolute);
  let nextContent: string;

  if (!existed) {
    const frontmatter = buildWikiPageFrontmatter({
      pageType,
      entityKind: args.entityKind,
      summary: args.summary,
      aliases: args.aliases,
      citationSource: args.citationSource,
      updated,
    });
    const skeleton = pageType === "concept" ? conceptBodySkeleton() : entityBodySkeleton();
    const bodyWithSection = insertAfterHeadingInContent(skeleton, heading, block);
    nextContent = renderWithFrontmatter(frontmatter, bodyWithSection);
  } else {
    const raw = await readUtf8(absolute);
    const parsed = parseFrontmatter(raw);
    parsed.data.updated = updated;
    if (args.summary) parsed.data.summary = args.summary;
    if (args.aliases) parsed.data.aliases = args.aliases;
    if (args.citationSource) {
      const existing = Array.isArray(parsed.data.sources)
        ? (parsed.data.sources as unknown[]).filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [];
      const citation = `[[${args.citationSource}]]`;
      if (!existing.includes(citation)) {
        parsed.data.sources = [...existing, citation];
      }
    }
    parsed.content = insertAfterHeadingInContent(parsed.content, heading, block);
    nextContent = stringifyFrontmatter(parsed);
  }

  await writeUtf8(absolute, nextContent);

  return {
    changed: true,
    target: args.targetPath,
    created: !existed,
    summary: existed
      ? `Merged new section into ${args.targetPath} under ${heading}`
      : `Created ${args.targetPath} with initial section under ${heading}`,
    heading,
    updated,
  };
}
