import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import MedusaStoreService from "./services/medusa-store";
import MedusaAdminService from "./services/medusa-admin";
import { loadToolModules } from "./tools/registry";

async function main(): Promise<void> {
    console.error("Starting Medusa Store MCP Server...");
    const medusaStoreService = new MedusaStoreService();
    const medusaAdminService = new MedusaAdminService();
    let tools = [];
    try {
        await medusaAdminService.init();

        // Auto-discovered tool modules (tools/*.module.ts) get the live services
        // + an authed backend call, so new modules need no edit here.
        const moduleTools = await loadToolModules({
            admin: medusaAdminService,
            store: medusaStoreService,
            request: medusaAdminService.request
        });

        tools = [
            ...medusaStoreService.defineTools(),
            ...medusaAdminService.defineTools(),
            ...moduleTools
        ];
    } catch (error) {
        console.error("Error initializing Medusa Admin Services:", error);
        tools = [...medusaStoreService.defineTools()];
    }

    const server = new McpServer(
        {
            name: "Medusa Store MCP Server",
            version: "1.0.0"
        },
        {
            capabilities: {
                tools: {}
            }
        }
    );

    tools.forEach((tool) => {
        server.tool(
            tool.name,
            tool.description,
            tool.inputSchema,
            tool.handler
        );
    });

    const transport = new StdioServerTransport();
    console.error("Connecting server to transport...");
    await server.connect(transport);

    console.error("Medusajs MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
