import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach } from "vitest";
import { getEnv } from "../src/config/env.js";
import { createDomainContext } from "../src/domain/context.js";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    cleanupPaths.splice(0, cleanupPaths.length).map(async (target) => {
      await fs.rm(target, { recursive: true, force: true });
    }),
  );
});

export async function makeTempVault(): Promise<string> {
  const source = path.resolve(process.cwd(), "tests", "fixtures", "sample_vault");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "kobsidian-"));
  const destination = path.join(tempRoot, "vault");
  await fs.cp(source, destination, { recursive: true });
  cleanupPaths.push(tempRoot);
  return destination;
}

export function makeContext(vaultPath: string, overrides: Partial<NodeJS.ProcessEnv> = {}) {
  const env = getEnv({
    ...process.env,
    OBSIDIAN_VAULT_PATH: vaultPath,
    KOBSIDIAN_ALLOWED_ORIGINS: "http://localhost",
    ...overrides,
  });
  return createDomainContext(env);
}
