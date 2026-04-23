import { randomUUID } from "node:crypto";
import { AppError } from "../lib/errors.js";
import { readUtf8, writeUtf8 } from "../lib/filesystem.js";
import { resolveVaultPath } from "../lib/paths.js";
import {
  KANBAN_CARD_PATTERN,
  KANBAN_COLUMN_PATTERN,
  KANBAN_DATE_PATTERN,
  TAG_PATTERN,
  WIKILINK_PATTERN,
} from "../lib/patterns.js";
import { type DomainContext, requireVaultPath } from "./context.js";

export type KanbanCard = {
  id: string;
  text: string;
  status: "incomplete" | "completed";
  dueDate?: string;
  tags: string[];
  wikilinks: string[];
  subtasks: KanbanCard[];
  indentLevel: number;
  lineNumber: number;
};

export type KanbanColumn = {
  name: string;
  cards: KanbanCard[];
  lineNumber: number;
};

export type KanbanBoard = {
  filePath: string;
  columns: KanbanColumn[];
  settings: Record<string, unknown>;
};

function parseCardMetadata(cardText: string) {
  const dueDate = cardText.match(KANBAN_DATE_PATTERN)?.[1];
  const tags = Array.from(cardText.matchAll(TAG_PATTERN), (match) => match[1]).filter(
    (tag): tag is string => typeof tag === "string" && tag.length > 0,
  );
  const wikilinks = Array.from(cardText.matchAll(WIKILINK_PATTERN), (match) => match[1]).filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return { dueDate, tags, wikilinks };
}

function sanitizeCardText(cardText: string) {
  return cardText.replace(KANBAN_DATE_PATTERN, "").trim();
}

export function parseKanbanStructure(content: string, filePath: string): KanbanBoard {
  const columns: KanbanColumn[] = [];
  let currentColumn: KanbanColumn | undefined;
  let stack: KanbanCard[] = [];
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const columnMatch = line.match(/^(#{2,3})\s+(.+)$/);
    if (columnMatch && columnMatch[1] === "##") {
      currentColumn = { name: columnMatch[2]?.trim() ?? "", cards: [], lineNumber: index + 1 };
      columns.push(currentColumn);
      stack = [];
      continue;
    }

    const cardMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s+(.+)$/);
    if (!cardMatch || !currentColumn) {
      continue;
    }
    const indent = Math.floor((cardMatch[1]?.length ?? 0) / 2);
    const status = cardMatch[2]?.toLowerCase() === "x" ? "completed" : "incomplete";
    const rawText = cardMatch[3]?.trim() ?? "";
    const metadata = parseCardMetadata(rawText);
    const card: KanbanCard = {
      id: randomUUID(),
      text: sanitizeCardText(rawText),
      status,
      dueDate: metadata.dueDate,
      tags: metadata.tags,
      wikilinks: metadata.wikilinks,
      subtasks: [],
      indentLevel: indent,
      lineNumber: index + 1,
    };

    while (stack.length > 0 && (stack[stack.length - 1]?.indentLevel ?? -1) >= indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      currentColumn.cards.push(card);
    } else {
      stack[stack.length - 1]?.subtasks.push(card);
    }
    stack.push(card);
  }

  const settings: Record<string, unknown> = {};
  if (/^---\s*\n[\s\S]*kanban-plugin:/m.test(content)) {
    settings["kanban-plugin"] = "basic";
  }

  return { filePath, columns, settings };
}

function renderCard(card: KanbanCard, lines: string[], indent = 0) {
  const prefix = "  ".repeat(indent);
  const suffix = card.dueDate ? ` @{${card.dueDate}}` : "";
  lines.push(`${prefix}- [${card.status === "completed" ? "x" : " "}] ${card.text}${suffix}`);
  for (const subtask of card.subtasks) {
    renderCard(subtask, lines, indent + 1);
  }
}

export function formatKanbanBoard(board: KanbanBoard): string {
  const lines: string[] = [];
  if (board.settings["kanban-plugin"]) {
    lines.push("---", `kanban-plugin: ${String(board.settings["kanban-plugin"])}`, "---", "");
  }
  for (const column of board.columns) {
    lines.push(`## ${column.name}`, "");
    for (const card of column.cards) {
      renderCard(card, lines);
    }
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n+$/, "\n")}`;
}

function flattenCards(cards: KanbanCard[]): KanbanCard[] {
  return cards.flatMap((card) => [card, ...flattenCards(card.subtasks)]);
}

function findCard(board: KanbanBoard, cardText: string, columnName?: string) {
  const columns = columnName
    ? board.columns.filter((column) => column.name === columnName)
    : board.columns;
  for (const column of columns) {
    for (const card of flattenCards(column.cards)) {
      if (card.text === cardText) {
        return { column, card };
      }
    }
  }
  return undefined;
}

export async function parseKanbanBoard(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const content = await readUtf8(absolutePath);
  const board = parseKanbanStructure(content, args.filePath);
  return {
    filePath: args.filePath,
    totalCards: board.columns.reduce(
      (count, column) => count + flattenCards(column.cards).length,
      0,
    ),
    columns: board.columns.map((column) => ({
      name: column.name,
      cardCount: flattenCards(column.cards).length,
      cards: column.cards,
    })),
  };
}

export async function addKanbanCard(
  context: DomainContext,
  args: {
    filePath: string;
    columnName: string;
    cardText: string;
    status?: "incomplete" | "completed";
    dueDate?: string;
    position?: "start" | "end";
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const board = parseKanbanStructure(await readUtf8(absolutePath), args.filePath);
  const column = board.columns.find((candidate) => candidate.name === args.columnName);
  if (!column) {
    throw new AppError("not_found", `Column not found: ${args.columnName}`);
  }

  const card: KanbanCard = {
    id: randomUUID(),
    text: args.cardText,
    status: args.status ?? "incomplete",
    dueDate: args.dueDate,
    tags: [],
    wikilinks: [],
    subtasks: [],
    indentLevel: 0,
    lineNumber: 0,
  };
  if (args.position === "start") {
    column.cards.unshift(card);
  } else {
    column.cards.push(card);
  }
  await writeUtf8(absolutePath, formatKanbanBoard(board));
  return {
    changed: true,
    target: args.filePath,
    summary: `Added card to ${args.columnName}`,
    card,
  };
}

export async function moveKanbanCard(
  context: DomainContext,
  args: {
    filePath: string;
    cardText: string;
    fromColumn: string;
    toColumn: string;
    position?: "start" | "end";
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const board = parseKanbanStructure(await readUtf8(absolutePath), args.filePath);
  const source = board.columns.find((candidate) => candidate.name === args.fromColumn);
  const destination = board.columns.find((candidate) => candidate.name === args.toColumn);
  if (!source || !destination) {
    throw new AppError("not_found", "Source or destination column not found");
  }
  const index = source.cards.findIndex((card) => card.text === args.cardText);
  if (index < 0) {
    throw new AppError("not_found", `Card not found: ${args.cardText}`);
  }
  const [card] = source.cards.splice(index, 1);
  if (!card) {
    throw new AppError("internal", "Card extraction failed");
  }
  card.indentLevel = 0;
  if (args.position === "start") {
    destination.cards.unshift(card);
  } else {
    destination.cards.push(card);
  }
  await writeUtf8(absolutePath, formatKanbanBoard(board));
  return { changed: true, target: args.filePath, summary: `Moved card to ${args.toColumn}` };
}

export async function toggleKanbanCard(
  context: DomainContext,
  args: { filePath: string; cardText: string; columnName?: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const board = parseKanbanStructure(await readUtf8(absolutePath), args.filePath);
  const result = findCard(board, args.cardText, args.columnName);
  if (!result) {
    throw new AppError("not_found", `Card not found: ${args.cardText}`);
  }
  result.card.status = result.card.status === "completed" ? "incomplete" : "completed";
  await writeUtf8(absolutePath, formatKanbanBoard(board));
  return {
    changed: true,
    target: args.filePath,
    summary: `Toggled card ${args.cardText}`,
    newStatus: result.card.status,
  };
}

export async function getKanbanStatistics(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const board = await parseKanbanBoard(context, args);
  const columns = board.columns.map((column) => {
    const allCards = flattenCards(column.cards);
    const completedCards = allCards.filter((card) => card.status === "completed").length;
    return {
      columnName: column.name,
      totalCards: allCards.length,
      completedCards,
      incompleteCards: allCards.length - completedCards,
      completionRate: Number(
        (allCards.length > 0 ? (completedCards / allCards.length) * 100 : 0).toFixed(1),
      ),
    };
  });
  const totalCards = columns.reduce((sum, column) => sum + column.totalCards, 0);
  const totalCompleted = columns.reduce((sum, column) => sum + column.completedCards, 0);
  return {
    filePath: args.filePath,
    totalCards,
    totalCompleted,
    totalIncomplete: totalCards - totalCompleted,
    overallCompletionRate: Number(
      (totalCards > 0 ? (totalCompleted / totalCards) * 100 : 0).toFixed(1),
    ),
    columnCount: columns.length,
    columns,
  };
}
