import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { vaultConfigSchema } from "../domain/vault-config.js";
import { toolRegistry } from "./registry.js";

const targetPath = path.resolve(process.cwd(), "docs", "tool-inventory.json");
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(
  targetPath,
  `${JSON.stringify(
    toolRegistry.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      ...(tool.annotations ? { annotations: tool.annotations } : {}),
    })),
    null,
    2,
  )}\n`,
  "utf8",
);

// Editor-facing JSON Schema for the per-vault `.kobsidian.json`; referenced
// from the file's `$schema` key for completion and validation.
const configSchemaPath = path.resolve(process.cwd(), "docs", "kobsidian.config.schema.json");
const configJsonSchema = {
  ...z.toJSONSchema(vaultConfigSchema, { target: "draft-2020-12" }),
  $id: "https://raw.githubusercontent.com/bezata/kObsidian/main/docs/kobsidian.config.schema.json",
  title: "kObsidian per-vault configuration (.kobsidian.json)",
};
await fs.writeFile(configSchemaPath, `${JSON.stringify(configJsonSchema, null, 2)}\n`, "utf8");
