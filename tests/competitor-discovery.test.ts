import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineCompetitorDiscoveryTools } from "../src/services/competitor-discovery";

const call = vi.fn();
const tools = () => defineCompetitorDiscoveryTools(call);
const tool = (name: string): any =>
    tools().find((t: any) => t.name === name);

beforeEach(() => {
    call.mockReset();
    call.mockResolvedValue({ ok: true });
});

describe("competitor-discovery tools", () => {
    it("exposes the forward + catalog + parser + scrape tools", () => {
        const names = tools().map((t: any) => t.name);
        expect(names).toEqual(
            expect.arrayContaining([
                "competitor_discovery_next_batch",
                "competitor_discovery_submit",
                "competitor_discovery_skip",
                "competitor_discovery_stats",
                "competitor_discovery_parser_issues",
                "competitor_discovery_fix_parser",
                "competitor_discovery_catalog_next_batch",
                "competitor_discovery_catalog_submit",
                "competitor_discovery_scrape"
            ])
        );
    });

    it("next_batch GETs the forward queue with limit/force", async () => {
        await tool("competitor_discovery_next_batch").handler({ limit: 10, force: true });
        expect(call).toHaveBeenCalledWith(
            "get",
            "/admin/competitor-prices/discovery/next-batch",
            { query: { limit: 10, force: true } }
        );
    });

    it("submit POSTs the watch + listings", async () => {
        await tool("competitor_discovery_submit").handler({
            watch_id: "w1",
            listings: [{ competitor_handle: "h", url: "u" }]
        });
        expect(call).toHaveBeenCalledWith(
            "post",
            "/admin/competitor-prices/discovery/submit",
            { body: { watch_id: "w1", product_id: undefined, listings: [{ competitor_handle: "h", url: "u" }] } }
        );
    });

    it("skip POSTs to the skip route", async () => {
        await tool("competitor_discovery_skip").handler({ watch_id: "w9" });
        expect(call).toHaveBeenCalledWith(
            "post",
            "/admin/competitor-prices/discovery/skip",
            { body: { watch_id: "w9", product_id: undefined } }
        );
    });

    it("catalog_next_batch GETs the reverse queue", async () => {
        await tool("competitor_discovery_catalog_next_batch").handler({ limit: 3 });
        expect(call).toHaveBeenCalledWith(
            "get",
            "/admin/competitor-prices/discovery/catalog/next-batch",
            { query: { limit: 3, force: undefined } }
        );
    });

    it("catalog_submit POSTs competitor + listings to the catalog route", async () => {
        await tool("competitor_discovery_catalog_submit").handler({
            competitor_handle: "egi-pt",
            listings: [{ url: "u" }]
        });
        expect(call).toHaveBeenCalledWith(
            "post",
            "/admin/competitor-prices/discovery/catalog/submit",
            { body: { competitor_id: undefined, competitor_handle: "egi-pt", listings: [{ url: "u" }] } }
        );
    });

    it("fix_parser forwards the whole body", async () => {
        await tool("competitor_discovery_fix_parser").handler({ competitor_handle: "x", deactivate: true });
        expect(call).toHaveBeenCalledWith(
            "post",
            "/admin/competitor-prices/discovery/fix-parser",
            { body: { competitor_handle: "x", deactivate: true } }
        );
    });

    it("scrape hits the non-discovery scrape route", async () => {
        await tool("competitor_discovery_scrape").handler({ force: true });
        expect(call).toHaveBeenCalledWith(
            "post",
            "/admin/competitor-prices/scrape",
            { body: { force: true } }
        );
    });

    it("stats GETs with no options and wraps the result as MCP text", async () => {
        call.mockResolvedValue({ count: 3 });
        const res: any = await tool("competitor_discovery_stats").handler({});
        expect(call).toHaveBeenCalledWith("get", "/admin/competitor-prices/discovery/stats");
        expect(res.content[0].text).toContain('"count": 3');
    });

    it("parser_issues GETs the parser-issues route", async () => {
        await tool("competitor_discovery_parser_issues").handler({});
        expect(call).toHaveBeenCalledWith("get", "/admin/competitor-prices/discovery/parser-issues");
    });
});
