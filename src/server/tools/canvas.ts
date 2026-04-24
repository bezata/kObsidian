import {
  addCanvasEdge,
  addCanvasNode,
  createCanvas,
  getCanvasNodeConnections,
  parseCanvas,
  removeCanvasNode,
} from "../../domain/canvas.js";
import {
  type CanvasConnectionsArgs,
  type CanvasCreateArgs,
  type CanvasEditArgs,
  type CanvasParseArgs,
  canvasConnectionsArgsSchema,
  canvasConnectionsOutputSchema,
  canvasCreateArgsSchema,
  canvasEditArgsSchema,
  canvasParseArgsSchema,
  canvasParseOutputSchema,
} from "../../schema/canvas.js";
import type { ToolDefinition } from "../tool-definition.js";
import { ADDITIVE, READ_ONLY, mutationResultSchema } from "../tool-schemas.js";

export const canvasTools: ToolDefinition[] = [
  {
    name: "canvas.create",
    title: "Create Canvas",
    description:
      "Create a new empty Obsidian canvas (`.canvas`) file at the given path. Fails if the path already exists unless `overwrite: true` is passed. Canvas files are JSON documents that Obsidian renders as an infinite spatial whiteboard of nodes and edges. Use `canvas.edit` to add nodes/edges once the file exists.",
    inputSchema: canvasCreateArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = canvasCreateArgsSchema.parse(rawArgs) as CanvasCreateArgs;
      return createCanvas(context, args);
    },
  },
  {
    name: "canvas.parse",
    title: "Parse Canvas",
    description:
      "Parse an Obsidian canvas file and return its full structure: every node (text, file, link, group) and every edge. Use this when you need the complete graph; for just the neighbours of a specific node, call `canvas.connections` instead. Read-only.",
    inputSchema: canvasParseArgsSchema,
    outputSchema: canvasParseOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = canvasParseArgsSchema.parse(rawArgs) as CanvasParseArgs;
      return parseCanvas(context, args);
    },
  },
  {
    name: "canvas.connections",
    title: "Canvas Node Connections",
    description:
      "Return the incoming and outgoing edges of a single canvas node. Use this to walk the canvas graph one node at a time without loading the full document. Read-only. For full-graph parsing, use `canvas.parse`.",
    inputSchema: canvasConnectionsArgsSchema,
    outputSchema: canvasConnectionsOutputSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = canvasConnectionsArgsSchema.parse(rawArgs) as CanvasConnectionsArgs;
      return getCanvasNodeConnections(context, args);
    },
  },
  {
    name: "canvas.edit",
    title: "Edit Canvas",
    description:
      "Mutate a canvas: add a node, add an edge, or remove a node. The `op` field selects the mutation. `add-node` needs `nodeType` (`text` for inline markdown or `file` for an embedded note), `content`, `x`, `y` (plus optional `width`/`height`). `add-edge` needs `fromNode` and `toNode` ids (plus optional `label`). `remove-node` needs `nodeId` — removing a node also removes every edge incident to it (destructive). Returns a standard mutation envelope.",
    inputSchema: canvasEditArgsSchema,
    outputSchema: mutationResultSchema,
    annotations: ADDITIVE,
    handler: async (context, rawArgs) => {
      const args = canvasEditArgsSchema.parse(rawArgs) as CanvasEditArgs;
      if (args.op === "add-node") {
        const { op: _op, ...rest } = args;
        return addCanvasNode(context, rest);
      }
      if (args.op === "add-edge") {
        const { op: _op, ...rest } = args;
        return addCanvasEdge(context, rest);
      }
      const { op: _op, ...rest } = args;
      return removeCanvasNode(context, rest);
    },
    inputExamples: [
      {
        description: "Add a text node to a canvas",
        input: {
          op: "add-node",
          filePath: "Boards/map.canvas",
          nodeType: "text",
          content: "Research question",
          x: 0,
          y: 0,
          width: 280,
          height: 80,
        },
      },
      {
        description: "Connect two existing nodes with a labelled edge",
        input: {
          op: "add-edge",
          filePath: "Boards/map.canvas",
          fromNode: "n1",
          toNode: "n2",
          label: "depends on",
        },
      },
      {
        description: "Remove a node and all its edges",
        input: { op: "remove-node", filePath: "Boards/map.canvas", nodeId: "n3" },
      },
    ],
  },
];
