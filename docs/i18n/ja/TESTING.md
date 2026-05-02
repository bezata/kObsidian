# テスト

kObsidian は Bun、TypeScript、Vitest でテストします。

## ローカルチェック

```bash
bun run typecheck
bun run test
bun run lint
bun run build
```

## Inventory

登録ツールを変更したら公開 MCP tool inventory を再生成します。

```bash
bun run inventory
```

生成物は `docs/tool-inventory.json` です。

## 環境

ファイルシステムベースのテストに Obsidian の起動は不要です。REST API に依存する live tool では次の変数を使います。

```bash
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=your-local-rest-api-key
```

`.env` や本物の API key はコミットしないでください。

## カバレッジ範囲

- notes、links、tags、tasks、Dataview、Kanban、canvas、Mermaid、Marp の parse と mutation。
- in-memory transport による MCP 登録と `structuredContent` 検証。
- Hono Streamable HTTP の smoke coverage。
- Markdown block を元の形式を保って更新する処理。
- Local REST API 依存ツールは opt-in の live check。
