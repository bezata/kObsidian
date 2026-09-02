import type { DomainContext } from "../context.js";
import { escapeRegExp } from "../smart-insert.js";

export type WikiHeadings = {
  /** index.md section listing source pages. */
  indexSources: string;
  /** index.md section listing concept pages. */
  indexConcepts: string;
  /** index.md section listing entity pages. */
  indexEntities: string;
  /** Concept-page heading that receives citations and merged sections. */
  concept: string;
  /** Entity-page heading that receives citations and merged sections. */
  entity: string;
};

export type WikiHeadingOverrides = {
  indexHeading?: string;
  conceptHeading?: string;
  entityHeading?: string;
};

export function resolveWikiHeadings(
  context: DomainContext,
  overrides: WikiHeadingOverrides = {},
): WikiHeadings {
  const env = context.env;
  return {
    indexSources: overrides.indexHeading ?? env.KOBSIDIAN_WIKI_INDEX_SOURCES_HEADING,
    indexConcepts: env.KOBSIDIAN_WIKI_INDEX_CONCEPTS_HEADING,
    indexEntities: env.KOBSIDIAN_WIKI_INDEX_ENTITIES_HEADING,
    concept: overrides.conceptHeading ?? env.KOBSIDIAN_WIKI_CONCEPT_PAGE_HEADING,
    entity: overrides.entityHeading ?? env.KOBSIDIAN_WIKI_ENTITY_PAGE_HEADING,
  };
}

/**
 * Returns the exact heading text present in `content` for `heading`, or
 * undefined when no heading line matches. A trailing ` (N)` count — what
 * `wiki.indexRebuild` renders with `includeCounts:true` — is tolerated, and the
 * returned text includes it so it can be passed verbatim as a `notes.edit` anchor.
 */
export function findHeading(content: string, heading: string): string | undefined {
  const pattern = new RegExp(`^#{1,6}\\s+(${escapeRegExp(heading)}(?:\\s+\\(\\d+\\))?)\\s*$`);
  for (const line of content.split(/\r?\n/)) {
    const match = pattern.exec(line);
    if (match) return match[1];
  }
  return undefined;
}
