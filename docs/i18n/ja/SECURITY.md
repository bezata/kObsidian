# セキュリティ

kObsidian はローカル MCP サーバーで、Obsidian vault を読み書きします。ファイルシステム権限を持つ CLI と同じ扱いにしてください。信頼できるソースから実行し、秘密情報をリポジトリに入れないでください。

## Transport レベルの保護

### stdio

ネットワーク面はありません。MCP クライアントがプロセスを直接起動し、stdin/stdout で JSON-RPC をやり取りします。診断は stderr に出し、stdout のプロトコルフレームを壊しません。

### Streamable HTTP

- `KOBSIDIAN_ALLOWED_ORIGINS` は Origin allowlist です。不許可の Origin は 403。
- `OPTIONS /mcp` は許可 Origin に CORS preflight を返し、不許可なら 403。
- `KOBSIDIAN_HTTP_BEARER_TOKEN` を設定した場合は `Authorization: Bearer ...` が必須です。
- `MCP-Protocol-Version` は検証され、未対応の値は JSON-RPC error になります。

## Supply chain

### VirusTotal

release workflow は各 `kobsidian-<platform>.mcpb` を VirusTotal にアップロードし、解析リンクを GitHub release に追加します。

### npm Trusted Publishing

npm publish は GitHub OIDC Trusted Publishing を使います。長期 `NPM_TOKEN` は保存しません。

```bash
npm trust github --file .github/workflows/release.yml --repo bezata/kObsidian
```

### SDK バージョン固定

`@modelcontextprotocol/sdk` は `1.29.0` に固定されています。UriTemplate ReDoS と cross-client response leak の修正を含む下限より新しい版です。

### Biome と TypeScript strict

`bun run lint` は Biome、`bun run typecheck` は strict TypeScript を使います。`prepublishOnly` は typecheck、lint、test、build を実行します。

## 環境変数の扱い

秘密情報：

- `OBSIDIAN_REST_API_KEY`
- `KOBSIDIAN_HTTP_BEARER_TOKEN`

`.env` と `.env.*` は `.gitignore` 済みです。vault 内にも秘密情報を置かないでください。

## MCP 固有の注意

### Tool annotation は安全境界ではない

`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint` はクライアント向けのヒントです。実際の検証はサーバー側の path containment などで行います。

### `wiki.ingest` は cross-reference を勝手に書かない

`wiki.ingest` は Source 作成と log 追記だけを行い、他ページへの編集は `proposedEdits` として返します。

### Tool poisoning / shadowing

ツール説明、タイトル、annotation はこのリポジトリのソースから来ます。複数 MCP server の gateway を使う場合は承認時に schema を固定してください。

## 脆弱性報告

GitHub private security advisory を使ってください：<https://github.com/bezata/kObsidian/security/advisories/new>。

または件名に `kObsidian security` を含めてメンテナへメールしてください。
