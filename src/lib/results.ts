import type { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";

export type ToolPayload<T extends Record<string, unknown>> = CallToolResult & {
  structuredContent: T;
  content: TextContent[];
};

export function ok<T extends Record<string, unknown>>(
  structuredContent: T,
  text?: string,
): ToolPayload<T> {
  return {
    structuredContent,
    content: text
      ? [
          {
            type: "text",
            text,
          },
        ]
      : [],
  };
}
