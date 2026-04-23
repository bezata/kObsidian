import { fileExists, readUtf8, writeUtf8 } from "../../lib/filesystem.js";
import type { WikiLogAppendArgs } from "../../schema/wiki.js";
import type { DomainContext } from "../context.js";
import { initWiki } from "./init.js";
import { resolveWikiPaths, todayIso } from "./paths.js";

export function formatLogEntry(args: {
  date: string;
  op: string;
  title: string;
  body?: string;
  refs?: string[];
}): string {
  const header = `## [${args.date}] ${args.op} | ${args.title}`;
  const lines: string[] = [header];
  if (args.body && args.body.trim().length > 0) {
    lines.push("", args.body.trim());
  }
  if (args.refs && args.refs.length > 0) {
    lines.push("", ...args.refs.map((ref) => `- [[${ref}]]`));
  }
  return `${lines.join("\n")}\n`;
}

export async function appendLogEntry(context: DomainContext, args: WikiLogAppendArgs) {
  const paths = resolveWikiPaths(context, args);
  if (!(await fileExists(paths.logAbsolute))) {
    await initWiki(context, { wikiRoot: args.wikiRoot, vaultPath: args.vaultPath });
  }

  const date = args.date ?? todayIso();
  const block = formatLogEntry({
    date,
    op: args.op,
    title: args.title,
    body: args.body,
    refs: args.refs,
  });

  const previous = await readUtf8(paths.logAbsolute);
  const separator = previous.endsWith("\n\n") ? "" : previous.endsWith("\n") ? "\n" : "\n\n";
  await writeUtf8(paths.logAbsolute, `${previous}${separator}${block}`);

  return {
    changed: true,
    target: paths.logRelative,
    summary: `Appended ${args.op} entry to ${paths.logRelative}`,
    date,
    op: args.op,
    entryTitle: args.title,
  };
}
