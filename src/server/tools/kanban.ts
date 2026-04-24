import {
  addKanbanCard,
  getKanbanStatistics,
  moveKanbanCard,
  parseKanbanBoard,
  toggleKanbanCard,
} from "../../domain/kanban.js";
import {
  type KanbanCardArgs,
  type KanbanParseArgs,
  type KanbanStatsArgs,
  kanbanBoardOutputSchema,
  kanbanCardArgsSchema,
  kanbanParseArgsSchema,
  kanbanStatsArgsSchema,
  kanbanStatsOutputSchema,
} from "../../schema/kanban.js";
import type { ToolDefinition } from "../tool-definition.js";
import { ADDITIVE, READ_ONLY, mutationResultSchema } from "../tool-schemas.js";

export const kanbanTools: ToolDefinition[] = [
  {
    name: "kanban.parse",
    title: "Parse Kanban Board",
    description:
      "Parse a markdown Kanban board file into its column/card structure. Use this when you need the full board content — each column's name and its cards with their completion state. Works with the obsidian-kanban plugin's markdown format. Read-only. For completion counts and ratios instead of the full card list, use `kanban.stats`.",
    inputSchema: kanbanParseArgsSchema,
    outputSchema: kanbanBoardOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = kanbanParseArgsSchema.parse(rawArgs) as KanbanParseArgs;
      return parseKanbanBoard(context, args);
    },
  },
  {
    name: "kanban.stats",
    title: "Kanban Board Statistics",
    description:
      "Summarise a Kanban board: total cards, completed count, incomplete count, completion rate, and per-column breakdown. Use this for dashboards or progress checks where you don't need each card's full text. Read-only. Use `kanban.parse` when you need the actual card content.",
    inputSchema: kanbanStatsArgsSchema,
    outputSchema: kanbanStatsOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = kanbanStatsArgsSchema.parse(rawArgs) as KanbanStatsArgs;
      return getKanbanStatistics(context, args);
    },
  },
  {
    name: "kanban.card",
    title: "Modify Kanban Card",
    description:
      "Add, move, or toggle a card on a Kanban board. The `op` field selects the mutation and determines which other fields are required: `add` needs `columnName` and `cardText` (plus optional `status`, `dueDate`, `position`); `move` needs `cardText`, `fromColumn`, `toColumn` (plus optional `position`); `toggle` needs `cardText` (plus optional `columnName` to scope the search). Missing destination columns are created automatically. Returns a `{changed, target, summary, ...}` mutation envelope.",
    inputSchema: kanbanCardArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = kanbanCardArgsSchema.parse(rawArgs) as KanbanCardArgs;
      if (args.op === "add") {
        const { op: _op, ...rest } = args;
        return addKanbanCard(context, rest);
      }
      if (args.op === "move") {
        const { op: _op, ...rest } = args;
        return moveKanbanCard(context, rest);
      }
      const { op: _op, ...rest } = args;
      return toggleKanbanCard(context, rest);
    },
    inputExamples: [
      {
        description: "Add a new card to the Todo column with a due date",
        input: {
          op: "add",
          filePath: "Boards/Project.md",
          columnName: "Todo",
          cardText: "Write migration doc",
          dueDate: "2026-05-01",
          position: "end",
        },
      },
      {
        description: "Move a card from In Progress to Done",
        input: {
          op: "move",
          filePath: "Boards/Project.md",
          cardText: "Write migration doc",
          fromColumn: "In Progress",
          toColumn: "Done",
        },
      },
      {
        description: "Toggle a card's completion in any column",
        input: {
          op: "toggle",
          filePath: "Boards/Project.md",
          cardText: "Write migration doc",
        },
      },
    ],
  },
];
