import type { ToolModule } from "../../../src/tools/types";
const m: ToolModule = {
    name: "alpha",
    defineTools: () => [
        { name: "alpha_tool", description: "d", inputSchema: {}, handler: async () => ({ content: [] }) }
    ]
};
export default m;
