import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { McpTool, ToolContext, ToolModule } from "./types";

/** Files in this directory matching this are treated as discoverable modules. */
const MODULE_RE = /\.module\.(js|ts)$/;

/**
 * Discover and load every tool module in `src/tools/*.module.ts`, returning
 * their combined tools. A module default-exports (or names `toolModule`) a
 * `ToolModule`. Discovery is convention-based: add a file, it's included — no
 * registration list to maintain. A module that fails to load is logged and
 * skipped so one bad file can't take the server down (mirrors index.ts).
 *
 * Uses `__dirname` (the package is CommonJS) so it resolves the same under the
 * compiled build, ts-node, and vitest.
 */
export async function loadToolModules(ctx: ToolContext): Promise<McpTool[]> {
    let entries: string[] = [];
    try {
        entries = await readdir(__dirname);
    } catch (err) {
        console.error("[tools] could not scan tool modules dir:", err);
        return [];
    }

    const files = entries
        .filter((f) => MODULE_RE.test(f) && !f.endsWith(".d.ts"))
        .sort(); // deterministic load order

    const tools: McpTool[] = [];
    const seen = new Set<string>();
    for (const file of files) {
        try {
            const ns: Record<string, unknown> = await import(
                pathToFileURL(join(__dirname, file)).href
            );
            // Robust to ESM/CJS interop (single or double `default`): pick the
            // export that actually looks like a ToolModule.
            const def = [
                ns.default,
                (ns.default as Record<string, unknown> | undefined)?.default,
                ns.toolModule
            ].find(
                (c): c is ToolModule =>
                    !!c && typeof (c as ToolModule).defineTools === "function"
            );
            if (!def) {
                console.error(`[tools] ${file} exports no ToolModule — skipped`);
                continue;
            }
            if (seen.has(def.name)) {
                console.error(`[tools] duplicate module "${def.name}" (${file}) — skipped`);
                continue;
            }
            seen.add(def.name);
            const built = def.defineTools(ctx);
            tools.push(...built);
            console.error(`[tools] loaded module "${def.name}" (${built.length} tools)`);
        } catch (err) {
            console.error(`[tools] failed to load ${file}:`, err);
        }
    }
    return tools;
}
