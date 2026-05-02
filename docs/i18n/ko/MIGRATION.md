# 마이그레이션 가이드

이전 버전에서 현재 TypeScript/Bun 버전으로 이동할 때의 핵심 변경점입니다.

## v0.3.0: 다중 vault

### 새 기능

- `vault.*`: `vault.list`, `vault.current`, `vault.select`, `vault.reset`.
- `OBSIDIAN_VAULT_<NAME>=path` 형식의 이름 있는 vault.
- Obsidian의 `obsidian.json`에서 vault 발견.
- `KOBSIDIAN_VAULT_ALLOW` / `KOBSIDIAN_VAULT_DENY` 제한.

### 우선순위

1. 호출별 `vaultPath`
2. `vault.select`의 session selection
3. `OBSIDIAN_VAULT_PATH`

기존처럼 `OBSIDIAN_VAULT_PATH`만 설정해도 동작합니다.

### 추가 env vars

```bash
OBSIDIAN_VAULT_WORK=/absolute/path/to/work
OBSIDIAN_VAULT_PERSONAL=/absolute/path/to/personal
KOBSIDIAN_VAULT_DISCOVERY=on
KOBSIDIAN_VAULT_ALLOW=work,personal
KOBSIDIAN_VAULT_DENY=secrets
KOBSIDIAN_OBSIDIAN_CONFIG=/absolute/path/obsidian.json
```

## v0.2.5: tool surface consolidation

### Namespace

도구는 `notes.*`, `tags.*`, `links.*`, `tasks.*`, `dataview.*`, `blocks.*`, `canvas.*`, `kanban.*`, `templates.*`, `wiki.*` 등으로 정리되었습니다.

### 인자 형태

많은 도구는 자유 형식이 아니라 Zod validated object를 받습니다. 이전 Python server의 인자 형태에 의존하지 말고 현재 tool inventory를 참조하세요.

```text
notes.edit
tags.add
blocks.update
templates.use
stats.note
commands.list
```

전체 mapping은 영어 원문 [`../../MIGRATION.md`](../../MIGRATION.md)와 [`../../tool-inventory.json`](../../tool-inventory.json)을 참고하세요.

## Python server에서 이동

주요 변경:

- Bun + strict TypeScript ESM.
- public contract는 Zod v4.
- MCP는 `@modelcontextprotocol/sdk` v1.x.
- 출력은 `structuredContent`의 typed JSON.
- filesystem-first이며 REST API는 live UI나 plugin 기능에 한정.

권장 순서:

1. 먼저 `OBSIDIAN_VAULT_PATH`를 유지해 단일 vault workflow를 보존합니다.
2. `bun run typecheck && bun run test && bun run lint`를 실행합니다.
3. `vault.list`로 다중 vault 발견을 확인합니다.
4. 자동화 스크립트의 오래된 tool name을 하나씩 교체합니다.
