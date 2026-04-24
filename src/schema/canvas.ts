import { z } from "zod";
import { canvasPathSchema, positiveIntSchema } from "./primitives.js";

const canvasFilePathSchema = z
  .string()
  .min(1)
  .describe("Vault-relative path to an Obsidian `.canvas` file.");

export const canvasCreateArgsSchema = z
  .object({
    filePath: canvasPathSchema.describe("Path for the new canvas (must end in `.canvas`)."),
    overwrite: z
      .boolean()
      .optional()
      .describe("When true, overwrite an existing canvas at the path. Defaults to false."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type CanvasCreateArgs = z.input<typeof canvasCreateArgsSchema>;

export const canvasParseArgsSchema = z
  .object({
    filePath: canvasFilePathSchema,
    vaultPath: z.string().optional(),
  })
  .strict();
export type CanvasParseArgs = z.input<typeof canvasParseArgsSchema>;

export const canvasConnectionsArgsSchema = z
  .object({
    filePath: canvasFilePathSchema,
    nodeId: z.string().min(1).describe("Id of the node whose edges to return."),
    vaultPath: z.string().optional(),
  })
  .strict();
export type CanvasConnectionsArgs = z.input<typeof canvasConnectionsArgsSchema>;

const addNodeShape = z.object({
  op: z.literal("add-node"),
  filePath: canvasFilePathSchema,
  nodeType: z.enum(["text", "file"]).describe("`text` = inline text node; `file` = embed a note."),
  content: z
    .string()
    .min(1)
    .describe(
      "For `nodeType:'text'`, the markdown body. For `nodeType:'file'`, the vault-relative path of the note to embed.",
    ),
  x: z.number().describe("X coordinate on the canvas grid."),
  y: z.number().describe("Y coordinate on the canvas grid."),
  width: positiveIntSchema.optional().describe("Node width in canvas pixels. Defaults to 250."),
  height: positiveIntSchema.optional().describe("Node height in canvas pixels. Defaults to 60."),
  vaultPath: z.string().optional(),
});

const addEdgeShape = z.object({
  op: z.literal("add-edge"),
  filePath: canvasFilePathSchema,
  fromNode: z.string().min(1).describe("Id of the source node."),
  toNode: z.string().min(1).describe("Id of the target node."),
  label: z.string().optional().describe("Optional edge label displayed on the connection."),
  vaultPath: z.string().optional(),
});

const removeNodeShape = z.object({
  op: z.literal("remove-node"),
  filePath: canvasFilePathSchema,
  nodeId: z
    .string()
    .min(1)
    .describe(
      "Id of the node to remove. Any edges incident to the node are removed too — this op is destructive.",
    ),
  vaultPath: z.string().optional(),
});

export const canvasEditArgsSchema = z
  .discriminatedUnion("op", [addNodeShape, addEdgeShape, removeNodeShape])
  .describe(
    "Discriminated union on `op` — add a node, add an edge, or remove a node (which also removes its incident edges).",
  );
export type CanvasEditArgs = z.input<typeof canvasEditArgsSchema>;

export const canvasParseOutputSchema = z
  .object({
    filePath: z.string(),
    nodes: z.array(z.record(z.string(), z.unknown())),
    edges: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

export const canvasConnectionsOutputSchema = z
  .object({
    filePath: z.string(),
    nodeId: z.string(),
    incoming: z.array(z.record(z.string(), z.unknown())),
    outgoing: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();
