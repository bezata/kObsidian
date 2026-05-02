# kObsidian Roadmap

이 문서는 [`../../../TODO.md`](../../../TODO.md)의 한국어 버전입니다. CHANGELOG가 이미 릴리스된 내용의 source of truth이며, 이 문서는 앞으로의 계획만 설명합니다.

## Motivation

kObsidian은 작성자의 Obsidian vault workflow를 위해 처음 만들어졌습니다. 하나의 client에 묶이지 않고, 일반 읽기 작업에 Obsidian 실행을 요구하지 않으며, notes를 proprietary sync에 가두지 않는 MCP server가 필요했기 때문입니다. 이후 같은 구조가 다른 Obsidian-first knowledge stack에도 유용하다고 판단해 open-source project로 정리했습니다.

## v0.4: Obsidian LiveSync bridge

목표는 [Self-Hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) plugin을 통해 무료, E2E encrypted, self-hostable vault sync에 연결하는 것입니다. LiveSync는 사용자의 CouchDB, S3, R2, WebRTC peer에서 실행될 수 있으므로 local Obsidian process가 live가 아니어도 API + MCP로 같은 vault에 접근할 수 있습니다.

계획:

- `.obsidian/plugins/obsidian-livesync/data.json` 감지.
- `vault.list`에 `livesync` source flag 추가.
- `vault.connectLiveSync` 추가.
- LiveSync chunked store를 통한 E2E-encrypted read path.
- CouchDB, IBM Cloudant, Cloudflare R2, WebRTC peer setup docs.

LiveSync를 먼저 선택한 이유는 널리 쓰이고, open-source이며, E2E encrypted이고, self-hostable한 Obsidian sync solution이기 때문입니다. LiveSync는 Obsidian Sync나 iCloud와 공존하지 않으므로 그 제약도 kObsidian에 적용됩니다.

## v0.5: Cross-semantic vault verification

목표는 `wiki.crossCheck`를 추가해 wiki layer에서 둘 이상의 LiveSync-paired vault를 비교하는 것입니다. 같은 Source slug는 호환되는 frontmatter를 가져야 하고, canonical log lines는 deterministic replay가 가능해야 하며, Concept/Entity pages는 같은 wiki-link graph로 수렴해야 합니다.

계획:

- Source, Concept, Entity frontmatter에 `schema_version: 1` 추가.
- `wiki.crossCheck`가 wiki tree diff를 `{page, field, severity}`로 반환.
- log merge는 `## [YYYY-MM-DD]` entries를 union하고 `(op, title, date)`로 dedupe.
- conflict policy는 `lastWriteWins`와 `manualResolve`.
- 이전 vault용 migration tool. 실행에는 `force:true` 필요.

## Conventions

- Roadmap은 semver를 따릅니다.
- 완료된 항목은 CHANGELOG로 이동합니다.
- 큰 항목은 구현 전에 tracking issue를 만듭니다.
