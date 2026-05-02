# Workspaces：Obsidian MCP 的多 vault 支持

`vault.*` 命名空间让 LLM 可以在同一个 kObsidian 会话中发现并切换多个 Obsidian vault，而不需要重启服务器、修改配置或给每个工具调用都传 `vaultPath`。

## 为什么重要

很多用户把个人、工作、研究、归档 vault 分开。传统 MCP 配置通常绑定一个 `OBSIDIAN_VAULT_PATH`，切换 vault 要改配置并重启。kObsidian 的方式是：

- `vault.list` 列出可见 vault。
- `vault.current` 显示当前文件系统工具会命中的 vault。
- `vault.select` 切换会话活动 vault。
- `vault.reset` 回到默认 vault。

这只影响文件系统工具，例如 `notes.*`、`tags.*`、`wiki.*`。`workspace.*` 和 `commands.*` 仍然面向正在运行的 Obsidian 进程当前打开的 vault。

## 60 秒流程

```text
vault.list
  -> { items: [{ name: "work", path: "...", source: "env-named" }] }

vault.select { name: "work" }
  -> { changed: true, active: { name: "work", path: "..." } }

notes.search { query: "incident" }
  -> 现在搜索 work vault
```

## vault 发现

| 方式 | 状态 | 说明 |
|---|---|---|
| `OBSIDIAN_VAULT_PATH` | 稳定 | 默认 vault，兼容旧版本 |
| `OBSIDIAN_VAULT_<NAME>=path` | 稳定 | 任意数量的命名额外 vault |
| `obsidian.json` | 实验性 | 解析 Obsidian 自己的 vault 注册表；可用 `KOBSIDIAN_VAULT_DISCOVERY=off` 关闭 |

### `obsidian.json` 路径

| 系统 | 路径 |
|---|---|
| macOS | `~/Library/Application Support/obsidian/obsidian.json` |
| Windows | `%APPDATA%\obsidian\obsidian.json` |
| Linux | `$XDG_CONFIG_HOME/obsidian/obsidian.json` 或 `~/.config/obsidian/obsidian.json` |

非标准安装可设置 `KOBSIDIAN_OBSIDIAN_CONFIG`。

## 优先级链

```ts
args.vaultPath
  ?? context.session.activeVault
  ?? context.env.OBSIDIAN_VAULT_PATH
  ?? error
```

单次调用的 `vaultPath` 永远最高。`vault.select` 改变会话默认值。`OBSIDIAN_VAULT_PATH` 是启动默认值。

## 安全与操作者限制

- `KOBSIDIAN_VAULT_ALLOW`：名称或绝对路径白名单。
- `KOBSIDIAN_VAULT_DENY`：名称或绝对路径黑名单。
- `OBSIDIAN_VAULT_PATH` 不会被过滤，避免把默认 vault 锁掉。

常见错误：

- `not_found` - vault 不存在或不在可见列表中。
- `unauthorized` - vault 被 allow/deny 规则阻止。
- `invalid_argument` - selector 无效或不明确。

## HTTP 传输注意事项

HTTP 模式通常是无状态请求。会话选择只在服务器实例和 transport 生命周期内有效；如果客户端每次创建新连接，就应传显式 `vaultPath` 或重新调用 `vault.select`。

## 相关文档

- [ENVIRONMENT.md](ENVIRONMENT.md)
- [tools.md](tools.md)
- [../../WORKSPACES.md](../../WORKSPACES.md)
