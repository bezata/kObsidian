# kObsidian Roadmap

これは [`../../../TODO.md`](../../../TODO.md) の日本語版です。CHANGELOG がリリース済み内容の source of truth で、この文書は将来計画のみを扱います。

## Motivation

kObsidian は作者自身の Obsidian vault workflow のために作られました。単一 client に閉じず、通常の read に Obsidian 起動を要求せず、notes を proprietary sync に閉じ込めない MCP server が必要だったためです。その形を open-source project として整理しています。

## v0.4：Obsidian LiveSync bridge

目標は [Self-Hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) plugin を通じて、無料、E2E encrypted、自ホスト可能な vault sync に接続することです。LiveSync は user の CouchDB、S3、R2、WebRTC peer 上で動作できるため、local Obsidian process が live でなくても API + MCP で同じ vault に到達できます。

計画：

- `.obsidian/plugins/obsidian-livesync/data.json` を検出。
- `vault.list` に `livesync` source flag を追加。
- `vault.connectLiveSync` を追加。
- LiveSync chunked store 経由の E2E-encrypted read path。
- CouchDB、IBM Cloudant、Cloudflare R2、WebRTC peer の setup docs。

LiveSync を優先する理由は、広く使われ、open-source、E2E encrypted、自ホスト可能な Obsidian sync solution だからです。LiveSync は Obsidian Sync や iCloud と共存しないため、その制約も kObsidian に伝わります。

## v0.5：Cross-semantic vault verification

目標は `wiki.crossCheck` を追加し、wiki layer で複数の LiveSync-paired vault を照合することです。同じ Source slug は互換 frontmatter を持ち、canonical log lines は deterministic に replay でき、Concept/Entity pages は同じ wiki-link graph に収束する必要があります。

計画：

- Source、Concept、Entity frontmatter に `schema_version: 1` を追加。
- `wiki.crossCheck` で wiki tree 差分を `{page, field, severity}` ごとに返す。
- log merge は `## [YYYY-MM-DD]` entries を union し、`(op, title, date)` で dedupe する。
- conflict policy は `lastWriteWins` と `manualResolve`。
- 旧 vault 向け migration tool。実行には `force:true` が必要。

## Conventions

- Roadmap は semver に従います。
- 完了項目は CHANGELOG に移動します。
- 大きな項目は実装前に tracking issue を作ります。
