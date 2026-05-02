# 架构

kObsidian 是文件系统优先的 MCP 服务器：它把 Obsidian vault 暴露为 typed tool surface，并可选通过 Obsidian Local REST API 操作正在运行的 UI。

## 端到端栈

```text
MCP client
  -> stdio 或 Streamable HTTP
  -> McpServer
  -> src/server/tools/*
  -> src/domain/*
  -> vault 文件系统
  -> 可选：Obsidian Local REST API
```

大多数工具直接读写 vault 文件，不要求 Obsidian 正在运行。只有 `workspace.*`、`commands.*` 和 live `dataview.query*` / Templater 分支需要 Local REST API。

## 模块地图

```text
src/config/   环境变量解析和运行时设置
src/schema/   可复用 Zod schema 与工具 I/O contract
src/lib/      文件系统、路径、frontmatter、REST client、错误和结果 helper
src/domain/   notes、links、tags、tasks、Dataview、Kanban、canvas、wiki 等领域逻辑
src/server/   MCP server factory、transport、资源、提示词和工具注册
tests/        Vitest fixtures 与集成测试
docs/         文档和生成的工具清单
```

### 分层规则

- `src/lib/` 不包含 MCP 概念，提供通用 helper。
- `src/domain/` 可以读写 vault 或调用 REST API，但不知道 MCP 传输。
- `src/server/` 只负责 MCP wiring、schema、工具描述、资源和提示词；需要业务逻辑时调用 domain。

这种结构让 domain 函数可以被 CLI、测试或其他协议复用。

## 传输

- `src/server/stdio.ts`：标准本地 MCP transport，适合 Claude Code、Cursor 等客户端。
- `src/server/http-app.ts`：Hono + Streamable HTTP，提供 `/mcp`、CORS、Origin 检查、Bearer token 和协议版本验证。

两个入口共享 `createServer()`，所以工具、资源和提示词是一致的。

## LLM Wiki 流程

```text
wiki.init
  -> 创建 wiki/Sources, wiki/Concepts, wiki/Entities, index.md, log.md, wiki-schema.md

wiki.ingest
  -> 创建一个 Sources 页面
  -> 追加 log.md
  -> 返回 proposedEdits

LLM
  -> 用 notes.create / notes.edit 应用 proposedEdits

wiki.query
  -> 排名 wiki 页面，LLM 再用 notes.read 深入阅读

wiki.lint
  -> 只读健康检查

wiki.summaryMerge
  -> 给 Concept 或 Entity 页面加入带引用的章节
```

关键点：`wiki.ingest` 不直接批量改 Concept/Entity/Index；它返回可审阅的 `proposedEdits`，让每次跨文件写入都在 transcript 中可见。

## 测试

- domain 测试覆盖 notes、links、tasks、Dataview、wiki 等。
- server integration 使用 SDK 的 `InMemoryTransport`。
- HTTP 测试通过 Hono `fetch` mock，不需要真实 socket。
- fixture vault 位于 `tests/fixtures/sample_vault`。
