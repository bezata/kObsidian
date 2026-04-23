import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { proposedEditOperationSchema } from "../schema/wiki.js";

function textMessage(role: "user" | "assistant", text: string) {
  return {
    role,
    content: { type: "text" as const, text },
  };
}

export function registerWikiPrompts(server: McpServer): void {
  server.registerPrompt(
    "ingest-source",
    {
      title: "Ingest Source Into Wiki",
      description:
        "Prompt template that instructs the agent to file a source using wiki.ingest and then apply the returned proposedEdits via notes.* tools.",
      argsSchema: {
        title: z.string().min(1),
        content: z.string().optional(),
        sourcePath: z.string().optional(),
        url: z.string().optional(),
        sourceType: z.string().optional(),
        tags: z.string().optional(),
        relatedConcepts: z.string().optional(),
        relatedEntities: z.string().optional(),
        summary: z.string().optional(),
      },
    },
    (args) => {
      const parts: string[] = [
        "You are ingesting a source into the kObsidian LLM Wiki.",
        "",
        "Step 1 — call the `wiki.ingest` tool with these arguments:",
        "",
        `- title: ${args.title}`,
      ];
      if (args.sourceType) parts.push(`- sourceType: ${args.sourceType}`);
      if (args.content) parts.push(`- content: |\n    ${args.content.replace(/\n/g, "\n    ")}`);
      if (args.sourcePath) parts.push(`- sourcePath: ${args.sourcePath}`);
      if (args.url) parts.push(`- url: ${args.url}`);
      if (args.tags) parts.push(`- tags: ${args.tags} (comma-separated)`);
      if (args.relatedConcepts) parts.push(`- relatedConcepts: ${args.relatedConcepts}`);
      if (args.relatedEntities) parts.push(`- relatedEntities: ${args.relatedEntities}`);
      if (args.summary) parts.push(`- summary: ${args.summary}`);
      const [opCreateStub, opInsertAfterHeading, opAppend] = proposedEditOperationSchema.options;
      parts.push(
        "",
        "Step 2 — iterate the returned `proposedEdits` array. For each proposal:",
        `- \`operation: ${opCreateStub}\` → use \`notes.create\` with the \`suggestedContent\`.`,
        `- \`operation: ${opInsertAfterHeading}\` → use \`notes.insertAfterHeading\` with the given \`heading\`.`,
        `- \`operation: ${opAppend}\` → use \`notes.append\`.`,
        "",
        "Apply index edits directly. For stub creations of Entities, consider whether to refine `kind` from `other` to `person/place/org/work` based on context.",
        "",
        "Step 3 — read the new Sources page with `notes.read` and confirm the frontmatter is correct.",
        "",
        "Step 4 — report a one-paragraph summary: what was filed, how many edits applied, what to do next.",
      );
      return {
        description: `Ingest '${args.title}' into the wiki and apply cross-reference edits.`,
        messages: [textMessage("user", parts.join("\n"))],
      };
    },
  );

  server.registerPrompt(
    "answer-from-wiki",
    {
      title: "Answer From Wiki With Citations",
      description:
        "Prompt template that instructs the agent to answer a question by querying the wiki, reading the top matches, and synthesizing a cited answer.",
      argsSchema: {
        question: z.string().min(1),
        topic: z.string().optional(),
        fileBack: z.string().optional(),
      },
    },
    (args) => {
      const topic = args.topic ?? args.question;
      const parts: string[] = [
        "Answer the following question from the kObsidian LLM Wiki, not from training data.",
        "",
        `Question: ${args.question}`,
        "",
        `Step 1 — call \`wiki.query\` with topic="${topic}" (keywords, not a full sentence).`,
        "Step 2 — for the top 3-5 scored pages, call `notes.read` to pull the full content. Prefer Concepts / Entities pages over raw Sources.",
        "Step 3 — synthesize a short, direct answer. Cite every specific claim with a wikilink to the page you pulled it from (e.g. `[[wiki/Concepts/memex.md|Memex]]`). If pages disagree, surface the disagreement; don't paper over it. If the wiki is silent on part of the question, say so explicitly.",
      ];
      if (args.fileBack && args.fileBack.toLowerCase() !== "false") {
        parts.push(
          `Step 4 — file the synthesis back via \`wiki.summaryMerge\` into \`${args.fileBack}\` so future queries benefit from it.`,
        );
      } else {
        parts.push(
          "Step 4 — if the synthesis is worth keeping, offer to file it via `wiki.summaryMerge` but do not file automatically.",
        );
      }
      parts.push(
        "Step 5 — if the synthesis took meaningful work (5+ pages read), append a `wiki.logAppend` entry with `op: query`.",
      );
      return {
        description: `Answer '${args.question}' using the wiki with citations.`,
        messages: [textMessage("user", parts.join("\n"))],
      };
    },
  );

  server.registerPrompt(
    "health-check-wiki",
    {
      title: "Health Check Wiki",
      description:
        "Prompt template that instructs the agent to lint the wiki, triage findings by severity, and propose (but not auto-apply) concrete fixes.",
      argsSchema: {
        staleDays: z.string().optional(),
      },
    },
    (args) => {
      const staleDaysLine = args.staleDays
        ? `Use staleDays: ${args.staleDays} when calling the tool.`
        : "Use the default staleDays threshold.";
      const body = [
        "Run a health check on the kObsidian LLM Wiki.",
        "",
        `Step 1 — call \`wiki.lint\`. ${staleDaysLine}`,
        "",
        "Step 2 — triage the `findings` in this priority order and summarize each category with counts plus 3-5 examples:",
        "1. Broken links (highest — actively misleading)",
        "2. Missing concept / entity pages (referenced but empty)",
        "3. Orphans (no inbound or outbound links)",
        "4. Index mismatch (pages missing from index, or stale entries)",
        "5. Stale sources",
        "6. Tag singletons (tags used once — often typos)",
        "",
        "Step 3 — for each category, propose concrete fixes and wait for user confirmation before applying. Do NOT auto-delete or auto-merge.",
        "",
        "Step 4 — after fixes, rerun `wiki.lint` and append a `wiki.logAppend` entry with `op: lint` summarizing what changed.",
      ].join("\n");
      return {
        description: "Lint the wiki and propose ranked fixes.",
        messages: [textMessage("user", body)],
      };
    },
  );
}
