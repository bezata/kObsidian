# Workspaces：Obsidian MCP の複数 vault

`vault.*` 名前空間により、LLM は同じ kObsidian セッション中に複数の Obsidian vault を見つけ、切り替えられます。サーバー再起動、設定編集、各 tool への `vaultPath` 付与は不要です。

## なぜ重要か

個人、仕事、研究、アーカイブを別 vault にするユーザーは多いです。単一 `OBSIDIAN_VAULT_PATH` だけだと切り替えが重くなります。

- `vault.list` - 見える vault を列挙。
- `vault.current` - 次の filesystem tool が使う vault を表示。
- `vault.select` - セッション active vault を切り替え。
- `vault.reset` - 既定に戻す。

対象は `notes.*`、`tags.*`、`wiki.*` などの filesystem tool です。`workspace.*` と `commands.*` は Obsidian process が現在開いている vault を対象にします。

## 60 秒ツアー

```text
vault.list
  -> { items: [{ name: "work", path: "...", source: "env-named" }] }

vault.select { name: "work" }
  -> { changed: true, active: { name: "work", path: "..." } }

notes.search { query: "incident" }
  -> work vault を検索
```

## vault 検出

| 方法 | 状態 | 説明 |
|---|---|---|
| `OBSIDIAN_VAULT_PATH` | 安定 | 既定 vault。旧バージョン互換 |
| `OBSIDIAN_VAULT_<NAME>=path` | 安定 | 任意数の名前付き vault |
| `obsidian.json` | 実験的 | Obsidian の vault registry を読む。`KOBSIDIAN_VAULT_DISCOVERY=off` で無効化 |

## 優先順位

```ts
args.vaultPath
  ?? context.session.activeVault
  ?? context.env.OBSIDIAN_VAULT_PATH
  ?? error
```

呼び出しごとの `vaultPath` が常に最優先です。

## 安全制御

- `KOBSIDIAN_VAULT_ALLOW` - 名前または絶対パスの allowlist。
- `KOBSIDIAN_VAULT_DENY` - 名前または絶対パスの denylist。
- `OBSIDIAN_VAULT_PATH` はフィルタされません。

エラー：

- `not_found`
- `unauthorized`
- `invalid_argument`

## HTTP transport の注意

HTTP クライアントが毎回新しい接続を作る場合、セッション選択は保持されないことがあります。その場合は明示的な `vaultPath` か再度 `vault.select` を使います。

## 関連ドキュメント

- [ENVIRONMENT.md](ENVIRONMENT.md)
- [tools.md](tools.md)
- [../../WORKSPACES.md](../../WORKSPACES.md)
