import { z } from "zod";
import { notePathSchema } from "./primitives.js";

export const templatesListArgsSchema = z
  .object({
    templateFolder: z
      .string()
      .optional()
      .describe(
        "Folder to scan for templates. Defaults to the vault's configured Templates folder.",
      ),
    vaultPath: z.string().optional(),
  })
  .strict();
export type TemplatesListArgs = z.input<typeof templatesListArgsSchema>;

const templateEngineSchema = z
  .enum(["filesystem", "templater"])
  .describe(
    "`filesystem` = simple `{{variable}}` substitution applied by kObsidian itself (no Obsidian plugin required). `templater` = delegate to the Templater Obsidian plugin via the Local REST API (requires OBSIDIAN_API_URL/OBSIDIAN_REST_API_KEY).",
  );

// Filesystem engine variants — render to text, or create a new note.
const filesystemRenderShape = z.object({
  engine: z.literal("filesystem"),
  action: z.literal("render"),
  templatePath: notePathSchema.describe("Vault-relative path of the template markdown file."),
  variables: z
    .record(z.string(), z.string())
    .optional()
    .describe("Map of `{{var}}` placeholders to replacement strings."),
  filename: z
    .string()
    .optional()
    .describe("Optional filename hint that can be referenced in the template as `{{filename}}`."),
  vaultPath: z.string().optional(),
});

const filesystemCreateShape = z.object({
  engine: z.literal("filesystem"),
  action: z.literal("create-note"),
  templatePath: notePathSchema,
  targetPath: notePathSchema.describe("Path where the new note should be written."),
  variables: z.record(z.string(), z.string()).optional(),
  vaultPath: z.string().optional(),
});

// Templater engine variants — requires the Local REST API + Templater plugin.
const templaterRenderShape = z.object({
  engine: z.literal("templater"),
  action: z.literal("render"),
  templateFile: z.string().min(1).describe("Path of the Templater template file."),
  targetFile: z
    .string()
    .optional()
    .describe("Where the rendered output should land; omit for a dry render."),
});

const templaterCreateShape = z.object({
  engine: z.literal("templater"),
  action: z.literal("create-note"),
  templateFile: z.string().min(1),
  targetFile: z.string().min(1).describe("Path of the note to create from the Templater template."),
  openFile: z.boolean().optional().describe("Open the newly-created note in Obsidian."),
});

const templaterInsertShape = z.object({
  engine: z.literal("templater"),
  action: z.literal("insert-active"),
  templateFile: z.string().min(1),
  activeFile: z
    .boolean()
    .optional()
    .describe("When true, requires an active file in Obsidian (default true)."),
});

export const templatesUseArgsSchema = z
  .discriminatedUnion("engine", [
    filesystemRenderShape,
    filesystemCreateShape,
    templaterRenderShape,
    templaterCreateShape,
    templaterInsertShape,
  ])
  .describe(
    "Discriminated union on `engine`. The `action` field then selects the operation within that engine. `filesystem` supports `render` and `create-note`; `templater` supports `render`, `create-note`, and `insert-active`.",
  );
export type TemplatesUseArgs = z.input<typeof templatesUseArgsSchema>;

export const templatesListOutputSchema = z
  .object({
    total: z.number().int().nonnegative(),
    items: z.array(
      z
        .object({
          path: z.string(),
          name: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
