# 变更日志

这是 [`../../../CHANGELOG.md`](../../../CHANGELOG.md) 的中文版本，保留版本号、工具名、环境变量和命令原文。

## Unreleased

尚无未发布条目。

## 0.3.2 - 2026-05-02

本次发布增加简体中文、日语和韩语文档。没有运行时行为、schema 或工具表面变化。

### Added

- 新增 `docs/i18n/zh-CN/`、`docs/i18n/ja/`、`docs/i18n/ko/`。
- 每个语言目录包含项目 README、路线图、变更日志、架构、wiki、示例、工具、安全、测试、环境变量、迁移、workspaces 文档。
- 新增 `docs/i18n/README.md` 作为多语言入口。

### Changed

- 根 `README.md` 与 `docs/README.md` 现在直接链接到中文、日语和韩语文档。
- `package.json`、`manifest.json`、`server.json` 的发布版本统一为 `0.3.2`。

## 0.3.1 - 2026-04-25

工具定义质量改进版本。此次发布只改描述，不改变行为、schema 或 annotation。

### Changed

- `wiki.*` 七个工具的描述被重写，包含参数语义、何时使用、返回形状和示例。
- `workspace.openFile`、`workspace.closeActiveFile`、`workspace.toggleEditMode` 增加返回形状、边界情况和 UI-only contract 说明。
- `links.hubs` 描述增加与 `links.health`、`links.graph` 的使用区分。
- `src/schema/wiki.ts` 中 wiki 参数 schema 增加 `.describe()`，让 MCP 客户端可以显示字段帮助。

## 0.3.0 - 2026-04-25

多 vault 支持。kObsidian 现在能在单个服务器会话中发现并切换多个 Obsidian vault。

### Added

- 新增 `vault.*` namespace：`vault.list`、`vault.current`、`vault.select`、`vault.reset`。
- 支持 `OBSIDIAN_VAULT_<NAME>=path` 命名 vault。
- 实验性支持解析 Obsidian 的 `obsidian.json` vault registry。
- 新增 `KOBSIDIAN_VAULT_ALLOW` 与 `KOBSIDIAN_VAULT_DENY`。
- 新增 `pick-vault` server-side prompt。
- 所有 filesystem tools 的描述都补充 session-active vault 优先级说明。
- CI matrix 覆盖 Ubuntu、macOS、Windows。

### Changed

- `requireVaultPath` 优先级变为 `arg > session > env > error`。
- `DomainContext` 增加 `session` 与 `vaults`。
- `AppEnv` 增加 `namedVaults`。

### Fixed

- `ingest-source` prompt 改为引用新的 `notes.edit` 模式。

### Migration

从 0.2.5 升级无需强制改动。只设置 `OBSIDIAN_VAULT_PATH` 的旧配置继续工作。要启用多 vault，可添加：

```bash
OBSIDIAN_VAULT_WORK=/absolute/path/to/work
OBSIDIAN_VAULT_SCRATCH=/absolute/path/to/scratch
```

然后调用 `vault.select { name: "work" }`。

## 0.2.5 - 2026-04-25

工具表面整理。工具从约 90 个减少到 62 个，命名空间更稳定，所有工具描述和 MCP annotation 被统一整理。

### Breaking

- `mermaid.*` 移除，改由 `blocks.*` 处理 Mermaid fenced blocks。
- `stats.note` 移除，使用 `notes.read` 的 `include: ['stats']`。
- 多个工具合并到 discriminated union 形式，例如 `notes.edit`、`tags.modify`、`kanban.card`、`canvas.edit`、`templates.use`。

### Changed

- 每个工具描述改为面向结果、限制、返回形状和安全提示的段落。
- annotation 常量扩展为显式设置四个 MCP hints。
- 每个 namespace 的 Zod schema 放到 `src/schema/<namespace>.ts`。
- `ToolDefinition` 支持 `inputExamples`。

### Migration examples

```diff
- notes.append { filePath: "foo.md", content: "..." }
+ notes.edit   { mode: "append", path: "foo.md", content: "..." }

- tags.add { path: "foo.md", tags: ["x"] }
+ tags.modify { path: "foo.md", op: "add", tags: ["x"] }

- mermaid.blocks.update { filePath, source, index }
+ blocks.update { filePath, source, index, language: "mermaid" }
```

## 0.2.x 与 0.1.x

早期版本建立了 TypeScript/Bun runtime、MCP server、stdio/HTTP transport、LLM Wiki 层、工具命名空间、Claude Code skills、发布流水线、安全文档和测试基线。完整逐条历史请查看英文源文件 [`../../../CHANGELOG.md`](../../../CHANGELOG.md)。
