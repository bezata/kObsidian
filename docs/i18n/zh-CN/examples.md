# 示例用例

下面示例展示如何把 `wiki.*`、`notes.*` 和 `vault.*` 组合成真实工作流。

## A. 个人研究 wiki

目标：把论文、文章、网页剪藏整理成可查询的知识库。

### ingest 流程

```text
wiki.init
wiki.ingest {
  title,
  content 或 sourcePath,
  sourceType: "paper",
  summary,
  relatedConcepts,
  relatedEntities
}
```

`wiki.ingest` 会创建 `wiki/Sources/<slug>.md`、追加 `wiki/log.md`，并返回 `proposedEdits`。LLM 应逐条应用这些建议，创建 Concept/Entity stub 或给已有页面加引用。

### query 流程

```text
wiki.query { topic: "memex hypertext" }
notes.read top results
```

回答时应引用读取过的页面，例如 `[[wiki/Concepts/memex.md|Memex]]`。如果 wiki 没有覆盖某部分，应该明确说明。

### lint 流程

```text
wiki.lint
```

按优先级处理 broken links、missing pages、orphans、stale pages、tag singletons 和 index mismatch。

## B. 架构决策记录

目标：把 ADR、RFC、事故复盘和设计说明沉淀成可追溯的工程知识。

### 记录 ADR

把 ADR 文件写入 vault，然后：

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

然后应用 `proposedEdits`，让相关 Concept/Entity 页面知道这个决策。

### “为什么我们决定 X？”

```text
wiki.query { topic: "why grpc internal service communication" }
notes.read results
```

回答应包含决策来源、替代方案、权衡和引用。

### 决策时间线

`wiki.logAppend` 可记录重要人工决策；`wiki/log.md` 的固定 heading 格式方便 grep。

## C. 代码库 wiki

目标：把设计文档、RFC、post-mortem 和模块说明组织成长期可维护的知识库。

### ingest 事故复盘

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

### 带引用查询

先 `wiki.query`，再读取 top pages。回答应说明哪些事实来自 Source，哪些是 Concept 页面中的综合。

### 工程团队的真实价值

`wiki.lint` 能发现：

- 被移动后断掉的设计文档链接。
- 只出现一次的标签，通常是拼写不一致。
- 过期的服务页面。
- Source 中提到但没有页面的系统、团队或概念。

## 标签建议

- `adr`
- `rfc`
- `postmortem`
- `incident`
- `service`
- `architecture`
- `security`

## 新建 wiki

任何用例都先运行：

```text
wiki.init
```

之后再开始 ingest、query、lint 和 merge。
