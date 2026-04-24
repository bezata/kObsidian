import { z } from "zod";
import { dateStringSchema, notePathSchema } from "./primitives.js";

const commonBoardFields = {
  filePath: notePathSchema.describe("Path of the Kanban board note (`.md`)."),
  vaultPath: z.string().optional(),
};

export const kanbanParseArgsSchema = z
  .object(commonBoardFields)
  .strict()
  .describe("Arguments for `kanban.parse`.");
export type KanbanParseArgs = z.input<typeof kanbanParseArgsSchema>;

export const kanbanStatsArgsSchema = z
  .object(commonBoardFields)
  .strict()
  .describe("Arguments for `kanban.stats`.");
export type KanbanStatsArgs = z.input<typeof kanbanStatsArgsSchema>;

const cardPositionSchema = z
  .enum(["start", "end"])
  .describe("Where to place the card within its destination column. Defaults to `end`.");

const cardAddShape = z.object({
  op: z.literal("add"),
  ...commonBoardFields,
  columnName: z.string().min(1).describe("Target column name. Created if it does not exist."),
  cardText: z.string().min(1).describe("The card's text (markdown allowed, single line)."),
  status: z
    .enum(["incomplete", "completed"])
    .optional()
    .describe("Initial checkbox state. Defaults to `incomplete`."),
  dueDate: dateStringSchema.optional().describe("ISO date (YYYY-MM-DD) appended as `@{date}`."),
  position: cardPositionSchema.optional(),
});

const cardMoveShape = z.object({
  op: z.literal("move"),
  ...commonBoardFields,
  cardText: z.string().min(1).describe("Card text to locate (matched verbatim after checkbox)."),
  fromColumn: z.string().min(1).describe("Source column the card currently lives in."),
  toColumn: z.string().min(1).describe("Destination column (created if missing)."),
  position: cardPositionSchema.optional(),
});

const cardToggleShape = z.object({
  op: z.literal("toggle"),
  ...commonBoardFields,
  cardText: z.string().min(1).describe("Card text to locate."),
  columnName: z
    .string()
    .optional()
    .describe(
      "Restrict search to this column. Omit to toggle the first matching card in any column.",
    ),
});

export const kanbanCardArgsSchema = z
  .discriminatedUnion("op", [cardAddShape, cardMoveShape, cardToggleShape])
  .describe(
    "Discriminated union on `op` — add, move, or toggle a card. Each op has its own required fields.",
  );
export type KanbanCardArgs = z.input<typeof kanbanCardArgsSchema>;

export const kanbanBoardOutputSchema = z
  .object({
    filePath: z.string(),
    columns: z.array(
      z
        .object({
          name: z.string(),
          cards: z.array(
            z
              .object({
                text: z.string(),
                completed: z.boolean(),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const kanbanStatsOutputSchema = z
  .object({
    filePath: z.string(),
    total: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    incomplete: z.number().int().nonnegative(),
    completionRate: z.number().describe("Ratio 0..1 of completed to total cards."),
    byColumn: z.record(z.string(), z.object({ total: z.number(), completed: z.number() })),
  })
  .passthrough();
