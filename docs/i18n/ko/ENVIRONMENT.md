# 환경 변수

로컬 설정은 환경 변수로 관리합니다. 실제 값, API key, `.env` 파일은 커밋하지 마세요.

```bash
# 핵심 설정
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=your-local-rest-api-key

# HTTP transport
KOBSIDIAN_HTTP_HOST=127.0.0.1
KOBSIDIAN_HTTP_PORT=3000
KOBSIDIAN_HTTP_BEARER_TOKEN=optional-local-http-token
KOBSIDIAN_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

# 다중 vault
OBSIDIAN_VAULT_WORK=/absolute/path/to/work-vault
OBSIDIAN_VAULT_PERSONAL=/absolute/path/to/personal-vault
KOBSIDIAN_VAULT_DISCOVERY=on
KOBSIDIAN_VAULT_ALLOW=work,personal
KOBSIDIAN_VAULT_DENY=secrets
KOBSIDIAN_OBSIDIAN_CONFIG=
```

Obsidian Local REST API는 기본적으로 self-signed HTTPS 인증서를 사용합니다. 로컬 개발에서는 보통 `OBSIDIAN_API_VERIFY_TLS=false`를 유지하고, OS에서 인증서를 신뢰하도록 설정한 경우에만 `true`로 바꿉니다.

`OBSIDIAN_REST_API_KEY`는 [Local REST API](obsidian://show-plugin?id=obsidian-local-rest-api) 플러그인이 생성하는 API key입니다. `workspace.*`, `commands.*`, runtime `dataview.query*`, `templates.use`의 Templater 분기에만 필요합니다. 대부분의 filesystem-first 도구에는 필요하지 않습니다.

## 다중 vault

kObsidian은 `vault.*` namespace로 하나의 서버에서 여러 vault를 다룰 수 있습니다.

1. 호출마다 전달하는 `vaultPath`가 최우선입니다.
2. `vault.select`로 선택한 세션 active vault.
3. `OBSIDIAN_VAULT_PATH` 기본값.
4. 모두 없으면 오류.

### vault 발견 소스

| 소스 | 읽는 대상 | 상태 |
|---|---|---|
| `OBSIDIAN_VAULT_PATH` | 단일 기본 vault | 안정, 문서화됨 |
| `OBSIDIAN_VAULT_<NAME>=path` | 이름이 있는 추가 vault | 안정, 문서화됨 |
| `obsidian.json` | Obsidian 자체 vault registry | 실험적. `KOBSIDIAN_VAULT_DISCOVERY=on|off`로 제어 |

`obsidian-app` 소스는 best-effort입니다. 파싱 실패는 `vault.list`의 `obsidianConfigError` 필드로 노출되고 서버를 중단하지 않습니다. Obsidian 내부 파일에 의존하고 싶지 않다면 `KOBSIDIAN_VAULT_DISCOVERY=off`를 사용하세요.

### OS별 `obsidian.json`

| OS | 기본 경로 |
|---|---|
| macOS | `~/Library/Application Support/obsidian/obsidian.json` |
| Windows | `%APPDATA%\obsidian\obsidian.json` |
| Linux | `$XDG_CONFIG_HOME/obsidian/obsidian.json` -> `~/.config/obsidian/obsidian.json` |
| Linux Flatpak | `~/.var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json` |
| Linux Snap | `~/snap/obsidian/current/.config/obsidian/obsidian.json` |
| Portable / WSL / 비표준 | `KOBSIDIAN_OBSIDIAN_CONFIG=/absolute/path/obsidian.json` |

### 보안 제한

| 변수 | 기본값 | 효과 |
|---|---|---|
| `KOBSIDIAN_VAULT_ALLOW` | 미설정, 모두 허용 | 이름 또는 절대 경로 allowlist |
| `KOBSIDIAN_VAULT_DENY` | 미설정 | allowlist 이후 적용되는 denylist |

`OBSIDIAN_VAULT_PATH`는 allow/deny 필터를 받지 않습니다. 운영자가 명시한 기본 vault를 항상 접근 가능하게 하여 실수로 스스로 잠그는 상황을 막습니다.

## 빠른 로컬 확인

```bash
bun run dev:stdio
bun run dev:http
bun run test
```
