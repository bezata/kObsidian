import matter from "gray-matter";

export type FrontmatterDocument = {
  data: Record<string, unknown>;
  content: string;
  excerpt?: string;
  orig: string;
};

export function parseFrontmatter(raw: string): FrontmatterDocument {
  const parsed = matter(raw);
  const document: FrontmatterDocument = {
    data: parsed.data as Record<string, unknown>,
    content: parsed.content,
    orig: raw,
  };

  if (typeof parsed.excerpt === "string") {
    document.excerpt = parsed.excerpt;
  }

  return document;
}

export function stringifyFrontmatter(document: FrontmatterDocument): string {
  return matter.stringify(document.content, document.data);
}

export function getFrontmatterTags(data: Record<string, unknown>): string[] {
  const tags = data.tags;
  if (Array.isArray(tags)) {
    return tags
      .flatMap((tag) => (typeof tag === "string" ? [tag.replace(/^#/, "").trim()] : []))
      .filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(/[,\s]+/)
      .map((tag) => tag.replace(/^#/, "").trim())
      .filter(Boolean);
  }

  return [];
}

export function setFrontmatterTags(
  data: Record<string, unknown>,
  tags: string[],
): Record<string, unknown> {
  return {
    ...data,
    tags: [...new Set(tags.map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean))],
  };
}
