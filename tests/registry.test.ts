import { describe, it, expect, vi } from "vitest";
import { loadToolModules } from "../src/tools/registry";
import type { ToolContext } from "../src/tools/types";

const ctx = (): ToolContext => ({
    admin: {} as any,
    store: {} as any,
    request: vi.fn().mockResolvedValue({})
});

describe("tool module registry", () => {
    it("auto-discovers tool modules by the *.module convention", async () => {
        const tools = await loadToolModules(ctx());
        const names = tools.map((t: any) => t.name);
        // the competitor-discovery module is picked up without any wiring
        expect(names).toContain("competitor_discovery_next_batch");
        expect(names).toContain("competitor_discovery_catalog_next_batch");
        expect(names).toContain("competitor_discovery_scrape");
    });

    it("returns tools whose handlers are callable", async () => {
        const tools = await loadToolModules(ctx());
        const stats: any = tools.find((t: any) => t.name === "competitor_discovery_stats");
        expect(stats).toBeTruthy();
        const res = await stats.handler({});
        expect(res).toHaveProperty("content");
    });
});
