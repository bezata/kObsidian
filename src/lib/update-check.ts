import { PACKAGE_NAME, PACKAGE_VERSION } from "../config/package-version.js";

const REGISTRY = "https://registry.npmjs.org";
const TIMEOUT_MS = 3000;

export async function runUpdateCheck(): Promise<void> {
  if (process.env.KOBSIDIAN_DISABLE_UPDATE_CHECK === "1") return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${REGISTRY}/${PACKAGE_NAME}/latest`, {
      signal: controller.signal,
      headers: { accept: "application/vnd.npm.install-v1+json" },
    });
    if (!response.ok) return;
    const body = (await response.json()) as { version?: unknown };
    const latest = typeof body.version === "string" ? body.version : undefined;
    if (!latest || latest === PACKAGE_VERSION) return;
    if (!isNewer(latest, PACKAGE_VERSION)) return;
    process.stderr.write(
      `[kobsidian] update available: ${PACKAGE_VERSION} → ${latest} (run: npm i -g ${PACKAGE_NAME}@${latest}). Set KOBSIDIAN_DISABLE_UPDATE_CHECK=1 to silence.\n`,
    );
  } catch {
    // Silent — update check must never block or surface errors to the client.
  } finally {
    clearTimeout(timer);
  }
}

function isNewer(candidate: string, current: string): boolean {
  const a = parseSemverCore(candidate);
  const b = parseSemverCore(current);
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

function parseSemverCore(version: string): number[] {
  const core = version.split(/[-+]/, 1)[0] ?? version;
  return core.split(".").map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}
