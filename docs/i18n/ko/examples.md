# 사용 예제

아래 예제는 `wiki.*`, `notes.*`, `vault.*`를 실제 workflow로 조합하는 방법입니다.

## A. 개인 연구 wiki

목표: 논문, 글, web clip을 검색 가능한 지식 기반으로 정리합니다.

### Ingest flow

```text
wiki.init
wiki.ingest {
  title,
  content 또는 sourcePath,
  sourceType: "paper",
  summary,
  relatedConcepts,
  relatedEntities
}
```

`wiki.ingest`는 Source page와 log를 만들고 `proposedEdits`를 반환합니다. LLM은 이를 적용해 Concept/Entity stub을 만들거나 기존 page에 citation을 추가합니다.

### Query flow

```text
wiki.query { topic: "memex hypertext" }
notes.read top results
```

답변은 읽은 page를 `[[wiki/Concepts/memex.md|Memex]]`처럼 인용해야 합니다. wiki에 없는 내용은 명확히 말합니다.

### Lint flow

```text
wiki.lint
```

broken links, missing pages, orphans, stale pages, tag singletons, index mismatch를 우선순위대로 처리합니다.

## B. Architecture Decision Records

ADR, RFC, post-mortem, design note를 추적 가능한 engineering knowledge로 만듭니다.

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

“왜 X를 선택했나?”를 묻는 경우 `wiki.query`로 관련 page를 찾고 `notes.read`로 근거를 읽습니다.

## C. 코드베이스 wiki

design docs, RFC, post-mortem, module notes를 장기 유지 가능한 wiki로 만듭니다.

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

`wiki.lint`는 이동으로 깨진 링크, typo처럼 보이는 tag, 오래된 service page, Source에서 언급되지만 page가 없는 concept/entity를 찾습니다.

## 추천 tag

- `adr`
- `rfc`
- `postmortem`
- `incident`
- `service`
- `architecture`
- `security`

## 새 wiki 시작

```text
wiki.init
```

그 다음 ingest, query, lint, merge를 반복합니다.
