# kObsidian 文档

这些文档面向中文读者，内容与英文文档保持同一结构。命令、工具名、环境变量和文件路径保持原样，便于直接复制使用。

## 项目级文档

- [PROJECT_README.md](PROJECT_README.md) - 项目 README 的中文版本：定位、安装、快速开始、配置、开发和安全。
- [ROADMAP.md](ROADMAP.md) - `TODO.md` 的中文版本：未来里程碑和约定。
- [CHANGELOG.md](CHANGELOG.md) - `CHANGELOG.md` 的中文版本：发布历史和迁移重点。

<a id="per-vault-configuration-v037"></a>

## 每个 vault 的独立配置（v0.3.7）

在 vault 根目录创建 `.kobsidian.json`，即可自定义该 vault 的 wiki。例如：

```json
{
  "wiki": {
    "root": "wiki",
    "sourcesDir": "来源",
    "staleDays": 90,
    "headings": {
      "indexSources": "来源"
    }
  }
}
```

还可以配置 `conceptsDir`、`entitiesDir`、`indexFile`、`logFile`、`schemaFile` 和全部五个 wiki 标题。完整字段见[配置 schema](../../kobsidian.config.schema.json)。优先级为：单次调用参数 → vault 配置文件 → `KOBSIDIAN_WIKI_*` 环境变量 → 内置默认值。`KOBSIDIAN_VAULT_CONFIG_FILE` 可覆盖配置文件路径；`vault.current` 会报告生效配置或错误。后续调用会重新读取配置；无效 JSON 和未知字段会明确报错。

配置文件是可选的，现有 vault 可继续使用默认值。修改目录或文件名配置不会移动已有 wiki 内容，请确保配置与实际布局一致。v0.3.7 的 `notes.edit` `after-heading` 会在章节顶部插入，衔接已有列表，并保留段落和标题前的间距。`after-heading` 和 `after-block` 也不会再额外添加第二个末尾换行。

## MCP 客户端兼容性

从 v0.3.5 起，stdio 和无状态 Streamable HTTP 的工具输入与输出 schema 均使用 **JSON Schema 2020-12**，修复了 draft-07 标记导致 Claude Code 拒绝发现工具的问题（[issue #35](https://github.com/bezata/kObsidian/issues/35)）。

从 v0.3.6 起，`notes.create`、`notes.edit` 等联合类型工具公开扁平对象 schema，包含可见字段和 `enum` 选择器，不再使用根级 `oneOf` / `anyOf`，让客户端能够发现所有变体。原始 Zod schema 仍在调用时强制验证各分支的要求，并验证结构化输出。

请使用 v0.3.6 或更高版本以获得两项修复，然后重启或重新连接 MCP 客户端以刷新工具列表。无需迁移 vault 或添加环境变量。回归测试涵盖 schema 结构检查以及真实 stdio / 无状态 HTTP 往返调用；详见 [TESTING.md](TESTING.md) 和[发布历史（英文）](../../../CHANGELOG.md)。

## 工作区与多库

- [WORKSPACES.md](WORKSPACES.md) - `vault.list`、`vault.select`、会话内切换 Obsidian vault、发现来源、优先级链和安全限制。

## 架构

- [architecture.md](architecture.md) - MCP 请求如何进入工具层、领域层和文件系统；模块职责、传输方式和 LLM Wiki 流程。

## LLM Wiki

- [wiki.md](wiki.md) - wiki 层的目标、`proposedEdits` 设计、日志格式、lint 分类和一次典型会话的流程。
- [examples.md](examples.md) - 个人研究 wiki、工程 ADR 档案、代码库知识库的端到端示例。

## 工具、资源与提示词

- [tools.md](tools.md) - 工具命名空间、注解、资源、提示词和 `structuredContent` 输出约定。
- [`../../tool-inventory.json`](../../tool-inventory.json) - 机器生成的完整工具清单，保持英文原始字段，供 MCP 客户端和注册表使用。

## 安全与运维

- [SECURITY.md](SECURITY.md) - Origin/CORS、Bearer 认证、VirusTotal、环境变量与 MCP 安全注意事项。
- [TESTING.md](TESTING.md) - 本地检查命令、工具清单生成和覆盖范围。
- [ENVIRONMENT.md](ENVIRONMENT.md) - 所有 `OBSIDIAN_*` 与 `KOBSIDIAN_*` 环境变量、默认值和用途。
- [MIGRATION.md](MIGRATION.md) - 从旧版本升级到当前 TypeScript/Bun 版本的迁移说明。

建议阅读顺序：[architecture](architecture.md) -> [wiki](wiki.md) -> [examples](examples.md) -> [tools](tools.md) -> [TESTING](TESTING.md)。
