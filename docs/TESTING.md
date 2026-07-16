# Testing

kObsidian is tested with Bun, TypeScript, and Vitest.

## Local Checks

```bash
bun run typecheck
bun run test
bun run lint
bun run build
```

Run the real-transport compatibility suite on its own with:

```bash
bun run test:compat
```

## Inventory

Regenerate the public MCP tool inventory after changing registered tools:

```bash
bun run inventory
```

The generated file is `docs/tool-inventory.json`.

## Environment

Filesystem-backed tests do not require Obsidian to be running. Runtime-backed tools use these environment variables:

```bash
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=your-local-rest-api-key
```

Never commit `.env` files or real API keys.

## Coverage Areas

- Domain parsing and mutations for notes, links, tags, tasks, Dataview, Kanban, canvas, Mermaid, and Marp.
- MCP registration and structured output validation through in-memory transports.
- Real stdio and Streamable HTTP JSON round trips, including newlines, literal escape text, tabs, quotes, backslashes, and Unicode.
- Hono Streamable HTTP compliance coverage.
- Source-preserving Markdown block updates.
- Local REST API-dependent tools as opt-in live checks.

## Client Compatibility Reports

Compatibility reports need evidence from each boundary in the request path:

1. Client and version.
2. Model and provider, because the model/provider produces tool arguments before the MCP call.
3. Transport (`stdio` or Streamable HTTP).
4. Exact raw `tool_call.function.arguments` or JSON-RPC `params.arguments`.
5. Expected and actual bytes or Unicode code points when text encoding is involved.

GitHub's **Client compatibility report** issue form collects these fields.
Do not add automatic unescaping or client-specific normalization without a raw
payload that proves the server received a correctly encoded value. In standard
JSON, `"\n"` decodes to newline U+000A while `"\\n"` decodes to the two
literal characters backslash + `n`; both are valid inputs and must remain
distinguishable.
