# 工具表面

kObsidian 暴露一组 typed MCP 工具。工具名保持英文，因为它们是协议契约；说明和使用建议在这里用中文解释。

## 命名空间

| 命名空间 | 用途 |
|---|---|
| `vault.*` | 列出、查看、选择和重置会话活动 vault |
| `notes.*` | 读写、创建、删除、移动、搜索 note 和 folder |
| `tags.*` | 添加、移除、更新、分析和列出标签 |
| `links.*` | backlinks、orphans、graph、hub、链接健康 |
| `tasks.*` | Tasks 插件格式的任务搜索、创建、切换、元数据更新和统计 |
| `dataview.*` | Dataview 字段、块和可选的运行时查询 |
| `blocks.*` | 按 Markdown block id 读取或替换区域 |
| `kanban.*` | 解析和修改 Kanban board/card |
| `canvas.*` | 解析、修改 Obsidian canvas 节点和边 |
| `mermaid.*` / `marp.*` | 读取和更新 fenced diagram / slide block |
| `templates.*` | 文件系统模板和可选 Templater 插件桥接 |
| `workspace.*` / `commands.*` | 通过 Local REST API 操作正在运行的 Obsidian UI |
| `wiki.*` | LLM Wiki 初始化、ingest、query、lint、merge、index rebuild |
| `stats.*` / `system.*` | vault 统计和版本信息 |

## 注解

每个工具都显式设置四个 MCP hint：

- `readOnlyHint`
- `destructiveHint`
- `idempotentHint`
- `openWorldHint`

文件系统工具通常 `openWorldHint:false`，因为它们只在 vault 内工作。`workspace.*`、`commands.*` 和 live REST/DQL 相关工具会标记为 open world。

## 资源

服务器公开 wiki 资源：

- `kobsidian://wiki/index`
- `kobsidian://wiki/log`
- `kobsidian://wiki/schema`
- `kobsidian://wiki/page/{+path}`

这些资源让非 Claude Code 客户端也能发现 wiki schema、索引、日志和具体页面。

## 提示词

服务器内置提示词：

- `ingest-source` - 包装 `wiki.ingest` 和 `proposedEdits` 应用流程。
- `answer-from-wiki` - 包装 `wiki.query`、读取页面并生成带 wikilink 引用的答案。
- `health-check-wiki` - 包装 `wiki.lint`，按优先级提出修复建议。

## 结构化输出

工具返回 MCP `structuredContent`，文本内容只用于短摘要。新工具应优先定义具体 Zod 输出 schema；只有形状复杂或仍在迁移的工具才使用通用 schema。

## 重新生成清单

```bash
bun run inventory
```

生成的完整机器清单位于 [`../../tool-inventory.json`](../../tool-inventory.json)。
