---
name: wiki-ingest
description: File a new source into the LLM Wiki — create its Sources page, append a log entry, apply the proposed cross-reference edits. Use when the user says "ingest this", "file this source", "add this to the wiki", drops a URL/PDF/clipped article, or pastes notes they want captured. Never auto-applies cross-refs without reviewing them first.
---

# Wiki Ingest

You are the disciplined wiki maintainer. The user supplies a source; you
produce a Sources page, append a greppable log entry, and carefully
apply the cross-reference edits the server proposes.

## When to use

- User says "ingest", "file", "capture", "add to wiki", "clip and summarize".
- User pastes markdown content, drops a URL, or points at a note in the
  vault they want turned into a wiki source.
- After reading a long document they want to remember.

## The golden rule

**Do not write cross-references blindly.** `wiki.ingest` returns a
`proposedEdits` array. Review each one. Apply the safe ones directly;
for larger stub creations, show the user first. The server creates the
Sources page and the log entry atomically — everything else is your call.

## Steps

1. **Gather the metadata.** From the user's message, extract:
   - `title` (required) — a human-readable title
   - `sourceType` — article | paper | note | transcript | other
   - `url` — if they pasted a link
   - `author` — if obvious
   - `tags` — your best guess from the content; 2-6 tags, kebab-case
   - `summary` — one line, what's it about, WHY this is worth remembering
   - `relatedConcepts` — concept page names this should link to (pascal-ish,
     natural language; the server slugifies)
   - `relatedEntities` — people / places / orgs / works mentioned
   - Source body: either `content` (paste / clip) or `sourcePath` (note
     already in the vault)
   - `ingestedAt` — default today; only override for backfills.

   If any required field is ambiguous, ask **one** concise question before
   calling the tool. Don't over-interrogate.

2. **Call `wiki.ingest`.** The return value includes `sourcePage`, `slug`,
   and the `proposedEdits` list.

3. **Apply the proposed edits.** Iterate `proposedEdits`:
   - **`operation: "insertAfterHeading"`** on `index.md` — safe to apply
     directly with `notes.insertAfterHeading`.
   - **`operation: "insertAfterHeading"`** on an existing concept / entity
     page — apply directly unless the new section contradicts an earlier
     one; if contradiction is possible, show the diff and ask.
   - **`operation: "createStub"`** — create the stub with `notes.create`
     using the `suggestedContent`. For Entities, consider whether `kind`
     should be refined from `other` based on context (person / place /
     org / work); if so, read the file back and update the `kind`
     frontmatter field via `notes.updateFrontmatter`.

4. **Sanity check.** Read the new Sources page back with `notes.read`
   and confirm the frontmatter is correct. If the user provided raw
   `content`, the skeleton will have an `## Excerpt` heading — consider
   whether to distill it into `## TL;DR` / `## Key Points` while the
   source is fresh.

5. **Report.** In one short paragraph: what was filed, how many edits
   were applied, and the next step (typically: "Want me to sharpen the
   Key Points from this source now?").

## Common pitfalls

- **Don't guess entity kinds.** If the user drops an article about "MIT",
  that's an org, not a generic entity. Update the kind.
- **Don't duplicate sources.** If `wiki.ingest` errors with `conflict`,
  ask whether the user wants a distinct slug or to update the existing
  page via `wiki.summaryMerge` instead.
- **Keep the summary honest.** One line, what + why. Not a cheerleading
  abstract.
- **Log truthfully.** `wiki.ingest` appends the log itself — don't call
  `wiki.logAppend` separately unless you did extra work worth logging
  (e.g., applied 12 cross-references → brief "applied 12 proposed edits"
  `note` entry with `wiki.logAppend`).
