import { describe, it, expect, afterEach } from "vitest";
import type { Server } from "node:http";
import { authorized, startHttp } from "../src/http";

describe("authorized", () => {
    it("is open when no token is configured", () => {
        expect(authorized(undefined, undefined)).toBe(true);
        expect(authorized("anything", undefined)).toBe(true);
    });
    it("requires the exact bearer token when configured", () => {
        expect(authorized("Bearer s3cret", "s3cret")).toBe(true);
        expect(authorized("Bearer wrong", "s3cret")).toBe(false);
        expect(authorized(undefined, "s3cret")).toBe(false);
        expect(authorized("s3cret", "s3cret")).toBe(false); // missing the "Bearer " prefix
    });
});

describe("startHttp", () => {
    let srv: Server | undefined;
    afterEach(() => srv?.close());

    it("serves an unauthenticated health probe and gates the MCP endpoint", async () => {
        srv = await startHttp([], { port: 0, token: "tok" });
        const { port } = srv.address() as { port: number };
        const base = `http://127.0.0.1:${port}`;

        const health = await fetch(`${base}/mcp/health`);
        expect(health.status).toBe(200);
        expect(await health.json()).toEqual({ status: "ok" });

        const unauth = await fetch(`${base}/mcp`, { method: "POST", body: "{}" });
        expect(unauth.status).toBe(401);

        const authed = await fetch(`${base}/mcp`, {
            method: "GET",
            headers: { Authorization: "Bearer tok" }
        });
        expect(authed.status).toBe(405); // POST-only

        const notFound = await fetch(`${base}/nope`);
        expect(notFound.status).toBe(404);
    });

    it("handles an MCP initialize over POST with a valid token", async () => {
        srv = await startHttp([], { port: 0, token: "tok" });
        const { port } = srv.address() as { port: number };
        const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
            method: "POST",
            headers: {
                Authorization: "Bearer tok",
                "Content-Type": "application/json",
                Accept: "application/json, text/event-stream"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: { name: "t", version: "1" }
                }
            })
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as any;
        expect(body.result.serverInfo.name).toContain("Medusa");
    });
});
