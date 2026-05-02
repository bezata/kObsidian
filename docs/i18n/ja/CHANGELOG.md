# Changelog

これは [`../../../CHANGELOG.md`](../../../CHANGELOG.md) の日本語版です。version、tool name、environment variable、command は原文のままです。

## Unreleased

未リリース項目はありません。

## 0.3.2 - 2026-05-02

このリリースでは Simplified Chinese、日本語、韓国語の documentation を追加しました。runtime behavior、schema、tool surface の変更はありません。

### Added

- `docs/i18n/zh-CN/`、`docs/i18n/ja/`、`docs/i18n/ko/` を追加。
- 各 locale に project README、roadmap、changelog、architecture、wiki、examples、tools、security、testing、environment、migration、workspaces docs を追加。
- `docs/i18n/README.md` を多言語 index として追加。

### Changed

- root `README.md` と `docs/README.md` から Chinese、Japanese、Korean docs へ直接リンク。
- `package.json`、`manifest.json`、`server.json` の release version を `0.3.2` に統一。

## 0.3.1 - 2026-04-25

Tool definition quality の改善リリースです。説明文のみの変更で、behavior、schema、annotation の変更はありません。

### Changed

- `wiki.*` 7 tools の description を書き直し、parameter semantics、usage、return shape、examples を追加。
- `workspace.openFile`、`workspace.closeActiveFile`、`workspace.toggleEditMode` に return shape、edge case、UI-only contract を明記。
- `links.hubs` description に `links.health`、`links.graph` との使い分けを追加。
- `src/schema/wiki.ts` の wiki schema parameters に `.describe()` を追加。

## 0.3.0 - 2026-04-25

複数 vault support。単一 server session 内で複数の Obsidian vault を発見し、切り替えられるようになりました。

### Added

- `vault.*` namespace：`vault.list`、`vault.current`、`vault.select`、`vault.reset`。
- `OBSIDIAN_VAULT_<NAME>=path` による named vault。
- Obsidian の `obsidian.json` vault registry の experimental discovery。
- `KOBSIDIAN_VAULT_ALLOW` と `KOBSIDIAN_VAULT_DENY`。
- `pick-vault` server-side prompt。
- filesystem tools の description に session-active vault precedence を追加。
- Ubuntu、macOS、Windows の CI matrix。

### Changed

- `requireVaultPath` precedence は `arg > session > env > error`。
- `DomainContext` に `session` と `vaults` を追加。
- `AppEnv` に `namedVaults` を追加。

### Fixed

- `ingest-source` prompt が新しい `notes.edit` modes を参照するよう修正。

### Migration

0.2.5 から必須変更はありません。`OBSIDIAN_VAULT_PATH` のみの設定は引き続き動作します。

```bash
OBSIDIAN_VAULT_WORK=/absolute/path/to/work
OBSIDIAN_VAULT_SCRATCH=/absolute/path/to/scratch
```

その後 `vault.select { name: "work" }` で切り替えます。

## 0.2.5 - 2026-04-25

Tool surface consolidation。tool 数を約 90 から 62 に減らし、namespace と tool descriptions、MCP annotations を整理しました。

### Breaking

- `mermaid.*` は削除され、`blocks.*` が Mermaid fenced blocks を扱います。
- `stats.note` は削除され、`notes.read` with `include: ['stats']` を使います。
- 複数 tool が `notes.edit`、`tags.modify`、`kanban.card`、`canvas.edit`、`templates.use` などへ統合されました。

### Changed

- すべての tool description を outcome、constraints、return shape、safety hints を含む形に変更。
- annotation constants は 4 つの MCP hints を明示。
- per-namespace Zod schemas を `src/schema/<namespace>.ts` に配置。
- `ToolDefinition` に `inputExamples` を追加。

### Migration examples

```diff
- notes.append { filePath: "foo.md", content: "..." }
+ notes.edit   { mode: "append", path: "foo.md", content: "..." }

- tags.add { path: "foo.md", tags: ["x"] }
+ tags.modify { path: "foo.md", op: "add", tags: ["x"] }

- mermaid.blocks.update { filePath, source, index }
+ blocks.update { filePath, source, index, language: "mermaid" }
```

## 0.2.x と 0.1.x

初期リリースでは TypeScript/Bun runtime、MCP server、stdio/HTTP transport、LLM Wiki layer、tool namespaces、Claude Code skills、release pipeline、security docs、test baseline が整備されました。完全な履歴は英語原文 [`../../../CHANGELOG.md`](../../../CHANGELOG.md) を参照してください。
