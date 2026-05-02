# kObsidian MCP

kObsidian は Obsidian vault 向けの filesystem-first MCP server で、その上に LLM Wiki layer を提供します。人間が保存すべき source を選び、LLM が整理、索引、相互参照、保守を行います。

## kObsidian の特徴

- **Filesystem-first**：多くの tool は vault file を直接読み書きし、Obsidian の起動を必要としません。
- **Typed MCP tools**：Zod schema で検証し、`structuredContent` を返し、MCP hint を明示します。
- **複数 vault**：`vault.list`、`vault.current`、`vault.select`、`vault.reset` でセッション中に vault を切り替えます。
- **LLM Wiki**：`wiki.*` で init、ingest、query、lint、merge、index rebuild を行います。
- **2 つの transport**：stdio と Hono Streamable HTTP。
- **配布**：npm、`.mcpb`、Smithery、MCP Registry に対応します。

## Install

基本環境変数：

```bash
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=only-if-you-use-workspace-or-commands-tools
```

起動例：

```bash
npx -y kobsidian-mcp
```

ソースから：

```bash
bun install
bun run dev:stdio
bun run dev:http
```

## Obsidian plugins

filesystem tool は Obsidian の起動を必要としません。次の機能は Obsidian Local REST API plugin と `OBSIDIAN_REST_API_KEY` が必要です。

- `workspace.*`
- `commands.*`
- live `dataview.query*`
- `templates.use` の Templater 分岐

## Quick start

1. `OBSIDIAN_VAULT_PATH` を設定します。
2. MCP server を起動します。
3. `vault.current` で対象 vault を確認します。
4. `notes.search` または `notes.read` で読み取りを確認します。
5. `wiki.init` で wiki を初期化します。
6. `wiki.ingest` で最初の source を登録します。

## Use cases

- 個人研究 wiki。
- ADR archive。
- codebase wiki。

詳しくは [examples.md](examples.md) を参照してください。

## Architecture

```text
MCP client
  -> stdio / Streamable HTTP
  -> McpServer
  -> server tools
  -> domain logic
  -> vault filesystem
  -> optional Local REST API
```

詳しくは [architecture.md](architecture.md)。

## Configuration

完全な一覧は [ENVIRONMENT.md](ENVIRONMENT.md) にあります。

- `OBSIDIAN_*`
- `KOBSIDIAN_HTTP_*`
- `KOBSIDIAN_VAULT_*`
- `KOBSIDIAN_WIKI_*`

## Docs

- [README.md](README.md)
- [architecture.md](architecture.md)
- [wiki.md](wiki.md)
- [tools.md](tools.md)
- [SECURITY.md](SECURITY.md)
- [TESTING.md](TESTING.md)
- [ROADMAP.md](ROADMAP.md)
- [CHANGELOG.md](CHANGELOG.md)

## Development

```bash
bun run typecheck
bun run test
bun run lint
bun run build
bun run inventory
```

## Security

kObsidian は local vault を読み書きします。信頼できるソースから実行し、`.env`、API key、vault secrets、build output をコミットしないでください。

## License

MIT。
