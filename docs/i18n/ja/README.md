# kObsidian ドキュメント

このディレクトリは日本語版ドキュメントです。コマンド、ツール名、環境変数、ファイルパスはプロトコル上の契約なので原文のまま残しています。

## Project-level docs

- [PROJECT_README.md](PROJECT_README.md) - project README の日本語版。概要、install、quick start、configuration、development、security。
- [ROADMAP.md](ROADMAP.md) - `TODO.md` の日本語版。今後の milestones と conventions。
- [CHANGELOG.md](CHANGELOG.md) - `CHANGELOG.md` の日本語版。release history と migration points。

<a id="per-vault-configuration-v037"></a>

## vault ごとの設定（v0.3.7）

vault 直下に `.kobsidian.json` を作成し、その vault の wiki を設定します。例：

```json
{
  "wiki": {
    "root": "wiki",
    "sourcesDir": "資料",
    "staleDays": 90,
    "headings": {
      "indexSources": "資料"
    }
  }
}
```

`conceptsDir`、`entitiesDir`、`indexFile`、`logFile`、`schemaFile` と wiki の全5種類の見出しも設定できます。全項目は[設定 schema](../../kobsidian.config.schema.json)を参照してください。優先順位は、呼び出し引数 → vault 設定ファイル → `KOBSIDIAN_WIKI_*` 環境変数 → 組み込みの既定値です。`KOBSIDIAN_VAULT_CONFIG_FILE` で設定ファイルのパスを変更でき、`vault.current` は有効な設定またはエラーを返します。変更は以降の呼び出しで読み込まれ、不正な JSON や未知のキーは明示的なエラーになります。

設定ファイルは任意で、既存の vault は既定値のまま使えます。ディレクトリ名やファイル名の設定を変えても既存の wiki 内容は移動しないため、実際の構成に合わせてください。v0.3.7 の `notes.edit` の `after-heading` はセクション先頭に挿入し、既存のリストにつなげ、段落や見出しの前の間隔を保ちます。`after-heading` と `after-block` は末尾に余分な2つ目の改行を追加しません。

## MCP クライアントの互換性

v0.3.5 以降、stdio とステートレス Streamable HTTP のツール入出力 schema は **JSON Schema 2020-12** を使用します。draft-07 の識別子により Claude Code がツールの検出を拒否する問題を修正しました（[issue #35](https://github.com/bezata/kObsidian/issues/35)）。

v0.3.6 以降、`notes.create` や `notes.edit` などの共用体を使うツールは、ルートの `oneOf` / `anyOf` の代わりに、フィールドと `enum` の選択肢を持つフラットなオブジェクト schema を公開します。これによりクライアントがすべてのバリアントを検出できます。呼び出し時の分岐ごとの必須条件と構造化出力は、引き続き元の Zod schema で検証します。

両方の修正を利用するには v0.3.6 以降を使用し、MCP クライアントを再起動または再接続してツール一覧を更新してください。vault の移行や環境変数の追加は不要です。回帰テストでは schema の構造と実際の stdio / ステートレス HTTP 通信を検証します。[TESTING.md](TESTING.md) と[リリース履歴（英語）](../../../CHANGELOG.md)を参照してください。

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
