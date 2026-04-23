# kObsidian Development Guidelines

## Runtime

- Bun + strict TypeScript ESM is the only supported runtime.
- MCP is implemented with `@modelcontextprotocol/sdk` v1.x, `McpServer`, stdio, and Streamable HTTP.
- Zod v4 schemas define public tool contracts.

## Project Structure

```text
src/config/   environment parsing and runtime settings
src/domain/   note, link, tag, task, Dataview, Mermaid, Marp, Kanban, canvas, workspace logic
src/lib/      shared filesystem, markdown, REST client, error, and result helpers
src/schema/   reusable Zod primitives and models
src/server/   MCP server factory, transports, and tool registration
tests/        Vitest fixture and integration tests
docs/         generated tool inventory and supporting docs
```

## Commands

```bash
bun install
bun run dev:stdio
bun run dev:http
bun run typecheck
bun run test
bun run lint
bun run build
bun run inventory
```

## Code Style

- Keep domain logic transport-agnostic.
- Prefer filesystem-first behavior where possible.
- Return typed JSON objects through `structuredContent`.
- Keep source-preserving Markdown edits region-based.
- Do not commit secrets, `.env` files, `node_modules`, or build output.
