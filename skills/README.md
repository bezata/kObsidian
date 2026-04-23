# kObsidian Wiki Skills

Four Claude Code skills that drive the LLM Wiki loop on top of the
`kobsidian` MCP server.

| Skill            | Trigger                                                     | What it does                                                                                                             |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `wiki-bootstrap` | "set up a wiki", "start a knowledge base", "init the wiki"  | Runs `wiki.init`, reads back `wiki-schema.md`, offers next step.                                                         |
| `wiki-ingest`    | "ingest this", "file this", "add to wiki", dropped URL/text | Calls `wiki.ingest`, reviews `proposedEdits`, applies them with `notes.*` tools.                                         |
| `wiki-query`     | "what does the wiki say", "search the wiki", "per our notes" | Calls `wiki.query`, reads top pages, synthesizes a cited answer, optionally files the synthesis via `wiki.summaryMerge`. |
| `wiki-lint`      | "lint the wiki", "audit the wiki", "clean up the wiki"      | Calls `wiki.lint`, triages findings by severity, proposes concrete fixes (does not auto-apply).                          |

## Install

The skills live at `skills/` in the kObsidian repo. Copy or symlink the
four wiki skills into your Claude Code skills directory:

```bash
# User-level (all projects)
cp -r skills/wiki-* ~/.claude/skills/

# Or symlink so updates flow
ln -s "$(pwd)/skills/wiki-bootstrap" ~/.claude/skills/wiki-bootstrap
ln -s "$(pwd)/skills/wiki-ingest"    ~/.claude/skills/wiki-ingest
ln -s "$(pwd)/skills/wiki-query"     ~/.claude/skills/wiki-query
ln -s "$(pwd)/skills/wiki-lint"      ~/.claude/skills/wiki-lint
```

## Prerequisites

The `kobsidian` MCP server must be registered in Claude Code (stdio or
HTTP), and `OBSIDIAN_VAULT_PATH` must point at your vault. See the repo
[README](../README.md) for MCP registration.

## Workflow

A typical session looks like:

```
1. /wiki-bootstrap         ← once per vault, scaffold the layout
2. Drop a source →
   /wiki-ingest            ← file it, apply cross-refs
3. Ask a question →
   /wiki-query             ← answer with citations, optionally save
4. Periodically →
   /wiki-lint              ← fix orphans, broken links, tag drift
```

Skills also fire automatically on natural-language triggers — you don't
need to type the slash commands. "Ingest this article" routes through
`wiki-ingest`; "what does my wiki say about X" routes through
`wiki-query`.
