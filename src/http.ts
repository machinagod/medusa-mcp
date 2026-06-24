import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { makeServer } from "./server";
import type { McpTool } from "./tools/types";

/**
 * Bearer-token gate. The HTTP endpoint proxies Medusa **admin** operations, so it
 * must not be open: when `MCP_AUTH_TOKEN` is set, every MCP request needs
 * `Authorization: Bearer <token>`. If it is unset the gate is open (local dev) —
 * callers should always set it in any deployed environment.
 */
export function authorized(authHeader: string | undefined, token: string | undefined): boolean {
    if (!token) return true;
    return authHeader === `Bearer ${token}`;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : undefined;
}

function send(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
}

export interface HttpOptions {
    port?: number;
    path?: string;
    token?: string;
}

/**
 * Serve the MCP over Streamable HTTP. Stateless (a fresh server + transport per
 * POST, JSON responses) — simple and horizontally scalable for a tool server.
 * `GET <path>/health` is an unauthenticated liveness probe; everything else is
 * POST-only behind the bearer gate.
 */
export async function startHttp(tools: McpTool[], opts: HttpOptions = {}): Promise<ReturnType<typeof createServer>> {
    const port = opts.port ?? Number(process.env.PORT ?? 3000);
    const path = opts.path ?? process.env.MCP_HTTP_PATH ?? "/mcp";
    const token = opts.token ?? process.env.MCP_AUTH_TOKEN;
    if (!token) {
        console.error("[mcp] WARNING: MCP_AUTH_TOKEN is unset — the HTTP endpoint is UNAUTHENTICATED");
    }

    const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
            const url = (req.url ?? "").split("?")[0];
            if (req.method === "GET" && url === `${path}/health`) {
                return send(res, 200, { status: "ok" });
            }
            if (url !== path) return send(res, 404, { error: "not found" });
            if (!authorized(req.headers.authorization, token)) {
                res.setHeader("WWW-Authenticate", "Bearer");
                return send(res, 401, { error: "unauthorized" });
            }
            if (req.method !== "POST") {
                return send(res, 405, { error: "method not allowed (stateless: POST only)" });
            }
            try {
                const body = await readJsonBody(req);
                const server = makeServer(tools);
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: undefined, // stateless
                    enableJsonResponse: true
                });
                res.on("close", () => {
                    void transport.close();
                    void server.close();
                });
                await server.connect(transport);
                await transport.handleRequest(req, res, body);
            } catch (err) {
                console.error("[mcp] request error:", err);
                if (!res.headersSent) send(res, 500, { error: "internal error" });
            }
        })();
    });

    await new Promise<void>((resolve) => httpServer.listen(port, resolve));
    console.error(`Medusa MCP HTTP server listening on :${port}${path}`);
    return httpServer;
}
