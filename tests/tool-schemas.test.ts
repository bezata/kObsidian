import { describe, expect, it } from "vitest";
import { z } from "zod";
import { notesCreateArgsSchema, notesEditArgsSchema } from "../src/schema/notes.js";
import { templatesUseArgsSchema } from "../src/schema/templates.js";
import { flattenRootUnion, toMcpObjectSchema } from "../src/server/json-schema.js";
import { toolRegistry } from "../src/server/registry.js";

// biome-ignore lint/suspicious/noExplicitAny: JSON Schema is inspected structurally.
type Schema = Record<string, any>;

function rawJsonSchema(schema: z.ZodTypeAny): Schema {
  return z.toJSONSchema(schema, { target: "draft-2020-12", io: "input" }) as Schema;
}

const DISCRIMINATED_UNION_TOOLS = [
  "notes.create",
  "notes.edit",
  "notes.move",
  "dataview.fields.read",
  "dataview.fields.write",
  "marp.read",
  "marp.update",
  "kanban.card",
  "canvas.edit",
  "templates.use",
];

describe("advertised tool schemas (issue #38)", () => {
  it("never exposes oneOf/anyOf/allOf at the root and always lists properties", () => {
    for (const tool of toolRegistry) {
      if (!tool.inputSchema) continue;
      const advertised = toMcpObjectSchema(tool.inputSchema, "input") as Schema;
      expect(advertised.type, tool.name).toBe("object");
      expect(advertised.oneOf, tool.name).toBeUndefined();
      expect(advertised.anyOf, tool.name).toBeUndefined();
      expect(advertised.allOf, tool.name).toBeUndefined();
      expect(typeof advertised.properties, tool.name).toBe("object");

      if (tool.outputSchema) {
        const output = toMcpObjectSchema(tool.outputSchema, "output") as Schema;
        expect(output.type, tool.name).toBe("object");
        expect(output.oneOf, tool.name).toBeUndefined();
      }
    }
  });

  it("flattens every discriminated-union tool so the discriminant is an enum in properties", () => {
    const unionTools = toolRegistry.filter(
      (tool) => tool.inputSchema && Array.isArray(rawJsonSchema(tool.inputSchema).oneOf),
    );
    expect(unionTools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(DISCRIMINATED_UNION_TOOLS),
    );

    for (const tool of unionTools) {
      if (!tool.inputSchema) continue;
      const raw = rawJsonSchema(tool.inputSchema);
      const advertised = toMcpObjectSchema(tool.inputSchema, "input") as Schema;
      const branches = raw.oneOf as Schema[];
      const discriminant = Object.keys(branches[0]?.properties ?? {}).find((key) =>
        branches.every((branch) => "const" in branch.properties[key]),
      );
      expect(discriminant, tool.name).toBeDefined();
      if (!discriminant) continue;

      const expectedValues = branches.map((branch) => branch.properties[discriminant].const);
      expect(advertised.properties[discriminant].enum, tool.name).toEqual(
        expect.arrayContaining(expectedValues),
      );
      expect(advertised.required, tool.name).toContain(discriminant);

      // Every field from every branch must be discoverable at the root.
      for (const branch of branches) {
        for (const key of Object.keys(branch.properties)) {
          expect(advertised.properties[key], `${tool.name}.${key}`).toBeDefined();
        }
      }
    }
  });
});

describe("flattenRootUnion", () => {
  it("returns non-union schemas untouched", () => {
    const flat = rawJsonSchema(z.object({ a: z.string() }));
    expect(flattenRootUnion(flat)).toBe(flat);
  });

  it("merges notes.create branches into one object schema", () => {
    const schema = flattenRootUnion(rawJsonSchema(notesCreateArgsSchema)) as Schema;
    expect(schema.type).toBe("object");
    expect(schema.oneOf).toBeUndefined();
    expect(Object.keys(schema.properties)).toEqual([
      "kind",
      "path",
      "content",
      "ifExists",
      "vaultPath",
    ]);
    expect(schema.properties.kind).toMatchObject({ type: "string", enum: ["note", "folder"] });
    expect(schema.properties.kind.description).toContain("`kind=note`: requires `path`, `content`");
    expect(schema.properties.kind.description).toContain("`kind=folder`: requires `path`");
    expect(schema.required).toEqual(["kind", "path"]);
    expect(schema.description).toContain("Discriminated union on `kind`");
    // `path` differs per branch (maxLength only on notes): shared keywords survive.
    expect(schema.properties.path).toMatchObject({ type: "string", minLength: 1 });
    expect(schema.properties.path.maxLength).toBeUndefined();
  });

  it("labels per-branch descriptions when a shared field means different things", () => {
    const schema = flattenRootUnion(rawJsonSchema(notesEditArgsSchema)) as Schema;
    expect(schema.properties.mode.enum).toEqual([
      "replace",
      "append",
      "prepend",
      "after-heading",
      "after-block",
    ]);
    expect(schema.properties.anchor.type).toBe("string");
    expect(schema.properties.anchor.description).toContain("When `mode=after-heading`:");
    expect(schema.properties.anchor.description).toContain("When `mode=after-block`:");
    expect(schema.required).toEqual(["mode", "path", "content"]);
  });

  it("supports unions with more than one literal key", () => {
    const schema = flattenRootUnion(rawJsonSchema(templatesUseArgsSchema)) as Schema;
    expect(schema.properties.engine.enum).toEqual(["filesystem", "templater"]);
    expect(schema.properties.action.enum).toEqual(["render", "create-note", "insert-active"]);
    expect(schema.properties.engine.description).toContain(
      "`engine=templater`, `action=insert-active`",
    );
    expect(schema.required).toEqual(expect.arrayContaining(["engine", "action"]));
  });
});
