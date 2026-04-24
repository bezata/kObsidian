import {
  listMarpSlides,
  readMarpDeck,
  readMarpSlide,
  updateMarpFrontmatter,
  updateMarpSlide,
} from "../../domain/marp.js";
import {
  type MarpReadArgs,
  type MarpUpdateArgs,
  marpReadArgsSchema,
  marpUpdateArgsSchema,
} from "../../schema/marp.js";
import type { ToolDefinition } from "../tool-definition.js";
import {
  IDEMPOTENT_DESTRUCTIVE,
  READ_ONLY,
  looseObjectSchema,
  mutationResultSchema,
} from "../tool-schemas.js";

export const marpTools: ToolDefinition[] = [
  {
    name: "marp.read",
    title: "Read Marp Deck",
    description:
      "Read some or all of a Marp presentation deck (a markdown file with `marp: true` frontmatter and `---` slide separators). The `part` field selects what to return: `deck` returns the whole deck (frontmatter, all slides, directives); `slides` returns a list of slide summaries (separator and directive metadata, no body); `slide` returns one slide's full source, located by `slideId` or 0-based `index`. Output shape varies by `part` — see the description of each variant. Read-only. Use `marp.update` to mutate.",
    inputSchema: marpReadArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = marpReadArgsSchema.parse(rawArgs) as MarpReadArgs;
      if (args.part === "deck") {
        const { part: _p, ...rest } = args;
        return readMarpDeck(context, rest);
      }
      if (args.part === "slides") {
        const { part: _p, ...rest } = args;
        return listMarpSlides(context, rest);
      }
      const { part: _p, ...rest } = args;
      return readMarpSlide(context, rest);
    },
  },
  {
    name: "marp.update",
    title: "Update Marp Deck",
    description:
      "Mutate a Marp deck in place. `part:'slide'` replaces one slide's body (located by `slideId` or `index`) without touching neighbouring slides. `part:'frontmatter'` merges `fields` into the deck's frontmatter — unspecified fields are preserved; pass `null` to a field to unset it. Idempotent — re-running with identical inputs is a no-op on the file contents. Destructive — overwrites in place.",
    inputSchema: marpUpdateArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: IDEMPOTENT_DESTRUCTIVE,
    handler: async (context, rawArgs) => {
      const args = marpUpdateArgsSchema.parse(rawArgs) as MarpUpdateArgs;
      if (args.part === "slide") {
        const { part: _p, ...rest } = args;
        return updateMarpSlide(context, rest);
      }
      const { part: _p, ...rest } = args;
      return updateMarpFrontmatter(context, rest);
    },
    inputExamples: [
      {
        description: "Replace the second slide's body",
        input: {
          part: "slide",
          filePath: "Decks/launch.md",
          index: 1,
          source: "# New headline\n\nUpdated body",
        },
      },
      {
        description: "Change the deck's theme and set a new title",
        input: {
          part: "frontmatter",
          filePath: "Decks/launch.md",
          fields: { theme: "gaia", title: "Launch plan" },
        },
      },
    ],
  },
];
