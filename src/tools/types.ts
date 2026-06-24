import type MedusaAdminService from "../services/medusa-admin";
import type MedusaStoreService from "../services/medusa-store";

/**
 * Authenticated request to a backend route, returning parsed JSON. Implemented
 * by MedusaAdminService.request and handed to tool modules so they stay pure.
 */
export type BackendCall = (
    method: "get" | "post",
    path: string,
    opts?: { query?: Record<string, unknown>; body?: Record<string, unknown> }
) => Promise<unknown>;

/**
 * A registered MCP tool — the shape `server.tool(...)` consumes. The handler is
 * intentionally loosely typed (`any` input) to accept `defineTool`'s generic,
 * per-tool inferred handler, matching how the services type their tool arrays.
 */
export interface McpTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches defineTool's generic handler signature
    handler: (input: any, extra?: any) => Promise<unknown>;
}

/** Services + helpers a tool module may use to build its tools. */
export interface ToolContext {
    admin: MedusaAdminService;
    store: MedusaStoreService;
    request: BackendCall;
}

/**
 * A self-contained group of tools. Drop a `*.module.ts` file in `src/tools/`
 * that default-exports one of these and the registry auto-discovers it — no
 * edit to index.ts. Mirrors the services' `defineTools()` shape, just packaged
 * for discovery.
 */
export interface ToolModule {
    /** Stable id for logging / de-dup. */
    name: string;
    defineTools(ctx: ToolContext): McpTool[];
}
