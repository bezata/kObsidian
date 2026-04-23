# Environment Variables

Use environment variables for local configuration. Do not commit real values.

```bash
OBSIDIAN_VAULT_PATH=/absolute/path/to/vault
OBSIDIAN_API_URL=https://127.0.0.1:27124
OBSIDIAN_API_VERIFY_TLS=false
OBSIDIAN_REST_API_KEY=your-local-rest-api-key
KOBSIDIAN_HTTP_HOST=127.0.0.1
KOBSIDIAN_HTTP_PORT=3000
KOBSIDIAN_HTTP_BEARER_TOKEN=optional-local-http-token
KOBSIDIAN_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1
```

For Obsidian Local REST API, the default HTTPS certificate is self-signed. Keep `OBSIDIAN_API_VERIFY_TLS=false` for local development unless you install and trust the certificate.

Quick local checks:

```bash
bun run dev:stdio
bun run dev:http
bun run test
```
