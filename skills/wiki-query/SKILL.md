---
name: wiki-query
description: Answer a question from the LLM Wiki with citations, and optionally file the synthesis back as a concept page. Use when the user asks "what does the wiki say about X", "search the wiki for Y", "summarize what I know about Z", or asks a question that should be grounded in their personal knowledge base rather than training data.
---

# Wiki Query

You are answering from the user's curated wiki, not from training data.
Treat `wiki/` as source of truth. Always cite. If the wiki doesn't cover
the question, say so and suggest an ingest.

## When to use

- User asks a factual / conceptual question and you know they have a
  wiki (either they just built one, or `wiki.query` returns results).
- User says "per the wiki", "from our notes", "what do we have on X".
- You're about to answer from general knowledge but suspect the wiki
  has a specific angle — check it first.

## Steps

1. **Call `wiki.query`** with the topic. Use a concise, keyword-like
   `topic` (not a full question). `limit` defaults to 10 — fine for most
   queries; raise to 20 if the topic is broad.

2. **Drill into the top matches.** For the top 3-5 pages (ranked by
   score), call `notes.read` to get the full content. Prefer Concepts /
   Entities pages over raw Sources — they're already distilled.

3. **Synthesize the answer.** Write a short, direct answer in prose:
   - Pull specific claims from the pages you read.
   - Cite each claim with a wikilink: `[[wiki/Concepts/memex.md|Memex]]`.
   - If two pages disagree, surface the disagreement; don't paper over
     it. The wiki's contradictions are signal.
   - If the wiki is silent on part of the question, say so explicitly —
     do not fall back to training data without flagging the gap.

4. **Offer to compound.** If your synthesis discovers a useful
   connection or produces a paragraph worth keeping, offer to file it
   back via `wiki.summaryMerge` into an existing concept page, or
   create a new one. Default: do NOT file automatically; ask first.

5. **Log queries worth remembering.** If the query took meaningful
   effort (you read 5+ pages, or produced a long synthesis), append a
   `wiki.logAppend` entry with `op: "query"` so the log reflects the
   wiki's real activity.

## What not to do

- **Don't answer from training data and cite the wiki anyway.** If you
  didn't read a page, don't wikilink it.
- **Don't just dump search results.** `wiki.query` output is a map, not
  the answer. Read the pages, then synthesize.
- **Don't over-file.** Not every query needs a permanent wiki page. File
  when the synthesis is non-obvious, or when the user asked you to.

## Example shape

> Based on your wiki, the memex is Bush's 1945 sketch of a personal,
> associative knowledge device ([[wiki/Concepts/memex.md]]) — the
> "trail" abstraction is the part that survived into modern hypertext
> ([[wiki/Concepts/associative-trails.md]]). Your sources so far are
> [[wiki/Sources/as-we-may-think.md]] and a Nelson interview that
> connects it to Xanadu ([[wiki/Sources/nelson-interview.md]]).
> The wiki doesn't cover the later 1967 memex-II revision — if you want
> that context I can ingest it when you have a source.
