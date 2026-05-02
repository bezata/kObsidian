# kObsidian 路线图

这是 [`../../../TODO.md`](../../../TODO.md) 的中文版本。CHANGELOG 是已经发布内容的事实来源；本文件只描述未来计划。

## 动机

kObsidian 最初是为作者自己的 Obsidian vault 工作流构建的：需要一个不绑定单一客户端、不要求 Obsidian 为普通读取持续运行、也不把 notes 关进专有同步方案里的 MCP server。这个结构稳定后，它被整理成开源项目，供其他 Obsidian-first 知识栈使用。

## v0.4：Obsidian LiveSync bridge

目标：通过社区插件 [Self-Hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) 支持免费、端到端加密、自托管的 vault 同步。LiveSync 可以运行在用户自己的 CouchDB、S3、R2 或 WebRTC peer 上，因此 kObsidian 可以在本地 Obsidian 进程不运行时，通过 API + MCP 访问同一个 vault。

计划：

- 检测 vault 中的 LiveSync 配置：`.obsidian/plugins/obsidian-livesync/data.json`。
- 在 `vault.list` 中暴露 remote endpoints，并新增 `livesync` source flag。
- 新增 `vault.connectLiveSync`，用于会话期间连接 remote vault。
- 支持通过 LiveSync chunked store 的 E2E-encrypted read path。
- 文档覆盖 CouchDB、IBM Cloudant、Cloudflare R2、WebRTC peer 等部署方式。

选择 LiveSync 的原因：它是广泛使用、开源、端到端加密、可自托管的 Obsidian 同步方案。注意：LiveSync 与 Obsidian Sync 或 iCloud 不共存，这个限制也会传递到 kObsidian。

## v0.5：跨语义 vault 验证

目标：新增 `wiki.crossCheck`，在 wiki 层比较两个或多个 LiveSync 配对 vault。相同 Source slug 应有兼容 frontmatter，`wiki/log.md` 的 canonical log lines 应可确定性 replay，Concept/Entity 页面应收敛到同一 wiki-link graph。

计划：

- 给 Source、Concept、Entity frontmatter 增加 `schema_version: 1`。
- `wiki.crossCheck` 比较两个 wiki tree，并按 `{page, field, severity}` 返回差异。
- 自动 replay log merge：合并 `## [YYYY-MM-DD]` entries，按 `(op, title, date)` 去重并保序。
- 冲突策略：`lastWriteWins` 默认，`manualResolve` 返回 `proposedEdits`。
- 为没有 `schema_version` 的 vault 提供 migration tool，必须显式 `force:true`。

## 约定

- 路线图按 semver 组织。
- 已完成项进入 CHANGELOG，然后从 TODO 移除。
- 大功能在实现前应拆成 tracking issue。
