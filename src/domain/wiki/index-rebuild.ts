import path from "node:path";
import { fileExists, readUtf8, walkMarkdownFiles, writeUtf8 } from "../../lib/filesystem.js";
import { toVaultRelativePath } from "../../lib/paths.js";
import type { WikiIndexRebuildArgs } from "../../schema/wiki.js";
import type { DomainContext } from "../context.js";
import { initWiki } from "./init.js";
import { type WikiPaths, resolveWikiPaths } from "./paths.js";
import { readFrontmatter } from "./schema.js";

type IndexEntry = {
  relative: string;
  title: string;
  summary: string;
};

async function walkCategory(vaultRoot: string, directoryAbsolute: string): Promise<string[]> {
  if (!(await fileExists(directoryAbsolute))) return [];
  const absolutes = await walkMarkdownFiles(directoryAbsolute);
  return absolutes.map((absolute) => toVaultRelativePath(vaultRoot, absolute));
}

async function collectEntries(paths: WikiPaths, directoryAbsolute: string): Promise<IndexEntry[]> {
  const relatives = await walkCategory(paths.vaultRoot, directoryAbsolute);
  const entries = await Promise.all(
    relatives.map(async (relative): Promise<IndexEntry> => {
      const raw = await readUtf8(path.join(paths.vaultRoot, relative));
      const { data } = readFrontmatter(raw);
      const title =
        typeof data.title === "string" && data.title.trim().length > 0
          ? data.title.trim()
          : path.basename(relative, path.extname(relative));
      const summary =
        typeof data.summary === "string" && data.summary.trim().length > 0
          ? data.summary.trim()
          : "";
      return { relative, title, summary };
    }),
  );
  entries.sort(
    (left, right) =>
      left.title.localeCompare(right.title) || left.relative.localeCompare(right.relative),
  );
  return entries;
}

function renderSection(
  title: string,
  entries: IndexEntry[],
  emptyPlaceholder: string,
  includeCount: boolean,
): string {
  const heading = includeCount ? `## ${title} (${entries.length})` : `## ${title}`;
  if (entries.length === 0) {
    return `${heading}\n\n${emptyPlaceholder}\n`;
  }
  const lines = entries.map(
    (entry) =>
      `- [[${entry.relative}|${entry.title}]]${entry.summary ? ` — ${entry.summary}` : ""}`,
  );
  return `${heading}\n\n${lines.join("\n")}\n`;
}

export async function rebuildIndex(context: DomainContext, args: WikiIndexRebuildArgs) {
  const paths = resolveWikiPaths(context, args);
  if (!(await fileExists(paths.rootAbsolute))) {
    await initWiki(context, { wikiRoot: args.wikiRoot, vaultPath: args.vaultPath });
  }

  const [sources, concepts, entities] = await Promise.all([
    collectEntries(paths, paths.sourcesAbsolute),
    collectEntries(paths, paths.conceptsAbsolute),
    collectEntries(paths, paths.entitiesAbsolute),
  ]);
  const includeCounts = args.includeCounts ?? false;

  const body = [
    "# Wiki Index",
    "",
    "Auto-generated catalog of wiki pages. Rebuilt with `wiki.indexRebuild`.",
    "",
    renderSection("Sources", sources, "_No sources yet._", includeCounts),
    renderSection("Concepts", concepts, "_No concepts yet._", includeCounts),
    renderSection("Entities", entities, "_No entities yet._", includeCounts),
  ].join("\n");

  await writeUtf8(paths.indexAbsolute, body);

  return {
    changed: true,
    target: paths.indexRelative,
    summary: `Rebuilt ${paths.indexRelative}`,
    counts: {
      sources: sources.length,
      concepts: concepts.length,
      entities: entities.length,
    },
  };
}
