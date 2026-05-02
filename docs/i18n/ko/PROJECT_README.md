# kObsidian MCP

kObsidian은 Obsidian vault용 filesystem-first MCP server이며, 그 위에 LLM Wiki layer를 제공합니다. 사용자는 저장할 source를 고르고, LLM은 정리, 색인, 상호 참조, 유지보수를 담당합니다.

## kObsidian을 쓰는 이유

- **Filesystem-first**: 대부분의 도구는 vault file을 직접 읽고 쓰며 Obsidian 실행이 필요 없습니다.
- **Typed MCP tools**: Zod schema로 검증하고 `structuredContent`를 반환하며 MCP hint를 명시합니다.
- **다중 vault**: `vault.list`, `vault.current`, `vault.select`, `vault.reset`으로 세션 중 vault를 전환합니다.
- **LLM Wiki**: `wiki.*`로 init, ingest, query, lint, merge, index rebuild를 수행합니다.
- **두 transport**: stdio와 Hono Streamable HTTP.
- **배포**: npm, `.mcpb`, Smithery, MCP Registry 설정을 제공합니다.

## Install

핵심 환경 변수:

```bash
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=only-if-you-use-workspace-or-commands-tools
```

실행 예:

```bash
npx -y kobsidian-mcp
```

소스에서 개발:

```bash
bun install
bun run dev:stdio
bun run dev:http
```

## Obsidian plugins

filesystem 도구는 Obsidian 실행이 필요 없습니다. 다음 기능은 Obsidian Local REST API plugin과 `OBSIDIAN_REST_API_KEY`가 필요합니다.

- `workspace.*`
- `commands.*`
- live `dataview.query*`
- `templates.use`의 Templater 분기

## Quick start

1. `OBSIDIAN_VAULT_PATH`를 설정합니다.
2. MCP server를 실행합니다.
3. `vault.current`로 대상 vault를 확인합니다.
4. `notes.search` 또는 `notes.read`로 읽기를 확인합니다.
5. `wiki.init`으로 wiki를 초기화합니다.
6. `wiki.ingest`로 첫 source를 등록합니다.

## Use cases

- 개인 연구 wiki.
- ADR archive.
- codebase wiki.

자세한 내용은 [examples.md](examples.md)를 보세요.

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

자세한 내용은 [architecture.md](architecture.md)를 보세요.

## Configuration

전체 목록은 [ENVIRONMENT.md](ENVIRONMENT.md)에 있습니다.

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

kObsidian은 local vault를 읽고 씁니다. 신뢰할 수 있는 출처에서 실행하고 `.env`, API key, vault secrets, build output을 커밋하지 마세요.

## License

MIT.
