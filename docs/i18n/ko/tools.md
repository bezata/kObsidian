# 도구 표면

kObsidian은 typed MCP tools를 제공합니다. 도구 이름은 protocol contract이므로 영어 그대로 유지합니다.

## Namespace

| Namespace | 용도 |
|---|---|
| `vault.*` | vault 목록, 현재 vault, 선택, reset |
| `notes.*` | note/folder 읽기, 쓰기, 생성, 삭제, 이동, 검색 |
| `tags.*` | tag 추가, 제거, 업데이트, 분석, 목록 |
| `links.*` | backlinks, orphans, graph, hub, 링크 건강도 |
| `tasks.*` | Tasks plugin 형식의 검색, 생성, toggle, metadata 업데이트, 통계 |
| `dataview.*` | Dataview field/block 및 선택적 live query |
| `blocks.*` | Markdown block id 기반 영역 읽기와 교체 |
| `kanban.*` | Kanban board/card parsing 및 mutation |
| `canvas.*` | Obsidian canvas node/edge parsing 및 mutation |
| `mermaid.*` / `marp.*` | fenced diagram / slide block 조작 |
| `templates.*` | filesystem template 및 Templater bridge |
| `workspace.*` / `commands.*` | Local REST API를 통한 Obsidian UI 조작 |
| `wiki.*` | LLM Wiki init, ingest, query, lint, merge, index rebuild |
| `stats.*` / `system.*` | vault 통계와 버전 정보 |

## Annotation

각 도구는 MCP의 네 가지 hint를 명시합니다.

- `readOnlyHint`
- `destructiveHint`
- `idempotentHint`
- `openWorldHint`

filesystem 도구는 일반적으로 `openWorldHint:false`입니다. `workspace.*`, `commands.*`, live REST/DQL 계열은 외부 Obsidian process를 사용하므로 open world입니다.

## Resources

- `kobsidian://wiki/index`
- `kobsidian://wiki/log`
- `kobsidian://wiki/schema`
- `kobsidian://wiki/page/{+path}`

## Prompts

- `ingest-source`
- `answer-from-wiki`
- `health-check-wiki`

## Structured output

각 도구는 MCP `structuredContent`에 typed JSON을 반환합니다. 텍스트 content는 짧은 요약용입니다. 새 도구는 가능한 구체적인 Zod output schema를 정의해야 합니다.

## Inventory 재생성

```bash
bun run inventory
```

전체 기계 생성 목록은 [`../../tool-inventory.json`](../../tool-inventory.json)에 있습니다.
