# 测试

kObsidian 使用 Bun、TypeScript 和 Vitest 测试。

## 本地检查

```bash
bun run typecheck
bun run test
bun run lint
bun run build
```

## 工具清单

修改注册工具后，重新生成公开的 MCP 工具清单：

```bash
bun run inventory
```

生成文件是 `docs/tool-inventory.json`。

## 环境

文件系统测试不需要 Obsidian 正在运行。依赖运行时 REST API 的工具使用这些变量：

```bash
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=your-local-rest-api-key
```

不要提交 `.env` 文件或真实 API key。

## 覆盖范围

- notes、links、tags、tasks、Dataview、Kanban、canvas、Mermaid、Marp 的领域解析和变更。
- 通过内存传输验证 MCP 注册和 `structuredContent` 输出。
- Hono Streamable HTTP 的基本覆盖。
- 保留源格式的 Markdown 块更新。
- 依赖 Local REST API 的工具作为可选 live check。
