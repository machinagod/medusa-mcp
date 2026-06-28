import { createHash } from "crypto";

/**
 * Anthropic's Messages API caps tool names at 64 characters. When these MCP
 * tools are surfaced to Claude they are prefixed with `mcp__<server>__` (19
 * chars for the `medusa-store` server), so the raw tool name returned here must
 * fit within `64 - prefix`. The upstream admin OAS has ~22 operationIds whose
 * prefixed names exceed 64 (claims / exchanges / draft-order shipping-method /
 * workflow-execution endpoints, longest 87) — those make the request's `tools`
 * array invalid and break the whole session.
 *
 * Names within budget pass through unchanged; longer names are truncated and
 * given a short stable hash suffix so they stay unique and deterministic.
 *
 * Override the budget with MEDUSA_TOOL_NAME_MAX if the server is mounted under a
 * different (longer) alias.
 */
const HARNESS_PREFIX_BUDGET = 19; // len("mcp__medusa-store__")
const API_TOOL_NAME_CAP = 64;

export const MAX_RAW_NAME = (() => {
  const override = Number(process.env.MEDUSA_TOOL_NAME_MAX);
  if (Number.isFinite(override) && override > 8) return Math.floor(override);
  return API_TOOL_NAME_CAP - HARNESS_PREFIX_BUDGET; // 45
})();

const HASH_LEN = 6;

export function clampToolName(name: string, max: number = MAX_RAW_NAME): string {
  if (name.length <= max) return name;
  const hash = createHash("sha1").update(name).digest("hex").slice(0, HASH_LEN);
  const head = name.slice(0, max - HASH_LEN - 1); // room for "_" + hash
  return `${head}_${hash}`;
}
