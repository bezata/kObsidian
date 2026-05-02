# ツール表面

kObsidian は typed MCP tools を公開します。ツール名は protocol contract なので英語のままです。

## 名前空間

| 名前空間 | 用途 |
|---|---|
| `vault.*` | vault の一覧、現在値、選択、リセット |
| `notes.*` | note/folder の読み書き、作成、削除、移動、検索 |
| `tags.*` | tag の追加、削除、更新、分析、一覧 |
| `links.*` | backlinks、orphans、graph、hub、リンク健全性 |
| `tasks.*` | Tasks plugin 形式の検索、作成、toggle、metadata 更新、統計 |
| `dataview.*` | Dataview field/block と任意の live query |
| `blocks.*` | Markdown block id による領域読み取りと置換 |
| `kanban.*` | Kanban board/card の parse と mutation |
| `canvas.*` | Obsidian canvas node/edge の parse と mutation |
| `mermaid.*` / `marp.*` | fenced diagram / slide block の操作 |
| `templates.*` | filesystem template と Templater bridge |
| `workspace.*` / `commands.*` | Local REST API 経由の Obsidian UI 操作 |
| `wiki.*` | LLM Wiki の init、ingest、query、lint、merge、index rebuild |
| `stats.*` / `system.*` | vault 統計とバージョン情報 |

## Annotation

各ツールは MCP の 4 hint を明示します。

- `readOnlyHint`
- `destructiveHint`
- `idempotentHint`
- `openWorldHint`

filesystem tool は原則 `openWorldHint:false` です。`workspace.*`、`commands.*`、live REST/DQL 系は外部の Obsidian process を使うため open world になります。

## Resources

- `kobsidian://wiki/index`
- `kobsidian://wiki/log`
- `kobsidian://wiki/schema`
- `kobsidian://wiki/page/{+path}`

## Prompts

- `ingest-source`
- `answer-from-wiki`
- `health-check-wiki`

## Structured output

各 tool は MCP `structuredContent` に typed JSON を返します。テキスト content は短い要約用です。新しい tool ではできるだけ具体的な Zod output schema を定義します。

## Inventory の再生成

```bash
bun run inventory
```

完全な機械生成一覧は [`../../tool-inventory.json`](../../tool-inventory.json) にあります。
