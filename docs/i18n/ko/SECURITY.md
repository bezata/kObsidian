# 보안

kObsidian은 로컬 MCP 서버이며 Obsidian vault를 읽고 씁니다. 파일 시스템 권한을 가진 CLI 도구처럼 다루세요. 신뢰할 수 있는 출처에서 실행하고, 비밀 값을 저장소에 넣지 마세요.

## Transport 수준 보호

### stdio

네트워크 노출면이 없습니다. MCP 클라이언트가 프로세스를 직접 실행하고 stdin/stdout으로 JSON-RPC를 주고받습니다. 진단 로그는 stderr로 보내 stdout 프로토콜 프레임을 깨지 않습니다.

### Streamable HTTP

- `KOBSIDIAN_ALLOWED_ORIGINS`는 Origin allowlist입니다. 허용되지 않은 Origin은 403입니다.
- `OPTIONS /mcp`는 허용된 Origin에 CORS preflight를 반환하고, 아니면 403입니다.
- `KOBSIDIAN_HTTP_BEARER_TOKEN`을 설정하면 `Authorization: Bearer ...`가 필요합니다.
- `MCP-Protocol-Version`은 검증되며 미지원 값은 JSON-RPC 오류가 됩니다.

## 공급망

### VirusTotal

release workflow는 각 `kobsidian-<platform>.mcpb`를 VirusTotal에 업로드하고 분석 링크를 GitHub release에 추가합니다.

### npm Trusted Publishing

npm publish는 GitHub OIDC Trusted Publishing을 사용합니다. 장기 `NPM_TOKEN`을 저장하지 않습니다.

```bash
npm trust github --file .github/workflows/release.yml --repo bezata/kObsidian
```

### SDK 버전 고정

`@modelcontextprotocol/sdk`는 `1.29.0`에 고정되어 있으며 UriTemplate ReDoS와 cross-client response leak 수정이 포함된 하한보다 높은 버전입니다.

### Biome 및 TypeScript strict

`bun run lint`는 Biome을 사용하고, `bun run typecheck`는 strict TypeScript를 사용합니다. `prepublishOnly`는 typecheck, lint, test, build를 실행합니다.

## 환경 변수 위생

민감한 변수:

- `OBSIDIAN_REST_API_KEY`
- `KOBSIDIAN_HTTP_BEARER_TOKEN`

`.env`와 `.env.*`는 `.gitignore`에 포함되어 있습니다. vault 안에도 비밀 값을 넣지 마세요.

## MCP 관련 주의

### Tool annotation은 보안 경계가 아닙니다

`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`는 클라이언트 UX를 위한 힌트입니다. 실제 검증은 서버의 path containment 등에서 수행됩니다.

### `wiki.ingest`는 cross-reference를 몰래 쓰지 않습니다

`wiki.ingest`는 Source 생성과 log append만 수행하고 다른 페이지 편집은 `proposedEdits`로 반환합니다.

### Tool poisoning / shadowing

도구 설명, 제목, annotation은 이 저장소의 소스에서 옵니다. 여러 MCP server gateway를 사용할 때는 승인 시 schema를 고정하세요.

## 취약점 보고

GitHub private security advisory를 사용하세요: <https://github.com/bezata/kObsidian/security/advisories/new>.

또는 제목에 `kObsidian security`를 포함해 maintainer에게 이메일을 보내세요.
