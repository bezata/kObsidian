import { parseFrontmatter, stringifyFrontmatter } from "../../lib/frontmatter.js";
import type { WikiPageType } from "../../schema/wiki.js";

export type WikiPageKind = WikiPageType | "other";

function stripUndefined(data: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries);
}

export function renderWithFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
  return stringifyFrontmatter({ data: stripUndefined(frontmatter), content: body, orig: "" });
}

export function readFrontmatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const parsed = parseFrontmatter(raw);
  return { data: parsed.data, content: parsed.content };
}

const SOURCE_SKELETON = `## TL;DR

## Key Points

## Open Questions

## Notes
`;

export function sourceBodySkeleton(): string {
  return SOURCE_SKELETON;
}

// The middle heading is where wiki.ingest / wiki.summaryMerge file citations,
// so stubs must be scaffolded with whatever heading the vault has configured.
export function conceptBodySkeleton(discussionHeading = "Discussion"): string {
  return `## Definition\n\n## ${discussionHeading}\n\n## Related\n`;
}

export function entityBodySkeleton(factsHeading = "Notable Facts"): string {
  return `## Overview\n\n## ${factsHeading}\n\n## Related\n`;
}
