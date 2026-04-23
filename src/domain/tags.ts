import { AppError } from "../lib/errors.js";
import { readUtf8, walkMarkdownFiles, writeUtf8 } from "../lib/filesystem.js";
import {
  getFrontmatterTags,
  parseFrontmatter,
  setFrontmatterTags,
  stringifyFrontmatter,
} from "../lib/frontmatter.js";
import { resolveVaultPath, toVaultRelativePath } from "../lib/paths.js";
import { TAG_PATTERN } from "../lib/patterns.js";
import { type DomainContext, requireVaultPath } from "./context.js";

export function extractAllTags(content: string) {
  const parsed = parseFrontmatter(content);
  const frontmatterTags = getFrontmatterTags(parsed.data);
  const inlineTags = Array.from(content.matchAll(TAG_PATTERN), (match) => match[1]).filter(
    (tag): tag is string => typeof tag === "string" && tag.length > 0,
  );
  const allTags = Array.from(new Set([...frontmatterTags, ...inlineTags]));
  return { frontmatterTags, inlineTags, allTags };
}

type TagMutationArgs = { path: string; tags: string[]; vaultPath?: string };

async function mutateTags(
  context: DomainContext,
  args: TagMutationArgs,
  mode: "add" | "remove" | "replace",
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.path);
  const content = await readUtf8(absolutePath);
  const parsed = parseFrontmatter(content);
  const existingTags = getFrontmatterTags(parsed.data);
  const incoming = args.tags.map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean);
  let nextTags: string[] = existingTags;

  if (mode === "add") {
    nextTags = Array.from(new Set([...existingTags, ...incoming]));
  } else if (mode === "remove") {
    nextTags = existingTags.filter((tag) => !incoming.includes(tag));
  } else {
    nextTags = Array.from(new Set(incoming));
  }

  const nextDocument = {
    ...parsed,
    data: setFrontmatterTags(parsed.data, nextTags),
  };
  await writeUtf8(absolutePath, stringifyFrontmatter(nextDocument));
  return nextTags;
}

export async function addTags(context: DomainContext, args: TagMutationArgs) {
  const nextTags = await mutateTags(context, args, "add");
  return {
    changed: true,
    target: args.path,
    summary: `Added ${args.tags.length} tags to ${args.path}`,
    tagsAdded: args.tags,
    allTags: nextTags,
  };
}

export async function updateTags(
  context: DomainContext,
  args: TagMutationArgs & { merge?: boolean },
) {
  const nextTags = await mutateTags(context, args, args.merge ? "add" : "replace");
  return {
    changed: true,
    target: args.path,
    summary: `${args.merge ? "Merged" : "Replaced"} tags on ${args.path}`,
    newTags: nextTags,
    merge: args.merge ?? false,
  };
}

export async function removeTags(context: DomainContext, args: TagMutationArgs) {
  const nextTags = await mutateTags(context, args, "remove");
  return {
    changed: true,
    target: args.path,
    summary: `Removed tags from ${args.path}`,
    tagsRemoved: args.tags,
    remainingTags: nextTags,
  };
}

export async function searchByTag(
  context: DomainContext,
  args: { tag: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const searchTag = args.tag.replace(/^#/, "");
  const items: Array<{
    file: string;
    absolutePath: string;
    tagLocations: { frontmatter: boolean; inline: boolean };
  }> = [];

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const content = await readUtf8(absolutePath);
    const tags = extractAllTags(content);
    const frontmatter = tags.frontmatterTags.includes(searchTag);
    const inline = tags.inlineTags.includes(searchTag);
    if (!frontmatter && !inline) {
      continue;
    }
    items.push({
      file: toVaultRelativePath(vaultRoot, absolutePath),
      absolutePath,
      tagLocations: { frontmatter, inline },
    });
  }

  return {
    tag: searchTag,
    items,
    total: items.length,
  };
}

export async function listTags(
  context: DomainContext,
  args: { includeCounts?: boolean; sortBy?: "name" | "count"; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const counts = new Map<string, number>();

  for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
    const content = await readUtf8(absolutePath);
    for (const tag of extractAllTags(content).allTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const sortBy = args.sortBy ?? "name";
  const entries = [...counts.entries()];
  entries.sort((left, right) =>
    sortBy === "count"
      ? right[1] - left[1] || left[0].localeCompare(right[0])
      : left[0].localeCompare(right[0]),
  );

  return {
    total: entries.length,
    items:
      (args.includeCounts ?? true)
        ? entries.map(([name, count]) => ({ name, count }))
        : entries.map(([name]) => ({ name })),
  };
}

export async function ensureNoteExists(context: DomainContext, path: string, vaultPath?: string) {
  const vaultRoot = requireVaultPath(context, vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, path);
  try {
    await readUtf8(absolutePath);
  } catch {
    throw new AppError("not_found", `Note not found: ${path}`);
  }
}
