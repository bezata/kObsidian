# kObsidian 文档

这些文档面向中文读者，内容与英文文档保持同一结构。命令、工具名、环境变量和文件路径保持原样，便于直接复制使用。

## 项目级文档

- [PROJECT_README.md](PROJECT_README.md) - 项目 README 的中文版本：定位、安装、快速开始、配置、开发和安全。
- [ROADMAP.md](ROADMAP.md) - `TODO.md` 的中文版本：未来里程碑和约定。
- [CHANGELOG.md](CHANGELOG.md) - `CHANGELOG.md` 的中文版本：发布历史和迁移重点。

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
