import { parseFrontmatter } from "../lib/frontmatter.js";

export type SourceSpan = {
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
};

export type MarkdownLine = SourceSpan & {
  text: string;
  body: string;
  eol: string;
};

export type FrontmatterRegion = SourceSpan & {
  raw: string;
  body: string;
  data: Record<string, unknown>;
};

export type FencedCodeBlock = {
  id: string;
  language: string;
  infoString: string;
  fence: string;
  raw: string;
  content: string;
  span: SourceSpan;
  contentSpan: SourceSpan;
};

export type HtmlCommentBlock = {
  id: string;
  raw: string;
  body: string;
  span: SourceSpan;
};

export type ListItemBlock = {
  id: string;
  raw: string;
  text: string;
  indent: number;
  marker: string;
  span: SourceSpan;
};

export type TaskItemBlock = ListItemBlock & {
  checked: boolean;
};

export type HorizontalRuleBlock = {
  id: string;
  marker: "---" | "___" | "***";
  raw: string;
  span: SourceSpan;
};

export type MarkdownDocumentBlocks = {
  filePath: string;
  content: string;
  lines: MarkdownLine[];
  frontmatter?: FrontmatterRegion;
  fencedCodeBlocks: FencedCodeBlock[];
  htmlComments: HtmlCommentBlock[];
  listItems: ListItemBlock[];
  tasks: TaskItemBlock[];
  horizontalRules: HorizontalRuleBlock[];
};

function splitLinesWithOffsets(content: string): MarkdownLine[] {
  const lines: MarkdownLine[] = [];
  const pattern = /.*(?:\r\n|\n|\r|$)/g;
  let lineNumber = 1;

  for (const match of content.matchAll(pattern)) {
    const text = match[0];
    if (text === "" && (match.index ?? 0) === content.length) {
      continue;
    }
    const startOffset = match.index ?? 0;
    const eolMatch = text.match(/(\r\n|\n|\r)$/);
    const eol = eolMatch?.[1] ?? "";
    const body = eol ? text.slice(0, -eol.length) : text;
    lines.push({
      text,
      body,
      eol,
      startOffset,
      endOffset: startOffset + text.length,
      startLine: lineNumber,
      endLine: lineNumber,
    });
    lineNumber += 1;
  }

  return lines;
}

function lineForOffset(lines: MarkdownLine[], offset: number): number {
  const line = lines.find(
    (candidate) => offset >= candidate.startOffset && offset < candidate.endOffset,
  );
  return line?.startLine ?? lines.at(-1)?.endLine ?? 1;
}

function detectFrontmatter(content: string, lines: MarkdownLine[]): FrontmatterRegion | undefined {
  if (lines[0]?.body.trim() !== "---") {
    return undefined;
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.body.trim() === "---");
  if (closingIndex < 0) {
    return undefined;
  }

  const first = lines[0];
  const last = lines[closingIndex];
  if (!first || !last) {
    return undefined;
  }

  const raw = content.slice(first.startOffset, last.endOffset);
  const bodyStart = first.endOffset;
  const bodyEnd = last.startOffset;
  return {
    raw,
    body: content.slice(bodyStart, bodyEnd),
    data: parseFrontmatter(content).data,
    startOffset: first.startOffset,
    endOffset: last.endOffset,
    startLine: first.startLine,
    endLine: last.endLine,
  };
}

function isInsideSpan(line: MarkdownLine, span: SourceSpan): boolean {
  return line.startOffset >= span.startOffset && line.endOffset <= span.endOffset;
}

function collectFencedCodeBlocks(
  filePath: string,
  content: string,
  lines: MarkdownLine[],
  frontmatter?: FrontmatterRegion,
): FencedCodeBlock[] {
  const blocks: FencedCodeBlock[] = [];
  let index = 0;
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (!line || (frontmatter && isInsideSpan(line, frontmatter))) {
      lineIndex += 1;
      continue;
    }

    const opener = line.body.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (!opener) {
      lineIndex += 1;
      continue;
    }

    const fence = opener[2] ?? "```";
    const fenceChar = fence[0] ?? "`";
    const fenceLength = fence.length;
    let closeIndex = -1;

    for (let candidateIndex = lineIndex + 1; candidateIndex < lines.length; candidateIndex += 1) {
      const candidate = lines[candidateIndex];
      const closePattern = new RegExp(`^\\s*\\${fenceChar}{${fenceLength},}\\s*$`);
      if (candidate && closePattern.test(candidate.body)) {
        closeIndex = candidateIndex;
        break;
      }
    }

    if (closeIndex < 0) {
      lineIndex += 1;
      continue;
    }

    const closeLine = lines[closeIndex];
    if (!closeLine) {
      lineIndex += 1;
      continue;
    }

    const infoString = (opener[3] ?? "").trim();
    const language = infoString.split(/\s+/)[0]?.toLowerCase() ?? "";
    const contentStart = line.endOffset;
    const contentEnd = closeLine.startOffset;
    index += 1;
    blocks.push({
      id: `fence-${index}`,
      language,
      infoString,
      fence,
      raw: content.slice(line.startOffset, closeLine.endOffset),
      content: content.slice(contentStart, contentEnd),
      span: {
        startOffset: line.startOffset,
        endOffset: closeLine.endOffset,
        startLine: line.startLine,
        endLine: closeLine.endLine,
      },
      contentSpan: {
        startOffset: contentStart,
        endOffset: contentEnd,
        startLine: line.startLine + 1,
        endLine: Math.max(line.startLine + 1, closeLine.startLine - 1),
      },
    });
    lineIndex = closeIndex + 1;
  }

  return blocks;
}

function insideAnyFence(line: MarkdownLine, fencedCodeBlocks: FencedCodeBlock[]): boolean {
  return fencedCodeBlocks.some((block) => isInsideSpan(line, block.span));
}

function collectHtmlComments(content: string, lines: MarkdownLine[]): HtmlCommentBlock[] {
  return Array.from(content.matchAll(/<!--([\s\S]*?)-->/g), (match, index) => {
    const startOffset = match.index ?? 0;
    const raw = match[0];
    const endOffset = startOffset + raw.length;
    return {
      id: `comment-${index + 1}`,
      raw,
      body: match[1]?.trim() ?? "",
      span: {
        startOffset,
        endOffset,
        startLine: lineForOffset(lines, startOffset),
        endLine: lineForOffset(lines, Math.max(startOffset, endOffset - 1)),
      },
    };
  });
}

export function parseMarkdownBlocks(content: string, filePath = ""): MarkdownDocumentBlocks {
  const lines = splitLinesWithOffsets(content);
  const frontmatter = detectFrontmatter(content, lines);
  const fencedCodeBlocks = collectFencedCodeBlocks(filePath, content, lines, frontmatter);
  const listItems: ListItemBlock[] = [];
  const tasks: TaskItemBlock[] = [];
  const horizontalRules: HorizontalRuleBlock[] = [];

  for (const line of lines) {
    if (
      (frontmatter && isInsideSpan(line, frontmatter)) ||
      insideAnyFence(line, fencedCodeBlocks)
    ) {
      continue;
    }

    const horizontalRule = line.body.match(/^\s*(---|___|\*\*\*)\s*$/);
    if (horizontalRule) {
      horizontalRules.push({
        id: `hr-${horizontalRules.length + 1}`,
        marker: horizontalRule[1] as HorizontalRuleBlock["marker"],
        raw: line.text,
        span: {
          startOffset: line.startOffset,
          endOffset: line.endOffset,
          startLine: line.startLine,
          endLine: line.endLine,
        },
      });
      continue;
    }

    const task = line.body.match(/^(\s*)([-*+])\s+\[([ xX])\]\s+(.*)$/);
    if (task) {
      const block: TaskItemBlock = {
        id: `task-${tasks.length + 1}`,
        raw: line.text,
        text: task[4] ?? "",
        indent: task[1]?.length ?? 0,
        marker: task[2] ?? "-",
        checked: (task[3] ?? " ").toLowerCase() === "x",
        span: {
          startOffset: line.startOffset,
          endOffset: line.endOffset,
          startLine: line.startLine,
          endLine: line.endLine,
        },
      };
      tasks.push(block);
      listItems.push(block);
      continue;
    }

    const listItem = line.body.match(/^(\s*)([-*+])\s+(.*)$/);
    if (listItem) {
      listItems.push({
        id: `list-${listItems.length + 1}`,
        raw: line.text,
        text: listItem[3] ?? "",
        indent: listItem[1]?.length ?? 0,
        marker: listItem[2] ?? "-",
        span: {
          startOffset: line.startOffset,
          endOffset: line.endOffset,
          startLine: line.startLine,
          endLine: line.endLine,
        },
      });
    }
  }

  return {
    filePath,
    content,
    lines,
    ...(frontmatter ? { frontmatter } : {}),
    fencedCodeBlocks,
    htmlComments: collectHtmlComments(content, lines).filter(
      (comment) =>
        !fencedCodeBlocks.some(
          (block) =>
            comment.span.startOffset >= block.span.startOffset &&
            comment.span.endOffset <= block.span.endOffset,
        ),
    ),
    listItems,
    tasks,
    horizontalRules,
  };
}

export function replaceSourceSpan(
  content: string,
  span: Pick<SourceSpan, "startOffset" | "endOffset">,
  replacement: string,
): string {
  return `${content.slice(0, span.startOffset)}${replacement}${content.slice(span.endOffset)}`;
}
