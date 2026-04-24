# Migration Guide

## v0.2.5 — Tool-surface consolidation (2026-04-25)

v0.2.5 reduces the tool surface from ~90 to **62 tools across 15 namespaces**
by collapsing closely-related verbs into mode-parameterised primitives, and
rewrites every remaining description/schema to Anthropic's tool-use bar.
Every tool now declares the full 4-hint MCP annotation set, every argument
field carries `.describe()`, and complex tools ship with `inputExamples`
rendered into their description at registration.

### Namespace changes

- **`mermaid.*` removed.** Mermaid fenced blocks are now served by the new
  generic `blocks.*` namespace.
- **`stats.note` removed.** Per-note statistics are available through
  `notes.read` with `include: ['stats']`.

### Tool renames (v0.2.4 → v0.2.5)

| Removed tool | Replacement | Migration notes |
|---|---|---|
| `notes.info` | `notes.read` | `include: ['metadata']` |
| `stats.note` | `notes.read` | `include: ['stats']` |
| `notes.update` | `notes.edit` | `mode: 'replace'` (or any other mode) |
| `notes.append` | `notes.edit` | `mode: 'append'` |
| `notes.insertAfterHeading` | `notes.edit` | `mode: 'after-heading'`, `anchor: <heading text>`, `path: <filePath>` |
| `notes.insertAfterBlock` | `notes.edit` | `mode: 'after-block'`, `anchor: <blockId>`, `path: <filePath>` |
| `notes.createFolder` | `notes.create` | `kind: 'folder'`, `path: <folderPath>` |
| `notes.moveFolder` | `notes.move` | `kind: 'folder'`, `from`, `to` |
| `notes.move` (old signature) | `notes.move` | `kind: 'note'`, `from`, `to` (renamed from `sourcePath`/`destinationPath`) |
| `notes.listFolders` | `notes.list` | `include: 'folders'` |
| `notes.searchByDate` | `notes.list` | `since`/`until` + `dateField: 'created' \| 'modified'` |
| `notes.updateFrontmatter` | `notes.frontmatter` | `set`, `unset`, and `strategy: 'merge' \| 'replace'` |
| `tags.add` / `tags.remove` / `tags.update` | `tags.modify` | `op: 'add' \| 'remove' \| 'replace' \| 'merge'` |
| `kanban.addCard` / `kanban.moveCard` / `kanban.toggleCard` | `kanban.card` | `op: 'add' \| 'move' \| 'toggle'` |
| `canvas.addNode` / `canvas.addEdge` / `canvas.removeNode` | `canvas.edit` | `op: 'add-node' \| 'add-edge' \| 'remove-node'` |
| `marp.deck.read` / `marp.slides.list` / `marp.slides.read` | `marp.read` | `part: 'deck' \| 'slides' \| 'slide'` (`slide` needs `index` or `slideId`) |
| `marp.slides.update` / `marp.frontmatter.update` | `marp.update` | `part: 'slide' \| 'frontmatter'` |
| `templates.expand` / `templates.createNote` | `templates.use` | `engine: 'filesystem'` + `action: 'render' \| 'create-note'` |
| `templates.renderTemplater` / `templates.createNoteTemplater` / `templates.insertTemplater` | `templates.use` | `engine: 'templater'` + `action: 'render' \| 'create-note' \| 'insert-active'` |
| `mermaid.blocks.list` | `blocks.list` | `language: 'mermaid'` |
| `mermaid.blocks.read` | `blocks.read` | `language: 'mermaid'` |
| `mermaid.blocks.update` | `blocks.update` | `language: 'mermaid'` |
| `dataview.query.read` / `dataview.js.read` | `blocks.list` + `blocks.read` | `language: 'dataview' \| 'dataviewjs'` |
| `dataview.query.update` / `dataview.js.update` | `blocks.update` | `language: 'dataview' \| 'dataviewjs'` |
| `dataview.index.read` | `dataview.index` | Shortened. |
| `dataview.fields.extract` / `dataview.fields.search` | `dataview.fields.read` | `op: 'extract' \| 'search'` |
| `dataview.fields.add` / `dataview.fields.remove` | `dataview.fields.write` | `op: 'add' \| 'remove'` |
| `workspace.navigateBack` / `workspace.navigateForward` | `workspace.navigate` | `direction: 'back' \| 'forward'` |
| `commands.search` | `commands.list` | Pass `query: <substring>`; omit for full list. |

### Argument shape changes

| Tool | Old argument | New argument |
|---|---|---|
| `notes.move` | `sourcePath` / `destinationPath` | `from` / `to` (plus `kind: 'note' \| 'folder'`) |
| `notes.create` (`kind:'note'`) | `overwrite: true` | `ifExists: 'replace'` |
| All insert/append tools | per-tool fields | Unified under `notes.edit` discriminated-union on `mode` |
| `tags.modify` | per-op tools | Single tool with `op` + `tags` array |

### Before/after examples

```diff
# Append to a note
- notes.append { filePath: "foo.md", content: "..." }
+ notes.edit   { mode: "append", path: "foo.md", content: "..." }

# Add tags
- tags.add { path: "foo.md", tags: ["x", "y"] }
+ tags.modify { path: "foo.md", op: "add", tags: ["x", "y"] }

# Update a Mermaid block
- mermaid.blocks.update { filePath, source, index: 0 }
+ blocks.update { filePath, source, index: 0, language: "mermaid" }

# Update a DQL block by id
- dataview.query.update { filePath, source, blockId: "inbox" }
+ blocks.update { filePath, source, blockId: "inbox", language: "dataview" }

# Create a note from a filesystem template
- templates.createNote { templatePath, targetPath, variables }
+ templates.use {
+   engine: "filesystem", action: "create-note",
+   templatePath, targetPath, variables
+ }

# Get per-note stats
- stats.note { filePath }
+ notes.read { path: filePath, include: ["stats"] }

# Search Obsidian commands
- commands.search { query: "save" }
+ commands.list   { query: "save" }
```

See [`../CHANGELOG.md`](../CHANGELOG.md) for the full release notes, and
[`tools.md`](tools.md) for the current namespace summary.

---

## Legacy migration — Python server → TypeScript/Bun

The TypeScript/Bun rewrite introduced a cleaned vNext tool surface. These
mappings are retained for anyone still migrating from the original Python
server (pre-v0.2.0).

### Key changes

- Tool names are domain-prefixed, such as `notes.read` and `tags.search`
- Filesystem-native behavior is the default for operations that do not
  require Obsidian to be running
- API-backed tools are kept for Dataview DQL, Templater, workspace actions,
  and command execution
- Dataview fields are now scope-aware across page, list-item, and task
  metadata
- Result shapes are normalized around:
  - reads/parsers: typed objects
  - lists/searches: `{ items, total, ... }`
  - mutations: `{ changed, target, summary, ... }`

### Tool name mapping (legacy Python → TypeScript)

> Many of the right-hand-side tool names below were themselves removed in
> v0.2.5 — cross-reference the v0.2.5 table above for the current names.

| Old Tool | TS Server Tool (pre-v0.2.5) |
|---|---|
| `read_note_tool` | `notes.read` |
| `create_note_tool` | `notes.create` |
| `update_note_tool` | `notes.update` → now `notes.edit` |
| `delete_note_tool` | `notes.delete` |
| `search_notes_tool` | `notes.search` |
| `search_by_date_tool` | `notes.searchByDate` → now `notes.list` |
| `list_notes_tool` | `notes.list` |
| `list_folders_tool` | `notes.listFolders` → now `notes.list` |
| `move_note_tool` | `notes.move` |
| `create_folder_tool` | `notes.createFolder` → now `notes.create` |
| `move_folder_tool` | `notes.moveFolder` → now `notes.move` |
| `get_note_info_tool` | `notes.info` → now `notes.read` |
| `get_backlinks_tool` | `links.backlinks` |
| `get_outgoing_links_tool` | `links.outgoing` |
| `find_broken_links_tool` | `links.broken` |
| `analyze_note_tags_fs_tool` | `tags.analyze` |
| `add_tags_tool` | `tags.add` → now `tags.modify` |
| `update_tags_tool` | `tags.update` → now `tags.modify` |
| `remove_tags_tool` | `tags.remove` → now `tags.modify` |
| `search_by_tag_fs_tool` | `tags.search` |
| `list_tags_tool` | `tags.list` |
| `insert_after_heading_fs_tool` | `notes.insertAfterHeading` → now `notes.edit` |
| `insert_after_block_fs_tool` | `notes.insertAfterBlock` → now `notes.edit` |
| `update_frontmatter_field_fs_tool` | `notes.updateFrontmatter` → now `notes.frontmatter` |
| `append_to_note_fs_tool` | `notes.append` → now `notes.edit` |
| `note_statistics_fs_tool` | `stats.note` → now `notes.read` |
| `vault_statistics_fs_tool` | `stats.vault` |
| `search_tasks_tool` | `tasks.search` |
| `create_task_tool` | `tasks.create` |
| `toggle_task_status_tool` | `tasks.toggle` |
| `update_task_metadata_tool` | `tasks.updateMetadata` |
| `get_task_statistics_tool` | `tasks.stats` |
| `extract_dataview_fields_tool` | `dataview.fields.extract` → now `dataview.fields.read` |
| `search_by_dataview_field_tool` | `dataview.fields.search` → now `dataview.fields.read` |
| `add_dataview_field_tool` | `dataview.fields.add` → now `dataview.fields.write` |
| `remove_dataview_field_tool` | `dataview.fields.remove` → now `dataview.fields.write` |
| Dataview page/list/task index | `dataview.index.read` → now `dataview.index` |
| Fenced Dataview DQL block read/update | `dataview.query.read` / `.update` → now `blocks.read` / `blocks.update` |
| Fenced DataviewJS block read/update | `dataview.js.read` / `.update` → now `blocks.read` / `blocks.update` |
| Mermaid block listing/read/update | `mermaid.blocks.*` → now `blocks.*` |
| Marp deck read | `marp.deck.read` → now `marp.read` |
| Marp slide listing/read | `marp.slides.list` / `.read` → now `marp.read` |
| Marp slide/frontmatter mutation | `marp.slides.update` / `marp.frontmatter.update` → now `marp.update` |
| `parse_kanban_board_tool` | `kanban.parse` |
| `add_kanban_card_tool` | `kanban.addCard` → now `kanban.card` |
| `move_kanban_card_tool` | `kanban.moveCard` → now `kanban.card` |
| `toggle_kanban_card_tool` | `kanban.toggleCard` → now `kanban.card` |
| `get_kanban_statistics_tool` | `kanban.stats` |
| `get_link_graph_tool` | `links.graph` |
| `find_orphaned_notes_tool` | `links.orphaned` |
| `find_hub_notes_tool` | `links.hubs` |
| `analyze_link_health_tool` | `links.health` |
| `get_note_connections_tool` | `links.connections` |
| `execute_dataview_query_tool` | `dataview.query` |
| `list_notes_by_tag_dql_tool` | `dataview.listByTag` |
| `list_notes_by_folder_dql_tool` | `dataview.listByFolder` |
| `table_query_dql_tool` | `dataview.table` |
| `expand_template_tool` | `templates.expand` → now `templates.use` |
| `list_templates_tool` | `templates.list` |
| `create_note_from_template_fs_tool` | `templates.createNote` → now `templates.use` |
| `render_templater_template_tool` | `templates.renderTemplater` → now `templates.use` |
| `create_note_from_template_api_tool` | `templates.createNoteTemplater` → now `templates.use` |
| `insert_templater_template_api_tool` | `templates.insertTemplater` → now `templates.use` |
| `parse_canvas_tool` | `canvas.parse` |
| `add_canvas_node_tool` | `canvas.addNode` → now `canvas.edit` |
| `add_canvas_edge_fs_tool` | `canvas.addEdge` → now `canvas.edit` |
| `remove_canvas_node_fs_tool` | `canvas.removeNode` → now `canvas.edit` |
| `get_canvas_node_connections_fs_tool` | `canvas.connections` |
| `get_active_file_tool` | `workspace.activeFile` |
| `open_file_tool` | `workspace.openFile` |
| `close_active_file_api_tool` | `workspace.closeActiveFile` |
| `navigate_back_api_tool` | `workspace.navigateBack` → now `workspace.navigate` |
| `navigate_forward_api_tool` | `workspace.navigateForward` → now `workspace.navigate` |
| `toggle_edit_mode_api_tool` | `workspace.toggleEditMode` |
| `execute_command_tool` | `commands.execute` |
| `list_commands_tool` | `commands.list` |
| `search_commands_api_tool` | `commands.search` → now `commands.list` (with `query`) |
