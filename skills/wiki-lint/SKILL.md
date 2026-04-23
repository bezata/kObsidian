---
name: wiki-lint
description: Health-check the LLM Wiki and offer fixes for each category of finding. Use when the user says "lint the wiki", "audit the wiki", "check wiki health", "clean up the wiki", or after a batch of ingests. Categories covered - orphans, broken links, stale sources, missing pages, tag drift, index parity.
---

# Wiki Lint

You are the wiki janitor. The user wants to know what's rotting and what
to fix first. Run the lint, group the findings by severity, and offer
concrete fixes — don't just dump raw output.

## When to use

- User asks to "lint", "audit", "health-check", or "clean up" the wiki.
- After a run of several ingests, proactively offer to lint.
- When `wiki.query` surfaces a broken link or missing page, offer to
  lint the rest.

## Steps

1. **Call `wiki.lint`.** With no args for defaults; override
   `staleDays` (default 180) if the user wants a shorter window. The
   return has `totals` and `findings.{orphans, brokenLinks, stale,
   missingPages, tagSingletons, indexMismatch}`.

2. **Triage.** Summarize findings in roughly this priority order:
   1. **Broken links** (highest — actively misleading)
   2. **Missing concept / entity pages** (referenced but empty)
   3. **Orphans** (content that nothing links to — might be dead or
      unlinked)
   4. **Index mismatch** (pages missing from `index.md`, or `index.md`
      pointing at deleted pages)
   5. **Stale sources** (past `staleDays` — might need refresh)
   6. **Tag singletons** (tags used exactly once — often typos or
      one-off tags that should merge)

   For each category with findings, report the count and the first 3-5
   examples; offer to drill in on the rest.

3. **Offer fixes.** Propose concrete next actions — do NOT auto-apply
   without confirmation for anything that deletes or rewrites content.
   - **Broken links** → ask user for the correct target (likely a rename
     they didn't propagate); use `notes.search` to find near matches.
     Fix with a targeted `notes.update` on the source page, or delete
     the link.
   - **Missing pages** → for each, use `notes.create` with the canonical
     frontmatter for the `suggestedKind` (concept / entity / source).
     You can borrow the stub templates the server generates via
     `wiki.summaryMerge` (targetPath = the missing path, new section
     from context of the referring page).
   - **Orphans** → surface to user and ask: "link these in somewhere, or
     delete?" Don't delete silently.
   - **Index mismatch** → usually fixed by a single
     `wiki.indexRebuild`. Just run it.
   - **Stale sources** → offer to mark with a tag like `needs-refresh`
     via `tags.add`, or to re-ingest if the user has an updated version.
   - **Tag singletons** → for each, suggest either merging with a close
     existing tag (use `tags.list` to find candidates) or removing via
     `tags.remove`. Never bulk-rename without explicit user approval —
     tag edits ripple.

4. **Re-lint after fixes.** When a set of fixes is applied, re-run
   `wiki.lint` and show the before/after totals. Append a
   `wiki.logAppend` entry with `op: "lint"` summarizing what was fixed.

## What not to do

- **Don't auto-fix.** Propose, wait for confirmation, then act. The
  user is the curator.
- **Don't fix the symptom and miss the cause.** If three sources all
  reference the same missing concept, fix by creating the concept page,
  not by removing the links.
- **Don't treat all orphans as garbage.** Sometimes the orphan is a
  draft concept the user hasn't linked yet. Ask before deleting.

## Example report shape

> Lint found 9 items across 23 pages:
>
> - **3 broken links** — `wiki/Sources/as-we-may-think.md` points at
>   `wiki/Concepts/memex-2.md` (looks like a rename; closest match is
>   `wiki/Concepts/memex-ii.md`). Want me to fix all three?
> - **2 missing concept pages** — `Associative Trails`, `Trail Blazer`.
>   I can scaffold stubs with your existing source as the seed.
> - **1 orphan** — `wiki/Concepts/abandoned-note.md` has no links in or
>   out since 2025-11-02. Keep, link, or delete?
> - **Index OK except** one entry points at a deleted source; a single
>   `wiki.indexRebuild` will fix it.
> - **Stale**: 0 past your 180-day window.
> - **Tag singletons**: `memex-machine` (probably should be `memex`).
>
> Shall I start with the broken links?
