# 迁移指南

本文说明从早期版本迁移到当前 TypeScript/Bun 版本时需要注意的变化。

## v0.3.0：多 vault 支持

### 新增内容

- 新增 `vault.*` 命名空间：`vault.list`、`vault.current`、`vault.select`、`vault.reset`。
- 支持 `OBSIDIAN_VAULT_<NAME>=path` 形式的命名 vault。
- 可从 Obsidian 的 `obsidian.json` 发现已打开过的 vault。
- 新增 allow/deny 限制：`KOBSIDIAN_VAULT_ALLOW`、`KOBSIDIAN_VAULT_DENY`。

### 优先级变化

文件系统工具解析 vault 的顺序为：

1. 单次调用 `vaultPath`
2. `vault.select` 的会话选择
3. `OBSIDIAN_VAULT_PATH`

旧配置只设置 `OBSIDIAN_VAULT_PATH` 仍然有效。

### 环境变量新增

```bash
OBSIDIAN_VAULT_WORK=/absolute/path/to/work
OBSIDIAN_VAULT_PERSONAL=/absolute/path/to/personal
KOBSIDIAN_VAULT_DISCOVERY=on
KOBSIDIAN_VAULT_ALLOW=work,personal
KOBSIDIAN_VAULT_DENY=secrets
KOBSIDIAN_OBSIDIAN_CONFIG=/absolute/path/obsidian.json
```

## v0.2.5：工具表面整理

### 命名空间变化

工具按领域合并到更稳定的命名空间：`notes.*`、`tags.*`、`links.*`、`tasks.*`、`dataview.*`、`blocks.*`、`canvas.*`、`kanban.*`、`templates.*`、`wiki.*` 等。

### 参数形状变化

许多工具从自由参数改为 Zod 验证对象。调用方应使用文档中的工具名和字段名，不要依赖旧的 Python server 参数形状。

### 示例

```text
notes.edit
tags.add
blocks.update
templates.use
stats.note
commands.list
```

完整映射请查看英文源文档 [`../../MIGRATION.md`](../../MIGRATION.md) 和生成清单 [`../../tool-inventory.json`](../../tool-inventory.json)。

## 从 Python server 迁移

关键变化：

- 运行时改为 Bun + strict TypeScript ESM。
- 公共 contract 由 Zod v4 定义。
- MCP 使用 `@modelcontextprotocol/sdk` v1.x。
- 输出通过 `structuredContent` 返回 typed JSON。
- 文件系统行为优先，REST API 只用于 live Obsidian UI 或插件能力。

迁移建议：

1. 先保留 `OBSIDIAN_VAULT_PATH`，让旧单 vault 工作流继续运行。
2. 运行 `bun run typecheck && bun run test && bun run lint`。
3. 用 `vault.list` 验证多 vault 发现。
4. 对自动化脚本逐个替换旧工具名。
