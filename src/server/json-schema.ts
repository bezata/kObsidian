import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const JSON_SCHEMA_2020_12_URI = "https://json-schema.org/draft/2020-12/schema";

export type JsonSchema = Record<string, unknown>;

type ObjectBranch = JsonSchema & {
  type: "object";
  properties: Record<string, JsonSchema>;
  required?: string[];
};

type Variant = { label: string; schema: JsonSchema };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObjectBranch(value: unknown): value is ObjectBranch {
  return isRecord(value) && value.type === "object" && isRecord(value.properties);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, i) => deepEqual(item, right[i]));
  }
  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left);
    return (
      leftKeys.length === Object.keys(right).length &&
      leftKeys.every((key) => key in right && deepEqual(left[key], right[key]))
    );
  }
  return false;
}

function formatList(keys: string[]): string {
  return keys.map((key) => `\`${key}\``).join(", ");
}

function mergeProperty(variants: Variant[]): JsonSchema {
  const first = variants[0]?.schema;
  if (!first) return {};
  if (variants.every((variant) => deepEqual(variant.schema, first))) {
    return first;
  }

  // Keep only keywords every branch agrees on; the Zod schema still enforces
  // the per-branch constraints at call time.
  const merged: JsonSchema = {};
  for (const [keyword, value] of Object.entries(first)) {
    if (keyword === "description") continue;
    if (variants.every((variant) => deepEqual(variant.schema[keyword], value))) {
      merged[keyword] = value;
    }
  }
  if (merged.type === undefined) {
    const types = [
      ...new Set(
        variants
          .map((variant) => variant.schema.type)
          .filter((type): type is string => typeof type === "string"),
      ),
    ];
    if (types.length === 1) merged.type = types[0];
    else if (types.length > 1) merged.type = types;
  }

  const described = variants.filter(
    (variant) =>
      typeof variant.schema.description === "string" &&
      variant.schema.description.trim().length > 0,
  );
  const firstDescription = described[0]?.schema.description;
  if (firstDescription !== undefined) {
    const unanimous =
      described.length === variants.length &&
      described.every((variant) => variant.schema.description === firstDescription);
    merged.description = unanimous
      ? firstDescription
      : described
          .map((variant) => `When ${variant.label}: ${String(variant.schema.description).trim()}`)
          .join(" ");
  }
  return merged;
}

/**
 * Collapse a root-level `oneOf`/`anyOf` of object schemas — what Zod emits for
 * a discriminated union — into one flat object schema.
 *
 * The Anthropic API (and therefore Claude Code) rejects composition keywords at
 * the root of a tool input schema, and clients that tolerate them tend to strip
 * the union and present an empty `properties` map to the model. The flattened
 * shape lists every branch's fields once, turns each discriminant into an enum,
 * and documents per-branch requirements on the discriminant's description.
 * Only the advertisement is loosened; calls are still validated against the
 * original Zod schema.
 */
export function flattenRootUnion(schema: JsonSchema): JsonSchema {
  const branches = schema.oneOf ?? schema.anyOf;
  if (!Array.isArray(branches) || branches.length === 0) return schema;
  if (!branches.every(isObjectBranch)) {
    throw new Error("Root-level unions must be composed of object schemas");
  }

  const head = branches[0];
  if (!head) return schema;

  const discriminants = Object.keys(head.properties).filter((key) =>
    branches.every((branch) => "const" in (branch.properties[key] ?? {})),
  );
  const labels = branches.map((branch, i) =>
    discriminants.length > 0
      ? discriminants.map((key) => `\`${key}=${String(branch.properties[key]?.const)}\``).join(", ")
      : `branch ${i + 1}`,
  );

  const properties: Record<string, JsonSchema> = {};

  for (const [index, key] of discriminants.entries()) {
    const values = [...new Set(branches.map((branch) => branch.properties[key]?.const))];
    const types = [
      ...new Set(
        branches
          .map((branch) => branch.properties[key]?.type)
          .filter((type): type is string => typeof type === "string"),
      ),
    ];
    const hints = branches.map((branch, i) => {
      const required = (branch.required ?? []).filter((name) => !discriminants.includes(name));
      const optional = Object.keys(branch.properties).filter(
        (name) => !discriminants.includes(name) && !required.includes(name),
      );
      const parts = [
        required.length > 0 ? `requires ${formatList(required)}` : "requires no other fields",
      ];
      if (optional.length > 0) parts.push(`accepts ${formatList(optional)}`);
      return `${labels[i]}: ${parts.join("; ")}.`;
    });
    properties[key] = {
      ...(types.length === 1 ? { type: types[0] } : {}),
      enum: values,
      description:
        index === 0
          ? `Selects the input shape. ${hints.join(" ")}`
          : `Secondary selector; valid combinations are listed under \`${discriminants[0]}\`.`,
    };
  }

  const otherKeys: string[] = [];
  for (const branch of branches) {
    for (const key of Object.keys(branch.properties)) {
      if (!discriminants.includes(key) && !otherKeys.includes(key)) otherKeys.push(key);
    }
  }
  for (const key of otherKeys) {
    const variants: Variant[] = [];
    for (const [i, branch] of branches.entries()) {
      const property = branch.properties[key];
      if (isRecord(property)) {
        variants.push({ label: labels[i] ?? `branch ${i + 1}`, schema: property });
      }
    }
    properties[key] = mergeProperty(variants);
  }

  const required = [
    ...discriminants,
    ...otherKeys.filter((key) => branches.every((branch) => (branch.required ?? []).includes(key))),
  ];

  const { oneOf: _oneOf, anyOf: _anyOf, ...rest } = schema;
  return {
    ...rest,
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

export function toMcpObjectSchema(
  schema: z.ZodTypeAny,
  io: "input" | "output",
): Tool["inputSchema"] {
  const jsonSchema = flattenRootUnion(
    z.toJSONSchema(schema, { target: "draft-2020-12", io }) as JsonSchema,
  );

  if (jsonSchema.type !== undefined && jsonSchema.type !== "object") {
    throw new Error(`MCP ${io} schemas must describe objects (got ${String(jsonSchema.type)})`);
  }

  return {
    ...jsonSchema,
    $schema: JSON_SCHEMA_2020_12_URI,
    type: "object",
  } as Tool["inputSchema"];
}
