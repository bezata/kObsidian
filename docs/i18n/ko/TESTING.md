# 테스트

kObsidian은 Bun, TypeScript, Vitest로 테스트합니다.

## 로컬 검사

```bash
bun run typecheck
bun run test
bun run lint
bun run build
```

## Inventory

등록된 도구를 바꾼 뒤에는 공개 MCP tool inventory를 다시 생성합니다.

```bash
bun run inventory
```

생성 파일은 `docs/tool-inventory.json`입니다.

## 환경

파일 시스템 기반 테스트는 Obsidian 실행이 필요 없습니다. REST API 기반 live 도구는 다음 변수를 사용합니다.

```bash
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=your-local-rest-api-key
```

`.env` 파일이나 실제 API key를 커밋하지 마세요.

## 커버리지 범위

- notes, links, tags, tasks, Dataview, Kanban, canvas, Mermaid, Marp의 parsing과 mutation.
- in-memory transport를 통한 MCP 등록 및 `structuredContent` 검증.
- Hono Streamable HTTP smoke coverage.
- 원본 형식을 보존하는 Markdown block 업데이트.
- Local REST API 의존 도구는 opt-in live check.
