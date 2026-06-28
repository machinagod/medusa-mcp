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

/**
 * Anthropic's API requires every tool input-schema property key to match
 * `^[a-zA-Z0-9_.-]{1,64}$`; a single bad key 400s the whole request. Medusa's
 * OAS exposes logical-filter operators named `$and` / `$or` as query params —
 * the `$` is illegal. Unlike tool names, these keys can't be hashed/clamped
 * (the handler forwards them verbatim as query params, so renaming would change
 * their meaning), so callers drop the param entirely. These operators are niche
 * advanced filters; losing them keeps the tool usable and valid.
 */
const PROPERTY_KEY_RE = /^[a-zA-Z0-9_.-]{1,64}$/;

export function isApiSafePropertyKey(name: string): boolean {
  return PROPERTY_KEY_RE.test(name);
}
