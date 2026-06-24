import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildTools, makeServer } from "./server";
import { startHttp } from "./http";

/**
 * Transport selection:
 *   - stdio (default) — local process the Claude config spawns
 *   - http — Streamable HTTP service with a URL; enabled by `MCP_TRANSPORT=http`
 *            or simply by `PORT` being set (so a Railway/container deploy is HTTP
 *            automatically).
 */
async function main(): Promise<void> {
    console.error("Starting Medusa Store MCP Server...");
    const tools = await buildTools();

    const mode = process.env.MCP_TRANSPORT ?? (process.env.PORT ? "http" : "stdio");
    if (mode === "http") {
        await startHttp(tools);
        return;
    }

    const server = makeServer(tools);
    const transport = new StdioServerTransport();
    console.error("Connecting server to transport...");
    await server.connect(transport);
    console.error("Medusajs MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
