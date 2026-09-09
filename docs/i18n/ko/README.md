# kObsidian 문서

이 디렉터리는 한국어 문서입니다. 명령어, 도구 이름, 환경 변수, 파일 경로는 프로토콜 계약이므로 원문 그대로 유지합니다.

## Project-level docs

- [PROJECT_README.md](PROJECT_README.md) - project README 한국어 버전. 개요, install, quick start, configuration, development, security.
- [ROADMAP.md](ROADMAP.md) - `TODO.md` 한국어 버전. 앞으로의 milestones와 conventions.
- [CHANGELOG.md](CHANGELOG.md) - `CHANGELOG.md` 한국어 버전. release history와 migration points.

<a id="per-vault-configuration-v037"></a>

## vault별 설정(v0.3.7)

vault 루트에 `.kobsidian.json`을 만들어 해당 vault의 wiki를 설정하세요. 예:

```json
{
  "wiki": {
    "root": "wiki",
    "sourcesDir": "자료",
    "staleDays": 90,
    "headings": {
      "indexSources": "자료"
    }
  }
}
```

`conceptsDir`, `entitiesDir`, `indexFile`, `logFile`, `schemaFile`과 다섯 가지 wiki 제목도 설정할 수 있습니다. 전체 필드는 [설정 schema](../../kobsidian.config.schema.json)를 참고하세요. 우선순위는 호출 인수 → vault 설정 파일 → `KOBSIDIAN_WIKI_*` 환경 변수 → 기본값입니다. `KOBSIDIAN_VAULT_CONFIG_FILE`로 설정 파일 경로를 바꿀 수 있으며, `vault.current`는 적용된 설정이나 오류를 반환합니다. 변경 사항은 이후 호출에서 다시 읽으며, 잘못된 JSON과 알 수 없는 키는 명시적인 오류를 반환합니다.

설정 파일은 선택 사항이므로 기존 vault는 기본값을 계속 사용할 수 있습니다. 디렉터리나 파일명 설정을 바꿔도 기존 wiki 콘텐츠는 이동하지 않으므로 실제 구조에 맞춰 설정하세요. v0.3.7의 `notes.edit` `after-heading`은 섹션 맨 위에 내용을 삽입하고 기존 목록에 연결하며 문단과 제목 앞의 간격을 유지합니다. `after-heading`과 `after-block`은 파일 끝에 불필요한 두 번째 줄바꿈을 추가하지 않습니다.

## MCP 클라이언트 호환성

v0.3.5부터 stdio와 무상태 Streamable HTTP의 도구 입력 및 출력 schema는 **JSON Schema 2020-12**를 사용합니다. draft-07 식별자로 인해 Claude Code가 도구 검색을 거부하던 문제를 수정했습니다([issue #35](https://github.com/bezata/kObsidian/issues/35)).

v0.3.6부터 `notes.create`, `notes.edit` 같은 유니온 타입 도구는 루트의 `oneOf` / `anyOf` 대신 필드와 `enum` 선택 항목을 포함하는 평탄한 객체 schema를 공개합니다. 이를 통해 클라이언트가 모든 변형을 확인할 수 있습니다. 호출 시 각 분기의 필수 조건과 구조화된 출력은 원래 Zod schema로 계속 검증합니다.

두 수정 사항을 모두 사용하려면 v0.3.6 이상을 사용하고 MCP 클라이언트를 재시작하거나 다시 연결하여 도구 목록을 새로고침하세요. vault 마이그레이션이나 환경 변수 추가는 필요하지 않습니다. 회귀 테스트는 schema 구조 검사와 실제 stdio / 무상태 HTTP 왕복 호출을 포함합니다. [TESTING.md](TESTING.md)와 [릴리스 내역(영문)](../../../CHANGELOG.md)을 참고하세요.

## 워크스페이스와 다중 vault

- [WORKSPACES.md](WORKSPACES.md) - `vault.list`, `vault.select`, 세션 중 Obsidian vault 전환, 발견 소스, 우선순위 체인, 보안 제한.

## 아키텍처

- [architecture.md](architecture.md) - MCP 요청이 도구 계층, 도메인 계층, 파일 시스템으로 흐르는 방식과 모듈 책임, transport, LLM Wiki 루프.

## LLM Wiki

- [wiki.md](wiki.md) - wiki 계층의 목적, `proposedEdits` 계약, 로그 형식, lint 범주, 일반적인 세션 흐름.
- [examples.md](examples.md) - 개인 연구 wiki, 엔지니어링 ADR, 코드베이스 wiki 예제.

## 도구, 리소스, 프롬프트

- [tools.md](tools.md) - 도구 namespace, MCP annotation, resources, prompts, `structuredContent` 출력.
- [`../../tool-inventory.json`](../../tool-inventory.json) - MCP 클라이언트용 기계 생성 도구 목록. 필드명은 영어 그대로입니다.

## 보안과 운영

- [SECURITY.md](SECURITY.md) - Origin/CORS, Bearer 인증, VirusTotal, 환경 변수 관리, MCP 관련 주의사항.
- [TESTING.md](TESTING.md) - 로컬 검사, inventory 생성, 커버리지 범위.
- [ENVIRONMENT.md](ENVIRONMENT.md) - `OBSIDIAN_*` 및 `KOBSIDIAN_*` 환경 변수의 용도와 기본값.
- [MIGRATION.md](MIGRATION.md) - 이전 버전에서 TypeScript/Bun 버전으로 옮길 때의 변경점.

추천 순서: [architecture](architecture.md) -> [wiki](wiki.md) -> [examples](examples.md) -> [tools](tools.md) -> [TESTING](TESTING.md).
