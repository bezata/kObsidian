# kObsidian ドキュメント

このディレクトリは日本語版ドキュメントです。コマンド、ツール名、環境変数、ファイルパスはプロトコル上の契約なので原文のまま残しています。

## Project-level docs

- [PROJECT_README.md](PROJECT_README.md) - project README の日本語版。概要、install、quick start、configuration、development、security。
- [ROADMAP.md](ROADMAP.md) - `TODO.md` の日本語版。今後の milestones と conventions。
- [CHANGELOG.md](CHANGELOG.md) - `CHANGELOG.md` の日本語版。release history と migration points。

## ワークスペースと複数 vault

- [WORKSPACES.md](WORKSPACES.md) - `vault.list`、`vault.select`、セッション中の Obsidian vault 切り替え、検出元、優先順位、安全制御。

## アーキテクチャ

- [architecture.md](architecture.md) - MCP リクエストからツール層、ドメイン層、ファイルシステムまでの流れ、モジュール責務、transport、LLM Wiki ループ。

## LLM Wiki

- [wiki.md](wiki.md) - wiki レイヤーの目的、`proposedEdits` 契約、ログ形式、lint カテゴリ、典型的なセッションの流れ。
- [examples.md](examples.md) - 個人研究 wiki、エンジニアリング ADR、コードベース wiki の実例。

## ツール、リソース、プロンプト

- [tools.md](tools.md) - ツール名前空間、MCP annotation、resources、prompts、`structuredContent` 出力。
- [`../../tool-inventory.json`](../../tool-inventory.json) - MCP クライアント向けの機械生成ツール一覧。フィールド名は英語のままです。

## セキュリティと運用

- [SECURITY.md](SECURITY.md) - Origin/CORS、Bearer 認証、VirusTotal、環境変数の扱い、MCP 固有の注意点。
- [TESTING.md](TESTING.md) - ローカル検証、inventory 生成、カバレッジ範囲。
- [ENVIRONMENT.md](ENVIRONMENT.md) - `OBSIDIAN_*` と `KOBSIDIAN_*` 環境変数の用途と既定値。
- [MIGRATION.md](MIGRATION.md) - 旧バージョンから TypeScript/Bun 版への移行メモ。

推奨順序：[architecture](architecture.md) -> [wiki](wiki.md) -> [examples](examples.md) -> [tools](tools.md) -> [TESTING](TESTING.md)。
