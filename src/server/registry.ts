import type { ToolDefinition } from "./tool-definition.js";
import { analyticsTools } from "./tools/analytics.js";
import { apiTools } from "./tools/api.js";
import { dataviewTools } from "./tools/dataview.js";
import { kanbanTools } from "./tools/kanban.js";
import { linkTools } from "./tools/links.js";
import { marpTools } from "./tools/marp.js";
import { mermaidTools } from "./tools/mermaid.js";
import { noteTools } from "./tools/notes.js";
import { tagTools } from "./tools/tags.js";
import { taskTools } from "./tools/tasks.js";
import { templateAndCanvasTools } from "./tools/templates-canvas.js";
import { wikiTools } from "./tools/wiki.js";

export const toolRegistry: ToolDefinition[] = [
  ...noteTools,
  ...tagTools,
  ...linkTools,
  ...analyticsTools,
  ...taskTools,
  ...dataviewTools,
  ...mermaidTools,
  ...marpTools,
  ...kanbanTools,
  ...templateAndCanvasTools,
  ...apiTools,
  ...wikiTools,
];
