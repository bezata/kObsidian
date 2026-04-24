import {
  executeDataviewQuery,
  listNotesByFolderDql,
  listNotesByTagDql,
  tableQueryDql,
} from "../../domain/api-tools.js";
import {
  addDataviewField,
  extractDataviewFieldsFromFile,
  readDataviewIndex,
  removeDataviewField,
  searchByDataviewField,
} from "../../domain/dataview.js";
import {
  type DataviewFieldsReadArgs,
  type DataviewFieldsWriteArgs,
  type DataviewIndexArgs,
  type DataviewListByFolderArgs,
  type DataviewListByTagArgs,
  type DataviewQueryArgs,
  type DataviewTableArgs,
  dataviewFieldsReadArgsSchema,
  dataviewFieldsWriteArgsSchema,
  dataviewIndexArgsSchema,
  dataviewListByFolderArgsSchema,
  dataviewListByTagArgsSchema,
  dataviewQueryArgsSchema,
  dataviewTableArgsSchema,
} from "../../schema/dataview.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  IDEMPOTENT_ADDITIVE,
  READ_ONLY,
  READ_ONLY_OPEN_WORLD,
  looseObjectSchema,
  mutationResultSchema,
} from "../tool-schemas.js";

export const dataviewTools: ToolDefinition[] = [
  {
    name: "dataview.query",
    title: "Run Dataview Query",
    description:
      'Execute an arbitrary Dataview Query Language (DQL) query through the Obsidian Local REST API. The query string is raw DQL — e.g. `LIST FROM #inbox`, `TASK WHERE !completed`, `TABLE file.mtime FROM "Journal"`. Requires the Dataview plugin to be enabled in Obsidian and the Local REST API plugin to be configured (OBSIDIAN_API_URL/OBSIDIAN_REST_API_KEY). For common patterns (list-by-tag, list-by-folder, table) the sugar tools `dataview.listByTag`/`listByFolder`/`table` are easier to use — prefer those when applicable and fall back to `dataview.query` for custom DQL.',
    inputSchema: dataviewQueryArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: async (context, rawArgs) => {
      const args = dataviewQueryArgsSchema.parse(rawArgs) as DataviewQueryArgs;
      return executeDataviewQuery(context, args);
    },
  },
  {
    name: "dataview.listByTag",
    title: "List Notes By Tag",
    description:
      "Convenience wrapper that runs `LIST FROM #tag` (optionally with `WHERE`, `SORT`, and `LIMIT` clauses). Returns the same shape as `dataview.query`. Requires the Dataview and Local REST API plugins. Use this instead of authoring raw DQL when filtering by a single tag.",
    inputSchema: dataviewListByTagArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: async (context, rawArgs) => {
      const args = dataviewListByTagArgsSchema.parse(rawArgs) as DataviewListByTagArgs;
      return listNotesByTagDql(context, args);
    },
  },
  {
    name: "dataview.listByFolder",
    title: "List Notes By Folder",
    description:
      'Convenience wrapper that runs `LIST FROM "folder"` (optionally with `WHERE`, `SORT`, and `LIMIT` clauses). Useful when you want every note under a vault folder. Requires the Dataview and Local REST API plugins.',
    inputSchema: dataviewListByFolderArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: async (context, rawArgs) => {
      const args = dataviewListByFolderArgsSchema.parse(rawArgs) as DataviewListByFolderArgs;
      return listNotesByFolderDql(context, args);
    },
  },
  {
    name: "dataview.table",
    title: "Run Dataview Table Query",
    description:
      "Convenience wrapper that runs `TABLE field1, field2, … FROM …` with optional `WHERE`, `SORT`, and `LIMIT` clauses. Use this when you need structured columnar output. Requires the Dataview and Local REST API plugins.",
    inputSchema: dataviewTableArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY_OPEN_WORLD,
    handler: async (context, rawArgs) => {
      const args = dataviewTableArgsSchema.parse(rawArgs) as DataviewTableArgs;
      return tableQueryDql(context, args);
    },
  },
  {
    name: "dataview.index",
    title: "Read Dataview Index",
    description:
      "Parse a single note and return everything Dataview would index from it: page-level metadata (title, aliases, tags, frontmatter fields), list-item fields, task-line fields, and both DQL and DataviewJS block locations. Read-only, runs locally (does NOT require the Local REST API). Use this to understand what Dataview sees in a note without running a query.",
    inputSchema: dataviewIndexArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = dataviewIndexArgsSchema.parse(rawArgs) as DataviewIndexArgs;
      return readDataviewIndex(context, args);
    },
  },
  {
    name: "dataview.fields.read",
    title: "Read Dataview Fields",
    description:
      "Read Dataview fields from the vault. `op:'extract'` returns every field declared in a single note (page, list-item, and task-line fields combined). `op:'search'` scans the whole vault for notes whose fields match a `key` (and optionally a `value` coerced by `valueType`); use `scope` to restrict which field kinds are considered. Read-only. For mutating fields, use `dataview.fields.write`.",
    inputSchema: dataviewFieldsReadArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = dataviewFieldsReadArgsSchema.parse(rawArgs) as DataviewFieldsReadArgs;
      if (args.op === "extract") {
        const { op: _op, ...rest } = args;
        return extractDataviewFieldsFromFile(context, rest);
      }
      const { op: _op, ...rest } = args;
      return searchByDataviewField(context, rest);
    },
  },
  {
    name: "dataview.fields.write",
    title: "Write Dataview Fields",
    description:
      "Insert or remove a Dataview field in a single note. `op:'add'` inserts a `key:: value` field; `syntaxType` picks the rendering (`full-line` = own line; `bracket` = `[key:: value]`; `paren` = `(key:: value)`); `insertAt` chooses placement (`start`, `end`, `afterFrontmatter`) unless `lineNumber` is given for precise control. `op:'remove'` deletes every occurrence of `key` (optionally restricted to a single `lineNumber` or a Dataview `scope`). Idempotent — re-running with the same args converges on the same document state.",
    inputSchema: dataviewFieldsWriteArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT_ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = dataviewFieldsWriteArgsSchema.parse(rawArgs) as DataviewFieldsWriteArgs;
      if (args.op === "add") {
        const { op: _op, ...rest } = args;
        return addDataviewField(context, rest);
      }
      const { op: _op, ...rest } = args;
      return removeDataviewField(context, rest);
    },
    inputExamples: [
      {
        description: "Add a full-line priority field after the frontmatter",
        input: {
          op: "add",
          filePath: "Projects/Alpha.md",
          key: "priority",
          value: "high",
          syntaxType: "full-line",
          insertAt: "afterFrontmatter",
        },
      },
      {
        description: "Remove every occurrence of the `status` field from a note",
        input: { op: "remove", filePath: "Projects/Alpha.md", key: "status", scope: "all" },
      },
    ],
  },
];
