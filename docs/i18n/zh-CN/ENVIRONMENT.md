# 环境变量

本地配置通过环境变量完成。不要提交真实 vault 路径、API key 或 `.env` 文件。

```bash
# 核心配置
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=your-local-rest-api-key

# HTTP 传输
KOBSIDIAN_HTTP_HOST=127.0.0.1
KOBSIDIAN_HTTP_PORT=3000
KOBSIDIAN_HTTP_BEARER_TOKEN=optional-local-http-token
KOBSIDIAN_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

# 多 vault
OBSIDIAN_VAULT_WORK=/absolute/path/to/work-vault
OBSIDIAN_VAULT_PERSONAL=/absolute/path/to/personal-vault
KOBSIDIAN_VAULT_DISCOVERY=on
KOBSIDIAN_VAULT_ALLOW=work,personal
KOBSIDIAN_VAULT_DENY=secrets
KOBSIDIAN_OBSIDIAN_CONFIG=
```

Obsidian Local REST API 默认使用自签名 HTTPS 证书。本地开发时通常保持 `OBSIDIAN_API_VERIFY_TLS=false`，只有在系统信任该证书后才设置为 `true`。

`OBSIDIAN_REST_API_KEY` 来自 [Local REST API](obsidian://show-plugin?id=obsidian-local-rest-api) 插件。它只用于 `workspace.*`、`commands.*`、运行时 `dataview.query*` 和 `templates.use` 的 Templater 分支。大多数文件系统优先的工具不需要它。

## 多 vault

kObsidian 通过 `vault.*` 命名空间支持同一个服务器内的多个 vault：

1. 单次调用传入的 `vaultPath`，优先级最高。
2. `vault.select` 选择的会话活动 vault。
3. `OBSIDIAN_VAULT_PATH`，作为默认回退。
4. 如果都没有配置，则返回错误。

### vault 发现来源

| 来源 | 读取内容 | 状态 |
|---|---|---|
| `OBSIDIAN_VAULT_PATH` | 单个默认 vault | 稳定、已文档化 |
| `OBSIDIAN_VAULT_<NAME>=path` | 命名的额外 vault，例如 `OBSIDIAN_VAULT_WORK` | 稳定、已文档化 |
| `obsidian.json` | Obsidian 自己的 vault 注册表 | 实验性；格式属于 Obsidian 内部实现，可用 `KOBSIDIAN_VAULT_DISCOVERY=on|off` 控制 |

`obsidian-app` 来源是 best-effort：解析失败会出现在 `vault.list` 的 `obsidianConfigError` 字段中，不会让服务器崩溃。若完全不想依赖 Obsidian 内部文件，请设置 `KOBSIDIAN_VAULT_DISCOVERY=off`，只用环境变量管理 vault。

### 各系统的 `obsidian.json`

| 系统 | 默认路径 |
|---|---|
| macOS | `~/Library/Application Support/obsidian/obsidian.json` |
| Windows | `%APPDATA%\obsidian\obsidian.json` |
| Linux | `$XDG_CONFIG_HOME/obsidian/obsidian.json` -> `~/.config/obsidian/obsidian.json` |
| Linux Flatpak | `~/.var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json` |
| Linux Snap | `~/snap/obsidian/current/.config/obsidian/obsidian.json` |
| 便携版、WSL、非标准路径 | 设置 `KOBSIDIAN_OBSIDIAN_CONFIG=/absolute/path/obsidian.json` |

### 安全限制

| 变量 | 默认值 | 作用 |
|---|---|---|
| `KOBSIDIAN_VAULT_ALLOW` | 未设置，允许全部 | 名称或绝对路径白名单；不匹配的 vault 会从 `vault.list` 过滤，并在 `vault.select` 中返回 `unauthorized` |
| `KOBSIDIAN_VAULT_DENY` | 未设置 | 黑名单，在白名单之后应用 |

`OBSIDIAN_VAULT_PATH` 永远不会被 allow/deny 过滤，因为它是操作者明确配置的默认 vault，必须始终可达，避免误配置导致自锁。

## 快速本地检查

```bash
bun run dev:stdio
bun run dev:http
bun run test
```
