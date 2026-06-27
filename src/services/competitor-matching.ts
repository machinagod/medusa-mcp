import { defineTool } from "../utils/define-tools";
import type { BackendCall, McpTool } from "../tools/types";

/**
 * Competitor price-intelligence MATCH-REVIEW tools.
 *
 * Thin MCP wrappers over the backend's custom `/admin/competitor-prices/match/*`
 * routes, so the competitor-matching Claude skill can resolve the review queue
 * through MCP tools (pre-authenticated) instead of curl + admin credentials.
 *
 * The deterministic matcher auto-confirms only EAN/SKU/brand-ref hits; title-only
 * "fuzzy" candidates are parked as PROPOSALS for review. These tools pull the
 * queue and resolve each proposal — confirm (goes live), reject (→ catalog_only),
 * or reassign (link to a different product). Resolve works on ANY mapping, so a
 * wrong auto-confirm can be corrected too.
 *
 * `call(method, path, { query?, body? })` performs the authenticated request and
 * returns parsed JSON; injected so the tools stay pure and testable.
 */
const BASE = "/admin/competitor-prices";

export function defineCompetitorMatchingTools(call: BackendCall): McpTool[] {
    return [
        defineTool((z) => ({
            name: "competitor_match_review",
            description:
                "Match-review queue: title-fuzzy PROPOSALS the matcher could not auto-confirm, each pairing a competitor listing with OUR proposed product (highest score first). status defaults to 'fuzzy' (the backlog); 'confirmed' audits live matches, 'all' sweeps both. Returns { count, limit, offset, items:[{ id, competitor_handle, competitor_name, competitor_url, theirs_title, brand, sku, ean, match_score, proposed_product_id, proposed_title, proposed_sku }] }.",
            inputSchema: {
                limit: z.number().int().positive().max(200).optional(),
                offset: z.number().int().nonnegative().optional(),
                competitor_id: z.string().optional(),
                status: z.enum(["fuzzy", "confirmed", "all"]).optional()
            },
            handler: (input) =>
                call("get", `${BASE}/match/review`, {
                    query: {
                        limit: input.limit,
                        offset: input.offset,
                        competitor_id: input.competitor_id,
                        status: input.status
                    }
                })
        })),
        defineTool((z) => ({
            name: "competitor_match_resolve",
            description:
                "Resolve a match proposal — works on ANY mapping regardless of status. action: 'confirm' (the proposed product is the same item → goes live, scraped/shown), 'reject' (not our product → catalog_only, link cleared), or 'reassign' (link to a DIFFERENT product_id, e.g. found via AdminGetProducts). `by` records who resolved it (e.g. 'agent').",
            inputSchema: {
                mapping_id: z.string(),
                action: z.enum(["confirm", "reject", "reassign"]),
                product_id: z.string().optional(),
                variant_id: z.string().optional(),
                product_sku: z.string().optional(),
                by: z.string().optional()
            },
            handler: (input) =>
                call("post", `${BASE}/match/resolve`, { body: { ...input } })
        })),
        defineTool((z) => ({
            name: "competitor_catalog_items",
            description:
                "Assortment-gap viewer: competitor catalog items discovered but NOT matched to any of our products (catalog_only) — products competitors sell that we don't. Paged; optional competitor_id filter. Returns { count, limit, offset, items:[{ id, competitor_handle, competitor_name, country, url, title, brand, sku, ean, discovered_at }] }.",
            inputSchema: {
                limit: z.number().int().positive().max(200).optional(),
                offset: z.number().int().nonnegative().optional(),
                competitor_id: z.string().optional()
            },
            handler: (input) =>
                call("get", `${BASE}/catalog-items`, {
                    query: {
                        limit: input.limit,
                        offset: input.offset,
                        competitor_id: input.competitor_id
                    }
                })
        }))
    ];
}
