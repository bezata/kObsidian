# 使用例

以下は `wiki.*`、`notes.*`、`vault.*` を組み合わせた実用的な workflow です。

## A. 個人研究 wiki

目的：論文、記事、web clip を検索可能な知識ベースに整理する。

### Ingest flow

```text
wiki.init
wiki.ingest {
  title,
  content または sourcePath,
  sourceType: "paper",
  summary,
  relatedConcepts,
  relatedEntities
}
```

`wiki.ingest` は Source page と log を作り、`proposedEdits` を返します。LLM はそれを使って Concept/Entity stub 作成や既存 page への引用挿入を行います。

### Query flow

```text
wiki.query { topic: "memex hypertext" }
notes.read top results
```

回答では読んだ page を `[[wiki/Concepts/memex.md|Memex]]` のように引用します。wiki に情報がない部分は明示します。

### Lint flow

```text
wiki.lint
```

broken links、missing pages、orphans、stale pages、tag singletons、index mismatch を優先度順に処理します。

## B. Architecture Decision Records

ADR、RFC、post-mortem、design note を追跡可能な engineering knowledge にします。

```text
wiki.ingest {
  title: "ADR-004 - gRPC for internal service comms",
  sourcePath: "docs/adr/004-grpc.md",
  sourceType: "note",
  tags: ["adr", "architecture"],
  relatedConcepts: ["gRPC", "Service Boundaries"],
  relatedEntities: ["payment-service"]
}
```

「なぜ X を選んだのか？」を聞くときは `wiki.query` で関連 page を探し、`notes.read` で根拠を読みます。

## C. コードベース wiki

設計文書、RFC、post-mortem、module notes を長期保守できる wiki にします。

```text
wiki.ingest {
  title: "Payment timeout cascade postmortem",
  sourcePath: "postmortems/payment-timeout-cascade.md",
  sourceType: "note",
  tags: ["postmortem", "payments"],
  relatedConcepts: ["Circuit Breaker", "Timeout Budget"],
  relatedEntities: ["payment-service", "order-service"]
}
```

`wiki.lint` は移動で壊れたリンク、typo っぽい tag、古い service page、Source で言及されたが page がない concept/entity を見つけます。

## 推奨 tag

- `adr`
- `rfc`
- `postmortem`
- `incident`
- `service`
- `architecture`
- `security`

## 新しい wiki を始める

```text
wiki.init
```

その後、ingest、query、lint、merge を回します。
