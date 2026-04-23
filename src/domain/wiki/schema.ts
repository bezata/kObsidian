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

const CONCEPT_SKELETON = `## Definition

## Discussion

## Related
`;

const ENTITY_SKELETON = `## Overview

## Notable Facts

## Related
`;

export function sourceBodySkeleton(): string {
  return SOURCE_SKELETON;
}

export function conceptBodySkeleton(): string {
  return CONCEPT_SKELETON;
}

export function entityBodySkeleton(): string {
  return ENTITY_SKELETON;
}
