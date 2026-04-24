import { z } from "zod";
import { notePathSchema, positiveIntSchema } from "./primitives.js";

export const dataviewQueryArgsSchema = z
  .object({
    query: z
      .string()
      .min(1)
      .describe(
        'A Dataview Query Language (DQL) string. Examples: `LIST FROM #inbox`, `TASK FROM "Journal" WHERE !completed`, `TABLE file.ctime, priority FROM #projects`.',
      ),
  })
  .strict();
export type DataviewQueryArgs = z.input<typeof dataviewQueryArgsSchema>;

const sharedDqlFields = {
  whereClause: z
    .string()
    .optional()
    .describe("Optional DQL `WHERE` clause body (without the `WHERE` keyword)."),
  sortBy: z
    .string()
    .optional()
    .describe(
      "Optional DQL `SORT` clause body (without the `SORT` keyword). Example: `file.ctime desc`.",
    ),
  limit: positiveIntSchema.optional().describe("Optional `LIMIT` n clause."),
};

export const dataviewListByTagArgsSchema = z
  .object({
    tag: z.string().min(1).describe("Tag to filter by. With or without leading `#`."),
    ...sharedDqlFields,
  })
  .strict()
  .describe("Sugar wrapper around `LIST FROM #tag`.");
export type DataviewListByTagArgs = z.input<typeof dataviewListByTagArgsSchema>;

export const dataviewListByFolderArgsSchema = z
  .object({
    folder: z.string().min(1).describe("Vault-relative folder to filter by."),
    ...sharedDqlFields,
  })
  .strict()
  .describe('Sugar wrapper around `LIST FROM "folder"`.');
export type DataviewListByFolderArgs = z.input<typeof dataviewListByFolderArgsSchema>;

export const dataviewTableArgsSchema = z
  .object({
    fields: z
      .array(z.string().min(1))
      .min(1)
      .describe("Field expressions to project as table columns (e.g. `file.name`, `priority`)."),
    fromClause: z
      .string()
      .optional()
      .describe("Optional DQL `FROM` clause body. Example: `#projects AND -#archive`."),
    ...sharedDqlFields,
  })
  .strict()
  .describe("Sugar wrapper around `TABLE … FROM …`.");
export type DataviewTableArgs = z.input<typeof dataviewTableArgsSchema>;

export const dataviewIndexArgsSchema = z
  .object({
    filePath: notePathSchema,
    vaultPath: z.string().optional(),
  })
  .strict()
  .describe("Arguments for `dataview.index`.");
export type DataviewIndexArgs = z.input<typeof dataviewIndexArgsSchema>;

const fieldsReadExtractShape = z.object({
  op: z.literal("extract"),
  filePath: notePathSchema,
  vaultPath: z.string().optional(),
});

const fieldsReadSearchShape = z.object({
  op: z.literal("search"),
  key: z.string().min(1).describe("Dataview field key to match."),
  value: z
    .unknown()
    .optional()
    .describe("Optional value to match. Omit to match any value for the key."),
  valueType: z
    .enum(["string", "number", "boolean", "date", "link", "list"])
    .optional()
    .describe("Interpret `value` as this type before comparison."),
  scope: z
    .enum(["page", "list", "task", "all"])
    .optional()
    .describe(
      "Restrict which Dataview field scopes to search: `page` = frontmatter/page-level; `list` = list-item fields; `task` = task-line fields; `all` = everything.",
    ),
  vaultPath: z.string().optional(),
});

export const dataviewFieldsReadArgsSchema = z
  .discriminatedUnion("op", [fieldsReadExtractShape, fieldsReadSearchShape])
  .describe(
    "Discriminated union on `op`. `extract` returns every Dataview field declared in a single note. `search` finds notes whose fields match a key (and optionally a value) across the vault.",
  );
export type DataviewFieldsReadArgs = z.input<typeof dataviewFieldsReadArgsSchema>;

const syntaxTypeSchema = z
  .enum(["full-line", "bracket", "paren"])
  .optional()
  .describe(
    "How to render the field: `full-line` = field on its own line (`key:: value`); `bracket` = `[key:: value]` inline; `paren` = `(key:: value)` inline.",
  );

const fieldsWriteAddShape = z.object({
  op: z.literal("add"),
  filePath: notePathSchema,
  key: z.string().min(1).describe("Dataview field key to insert."),
  value: z
    .unknown()
    .describe("Field value. Strings, numbers, booleans, dates, and lists are all valid."),
  syntaxType: syntaxTypeSchema,
  insertAt: z
    .enum(["start", "end", "afterFrontmatter"])
    .optional()
    .describe(
      "Where to place the field in the note body. Defaults to `afterFrontmatter`. Ignored when `lineNumber` is given.",
    ),
  scope: z.enum(["page", "list", "task"]).optional(),
  lineNumber: positiveIntSchema
    .optional()
    .describe("Explicit 1-based line number to insert at. Overrides `insertAt`."),
  vaultPath: z.string().optional(),
});

const fieldsWriteRemoveShape = z.object({
  op: z.literal("remove"),
  filePath: notePathSchema,
  key: z.string().min(1).describe("Field key to remove."),
  lineNumber: positiveIntSchema
    .optional()
    .describe(
      "Restrict removal to a single line. Omit to remove every occurrence of the key within `scope`.",
    ),
  scope: z.enum(["page", "list", "task", "all"]).optional(),
  vaultPath: z.string().optional(),
});

export const dataviewFieldsWriteArgsSchema = z
  .discriminatedUnion("op", [fieldsWriteAddShape, fieldsWriteRemoveShape])
  .describe(
    "Discriminated union on `op`. `add` inserts a Dataview field; `remove` deletes every occurrence of a key (optionally scoped by line or Dataview scope).",
  );
export type DataviewFieldsWriteArgs = z.input<typeof dataviewFieldsWriteArgsSchema>;
