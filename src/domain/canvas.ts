import { randomUUID } from "node:crypto";
import path from "node:path";
import { AppError } from "../lib/errors.js";
import { ensureDir, fileExists, readUtf8, writeUtf8 } from "../lib/filesystem.js";
import { resolveVaultPath } from "../lib/paths.js";
import { type DomainContext, requireVaultPath } from "./context.js";

type CanvasNode = Record<string, unknown> & { id: string };
type CanvasEdge = Record<string, unknown> & { id: string; fromNode: string; toNode: string };
type CanvasDocument = { nodes: CanvasNode[]; edges: CanvasEdge[] };

async function loadCanvas(filePath: string): Promise<CanvasDocument> {
  const raw = await readUtf8(filePath);
  try {
    const parsed = JSON.parse(raw) as Partial<CanvasDocument>;
    return {
      nodes: Array.isArray(parsed.nodes) ? (parsed.nodes as CanvasNode[]) : [],
      edges: Array.isArray(parsed.edges) ? (parsed.edges as CanvasEdge[]) : [],
    };
  } catch (error) {
    throw new AppError("invalid_argument", `Invalid canvas JSON: ${filePath}`, { cause: error });
  }
}

async function saveCanvas(filePath: string, canvas: CanvasDocument): Promise<void> {
  await writeUtf8(filePath, `${JSON.stringify(canvas, null, 2)}\n`);
}

export async function createCanvas(
  context: DomainContext,
  args: { filePath: string; overwrite?: boolean; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  if (!args.overwrite && (await fileExists(absolutePath))) {
    throw new AppError("conflict", `Canvas already exists: ${args.filePath}`);
  }
  await ensureDir(path.dirname(absolutePath));
  await saveCanvas(absolutePath, { nodes: [], edges: [] });
  return {
    changed: true,
    target: args.filePath,
    summary: `Created canvas ${args.filePath}`,
  };
}

export async function parseCanvas(
  context: DomainContext,
  args: { filePath: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const canvas = await loadCanvas(absolutePath);
  return {
    filePath: args.filePath,
    nodes: canvas.nodes,
    edges: canvas.edges,
    nodeCount: canvas.nodes.length,
    edgeCount: canvas.edges.length,
  };
}

export async function addCanvasNode(
  context: DomainContext,
  args: {
    filePath: string;
    nodeType: "text" | "file";
    content: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    vaultPath?: string;
  },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const canvas = (await fileExists(absolutePath))
    ? await loadCanvas(absolutePath)
    : { nodes: [], edges: [] };
  const nodeId = randomUUID();
  const node: CanvasNode =
    args.nodeType === "file"
      ? {
          id: nodeId,
          type: "file",
          file: args.content,
          x: args.x,
          y: args.y,
          width: args.width ?? 400,
          height: args.height ?? 400,
        }
      : {
          id: nodeId,
          type: "text",
          text: args.content,
          x: args.x,
          y: args.y,
          width: args.width ?? 250,
          height: args.height ?? 60,
        };
  canvas.nodes.push(node);
  await saveCanvas(absolutePath, canvas);
  return {
    changed: true,
    target: args.filePath,
    summary: `Added ${args.nodeType} node to ${args.filePath}`,
    nodeId,
  };
}

export async function addCanvasEdge(
  context: DomainContext,
  args: { filePath: string; fromNode: string; toNode: string; label?: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const canvas = await loadCanvas(absolutePath);
  const nodeIds = new Set(canvas.nodes.map((node) => node.id));
  if (!nodeIds.has(args.fromNode) || !nodeIds.has(args.toNode)) {
    throw new AppError("not_found", "Canvas edge endpoints must already exist");
  }
  const edgeId = randomUUID();
  canvas.edges.push({
    id: edgeId,
    fromNode: args.fromNode,
    toNode: args.toNode,
    ...(args.label ? { label: args.label } : {}),
  });
  await saveCanvas(absolutePath, canvas);
  return {
    changed: true,
    target: args.filePath,
    summary: `Added edge ${edgeId} to ${args.filePath}`,
    edgeId,
  };
}

export async function removeCanvasNode(
  context: DomainContext,
  args: { filePath: string; nodeId: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const canvas = await loadCanvas(absolutePath);
  const originalLength = canvas.nodes.length;
  canvas.nodes = canvas.nodes.filter((node) => node.id !== args.nodeId);
  if (canvas.nodes.length === originalLength) {
    throw new AppError("not_found", `Node not found: ${args.nodeId}`);
  }
  canvas.edges = canvas.edges.filter(
    (edge) => edge.fromNode !== args.nodeId && edge.toNode !== args.nodeId,
  );
  await saveCanvas(absolutePath, canvas);
  return {
    changed: true,
    target: args.filePath,
    summary: `Removed node ${args.nodeId} from ${args.filePath}`,
  };
}

export async function getCanvasNodeConnections(
  context: DomainContext,
  args: { filePath: string; nodeId: string; vaultPath?: string },
) {
  const vaultRoot = requireVaultPath(context, args.vaultPath);
  const absolutePath = resolveVaultPath(vaultRoot, args.filePath);
  const canvas = await loadCanvas(absolutePath);
  if (!canvas.nodes.some((node) => node.id === args.nodeId)) {
    throw new AppError("not_found", `Node not found: ${args.nodeId}`);
  }
  const incoming = canvas.edges
    .filter((edge) => edge.toNode === args.nodeId)
    .map((edge) => edge.fromNode);
  const outgoing = canvas.edges
    .filter((edge) => edge.fromNode === args.nodeId)
    .map((edge) => edge.toNode);
  return {
    filePath: args.filePath,
    nodeId: args.nodeId,
    incoming,
    outgoing,
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
  };
}
