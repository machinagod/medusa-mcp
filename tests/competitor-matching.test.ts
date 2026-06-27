import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineCompetitorMatchingTools } from "../src/services/competitor-matching";

const call = vi.fn();
const tools = () => defineCompetitorMatchingTools(call);
const tool = (name: string): any => tools().find((t: any) => t.name === name);

beforeEach(() => {
    call.mockReset();
    call.mockResolvedValue({ ok: true });
});

describe("competitor-matching tools", () => {
    it("exposes the review + resolve + catalog-items tools", () => {
        const names = tools().map((t: any) => t.name);
        expect(names).toEqual(
            expect.arrayContaining([
                "competitor_match_review",
                "competitor_match_resolve",
                "competitor_catalog_items"
            ])
        );
    });

    it("review GETs the queue with limit/offset/competitor_id/status", async () => {
        await tool("competitor_match_review").handler({ limit: 20, status: "fuzzy" });
        expect(call).toHaveBeenCalledWith("get", "/admin/competitor-prices/match/review", {
            query: { limit: 20, offset: undefined, competitor_id: undefined, status: "fuzzy" }
        });
    });

    it("review supports the audit status (confirmed/all)", async () => {
        await tool("competitor_match_review").handler({ status: "all", competitor_id: "c1", offset: 50 });
        expect(call).toHaveBeenCalledWith("get", "/admin/competitor-prices/match/review", {
            query: { limit: undefined, offset: 50, competitor_id: "c1", status: "all" }
        });
    });

    it("resolve POSTs the full body (confirm)", async () => {
        await tool("competitor_match_resolve").handler({ mapping_id: "m1", action: "confirm", by: "agent" });
        expect(call).toHaveBeenCalledWith("post", "/admin/competitor-prices/match/resolve", {
            body: { mapping_id: "m1", action: "confirm", by: "agent" }
        });
    });

    it("resolve forwards reassign with product_id", async () => {
        await tool("competitor_match_resolve").handler({ mapping_id: "m2", action: "reassign", product_id: "p9" });
        expect(call).toHaveBeenCalledWith("post", "/admin/competitor-prices/match/resolve", {
            body: { mapping_id: "m2", action: "reassign", product_id: "p9" }
        });
    });

    it("catalog_items GETs the assortment-gap viewer and wraps JSON as MCP text", async () => {
        call.mockResolvedValue({ count: 2 });
        const res: any = await tool("competitor_catalog_items").handler({ competitor_id: "c1" });
        expect(call).toHaveBeenCalledWith("get", "/admin/competitor-prices/catalog-items", {
            query: { limit: undefined, offset: undefined, competitor_id: "c1" }
        });
        expect(res.content[0].text).toContain('"count": 2');
    });
});
