import {
  createNoteFromTemplater,
  insertTemplaterTemplate,
  renderTemplaterTemplate,
} from "../../domain/api-tools.js";
import { createNoteFromTemplate, expandTemplate, listTemplates } from "../../domain/templates.js";
import { AppError } from "../../lib/errors.js";
import {
  type TemplatesListArgs,
  type TemplatesUseArgs,
  templatesListArgsSchema,
  templatesListOutputSchema,
  templatesUseArgsSchema,
} from "../../schema/templates.js";
import type { ToolDefinition } from "../tool-definition.js";
import { ADDITIVE, READ_ONLY, looseObjectSchema } from "../tool-schemas.js";

export const templateTools: ToolDefinition[] = [
  {
    name: "templates.list",
    title: "List Templates",
    description:
      "List markdown templates in the vault's templates folder (or a folder of your choosing via `templateFolder`). Use this to discover what templates are available before calling `templates.use`. Read-only. Only returns markdown (`.md`) files.",
    inputSchema: templatesListArgsSchema,
    outputSchema: templatesListOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = templatesListArgsSchema.parse(rawArgs) as TemplatesListArgs;
      return listTemplates(context, args);
    },
  },
  {
    name: "templates.use",
    title: "Use Template",
    description:
      "Render or apply a template using one of two engines. The `engine` field selects the engine and the `action` field selects the operation:\n\n- `engine:'filesystem'` — kObsidian's built-in `{{variable}}` substitution; no Obsidian plugin required. Actions: `render` (return the expanded text) or `create-note` (write a new note from the template).\n- `engine:'templater'` — delegate to the Templater Obsidian plugin via the Local REST API. Requires OBSIDIAN_API_URL and OBSIDIAN_REST_API_KEY. Actions: `render` (execute the template and return output), `create-note` (execute and write to `targetFile`), or `insert-active` (insert into the currently active note in Obsidian).\n\nThe `filesystem` engine is pure text substitution — it does NOT evaluate Templater's `<% … %>` scripts. Use `engine:'templater'` when you need dynamic evaluation.",
    inputSchema: templatesUseArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = templatesUseArgsSchema.parse(rawArgs) as TemplatesUseArgs;
      if (args.engine === "filesystem") {
        if (args.action === "render") {
          const { engine: _e, action: _a, ...rest } = args;
          return expandTemplate(context, rest);
        }
        const { engine: _e, action: _a, ...rest } = args;
        return createNoteFromTemplate(context, rest);
      }
      if (args.action === "render") {
        const { engine: _e, action: _a, ...rest } = args;
        return renderTemplaterTemplate(context, rest);
      }
      if (args.action === "create-note") {
        const { engine: _e, action: _a, ...rest } = args;
        return createNoteFromTemplater(context, rest);
      }
      if (args.action === "insert-active") {
        const { engine: _e, action: _a, ...rest } = args;
        return insertTemplaterTemplate(context, rest);
      }
      throw new AppError("invalid_argument", "Unsupported templates.use variant");
    },
    inputExamples: [
      {
        description: "Render a filesystem template to text (no file written)",
        input: {
          engine: "filesystem",
          action: "render",
          templatePath: "Templates/daily.md",
          variables: { date: "2026-04-24", topic: "kObsidian release planning" },
        },
      },
      {
        description: "Create a new note from a filesystem template",
        input: {
          engine: "filesystem",
          action: "create-note",
          templatePath: "Templates/daily.md",
          targetPath: "Journal/2026-04-24.md",
          variables: { date: "2026-04-24" },
        },
      },
      {
        description: "Use Templater to create a note via the Obsidian plugin",
        input: {
          engine: "templater",
          action: "create-note",
          templateFile: "Templates/meeting.md",
          targetFile: "Meetings/Kickoff.md",
          openFile: true,
        },
      },
    ],
  },
];
