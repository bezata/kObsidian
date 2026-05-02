# 環境変数

ローカル設定には環境変数を使います。実際の値、API key、`.env` ファイルをコミットしないでください。

```bash
# 基本設定
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=your-local-rest-api-key

# HTTP transport
KOBSIDIAN_HTTP_HOST=127.0.0.1
KOBSIDIAN_HTTP_PORT=3000
KOBSIDIAN_HTTP_BEARER_TOKEN=optional-local-http-token
KOBSIDIAN_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

# 複数 vault
OBSIDIAN_VAULT_WORK=/absolute/path/to/work-vault
OBSIDIAN_VAULT_PERSONAL=/absolute/path/to/personal-vault
KOBSIDIAN_VAULT_DISCOVERY=on
KOBSIDIAN_VAULT_ALLOW=work,personal
KOBSIDIAN_VAULT_DENY=secrets
KOBSIDIAN_OBSIDIAN_CONFIG=
```

Obsidian Local REST API は既定で自己署名 HTTPS 証明書を使います。ローカル開発では通常 `OBSIDIAN_API_VERIFY_TLS=false` のままで問題ありません。証明書を OS 側で信頼した場合だけ `true` にします。

`OBSIDIAN_REST_API_KEY` は [Local REST API](obsidian://show-plugin?id=obsidian-local-rest-api) プラグインが発行する API key です。必要なのは `workspace.*`、`commands.*`、実行時 `dataview.query*`、`templates.use` の Templater 分岐だけです。ファイルシステム優先の多くのツールは不要です。

## 複数 vault

kObsidian は `vault.*` 名前空間で 1 つのサーバー内に複数 vault を扱えます。

1. 呼び出しごとの `vaultPath` が最優先。
2. `vault.select` で選んだセッション中の active vault。
3. `OBSIDIAN_VAULT_PATH` が既定値。
4. どれも無ければエラー。

### vault の検出元

| 検出元 | 読むもの | 状態 |
|---|---|---|
| `OBSIDIAN_VAULT_PATH` | 単一の既定 vault | 安定、文書化済み |
| `OBSIDIAN_VAULT_<NAME>=path` | 名前付き追加 vault | 安定、文書化済み |
| `obsidian.json` | Obsidian 自身の vault レジストリ | 実験的。`KOBSIDIAN_VAULT_DISCOVERY=on|off` で切り替え |

`obsidian-app` 検出は best-effort です。解析失敗は `vault.list` の `obsidianConfigError` に出し、サーバーは落としません。Obsidian 内部ファイルに依存したくない場合は `KOBSIDIAN_VAULT_DISCOVERY=off` にして環境変数だけを使います。

### OS ごとの `obsidian.json`

| OS | 既定パス |
|---|---|
| macOS | `~/Library/Application Support/obsidian/obsidian.json` |
| Windows | `%APPDATA%\obsidian\obsidian.json` |
| Linux | `$XDG_CONFIG_HOME/obsidian/obsidian.json` -> `~/.config/obsidian/obsidian.json` |
| Linux Flatpak | `~/.var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json` |
| Linux Snap | `~/snap/obsidian/current/.config/obsidian/obsidian.json` |
| Portable / WSL / 非標準 | `KOBSIDIAN_OBSIDIAN_CONFIG=/absolute/path/obsidian.json` |

### セキュリティ制御

| 変数 | 既定 | 効果 |
|---|---|---|
| `KOBSIDIAN_VAULT_ALLOW` | 未設定、すべて許可 | 名前または絶対パスの allowlist |
| `KOBSIDIAN_VAULT_DENY` | 未設定 | allowlist の後に適用する denylist |

`OBSIDIAN_VAULT_PATH` は allow/deny の対象外です。操作者が明示した既定 vault を常に到達可能にし、誤設定によるロックアウトを避けます。

## ローカル確認

```bash
bun run dev:stdio
bun run dev:http
bun run test
```
