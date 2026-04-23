# Migration Guide

This repository now uses a TypeScript/Bun MCP server with a cleaned vNext tool surface.

## Key Changes

- Tool names are domain-prefixed, such as `notes.read` and `tags.search`
- Filesystem-native behavior is the default for operations that do not require Obsidian to be running
- API-backed tools are kept for Dataview DQL, Templater, workspace actions, and command execution
- Dataview fields are now scope-aware across page, list-item, and task metadata
- Mermaid and Marp are new source-safe parse/edit tool families; they do not render or export diagrams/decks
- Result shapes are normalized around:
  - reads/parsers: typed objects
  - lists/searches: `{ items, total, ... }`
  - mutations: `{ changed, target, summary, ... }`

## Tool Name Mapping

| Old Tool | New Tool |
|---|---|
| `read_note_tool` | `notes.read` |
| `create_note_tool` | `notes.create` |
| `update_note_tool` | `notes.update` |
| `delete_note_tool` | `notes.delete` |
| `search_notes_tool` | `notes.search` |
| `search_by_date_tool` | `notes.searchByDate` |
| `list_notes_tool` | `notes.list` |
| `list_folders_tool` | `notes.listFolders` |
| `move_note_tool` | `notes.move` |
| `create_folder_tool` | `notes.createFolder` |
| `move_folder_tool` | `notes.moveFolder` |
| `get_note_info_tool` | `notes.info` |
| `get_backlinks_tool` | `links.backlinks` |
| `get_outgoing_links_tool` | `links.outgoing` |
| `find_broken_links_tool` | `links.broken` |
| `get_backlinks_fs_tool` | `links.backlinks` |
| `get_broken_links_fs_tool` | `links.broken` |
| `analyze_note_tags_fs_tool` | `tags.analyze` |
| `add_tag_fs_tool` | `tags.add` |
| `remove_tag_fs_tool` | `tags.remove` |
| `search_by_tag_fs_tool` | `tags.search` |
| `list_tags_tool` | `tags.list` |
| `add_tags_tool` | `tags.add` |
| `update_tags_tool` | `tags.update` |
| `remove_tags_tool` | `tags.remove` |
| `insert_after_heading_fs_tool` | `notes.insertAfterHeading` |
| `insert_after_block_fs_tool` | `notes.insertAfterBlock` |
| `update_frontmatter_field_fs_tool` | `notes.updateFrontmatter` |
| `append_to_note_fs_tool` | `notes.append` |
| `note_statistics_fs_tool` | `stats.note` |
| `vault_statistics_fs_tool` | `stats.vault` |
| `search_tasks_tool` | `tasks.search` |
| `create_task_tool` | `tasks.create` |
| `toggle_task_status_tool` | `tasks.toggle` |
| `update_task_metadata_tool` | `tasks.updateMetadata` |
| `get_task_statistics_tool` | `tasks.stats` |
| `extract_dataview_fields_tool` | `dataview.fields.extract` |
| `search_by_dataview_field_tool` | `dataview.fields.search` |
| `add_dataview_field_tool` | `dataview.fields.add` |
| `remove_dataview_field_tool` | `dataview.fields.remove` |
| Dataview page/list/task index | `dataview.index.read` |
| Fenced Dataview DQL block extraction | `dataview.query.read` |
| Fenced Dataview DQL block mutation | `dataview.query.update` |
| Fenced DataviewJS block extraction | `dataview.js.read` |
| Fenced DataviewJS block mutation | `dataview.js.update` |
| Mermaid block extraction/listing | `mermaid.blocks.list` |
| Mermaid block read | `mermaid.blocks.read` |
| Mermaid block mutation | `mermaid.blocks.update` |
| Marp deck read | `marp.deck.read` |
| Marp slide listing | `marp.slides.list` |
| Marp slide read | `marp.slides.read` |
| Marp slide mutation | `marp.slides.update` |
| Marp frontmatter mutation | `marp.frontmatter.update` |
| `parse_kanban_board_tool` | `kanban.parse` |
| `add_kanban_card_tool` | `kanban.addCard` |
| `move_kanban_card_tool` | `kanban.moveCard` |
| `toggle_kanban_card_tool` | `kanban.toggleCard` |
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
| `expand_template_tool` | `templates.expand` |
| `list_templates_tool` | `templates.list` |
| `create_note_from_template_fs_tool` | `templates.createNote` |
| `render_templater_template_tool` | `templates.renderTemplater` |
| `create_note_from_template_api_tool` | `templates.createNoteTemplater` |
| `insert_templater_template_api_tool` | `templates.insertTemplater` |
| `parse_canvas_tool` | `canvas.parse` |
| `add_canvas_node_tool` | `canvas.addNode` |
| `add_canvas_edge_fs_tool` | `canvas.addEdge` |
| `remove_canvas_node_fs_tool` | `canvas.removeNode` |
| `get_canvas_node_connections_fs_tool` | `canvas.connections` |
| `get_active_file_tool` | `workspace.activeFile` |
| `open_file_tool` | `workspace.openFile` |
| `close_active_file_api_tool` | `workspace.closeActiveFile` |
| `navigate_back_api_tool` | `workspace.navigateBack` |
| `navigate_forward_api_tool` | `workspace.navigateForward` |
| `toggle_edit_mode_api_tool` | `workspace.toggleEditMode` |
| `execute_command_tool` | `commands.execute` |
| `list_commands_tool` | `commands.list` |
| `search_commands_api_tool` | `commands.search` |
