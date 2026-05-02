# 安全

kObsidian 是本地 MCP 服务器，会读写你的 Obsidian vault。把它当作拥有文件系统访问权限的 CLI 工具：只从可信来源运行，不要把密钥放进仓库。

## 传输层保护

### stdio

没有网络暴露面。MCP 客户端直接启动进程；进程从 stdin 读取 JSON-RPC，从 stdout 写回响应。诊断信息写到 stderr，避免破坏 stdout 协议帧。

### Streamable HTTP

- `KOBSIDIAN_ALLOWED_ORIGINS` 是 Origin 白名单；带有不允许 Origin 的请求会立即返回 403。
- `OPTIONS /mcp` 对允许的 Origin 返回 CORS 预检头；不允许则 403。
- 设置 `KOBSIDIAN_HTTP_BEARER_TOKEN` 后，请求必须携带 `Authorization: Bearer ...`，否则返回 401。
- `MCP-Protocol-Version` 会被验证；缺失时按规范回退， unsupported 版本返回 JSON-RPC 错误。

## 供应链

### VirusTotal

发布流程会把每个 `kobsidian-<platform>.mcpb` 上传到 VirusTotal，并把分析链接追加到 GitHub release，用户可以在运行前查看报告。

### npm Trusted Publishing

npm 发布使用 GitHub OIDC Trusted Publishing，不在仓库中保存长期 `NPM_TOKEN`。tag push 时 GitHub Actions 生成短期 token，npm CLI 用它换取一次性发布权限。

```bash
npm trust github --file .github/workflows/release.yml --repo bezata/kObsidian
```

### 固定 SDK 版本

`@modelcontextprotocol/sdk` 固定在 `1.29.0`，高于修复 UriTemplate ReDoS 和跨客户端响应泄漏问题的最低版本。

### Biome 与 TypeScript strict

`bun run lint` 使用 Biome，`bun run typecheck` 使用严格 TypeScript。`prepublishOnly` 会在发布前执行 typecheck、lint、test 和 build。

## 环境变量卫生

这些变量是敏感信息，不要提交：

- `OBSIDIAN_REST_API_KEY`
- `KOBSIDIAN_HTTP_BEARER_TOKEN`

`.env` 和 `.env.*` 已在 `.gitignore` 中。vault 本身也不应该保存这些密钥。

## MCP 注意事项

### 工具注解不是安全边界

`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint` 是给客户端改善 UX 的提示。真正的限制由服务器执行，例如路径参数必须通过 `assertVaultRelativePath`。

### `wiki.ingest` 不会盲目写交叉引用

`wiki.ingest` 只创建 Sources 页面、追加日志，并返回 `proposedEdits`。跨页面编辑必须通过可见的 `notes.*` 调用完成。

### 工具投毒与 shadowing

工具描述、标题和注解来自本仓库源码，不来自外部服务器。如果在多服务器 MCP 网关前使用 kObsidian，请在批准时固定工具 schema。

## 报告漏洞

请在 GitHub 打开 private security advisory：<https://github.com/bezata/kObsidian/security/advisories/new>。

也可以邮件联系维护者，并在主题中写明 `kObsidian security`。
