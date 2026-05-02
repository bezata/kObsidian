# Workspaces: Obsidian MCP의 다중 vault

`vault.*` namespace를 사용하면 LLM이 같은 kObsidian 세션 안에서 여러 Obsidian vault를 발견하고 전환할 수 있습니다. 서버 재시작, 설정 수정, 모든 도구 호출에 `vaultPath`를 넣는 작업이 필요 없습니다.

## 왜 중요한가

개인, 업무, 연구, 아카이브를 별도 vault로 나누는 사용자가 많습니다. 단일 `OBSIDIAN_VAULT_PATH`만 있으면 전환이 번거롭습니다.

- `vault.list` - 보이는 vault 목록.
- `vault.current` - 다음 filesystem 도구가 사용할 vault.
- `vault.select` - 세션 active vault 전환.
- `vault.reset` - 기본값으로 복귀.

이 선택은 `notes.*`, `tags.*`, `wiki.*` 같은 filesystem 도구에 적용됩니다. `workspace.*`와 `commands.*`는 실행 중인 Obsidian process가 현재 연 vault를 대상으로 합니다.

## 60초 흐름

```text
vault.list
  -> { items: [{ name: "work", path: "...", source: "env-named" }] }

vault.select { name: "work" }
  -> { changed: true, active: { name: "work", path: "..." } }

notes.search { query: "incident" }
  -> work vault 검색
```

## vault 발견

| 방식 | 상태 | 설명 |
|---|---|---|
| `OBSIDIAN_VAULT_PATH` | 안정 | 기본 vault, 이전 버전 호환 |
| `OBSIDIAN_VAULT_<NAME>=path` | 안정 | 이름이 있는 추가 vault |
| `obsidian.json` | 실험적 | Obsidian vault registry를 읽음. `KOBSIDIAN_VAULT_DISCOVERY=off`로 비활성화 |

## 우선순위

```ts
args.vaultPath
  ?? context.session.activeVault
  ?? context.env.OBSIDIAN_VAULT_PATH
  ?? error
```

호출별 `vaultPath`가 항상 최우선입니다.

## 보안 제한

- `KOBSIDIAN_VAULT_ALLOW` - 이름 또는 절대 경로 allowlist.
- `KOBSIDIAN_VAULT_DENY` - 이름 또는 절대 경로 denylist.
- `OBSIDIAN_VAULT_PATH`는 필터되지 않습니다.

오류:

- `not_found`
- `unauthorized`
- `invalid_argument`

## HTTP transport 주의

HTTP 클라이언트가 매번 새 연결을 만들면 세션 선택이 유지되지 않을 수 있습니다. 이 경우 명시적인 `vaultPath`를 전달하거나 다시 `vault.select`를 호출하세요.

## 관련 문서

- [ENVIRONMENT.md](ENVIRONMENT.md)
- [tools.md](tools.md)
- [../../WORKSPACES.md](../../WORKSPACES.md)
