# kObsidian 문서

이 디렉터리는 한국어 문서입니다. 명령어, 도구 이름, 환경 변수, 파일 경로는 프로토콜 계약이므로 원문 그대로 유지합니다.

## Project-level docs

- [PROJECT_README.md](PROJECT_README.md) - project README 한국어 버전. 개요, install, quick start, configuration, development, security.
- [ROADMAP.md](ROADMAP.md) - `TODO.md` 한국어 버전. 앞으로의 milestones와 conventions.
- [CHANGELOG.md](CHANGELOG.md) - `CHANGELOG.md` 한국어 버전. release history와 migration points.

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
