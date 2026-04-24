import { readNote } from "../../domain/notes.js";
import {
  addTags,
  extractAllTags,
  listTags,
  removeTags,
  searchByTag,
  updateTags,
} from "../../domain/tags.js";
import {
  type TagsAnalyzeArgs,
  type TagsListArgs,
  type TagsModifyArgs,
  type TagsSearchArgs,
  tagsAnalyzeArgsSchema,
  tagsAnalyzeOutputSchema,
  tagsListArgsSchema,
  tagsListOutputSchema,
  tagsModifyArgsSchema,
  tagsModifyOutputSchema,
  tagsSearchArgsSchema,
  tagsSearchOutputSchema,
} from "../../schema/tags.js";
import type { ToolDefinition } from "../tool-definition.js";
import { IDEMPOTENT_ADDITIVE, READ_ONLY } from "../tool-schemas.js";

export const tagTools: ToolDefinition[] = [
  {
    name: "tags.modify",
    title: "Modify Tags",
    description:
      "Mutate the frontmatter `tags` list of a single note. Four ops are supported: `add` unions the incoming tags with the existing list (duplicates dropped); `remove` drops any incoming tag currently present; `replace` overwrites the list entirely; `merge` is an alias for `add`. Leading `#` on incoming tags is stripped automatically. This tool only touches the frontmatter block — inline `#tag` occurrences in the body are left untouched. Idempotent: repeated calls with the same op and tags converge on the same result. Returns `{changed, target, summary, op, tagsAfter}`.",
    inputSchema: tagsModifyArgsSchema,
    outputSchema: tagsModifyOutputSchema,
    annotations: IDEMPOTENT_ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = tagsModifyArgsSchema.parse(rawArgs) as TagsModifyArgs;
      const mutationArgs = { path: args.path, tags: args.tags, vaultPath: args.vaultPath };
      if (args.op === "add" || args.op === "merge") {
        const result = await addTags(context, mutationArgs);
        return { ...result, op: args.op, tagsAfter: result.allTags };
      }
      if (args.op === "remove") {
        const result = await removeTags(context, mutationArgs);
        return { ...result, op: args.op, tagsAfter: result.remainingTags };
      }
      const result = await updateTags(context, { ...mutationArgs, merge: false });
      return { ...result, op: args.op, tagsAfter: result.newTags };
    },
    inputExamples: [
      {
        description: "Add two tags to a note (idempotent)",
        input: { path: "Projects/Alpha.md", op: "add", tags: ["in-progress", "priority/high"] },
      },
      {
        description: "Replace a note's entire tag set",
        input: { path: "Inbox/today.md", op: "replace", tags: ["processed"] },
      },
    ],
  },
  {
    name: "tags.search",
    title: "Search Notes By Tag",
    description:
      "Find every note in the vault that contains a given tag, either in frontmatter `tags` or as an inline `#tag` in the body. Leading `#` on the query is stripped. For each hit, the result carries `{file, absolutePath, tagLocations: {frontmatter, inline}}` so callers can distinguish where the tag came from. Read-only. For analyzing tags of ONE specific note (not a vault-wide search), use `tags.analyze` instead.",
    inputSchema: tagsSearchArgsSchema,
    outputSchema: tagsSearchOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = tagsSearchArgsSchema.parse(rawArgs) as TagsSearchArgs;
      return searchByTag(context, args);
    },
  },
  {
    name: "tags.analyze",
    title: "Analyze Note Tags",
    description:
      "Return the tags present in a single note, split into `frontmatterTags`, `inlineTags`, and their de-duplicated union `allTags`. Use this when you have one note and want to know what tags it carries — contrast with `tags.search`, which scans the whole vault for one specific tag. Read-only.",
    inputSchema: tagsAnalyzeArgsSchema,
    outputSchema: tagsAnalyzeOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = tagsAnalyzeArgsSchema.parse(rawArgs) as TagsAnalyzeArgs;
      const note = await readNote(context, { path: args.path, vaultPath: args.vaultPath });
      return { path: note.path, ...extractAllTags(note.content) };
    },
  },
  {
    name: "tags.list",
    title: "List All Tags",
    description:
      "List every unique tag used across the vault (frontmatter and inline combined). With `includeCounts: true`, each item includes how many notes carry the tag; `sortBy` lets you sort by `name` or `count` (the latter requires counts). Read-only. For finding notes carrying a specific tag, use `tags.search`.",
    inputSchema: tagsListArgsSchema,
    outputSchema: tagsListOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = tagsListArgsSchema.parse(rawArgs) as TagsListArgs;
      return listTags(context, args);
    },
  },
];
