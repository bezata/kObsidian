import { z } from "zod";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../../config/package-version.js";
import { isBun } from "../../lib/runtime.js";
import type { ToolDefinition } from "../tool-definition.js";
import { READ_ONLY_OPEN_WORLD } from "../tool-schemas.js";

const versionOutputSchema = z.object({
  name: z.string(),
  version: z.string(),
  runtime: z.enum(["bun", "node"]),
  runtimeVersion: z.string(),
  summary: z.string(),
});

export const systemTools: ToolDefinition[] = [
  {
    name: "system.version",
    title: "Server Version",
    description: "Return the running kObsidian server name, version, and host runtime.",
    inputSchema: z.object({}),
    outputSchema: versionOutputSchema,
    annotations: READ_ONLY_OPEN_WORLD,
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
