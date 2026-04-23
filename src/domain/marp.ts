import { AppError } from "../lib/errors.js";
import { readUtf8, writeUtf8 } from "../lib/filesystem.js";
import { resolveVaultPath } from "../lib/paths.js";
import { type DomainContext, requireVaultPath } from "./context.js";
import {
  type HorizontalRuleBlock,
  type SourceSpan,
  parseMarkdownBlocks,
  replaceSourceSpan,
} from "./markdown-blocks.js";

export type MarpDirectiveMap = Record<string, unknown>;

export type MarpSlide = {
  id: string;
  index: number;
  raw: string;
  body: string;
  separator?: "---" | "___" | "***";
  directives: MarpDirectiveMap;
  inheritedDirectives: MarpDirectiveMap;
  span: SourceSpan;
};

export type MarpDeck = {
  filePath: string;
  frontmatter: Record<string, unknown>;
  isMarpDeck: boolean;
  slides: MarpSlide[];
  totalSlides: number;
  directives: MarpDirectiveMap;
};

function parseDirectiveValue(value: string): unknown {
  const trimmed = value.trim();
  if (/^(true|false)$/i.test(trimmed)) {
    return /^true$/i.test(trimmed);
  }
  if (!Number.isNaN(Number(trimmed)) && trimmed !== "") {
    return Number(trimmed);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

function extractCommentDirectives(raw: string): MarpDirectiveMap {
  const directives: MarpDirectiveMap = {};
  for (const comment of raw.matchAll(/<!--([\s\S]*?)-->/g)) {
    for (const line of (comment[1] ?? "").split(/\r?\n/)) {
      const match = line.trim().match(/^(_?[A-Za-z][\w-]*)\s*:\s*(.+)$/);
      if (match?.[1] && match[2]) {
        directives[match[1]] = parseDirectiveValue(match[2]);
      }
    }
  }
  return directives;
}

function yamlScalar(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(String(value));
}

function buildSlideSpans(
  content: string,
  startOffset: number,
  endOffset: number,
  separators: HorizontalRuleBlock[],
) {
  const spans: Array<{ startOffset: number; endOffset: number; separator?: HorizontalRuleBlock }> =
    [];
  let currentStart = startOffset;
  let separatorForNext: HorizontalRuleBlock | undefined;

  for (const separator of separators) {
    if (separator.span.startOffset < startOffset || separator.span.startOffset > endOffset) {
      continue;
    }
    spans.push({
      startOffset: currentStart,
      endOffset: separator.span.startOffset,
      ...(separatorForNext ? { separator: separatorForNext } : {}),
    });
    currentStart = separator.span.endOffset;
    separatorForNext = separator;
  }

  spans.push({
    startOffset: currentStart,
    endOffset,
    ...(separatorForNext ? { separator: separatorForNext } : {}),
  });
  return spans.filter((span) => content.slice(span.startOffset, span.endOffset).trim().length > 0);
}

function lineNumberForOffset(content: string, offset: number): number {
  return content.slice(0, offset).split(/\r?\n/).length;
}

export function parseMarpDeck(content: string, filePath: string): MarpDeck {
  const document = parseMarkdownBlocks(content, filePath);
  const frontmatter = document.frontmatter?.data ?? {};
  const contentStart = document.frontmatter?.endOffset ?? 0;
  const slideSpans = buildSlideSpans(
    content,
    contentStart,
    content.length,
    document.horizontalRules,
  );
  const slides: MarpSlide[] = [];
  const inherited: MarpDirectiveMap = {};

  for (const [index, slideSpan] of slideSpans.entries()) {
    const raw = content.slice(slideSpan.startOffset, slideSpan.endOffset);
    const localDirectives = extractCommentDirectives(raw);
    const effectiveDirectives = { ...inherited };
    for (const [key, value] of Object.entries(localDirectives)) {
      if (key.startsWith("_")) {
        effectiveDirectives[key.slice(1)] = value;
      } else {
        inherited[key] = value;
        effectiveDirectives[key] = value;
      }
    }
    slides.push({
      id: `slide-${index + 1}`,
      index,
      raw,
      body: raw,
      ...(slideSpan.separator ? { separator: slideSpan.separator.marker } : {}),
      directives: localDirectives,
      inheritedDirectives: effectiveDirectives,
      span: {
        startOffset: slideSpan.startOffset,
        endOffset: slideSpan.endOffset,
        startLine: lineNumberForOffset(content, slideSpan.startOffset),
        endLine: lineNumberForOffset(
          content,
          Math.max(slideSpan.startOffset, slideSpan.endOffset - 1),
        ),
      },
    });
  }

  return {
    filePath,
    frontmatter,
    isMarpDeck: frontmatter.marp === true || frontmatter.marp === "true",
    slides,
    totalSlides: slides.length,
    directives: inherited,
  };
}

export async function readMarpDeck(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const content = await readUtf8(resolveVaultPath(vaultRoot, args.filePath));
  return parseMarpDeck(content, args.filePath);
}

export async function listMarpSlides(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const deck = await readMarpDeck(context, args);
  return { filePath: args.filePath, items: deck.slides, total: deck.totalSlides };
}

function selectSlide(slides: MarpSlide[], slideId?: string, index?: number) {
  if (slideId) {
    return slides.find((slide) => slide.id === slideId);
  }
  if (typeof index === "number") {
    return slides[index];
  }
  return slides[0];
}

export async function readMarpSlide(
  context: DomainContext,
  args: { filePath: string; slideId?: string; index?: number; vaultPath?: string },
) {
  const deck = await readMarpDeck(context, args);
  const slide = selectSlide(deck.slides, args.slideId, args.index);
  if (!slide) {
    throw new AppError("not_found", "Marp slide not found");
  }
  return { filePath: args.filePath, ...slide };
}

export async function updateMarpSlide(
  context: DomainContext,
  args: { filePath: string; source: string; slideId?: string; index?: number; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const content = await readUtf8(absolutePath);
  const deck = parseMarpDeck(content, args.filePath);
  const slide = selectSlide(deck.slides, args.slideId, args.index);
  if (!slide) {
    throw new AppError("not_found", "Marp slide not found");
  }
  await writeUtf8(absolutePath, replaceSourceSpan(content, slide.span, args.source));
  return {
    changed: true,
    target: args.filePath,
    summary: "Updated Marp slide",
    slideId: slide.id,
  };
}

function updateFrontmatterSource(content: string, fields: Record<string, unknown>): string {
  const document = parseMarkdownBlocks(content);
  if (!document.frontmatter) {
    const lines = [
      "---",
      ...Object.entries(fields).map(([key, value]) => `${key}: ${yamlScalar(value)}`),
      "---",
      "",
    ];
    return `${lines.join("\n")}${content}`;
  }

  const rawLines = document.frontmatter.raw.split(/(\r?\n)/);
  const lineParts: string[] = [];
  for (let index = 0; index < rawLines.length; index += 2) {
    lineParts.push(`${rawLines[index] ?? ""}${rawLines[index + 1] ?? ""}`);
  }

  const pending = new Map(Object.entries(fields));
  const nextLines = lineParts.map((line) => {
    const key = line.match(/^(\s*[^:\s][^:]*)\s*:/)?.[1]?.trim();
    if (key && pending.has(key)) {
      const value = pending.get(key);
      pending.delete(key);
      const eol = line.match(/(\r?\n)$/)?.[1] ?? "";
      return `${key}: ${yamlScalar(value)}${eol}`;
    }
    return line;
  });

  let closingIndex = nextLines.length - 1;
  for (let index = nextLines.length - 1; index >= 0; index -= 1) {
    if (nextLines[index]?.trim() === "---") {
      closingIndex = index;
      break;
    }
  }
  const additions = [...pending.entries()].map(([key, value]) => `${key}: ${yamlScalar(value)}\n`);
  nextLines.splice(Math.max(0, closingIndex), 0, ...additions);
  return replaceSourceSpan(content, document.frontmatter, nextLines.join(""));
}

export async function updateMarpFrontmatter(
  context: DomainContext,
  args: { filePath: string; fields: Record<string, unknown>; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const content = await readUtf8(absolutePath);
  await writeUtf8(absolutePath, updateFrontmatterSource(content, args.fields));
  return {
    changed: true,
    target: args.filePath,
    summary: "Updated Marp frontmatter",
    fields: Object.keys(args.fields),
  };
}
