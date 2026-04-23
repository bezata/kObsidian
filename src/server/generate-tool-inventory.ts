import { promises as fs } from "node:fs";
import path from "node:path";
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
