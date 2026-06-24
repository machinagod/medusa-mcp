import { defineTool } from "../utils/define-tools";
import type { BackendCall, McpTool } from "../tools/types";

/**
 * Competitor price-intelligence discovery tools.
 *
 * Thin MCP wrappers over the Medusa backend's custom
 * `/admin/competitor-prices/discovery/*` routes, so the competitor-discovery
 * Claude skill drives the queue through MCP tools instead of curl. Two queues:
 *  - forward (product-anchored): our product → find it at competitors
 *  - catalog (competitor-anchored): crawl a competitor's whole catalog → match
 * Plus parser self-correction (parser_issues / fix_parser) and a scrape trigger.
 *
 * `call(method, path, { query?, body? })` performs the authenticated request and
 * returns the parsed JSON; it is injected so the tools stay pure and testable.
 */
const BASE = "/admin/competitor-prices";
const D = `${BASE}/discovery`;

export function defineCompetitorDiscoveryTools(call: BackendCall): McpTool[] {
    return [
        defineTool((z) => ({
            name: "competitor_discovery_next_batch",
            description:
                "Forward discovery (pull): next batch of our product watches due to be found at competitors, plus the active competitor list. Returns { count, watches, competitors }.",
            inputSchema: {
                limit: z.number().int().positive().max(100).optional(),
                force: z.boolean().optional()
            },
            handler: (input) =>
                call("get", `${D}/next-batch`, {
                    query: { limit: input.limit, force: input.force }
                })
        })),
        defineTool((z) => ({
            name: "competitor_discovery_submit",
            description:
                "Forward discovery (push): submit the competitor listings found for one watched product. Creates mappings and resets the watch's miss back-off.",
            inputSchema: {
                watch_id: z.string().optional(),
                product_id: z.string().optional(),
                listings: z
                    .array(
                        z.object({
                            competitor_handle: z.string(),
                            url: z.string(),
                            competitor_name: z.string().optional(),
                            competitor_base_url: z.string().optional(),
                            competitor_country: z.string().optional(),
                            competitor_scraper_key: z.string().optional(),
                            competitor_scraper_hints: z
                                .record(z.string(), z.unknown())
                                .optional(),
                            is_new_competitor: z.boolean().optional(),
                            title: z.string().optional(),
                            brand: z.string().optional(),
                            sku: z.string().optional(),
                            ean: z.string().optional(),
                            confidence: z.number().optional()
                        })
                    )
                    .default([])
            },
            handler: (input) =>
                call("post", `${D}/submit`, {
                    body: {
                        watch_id: input.watch_id,
                        product_id: input.product_id,
                        listings: input.listings
                    }
                })
        })),
        defineTool((z) => ({
            name: "competitor_discovery_skip",
            description:
                "Forward discovery: nothing found for this watch — mark it a miss (climbs the back-off, retires it after repeated misses).",
            inputSchema: {
                watch_id: z.string().optional(),
                product_id: z.string().optional()
            },
            handler: (input) =>
                call("post", `${D}/skip`, {
                    body: {
                        watch_id: input.watch_id,
                        product_id: input.product_id
                    }
                })
        })),
        defineTool((z) => ({
            name: "competitor_discovery_stats",
            description:
                "Discovery queue health: due/total watches, total/matched/unmatched mappings.",
            inputSchema: {},
            handler: () => call("get", `${D}/stats`)
        })),
        defineTool((z) => ({
            name: "competitor_discovery_parser_issues",
            description:
                "Competitors whose deterministic parser yields no prices (all mappings failing) — with the current recipe and sample failing URLs, for self-correction.",
            inputSchema: {},
            handler: () => call("get", `${D}/parser-issues`)
        })),
        defineTool((z) => ({
            name: "competitor_discovery_fix_parser",
            description:
                "Apply a corrected scraper_key / scraper_hints to a competitor (or deactivate a login-gated store).",
            inputSchema: {
                competitor_id: z.string().optional(),
                competitor_handle: z.string().optional(),
                scraper_key: z.string().optional(),
                scraper_hints: z.record(z.string(), z.unknown()).optional(),
                deactivate: z.boolean().optional()
            },
            handler: (input) =>
                call("post", `${D}/fix-parser`, { body: { ...input } })
        })),
        defineTool((z) => ({
            name: "competitor_discovery_catalog_next_batch",
            description:
                "Reverse discovery (pull): next batch of competitors due for a CATALOG crawl, each with the listing URLs we already track so you skip them.",
            inputSchema: {
                limit: z.number().int().positive().max(50).optional(),
                force: z.boolean().optional()
            },
            handler: (input) =>
                call("get", `${D}/catalog/next-batch`, {
                    query: { limit: input.limit, force: input.force }
                })
        })),
        defineTool((z) => ({
            name: "competitor_discovery_catalog_submit",
            description:
                "Reverse discovery (push): submit the listings crawled from a competitor's catalog. They become unmatched mappings, then the matcher resolves them to our products. Returns { created, matched, report }.",
            inputSchema: {
                competitor_id: z.string().optional(),
                competitor_handle: z.string().optional(),
                listings: z
                    .array(
                        z.object({
                            url: z.string(),
                            title: z.string().optional(),
                            brand: z.string().optional(),
                            sku: z.string().optional(),
                            ean: z.string().optional()
                        })
                    )
                    .default([])
            },
            handler: (input) =>
                call("post", `${D}/catalog/submit`, {
                    body: {
                        competitor_id: input.competitor_id,
                        competitor_handle: input.competitor_handle,
                        listings: input.listings
                    }
                })
        })),
        defineTool((z) => ({
            name: "competitor_discovery_scrape",
            description:
                "Trigger a price scrape of competitor mappings (e.g. right after submitting new ones). force=true ignores the per-mapping schedule.",
            inputSchema: {
                mapping_ids: z.array(z.string()).optional(),
                limit: z.number().int().positive().optional(),
                force: z.boolean().optional()
            },
            handler: (input) =>
                call("post", `${BASE}/scrape`, { body: { ...input } })
        }))
    ];
}
