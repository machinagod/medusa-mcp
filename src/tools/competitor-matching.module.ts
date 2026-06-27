import { defineCompetitorMatchingTools } from "../services/competitor-matching";
import type { ToolModule } from "./types";

/**
 * Auto-discovered tool module for the competitor match-review queue. The registry
 * picks this up via the `*.module.ts` convention; it just adapts the pure tool
 * builder to the authed backend call (ctx.request).
 */
const competitorMatchingModule: ToolModule = {
    name: "competitor-matching",
    defineTools: (ctx) => defineCompetitorMatchingTools(ctx.request)
};

export default competitorMatchingModule;
