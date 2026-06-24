import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import MedusaStoreService from "./services/medusa-store";
import MedusaAdminService from "./services/medusa-admin";
import { loadToolModules } from "./tools/registry";
import type { McpTool } from "./tools/types";

/**
 * Build the full tool set once: the generated store + admin tools plus every
 * auto-discovered tool module (tools/registry). The admin service logs in once
 * here, so tool handlers reuse that token rather than re-authing per request.
 * If admin init fails we fall back to the store tools only (mirrors the old
 * index.ts behaviour).
 */
export async function buildTools(): Promise<McpTool[]> {
    const store = new MedusaStoreService();
    const admin = new MedusaAdminService();
    try {
        await admin.init();
        const moduleTools = await loadToolModules({
            admin,
            store,
            request: admin.request
        });
        return [...store.defineTools(), ...admin.defineTools(), ...moduleTools];
    } catch (error) {
        console.error("Error initializing Medusa Admin Services:", error);
        return [...store.defineTools()];
    }
}

/** A fresh McpServer with the given tools registered. */
export function makeServer(tools: McpTool[]): McpServer {
    const server = new McpServer(
        { name: "Medusa Store MCP Server", version: "1.0.0" },
        { capabilities: { tools: {} } }
    );
    for (const tool of tools) {
        // The generated tools are loosely typed (defineTool's per-tool inferred
        // handler); cast at the registration boundary, as the original index.ts did.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        server.tool(tool.name, tool.description, tool.inputSchema as any, tool.handler as any);
    }
    return server;
}
