# Testing

kObsidian is tested with Bun, TypeScript, and Vitest.

## Local Checks

```bash
bun run typecheck
bun run test
bun run lint
bun run build
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
- Hono Streamable HTTP smoke coverage.
- Source-preserving Markdown block updates.
- Local REST API-dependent tools as opt-in live checks.
