import { z } from "zod";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../../config/package-version.js";
import { isBun } from "../../lib/runtime.js";
import type { ToolDefinition } from "../tool-definition.js";
import { READ_ONLY } from "../tool-schemas.js";

const versionOutputSchema = z
  .object({
    name: z.string().describe("npm package name of the running server."),
    version: z.string().describe("Semver version."),
    runtime: z.enum(["bun", "node"]).describe("Which runtime is executing the server."),
    runtimeVersion: z.string().describe("Version of the runtime (bun or node)."),
    summary: z.string().describe("Human-readable one-liner combining the fields above."),
  })
  .describe("Return shape for `system.version`.");

export const systemTools: ToolDefinition[] = [
  {
    name: "system.version",
    title: "Server Version",
    description:
      "Return the running kObsidian server's package name, semver version, host runtime (`bun` or `node`), and runtime version. Use this as a health-check or to confirm which server build a client is talking to. Read-only; zero side effects.",
    inputSchema: z.object({}).strict(),
    outputSchema: versionOutputSchema,
    annotations: READ_ONLY,
    handler: async () => {
      const runtime: "bun" | "node" = isBun ? "bun" : "node";
      const runtimeVersion = isBun
        ? ((process.versions as { bun?: string }).bun ?? "unknown")
        : process.version;
      return {
        name: PACKAGE_NAME,
        version: PACKAGE_VERSION,
        runtime,
        runtimeVersion,
        summary: `${PACKAGE_NAME} ${PACKAGE_VERSION} on ${runtime} ${runtimeVersion}`,
      };
    },
  },
];
