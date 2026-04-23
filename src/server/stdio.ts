import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { runUpdateCheck } from "../lib/update-check.js";
import { createServer } from "./create-server.js";

const server = createServer();
const transport = new StdioServerTransport();

await server.connect(transport);

void runUpdateCheck();
