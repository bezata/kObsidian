import {
  analyzeLinkHealth,
  findBrokenLinks,
  findHubNotes,
  findOrphanedNotes,
  getBacklinks,
  getLinkGraph,
  getNoteConnections,
  getOutgoingLinks,
} from "../../domain/links.js";
import {
  type LinksBacklinksArgs,
  type LinksBrokenArgs,
  type LinksConnectionsArgs,
  type LinksGraphArgs,
  type LinksHealthArgs,
  type LinksHubsArgs,
  type LinksOrphanedArgs,
  type LinksOutgoingArgs,
  linksBacklinksArgsSchema,
  linksBrokenArgsSchema,
  linksConnectionsArgsSchema,
  linksGraphArgsSchema,
  linksHealthArgsSchema,
  linksHubsArgsSchema,
  linksOrphanedArgsSchema,
  linksOutgoingArgsSchema,
} from "../../schema/links.js";
import type { ToolDefinition } from "../tool-definition.js";
import { READ_ONLY, listResultSchema, looseObjectSchema } from "../tool-schemas.js";

export const linkTools: ToolDefinition[] = [
  {
    name: "links.backlinks",
    title: "Get Backlinks",
    description:
      "Find every note that links TO a target note (inbound references). Supports both wiki-style `[[Note]]` and markdown-style `[text](Note.md)` links. When `includeContext:true`, each result carries a `contextLength`-char snippet of surrounding text so the agent can judge link intent without re-reading each source. Read-only. For outbound links (what a note points AT), use `links.outgoing`.",
    inputSchema: linksBacklinksArgsSchema,
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = linksBacklinksArgsSchema.parse(rawArgs) as LinksBacklinksArgs;
      return getBacklinks(context, args);
    },
  },
  {
    name: "links.outgoing",
    title: "Get Outgoing Links",
    description:
      "Extract every link FROM a note (outbound references) — wiki-style `[[…]]` and markdown-style `[…](…)`. When `checkValidity:true`, each entry carries a `valid` flag indicating whether the target path resolves in the vault. Read-only. For inbound references (what points AT the note), use `links.backlinks`.",
    inputSchema: linksOutgoingArgsSchema,
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = linksOutgoingArgsSchema.parse(rawArgs) as LinksOutgoingArgs;
      return getOutgoingLinks(context, args);
    },
  },
  {
    name: "links.broken",
    title: "Find Broken Links",
    description:
      "Find every link in the vault (or a `directory` subtree) whose target does not resolve to an existing note. Each result carries the source file, line number, link text, and unresolved target. Read-only. Pair with `notes.move` (with `updateLinks:true`) to fix them after moves.",
    inputSchema: linksBrokenArgsSchema,
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = linksBrokenArgsSchema.parse(rawArgs) as LinksBrokenArgs;
      return findBrokenLinks(context, args);
    },
  },
  {
    name: "links.graph",
    title: "Get Link Graph",
    description:
      "Build a full vault link graph: every note becomes a node, every outbound link becomes a directed edge. Return shape is `{nodes, edges, stats}` where nodes carry basic metadata (path, title) and edges carry source/target and link kind. Expensive for large vaults — prefer `links.backlinks`, `links.outgoing`, or `links.connections` for targeted queries. Read-only.",
    inputSchema: linksGraphArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = linksGraphArgsSchema.parse(rawArgs) as LinksGraphArgs;
      return getLinkGraph(context, args);
    },
  },
  {
    name: "links.orphaned",
    title: "Find Orphaned Notes",
    description:
      "Return every note with zero incoming AND zero outgoing links — i.e., notes that are disconnected from the rest of the vault graph. Useful for cleanup passes. Read-only. Often paired with `links.hubs` and `links.broken` in a weekly vault-health routine.",
    inputSchema: linksOrphanedArgsSchema,
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = linksOrphanedArgsSchema.parse(rawArgs) as LinksOrphanedArgs;
      return findOrphanedNotes(context, args);
    },
  },
  {
    name: "links.hubs",
    title: "Find Hub Notes",
    description:
      "Return notes with at least `minOutlinks` outgoing links (default 10), sorted by outbound count descending — the vault's connective tissue / MOCs / curated indexes. Each result carries `{path, title, outbound, inbound}`. Read-only. Use this to find pages that already act as navigational anchors (good seeds for `links.connections`); use `links.health` for a single rolled-up score across the whole vault, and `links.graph` when you need the full raw edge list rather than just the dense nodes.",
    inputSchema: linksHubsArgsSchema,
    outputSchema: listResultSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = linksHubsArgsSchema.parse(rawArgs) as LinksHubsArgs;
      return findHubNotes(context, args);
    },
  },
  {
    name: "links.health",
    title: "Analyze Link Health",
    description:
      "Summarise link health for the whole vault: total link count, broken-link count and ratio, orphan-note count, average outbound/inbound link density, and a list of the top hub notes. Read-only. Use this as a dashboard check; call `links.broken`/`links.orphaned`/`links.hubs` for the full per-item lists.",
    inputSchema: linksHealthArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = linksHealthArgsSchema.parse(rawArgs) as LinksHealthArgs;
      return analyzeLinkHealth(context, args);
    },
  },
  {
    name: "links.connections",
    title: "Explore Note Connections",
    description:
      "Explore the graph neighbourhood around a seed note — direct and multi-hop connections up to `depth` hops (default 2). Returns the set of reachable notes plus the paths that reach them. Higher `depth` values blow up result size quickly; keep it ≤3 unless you know the graph is sparse. Read-only.",
    inputSchema: linksConnectionsArgsSchema,
    outputSchema: looseObjectSchema,
    annotations: READ_ONLY,
    handler: async (context, rawArgs) => {
      const args = linksConnectionsArgsSchema.parse(rawArgs) as LinksConnectionsArgs;
      return getNoteConnections(context, args);
    },
  },
];
