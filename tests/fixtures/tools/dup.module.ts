import type { ToolModule } from "../../../src/tools/types";
// same name as alpha → should be skipped as a duplicate
const m: ToolModule = { name: "alpha", defineTools: () => [] };
export default m;
