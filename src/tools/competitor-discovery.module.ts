import { defineCompetitorDiscoveryTools } from "../services/competitor-discovery";
import type { ToolModule } from "./types";

/**
 * Auto-discovered tool module for the competitor price-intelligence queues.
 * The registry picks this up via the `*.module.ts` convention; it just adapts
 * the pure tool builder to the discovery context (the authed backend call).
 */
const competitorDiscoveryModule: ToolModule = {
    name: "competitor-discovery",
    defineTools: (ctx) => defineCompetitorDiscoveryTools(ctx.request)
};

export default competitorDiscoveryModule;
