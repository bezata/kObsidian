# Changelog

이 문서는 [`../../../CHANGELOG.md`](../../../CHANGELOG.md)의 한국어 버전입니다. version, tool name, environment variable, command는 원문 그대로 유지합니다.

## Unreleased

아직 미릴리스 항목은 없습니다.

## 0.3.2 - 2026-05-02

이번 릴리스는 Simplified Chinese, Japanese, Korean 문서를 추가합니다. runtime behavior, schema, tool surface 변경은 없습니다.

### Added

- `docs/i18n/zh-CN/`, `docs/i18n/ja/`, `docs/i18n/ko/` 추가.
- 각 locale에 project README, roadmap, changelog, architecture, wiki, examples, tools, security, testing, environment, migration, workspaces docs 추가.
- `docs/i18n/README.md`를 다국어 index로 추가.

### Changed

- root `README.md`와 `docs/README.md`에서 Chinese, Japanese, Korean docs로 직접 링크.
- `package.json`, `manifest.json`, `server.json` release version을 `0.3.2`로 통일.

## 0.3.1 - 2026-04-25

Tool definition quality 개선 릴리스입니다. 설명만 변경되었고 behavior, schema, annotation 변경은 없습니다.

### Changed

- `wiki.*` 7개 도구 설명을 다시 작성해 parameter semantics, usage, return shape, examples를 추가했습니다.
- `workspace.openFile`, `workspace.closeActiveFile`, `workspace.toggleEditMode`에 return shape, edge case, UI-only contract를 명시했습니다.
- `links.hubs` 설명에 `links.health`, `links.graph`와의 구분을 추가했습니다.
- `src/schema/wiki.ts`의 wiki schema parameters에 `.describe()`를 추가했습니다.

## 0.3.0 - 2026-04-25

다중 vault 지원. 하나의 server session 안에서 여러 Obsidian vault를 발견하고 전환할 수 있습니다.

### Added

- `vault.*` namespace: `vault.list`, `vault.current`, `vault.select`, `vault.reset`.
- `OBSIDIAN_VAULT_<NAME>=path` named vault.
- Obsidian `obsidian.json` vault registry experimental discovery.
- `KOBSIDIAN_VAULT_ALLOW`와 `KOBSIDIAN_VAULT_DENY`.
- `pick-vault` server-side prompt.
- filesystem tools 설명에 session-active vault precedence 추가.
- Ubuntu, macOS, Windows CI matrix.

### Changed

- `requireVaultPath` precedence는 `arg > session > env > error`.
- `DomainContext`에 `session`과 `vaults` 추가.
- `AppEnv`에 `namedVaults` 추가.

### Fixed

- `ingest-source` prompt가 새 `notes.edit` modes를 참조하도록 수정.

### Migration

0.2.5에서 필수 변경은 없습니다. `OBSIDIAN_VAULT_PATH`만 설정한 기존 구성도 계속 동작합니다.

```bash
OBSIDIAN_VAULT_WORK=/absolute/path/to/work
OBSIDIAN_VAULT_SCRATCH=/absolute/path/to/scratch
```

그 다음 `vault.select { name: "work" }`로 전환합니다.

## 0.2.5 - 2026-04-25

Tool surface consolidation. tool 수를 약 90개에서 62개로 줄이고 namespace, tool descriptions, MCP annotations를 정리했습니다.

### Breaking

- `mermaid.*`는 제거되었고 `blocks.*`가 Mermaid fenced blocks를 처리합니다.
- `stats.note`는 제거되었고 `notes.read` with `include: ['stats']`를 사용합니다.
- 여러 tool이 `notes.edit`, `tags.modify`, `kanban.card`, `canvas.edit`, `templates.use` 등으로 통합되었습니다.

### Changed

- 모든 tool description을 outcome, constraints, return shape, safety hints 중심으로 변경.
- annotation constants가 네 가지 MCP hints를 명시.
- per-namespace Zod schemas를 `src/schema/<namespace>.ts`에 배치.
- `ToolDefinition`에 `inputExamples` 추가.

### Migration examples

```diff
- notes.append { filePath: "foo.md", content: "..." }
+ notes.edit   { mode: "append", path: "foo.md", content: "..." }

- tags.add { path: "foo.md", tags: ["x"] }
+ tags.modify { path: "foo.md", op: "add", tags: ["x"] }

- mermaid.blocks.update { filePath, source, index }
+ blocks.update { filePath, source, index, language: "mermaid" }
```

## 0.2.x 및 0.1.x

초기 릴리스에서는 TypeScript/Bun runtime, MCP server, stdio/HTTP transport, LLM Wiki layer, tool namespaces, Claude Code skills, release pipeline, security docs, test baseline이 만들어졌습니다. 전체 히스토리는 영어 원문 [`../../../CHANGELOG.md`](../../../CHANGELOG.md)를 참고하세요.
