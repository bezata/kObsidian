import { AppError } from "../../lib/errors.js";
import { fileExists, readUtf8, writeUtf8 } from "../../lib/filesystem.js";
import { resolveVaultPath } from "../../lib/paths.js";
import type { ProposedEditOperation, WikiIngestArgs } from "../../schema/wiki.js";
import { sourceFrontmatterSchema } from "../../schema/wiki.js";
import type { DomainContext } from "../context.js";
import { findHeading, resolveWikiHeadings } from "./headings.js";
import { initWiki } from "./init.js";
import { appendLogEntry } from "./log.js";
import { resolveWikiPaths, slugify, todayIso } from "./paths.js";
import {
  conceptBodySkeleton,
  entityBodySkeleton,
  renderWithFrontmatter,
  sourceBodySkeleton,
} from "./schema.js";

export type ProposedEdit = {
  path: string;
  operation: ProposedEditOperation;
  heading?: string;
  suggestedContent: string;
  reason: string;
};

function buildSourceBody(args: {
  summary: string;
  sourcePath?: string;
  content?: string;
}): string {
  const sections: string[] = [`> ${args.summary.trim()}`, ""];
  if (args.sourcePath) {
    sections.push(`Raw source: [[${args.sourcePath}]]`, "");
  }
  sections.push(sourceBodySkeleton());
  if (args.content && args.content.trim().length > 0 && !args.sourcePath) {
    sections.push("", "## Excerpt", "", args.content.trim(), "");
  }
  return sections.join("\n");
}

function buildConceptStub(
  name: string,
  sourcePage: string,
  updated: string,
  heading: string,
): string {
  const frontmatter = {
    type: "concept",
    aliases: [],
    related: [],
    sources: [`[[${sourcePage}]]`],
    updated,
    summary: `${name} — stub created from ${sourcePage}.`,
  };
  const body = `${conceptBodySkeleton(heading)}\n<!-- Seeded from [[${sourcePage}]]; expand this stub when you have real content. -->\n`;
  return renderWithFrontmatter(frontmatter, body);
}

function buildEntityStub(
  name: string,
  sourcePage: string,
  updated: string,
  heading: string,
): string {
  const frontmatter = {
    type: "entity",
    kind: "other",
    aliases: [],
    related: [],
    sources: [`[[${sourcePage}]]`],
    updated,
    summary: `${name} — stub created from ${sourcePage}.`,
  };
  const body = `${entityBodySkeleton(heading)}\n<!-- Seeded from [[${sourcePage}]]; fill in the kind + overview. -->\n`;
  return renderWithFrontmatter(frontmatter, body);
}

function indexEntry(sourcePage: string, title: string, summary: string): string {
  return `- [[${sourcePage}|${title}]] — ${summary}`;
}

async function readIfExists(absolute: string): Promise<string | undefined> {
  if (!(await fileExists(absolute))) return undefined;
  return readUtf8(absolute);
}

// Proposals must be applicable as returned: when the configured heading is
// absent from the target page (localized vault, hand-edited page, index with
// count suffixes), degrade to `append` instead of proposing an anchor that
// `notes.edit` would reject.
function citationProposal(args: {
  path: string;
  content: string;
  heading: string;
  suggestedContent: string;
  subject: string;
}): ProposedEdit {
  const found = findHeading(args.content, args.heading);
  if (found) {
    return {
      path: args.path,
      operation: "insertAfterHeading",
      heading: found,
      suggestedContent: args.suggestedContent,
      reason: `${args.subject} under the '${found}' heading.`,
    };
  }
  return {
    path: args.path,
    operation: "append",
    suggestedContent: args.suggestedContent,
    reason: `${args.subject}. Heading '${args.heading}' was not found in the page, so append at the end instead (configure KOBSIDIAN_WIKI_*_HEADING or pass indexHeading/conceptHeading/entityHeading to target an existing heading).`,
  };
}

async function ensureWikiInitialized(
  context: DomainContext,
  args: Pick<WikiIngestArgs, "wikiRoot" | "vaultPath">,
): Promise<void> {
  const paths = resolveWikiPaths(context, args);
  if (!(await fileExists(paths.rootAbsolute))) {
    await initWiki(context, { wikiRoot: args.wikiRoot, vaultPath: args.vaultPath });
  }
}

export async function ingestSource(context: DomainContext, args: WikiIngestArgs) {
  await ensureWikiInitialized(context, args);
  const paths = resolveWikiPaths(context, args);
  const ingestedAt = args.ingestedAt ?? todayIso();
  const slug = args.slug ? slugify(args.slug) : slugify(args.title);
  const sourceRelative = `${paths.sourcesRelative}/${slug}.md`;
  const sourceAbsolute = resolveVaultPath(paths.vaultRoot, sourceRelative);

  if (await fileExists(sourceAbsolute)) {
    throw new AppError(
      "conflict",
      `Source page already exists: ${sourceRelative}. Pass a distinct slug or delete the existing page.`,
    );
  }

  const summary = (args.summary ?? args.title).trim();
  const frontmatter: Record<string, unknown> = sourceFrontmatterSchema.parse({
    type: "source",
    source_type: args.sourceType,
    title: args.title,
    url: args.url,
    author: args.author,
    ingested_at: ingestedAt,
    tags: args.tags ?? [],
    confidence: args.confidence,
    summary,
  });
  if (args.sourcePath) {
    frontmatter.source_path = args.sourcePath;
  }

  const body = buildSourceBody({
    summary,
    sourcePath: args.sourcePath,
    content: args.content,
  });
  await writeUtf8(sourceAbsolute, renderWithFrontmatter(frontmatter, body));

  const logBody = args.url ? `${summary}\n\nURL: ${args.url}` : summary;
  await appendLogEntry(context, {
    op: "ingest",
    title: args.title,
    date: ingestedAt,
    body: logBody,
    refs: [sourceRelative],
    wikiRoot: args.wikiRoot,
    vaultPath: args.vaultPath,
  });

  const headings = resolveWikiHeadings(context, args);
  const citation = `- From [[${sourceRelative}|${args.title}]]: ${summary}`;
  const proposedEdits: ProposedEdit[] = [];

  proposedEdits.push(
    citationProposal({
      path: paths.indexRelative,
      content: (await readIfExists(paths.indexAbsolute)) ?? "",
      heading: headings.indexSources,
      suggestedContent: indexEntry(sourceRelative, args.title, summary),
      subject: "Add the new source to the index",
    }),
  );

  for (const conceptName of args.relatedConcepts ?? []) {
    const conceptSlug = slugify(conceptName);
    const conceptRelative = `${paths.conceptsRelative}/${conceptSlug}.md`;
    const existing = await readIfExists(resolveVaultPath(paths.vaultRoot, conceptRelative));
    if (existing !== undefined) {
      proposedEdits.push(
        citationProposal({
          path: conceptRelative,
          content: existing,
          heading: headings.concept,
          suggestedContent: citation,
          subject: `Cite the new source in the existing concept page for ${conceptName}`,
        }),
      );
    } else {
      proposedEdits.push({
        path: conceptRelative,
        operation: "createStub",
        suggestedContent: buildConceptStub(
          conceptName,
          sourceRelative,
          ingestedAt,
          headings.concept,
        ),
        reason: `${conceptName} is referenced but has no concept page yet.`,
      });
    }
  }

  for (const entityName of args.relatedEntities ?? []) {
    const entitySlug = slugify(entityName);
    const entityRelative = `${paths.entitiesRelative}/${entitySlug}.md`;
    const existing = await readIfExists(resolveVaultPath(paths.vaultRoot, entityRelative));
    if (existing !== undefined) {
      proposedEdits.push(
        citationProposal({
          path: entityRelative,
          content: existing,
          heading: headings.entity,
          suggestedContent: citation,
          subject: `Cite the new source in the existing entity page for ${entityName}`,
        }),
      );
    } else {
      proposedEdits.push({
        path: entityRelative,
        operation: "createStub",
        suggestedContent: buildEntityStub(entityName, sourceRelative, ingestedAt, headings.entity),
        reason: `${entityName} is referenced but has no entity page yet.`,
      });
    }
  }

  return {
    changed: true,
    target: sourceRelative,
    summary: `Ingested ${args.title} as ${sourceRelative}`,
    sourcePage: sourceRelative,
    slug,
    ingestedAt,
    proposedEdits,
    proposedEditCount: proposedEdits.length,
  };
}
