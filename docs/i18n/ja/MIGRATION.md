# 移行ガイド

古いバージョンから現在の TypeScript/Bun 版へ移行する際の要点です。

## v0.3.0：複数 vault

### 新機能

- `vault.*`：`vault.list`、`vault.current`、`vault.select`、`vault.reset`。
- `OBSIDIAN_VAULT_<NAME>=path` による名前付き vault。
- Obsidian の `obsidian.json` から vault を検出。
- `KOBSIDIAN_VAULT_ALLOW` / `KOBSIDIAN_VAULT_DENY` による制限。

### 優先順位

1. 呼び出しごとの `vaultPath`
2. `vault.select` の session selection
3. `OBSIDIAN_VAULT_PATH`

従来どおり `OBSIDIAN_VAULT_PATH` だけでも動作します。

### 追加 env vars

```bash
OBSIDIAN_VAULT_WORK=/absolute/path/to/work
OBSIDIAN_VAULT_PERSONAL=/absolute/path/to/personal
KOBSIDIAN_VAULT_DISCOVERY=on
KOBSIDIAN_VAULT_ALLOW=work,personal
KOBSIDIAN_VAULT_DENY=secrets
KOBSIDIAN_OBSIDIAN_CONFIG=/absolute/path/obsidian.json
```

## v0.2.5：tool surface consolidation

### 名前空間

tool は `notes.*`、`tags.*`、`links.*`、`tasks.*`、`dataview.*`、`blocks.*`、`canvas.*`、`kanban.*`、`templates.*`、`wiki.*` などに整理されました。

### 引数形状

多くの tool は自由形式ではなく Zod validated object を受け取ります。旧 Python server の引数形状に依存せず、現在の tool inventory を参照してください。

```text
notes.edit
tags.add
blocks.update
templates.use
stats.note
commands.list
```

完全な対応は英語版 [`../../MIGRATION.md`](../../MIGRATION.md) と [`../../tool-inventory.json`](../../tool-inventory.json) を参照してください。

## Python server から

主な変更：

- Bun + strict TypeScript ESM。
- public contract は Zod v4。
- MCP は `@modelcontextprotocol/sdk` v1.x。
- 出力は `structuredContent` の typed JSON。
- filesystem-first。REST API は live UI や plugin 能力に限定。

移行手順：

1. まず `OBSIDIAN_VAULT_PATH` を残し、単一 vault workflow を維持する。
2. `bun run typecheck && bun run test && bun run lint` を実行。
3. `vault.list` で複数 vault 検出を確認。
4. 自動化 script の旧 tool 名を順に置き換える。
