import { describe, it, expect, vi } from "vitest";
import { join } from "node:path";
import { loadToolModules } from "../src/tools/registry";
import type { ToolContext } from "../src/tools/types";

const FIXTURES = join(__dirname, "fixtures", "tools");

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

    it("loads valid modules and skips broken / duplicate / throwing ones", async () => {
        const tools = await loadToolModules(ctx(), { dir: FIXTURES });
        const names = tools.map((t: any) => t.name);
        expect(names).toEqual(["alpha_tool"]); // broken (no module), dup (same name), throws (import error), helper (not *.module) all skipped
    });

    it("returns [] when the modules dir can't be scanned", async () => {
        const tools = await loadToolModules(ctx(), { dir: join(__dirname, "no", "such", "dir") });
        expect(tools).toEqual([]);
    });
});
