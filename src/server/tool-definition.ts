import type { z } from "zod";
import type { DomainContext } from "../domain/context.js";

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema?: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  handler: (context: DomainContext, args: unknown) => Promise<unknown>;
};
