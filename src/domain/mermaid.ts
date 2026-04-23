import { AppError } from "../lib/errors.js";
import { readUtf8, walkMarkdownFiles, writeUtf8 } from "../lib/filesystem.js";
import { parseFrontmatter } from "../lib/frontmatter.js";
import { resolveVaultPath, toVaultRelativePath } from "../lib/paths.js";
import { type DomainContext, requireVaultPath } from "./context.js";
import {
  type FencedCodeBlock,
  type SourceSpan,
  parseMarkdownBlocks,
  replaceSourceSpan,
} from "./markdown-blocks.js";

export type MermaidBlock = {
  id: string;
  filePath: string;
  raw: string;
  body: string;
  diagramKind?: string;
  frontmatter?: { raw: string; data: Record<string, unknown> };
  directives: string[];
  span: SourceSpan;
  contentSpan: SourceSpan;
};

function parseMermaidFrontmatter(content: string) {
  const match = content.match(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/);
  if (!match) {
    return undefined;
  }
  const raw = match[0];
  return {
    raw,
    data: parseFrontmatter(content).data,
    endOffset: raw.length,
  };
}

function detectDiagramKind(body: string): string | undefined {
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) {
      continue;
    }
    return trimmed.split(/\s+/)[0]?.replace(/:$/, "");
  }
  return undefined;
}

function mermaidBlockFromFence(filePath: string, block: FencedCodeBlock): MermaidBlock {
  const frontmatter = parseMermaidFrontmatter(block.content);
  const directives = Array.from(block.content.matchAll(/%%\{([\s\S]*?)\}%%/g), (match) =>
    (match[1] ?? "").trim(),
  );
  const body = frontmatter ? block.content.slice(frontmatter.endOffset) : block.content;
  return {
    id: block.id,
    filePath,
    raw: block.raw,
    body,
    ...(detectDiagramKind(body) ? { diagramKind: detectDiagramKind(body) } : {}),
    ...(frontmatter ? { frontmatter: { raw: frontmatter.raw, data: frontmatter.data } } : {}),
    directives,
    span: block.span,
    contentSpan: block.contentSpan,
  };
}

export function extractMermaidBlocks(content: string, filePath: string): MermaidBlock[] {
  return parseMarkdownBlocks(content, filePath)
    .fencedCodeBlocks.filter((block) => block.language === "mermaid")
    .map((block) => mermaidBlockFromFence(filePath, block));
}

async function readMermaidBlocksInFile(vaultRoot: string, filePath: string) {
  const absolutePath = resolveVaultPath(vaultRoot, filePath);
  const content = await readUtf8(absolutePath);
  return extractMermaidBlocks(content, filePath);
}

export async function listMermaidBlocks(
  context: DomainContext,
  args: { filePath?: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const items: MermaidBlock[] = [];

  if (args.filePath) {
    items.push(...(await readMermaidBlocksInFile(vaultRoot, args.filePath)));
  } else {
    for (const absolutePath of await walkMarkdownFiles(vaultRoot)) {
      const filePath = toVaultRelativePath(vaultRoot, absolutePath);
      const content = await readUtf8(absolutePath);
      items.push(...extractMermaidBlocks(content, filePath));
    }
  }

  return { items, total: items.length, filePath: args.filePath };
}

function selectMermaidBlock(blocks: MermaidBlock[], blockId?: string, index?: number) {
  if (blockId) {
    return blocks.find((block) => block.id === blockId);
  }
  if (typeof index === "number") {
    return blocks[index];
  }
  return blocks[0];
}

export async function readMermaidBlock(
  context: DomainContext,
  args: { filePath: string; blockId?: string; index?: number; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const blocks = await readMermaidBlocksInFile(vaultRoot, args.filePath);
  const block = selectMermaidBlock(blocks, args.blockId, args.index);
  if (!block) {
    throw new AppError("not_found", "Mermaid block not found");
  }
  return block;
}

export async function updateMermaidBlock(
  context: DomainContext,
  args: {
    filePath: string;
    source: string;
    blockId?: string;
    index?: number;
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const content = await readUtf8(absolutePath);
  const block = selectMermaidBlock(
    extractMermaidBlocks(content, args.filePath),
    args.blockId,
    args.index,
  );
  if (!block) {
    throw new AppError("not_found", "Mermaid block not found");
  }
  await writeUtf8(absolutePath, replaceSourceSpan(content, block.contentSpan, args.source));
  return {
    changed: true,
    target: args.filePath,
    summary: "Updated Mermaid block",
    blockId: block.id,
  };
}
