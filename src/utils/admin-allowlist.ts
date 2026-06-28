/**
 * The upstream medusa-mcp registers ALL 245 admin operations as tools, which
 * (a) floods every Claude session with tool definitions (~13k tokens of names
 * alone) and (b) drags in the long-named claim/exchange/draft-order-edit
 * endpoints. We scope the admin surface to the resource groups actually used
 * here (catalog, pricing, inventory, orders, customers, store config).
 *
 * Override with the MEDUSA_ADMIN_TOOL_GROUPS env var: a comma-separated list of
 * leading `/admin/<group>` path segments, or `*` to expose everything (the
 * original behaviour).
 */
export const DEFAULT_ADMIN_GROUPS: readonly string[] = [
  // catalog
  "products",
  "product-categories",
  "product-types",
  "product-tags",
  "product-variants",
  "collections",
  // pricing
  "price-lists",
  "price-preferences",
  // inventory / fulfilment sources
  "inventory-items",
  "reservations",
  "stock-locations",
  // orders & customers
  "orders",
  "customers",
  "customer-groups",
  // merchandising
  "promotions",
  "campaigns",
  "sales-channels",
  // store configuration
  "regions",
  "currencies",
  "tax-rates",
  "tax-regions",
  "shipping-options",
  "shipping-profiles",
  "fulfillment-providers",
  "stores",
  "uploads",
];

function adminGroups(): Set<string> | "*" {
  const raw = process.env.MEDUSA_ADMIN_TOOL_GROUPS?.trim();
  if (!raw) return new Set(DEFAULT_ADMIN_GROUPS);
  if (raw === "*") return "*";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** Whether an `/admin/...` OAS path falls within the configured tool groups. */
export function isAdminPathAllowed(path: string): boolean {
  const groups = adminGroups();
  if (groups === "*") return true;
  const m = path.match(/^\/admin\/([^/]+)/);
  return m != null && groups.has(m[1]);
}
