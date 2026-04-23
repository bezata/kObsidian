# Example use cases

kObsidian's `wiki.*` layer is the same building block regardless of what
kind of knowledge base you're keeping. Three worked examples below —
each shows the tool calls the LLM actually makes and what ends up on
disk.

> A reminder on the design: `wiki.ingest` creates exactly **one** file
> (the Sources page), appends exactly **one** file (`log.md`), and
> returns a `proposedEdits` array the agent applies with existing
> `notes.*` tools. Every cross-reference write is visible in the
> transcript.

---

## A. Personal research wiki

The original use case from
[Karpathy's LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):
you're reading deeply on a topic over weeks or months. Sources are
papers, articles, podcast transcripts; Concepts are the ideas you're
tracking; Entities are the people, labs, and works involved.

### Ingest flow

```
You: "Ingest this paper on in-context learning."
     (Pastes markdown clipped via Obsidian Web Clipper.)

LLM: wiki.ingest {
       title: "In-Context Learning — A Survey",
       content: "<pasted markdown>",
       sourceType: "paper",
       url: "https://arxiv.org/abs/…",
       author: "Dong et al.",
       tags: ["icl", "prompting", "few-shot"],
       summary: "Survey of in-context learning, scaling behavior, and mechanistic accounts.",
       confidence: "high",
       relatedConcepts: ["In-Context Learning", "Few-Shot Prompting",
                         "Chain-of-Thought"],
       relatedEntities: ["Dong et al."]
     }

     → wiki/Sources/in-context-learning-a-survey.md created
     → wiki/log.md appended: "## [2026-04-23] ingest | In-Context Learning — A Survey"
     → proposedEdits: [
         { path: "wiki/index.md",                         operation: "insertAfterHeading", heading: "Sources" },
         { path: "wiki/Concepts/in-context-learning.md",  operation: "createStub" },
         { path: "wiki/Concepts/few-shot-prompting.md",   operation: "createStub" },
         { path: "wiki/Concepts/chain-of-thought.md",     operation: "createStub" },
         { path: "wiki/Entities/dong-et-al.md",           operation: "createStub" }
       ]

     LLM walks the proposedEdits, applying each via
       notes.create (for stubs) or notes.insertAfterHeading.
     Reports: "Filed. 4 stubs created, 1 index entry added."
```

### Query flow

```
You: "What does the wiki say about whether in-context learning is actually
     learning, or just pattern-matching?"

LLM: wiki.query { topic: "in-context learning mechanism" }
     → topPages: [
         Concepts/in-context-learning.md          (score 13, matchedOn: filename, alias, tag),
         Sources/in-context-learning-a-survey.md  (score 9, matchedOn: title, body),
         Concepts/mechanistic-interpretability.md (score 4, matchedOn: body),
         Sources/nelson-interview.md              (score 2, matchedOn: body)
       ]

     notes.read on the top 3
     → "Two views in your wiki: the Survey position
        ([[wiki/Sources/in-context-learning-a-survey.md|Dong et al.]])
        leans toward emergent meta-learning at scale; the Anthropic-
        mechanistic view ([[wiki/Concepts/mechanistic-interpretability.md]])
        frames it as induction-head pattern-matching. Your notes don't
        resolve this — you might ingest Olsson et al. (2022) next."
```

### Lint flow

```
You: "Audit the wiki."

LLM: wiki.lint {}
     → findings: {
         orphans: 1  (Concepts/meta-learning.md — no links in or out),
         brokenLinks: 2,
         stale: 3    (Sources past 180 days without updates),
         missingPages: 0,
         tagSingletons: 2  ("gpt4" — merge into "llm"?),
         indexMismatch: { missingFromIndex: [], staleEntries: 0 }
       }

     LLM summarizes by category, offers concrete fixes per finding.
     Nothing auto-applied.
```

---

## B. Architecture Decision Records (ADRs)

Each ADR is a Source. Architectural patterns become Concepts. Services,
teams, and libraries become Entities. The wiki becomes your ADR archive
with cross-links you never have to maintain manually — and a greppable
log of every decision in order.

### Recording an ADR

```
You: "Record ADR-004: we're switching internal service comms from REST
     to gRPC. Context: mobile team needs streaming + our SDKs already
     ship protobuf definitions. Deprecates the old REST gateway for
     service-to-service (edge-facing stays REST)."

LLM: wiki.ingest {
       title: "ADR-004 — gRPC for internal service comms",
       content: "<context + decision + consequences, in the team's
                 ADR template format>",
       sourceType: "note",
       tags: ["adr", "architecture", "rpc", "streaming"],
       summary: "Internal service calls move to gRPC; edge stays REST.",
       confidence: "high",
       relatedConcepts: ["gRPC", "Service Mesh", "Internal RPC",
                         "Protobuf"],
       relatedEntities: ["order-service", "payment-service",
                         "inventory-service", "rest-gateway"]
     }

     → wiki/Sources/adr-004-grpc-for-internal-service-comms.md
     → wiki/log.md += "## [2026-04-23] ingest | ADR-004 — gRPC for internal service comms"
     → proposedEdits: [
         insertAfterHeading  wiki/index.md#Sources,
         createStub          wiki/Concepts/grpc.md,
         createStub          wiki/Concepts/service-mesh.md,
         createStub          wiki/Concepts/internal-rpc.md,
         createStub          wiki/Concepts/protobuf.md,
         insertAfterHeading  wiki/Entities/order-service.md#Notable Facts,
         insertAfterHeading  wiki/Entities/payment-service.md#Notable Facts,
         insertAfterHeading  wiki/Entities/inventory-service.md#Notable Facts,
         createStub          wiki/Entities/rest-gateway.md
       ]
```

The agent applies each edit via `notes.*`. The `insertAfterHeading`
proposals look like:

```markdown
<!-- inside wiki/Entities/order-service.md under "## Notable Facts" -->
- From [[wiki/Sources/adr-004-grpc-for-internal-service-comms.md|ADR-004]]:
  moves internal calls to gRPC; edge stays REST.
```

### "Why did we decide X?"

Three weeks later, a new teammate asks —

```
You: "Why did we pick gRPC for internal comms?"

LLM: wiki.query { topic: "grpc internal comms" }
     → topPages: [
         Sources/adr-004-grpc-for-internal-service-comms.md (score 14),
         Concepts/grpc.md                                   (score 8),
         Concepts/internal-rpc.md                           (score 6),
         Entities/order-service.md                          (score 3,
           matched via the "Notable Facts" citation)
       ]
     notes.read on top 3
     → "Per [[wiki/Sources/adr-004-grpc-for-internal-service-comms.md|
        ADR-004]], chosen over REST because of native streaming and
        typed schemas; the mobile-team SDK already shipped protobuf.
        Tradeoff accepted: browser clients still hit REST through the
        edge gateway ([[wiki/Concepts/service-mesh.md]]).
        See also [[wiki/Concepts/grpc.md]] for why we picked gRPC over
        Thrift/Twirp/Connect."
```

### Timeline of decisions

```bash
grep '^## \[' wiki/log.md | grep ' ingest | ADR-' | tail -10
```

Returns the last 10 ADRs in chronological order with their dates — no
index page to maintain.

### Tips

- Give each ADR its number in the title (`ADR-004 — …`). `wiki.query`
  ranks filename hits highest, so "show me ADR-4" resolves reliably.
- Use `sourceType: "note"` (or add "decision" to your own
  `KOBSIDIAN_WIKI_*` schema — the Zod source-type enum is
  `article | paper | note | transcript | other`).
- Tag consistently: `adr` on every ADR means
  `notes.search tag:#adr` surfaces the full archive instantly.

---

## C. Codebase wiki (design docs + RFCs + post-mortems)

Engineering teams abandon wikis because nobody updates them. The LLM
doesn't forget to update cross-references when a service gets renamed.
Ingest design docs, RFCs, and post-mortems as Sources; architectural
patterns become Concepts; services / teams / libraries become Entities.

### Ingesting a post-mortem

```
You: "We had an incident today — payment-service timeouts cascaded
     into order-service. Here's the post-mortem."
     (Pastes the team's post-mortem template.)

LLM: wiki.ingest {
       title: "Postmortem 2026-04-10 — Payment timeouts cascade into order",
       content: "<pasted>",
       sourceType: "other",
       tags: ["postmortem", "incident", "reliability", "p1"],
       summary: "payment-service DB pool exhaustion → order-service retry storm; fixed with circuit breaker + tighter timeout budget.",
       confidence: "high",
       relatedConcepts: ["Circuit Breaker", "Cascade Failure",
                         "Timeout Budget", "Retry Policy"],
       relatedEntities: ["payment-service", "order-service",
                         "platform-team"]
     }

     → wiki/Sources/postmortem-2026-04-10-payment-timeouts-cascade-into-order.md
     → proposedEdits: [
         insertAfterHeading  wiki/index.md#Sources,
         createStub          wiki/Concepts/circuit-breaker.md,
         createStub          wiki/Concepts/cascade-failure.md,
         createStub          wiki/Concepts/timeout-budget.md,
         createStub          wiki/Concepts/retry-policy.md,
         insertAfterHeading  wiki/Entities/payment-service.md#Notable Facts,
         insertAfterHeading  wiki/Entities/order-service.md#Notable Facts,
         insertAfterHeading  wiki/Entities/platform-team.md#Notable Facts
       ]
```

Now `wiki/Entities/payment-service.md` accumulates a running "Notable
Facts" list of every incident, design decision, and RFC that touched it
— keyed off whatever the team calls the service in their docs.

### Querying with citations

```
You: "Has anyone written about retry storms in our services?"

LLM: wiki.query { topic: "retry storm" }
     notes.read the top 3-4 pages
     → "Yes — two references in the wiki:
        1. [[wiki/Concepts/cascade-failure.md]] summarizes
           [[wiki/Sources/postmortem-2026-04-10-payment-timeouts-cascade-into-order.md|
            the 2026-04-10 payment cascade]]. Root cause was
            unbounded retries without a budget; fix was a circuit
            breaker + 250ms budget across the chain.
        2. [[wiki/Concepts/retry-policy.md]] cites
           [[wiki/Sources/rfc-021-standard-retry-budgets.md|RFC-021]]
           which proposed team-wide retry budgets after that incident.
        Nothing else in the wiki references retry storms yet —
        might be worth ingesting your Jan post-mortem if you want it
        connected here."
```

### Lint flow (the real value for engineering teams)

```
You: "Audit the codebase wiki."

LLM: wiki.lint {}
     → totals: { orphans: 3, brokenLinks: 1, stale: 4,
                 missingPages: 2, tagSingletons: 5,
                 indexMissingFromIndex: 1, indexStaleEntries: 0 }

     Triaged by severity:

     1. Broken links (ACTIVELY MISLEADING)
        - wiki/Sources/adr-002-session-migration.md links to
          [[wiki/Entities/legacy-auth-service.md]] (deprecated Q1,
          replaced by auth-v2-service). Remove the link or re-point.

     2. Missing concept pages (referenced but empty)
        - Sources/rfc-018-multi-region.md mentions [[Concepts/consistent-hashing.md]]
        - Sources/postmortem-2026-02-03-cache-miss.md mentions [[Concepts/cache-stampede.md]]
        Scaffold stubs?

     3. Orphan RFCs (3 — nobody links in or out):
        - Sources/rfc-009-job-scheduler.md (2024-11-02 — shipped or abandoned?)
        - Sources/rfc-014-graphql-gateway.md (2025-02-14 — superseded by ADR-004?)
        - Sources/rfc-017-feature-flags.md (2025-07-21 — still active, link to Concepts/feature-flags.md?)

     4. Stale sources (> 180 days without updates):
        - 4 post-mortems. Tag "needs-review" or re-ingest with
          lessons-learned addenda?

     5. Tag singletons (probably typos / merge candidates):
        - "retry-logic" (merge into "retry-policy"?),
        - "observability" (first use — fine),
        - "p2" (only one; wiki has "p0", "p1" — consolidate severity?),
        - "cache" (merge into "caching"?),
        - "auth-v2" (legit, first use).

     6. Index mismatch:
        - Concepts/timeout-budget.md isn't in index.md yet — run wiki.indexRebuild.
```

The agent proposes fixes; the human confirms each category; nothing
silent.

### Why this works for engineering teams

- **The `proposedEdits` contract** means every cross-reference write is
  reviewable. An LLM hallucination about which services a decision
  affects shows up in the transcript as a visible edit — not as silent
  vault corruption.
- **The greppable log** turns "what did the team decide recently" into
  `grep '^## \[' wiki/log.md | tail -20`. Works from a CI job too —
  post a weekly "decisions digest" to Slack.
- **Lint catches the rot humans miss.** Renamed a service six months
  ago? Broken links. Deprecated a pattern in an ADR update? Lint
  surfaces the orphaned concept. Nobody needs to remember to audit.
- **Symmetric with code.** Services appear as Entities alongside the
  decisions that shaped them. Running `wiki.query "payment-service"`
  returns both "what is it" (the Entity page) and "what did we decide"
  (ADRs + post-mortems citing it).

### Suggested tag conventions for engineering teams

| Tag | Meaning |
|---|---|
| `adr` | Every ADR Source |
| `rfc` | Every RFC Source |
| `postmortem` | Every incident retro |
| `design-doc` | Longer design documents |
| `deprecated` | Sources describing things no longer current |
| `p0`/`p1`/`p2` | Incident severity on postmortems |

Keeping this small + consistent gives `tags.analyze` + `wiki.lint`
useful signal.

---

## Starting a new wiki for any of these

```
You: "Set up a wiki in this vault for our team's ADRs and post-mortems."

LLM: wiki.init {}
     → Creates wiki/Sources/, wiki/Concepts/, wiki/Entities/,
       wiki/index.md, wiki/log.md, wiki/wiki-schema.md
```

Then start ingesting. The first few sources take a while (lots of stubs
get created); after that, proposedEdits shrink as the Concept/Entity
graph stabilizes.
