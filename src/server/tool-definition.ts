import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import type { DomainContext } from "../domain/context.js";

export type ToolInputExample = {
  /** Short description of the scenario this example illustrates. */
  description: string;
  /** The argument object the caller would pass. */
  input: Record<string, unknown>;
};

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  annotations?: ToolAnnotations;
  /**
   * Optional input examples rendered into the tool description at registration
   * time. Anthropic's tool-use guidance recommends examples for tools with
   * complex, nested, or format-sensitive inputs — MCP's current spec has no
   * dedicated examples field, so we surface them through the description.
   */
  inputExamples?: ToolInputExample[];
  handler: (context: DomainContext, args: unknown) => Promise<unknown>;
};
