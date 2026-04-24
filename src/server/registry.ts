import type { ToolDefinition } from "./tool-definition.js";
import { analyticsTools } from "./tools/analytics.js";
import { apiTools } from "./tools/api.js";
import { blocksTools } from "./tools/blocks.js";
import { canvasTools } from "./tools/canvas.js";
import { dataviewTools } from "./tools/dataview.js";
import { kanbanTools } from "./tools/kanban.js";
import { linkTools } from "./tools/links.js";
import { marpTools } from "./tools/marp.js";
import { noteTools } from "./tools/notes.js";
import { systemTools } from "./tools/system.js";
import { tagTools } from "./tools/tags.js";
import { taskTools } from "./tools/tasks.js";
import { templateTools } from "./tools/templates.js";
import { vaultTools } from "./tools/vaults.js";
import { wikiTools } from "./tools/wiki.js";

export const toolRegistry: ToolDefinition[] = [
  ...vaultTools,
  ...noteTools,
  ...tagTools,
  ...linkTools,
  ...analyticsTools,
  ...taskTools,
  ...dataviewTools,
  ...blocksTools,
  ...marpTools,
  ...kanbanTools,
  ...canvasTools,
  ...templateTools,
  ...apiTools,
  ...wikiTools,
  ...systemTools,
];
