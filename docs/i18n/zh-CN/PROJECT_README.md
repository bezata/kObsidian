# kObsidian MCP

kObsidian 是面向 Obsidian vault 的 filesystem-first MCP server，并在其上提供 LLM Wiki 层。你负责选择值得保存的 sources，LLM 负责整理、索引、交叉引用和维护。

## v0.3.7 新功能

通过每个 vault 根目录中的 `.kobsidian.json`，独立配置 wiki 文件夹、文件名、标题和过期天数，不同 vault 无需共用一套配置。`notes.edit` 按标题插入时也会保留段落间距，并正确衔接已有列表。

[配置示例与升级说明](README.md#per-vault-configuration-v037)。

## 为什么选择 kObsidian

- **Filesystem-first**：大多数工具直接读写 vault 文件，不要求 Obsidian 正在运行。
- **Typed MCP tools**：工具使用 Zod schema 验证，返回 `structuredContent`，并显式声明 MCP hint。
- **多 vault**：`vault.list`、`vault.current`、`vault.select`、`vault.reset` 支持会话内切换 vault。
- **LLM Wiki**：`wiki.*` 命名空间可初始化 wiki、ingest sources、query、lint、merge summary、rebuild index。
- **双 transport**：本地 stdio 与 Hono Streamable HTTP。
- **Claude Code schema 兼容性（v0.3.5 起，v0.3.6 完善）**：stdio 和无状态 Streamable HTTP 均使用 JSON Schema 2020-12。联合类型工具向客户端公开字段和选择器，Zod 仍会验证每次调用和结构化输出。详见 [兼容性说明](README.md#mcp-客户端兼容性)。
- **可分发**：npm、`.mcpb`、Smithery、MCP Registry 配置都包含在项目中。

## 安装

核心环境变量：

```bash
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=only-if-you-use-workspace-or-commands-tools
```

典型 stdio 启动：

```bash
npx -y kobsidian-mcp
```

从源码开发：

```bash
bun install
bun run dev:stdio
bun run dev:http
```

## Obsidian 插件

文件系统工具不需要 Obsidian 正在运行。以下能力需要插件：

- `workspace.*`
- `commands.*`
- live `dataview.query*`
- `templates.use` 的 Templater 分支

这些能力依赖 Obsidian Local REST API plugin 和 `OBSIDIAN_REST_API_KEY`。

## 快速开始

1. 设置 `OBSIDIAN_VAULT_PATH`。
2. 启动 MCP server。
3. 调用 `vault.current` 确认目标 vault。
4. 调用 `notes.search` 或 `notes.read` 验证读写。
5. 调用 `wiki.init` 初始化 wiki。
6. 用 `wiki.ingest` 文件化第一个 source。

## 示例用例

- 个人研究 wiki：论文、文章、网页剪藏。
- ADR 档案：设计决策、RFC、事故复盘。
- 代码库 wiki：模块说明、post-mortems、设计文档。

详见 [examples.md](examples.md)。

## 架构

```text
MCP client
  -> stdio / Streamable HTTP
  -> McpServer
  -> server tools
  -> domain logic
  -> vault filesystem
  -> optional Local REST API
```

详见 [architecture.md](architecture.md)。

## 配置

完整环境变量见 [ENVIRONMENT.md](ENVIRONMENT.md)。常用分组：

- `OBSIDIAN_*`：vault 与 Local REST API。
- `KOBSIDIAN_HTTP_*`：HTTP transport。
- `KOBSIDIAN_VAULT_*`：多 vault 发现和限制。
- `KOBSIDIAN_WIKI_*`：wiki 目录、文件名和 stale 阈值。

## 文档

- [README.md](README.md) - 中文文档入口。
- [architecture.md](architecture.md) - 架构。
- [wiki.md](wiki.md) - LLM Wiki contract。
- [tools.md](tools.md) - 工具表面。
- [SECURITY.md](SECURITY.md) - 安全。
- [TESTING.md](TESTING.md) - 测试。
- [ROADMAP.md](ROADMAP.md) - 路线图。
- [CHANGELOG.md](CHANGELOG.md) - 变更日志。

## 开发

```bash
bun run typecheck
bun run test
bun run lint
bun run build
bun run inventory
```

## 安全

kObsidian 会读写本地 vault。只从可信来源运行，不要提交 `.env`、API key、vault secrets 或 build output。

## 许可

MIT。
