/**
 * LeafLink's v2 API doesn't expose a public machine-readable schema, so these
 * mappers read defensively: they try several plausible field names for each
 * value and always keep the full raw payload alongside the parsed fields.
 * If a mapping is wrong, fix it here and re-run `npm run sync` — no data is
 * lost since `raw` retains everything LeafLink sent.
 */

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
}

function pick(obj: Json | null, keys: string[]): unknown {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function pickString(obj: Json | null, keys: string[]): string | undefined {
  const value = pick(obj, keys);
  return typeof value === "string" ? value : value != null ? String(value) : undefined;
}

/** LeafLink represents money as either a bare number/string or {amount, currency}. */
function pickMoney(obj: Json | null, keys: string[]): number {
  const value = pick(obj, keys);
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  const nested = asRecord(value);
  const amount = pick(nested, ["amount", "value"]);
  return amount != null ? Number(amount) || 0 : 0;
}

function pickDate(obj: Json | null, keys: string[]): Date {
  const value = pickString(obj, keys);
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

export function mapCustomer(raw: Json) {
  return {
    leaflinkId: String(pick(raw, ["id"])),
    name: pickString(raw, ["name", "company_name", "business_name", "display_name"]) ?? `Customer ${pick(raw, ["id"])}`,
    email: pickString(raw, ["email", "contact_email"]) ?? null,
    city: pickString(raw, ["city"]) ?? null,
    state: pickString(raw, ["state", "state_code", "region"]) ?? null,
    raw,
  };
}

export function mapProduct(raw: Json) {
  return {
    leaflinkId: String(pick(raw, ["id"])),
    sku: pickString(raw, ["sku", "sku_code"]) ?? null,
    name: pickString(raw, ["name", "title", "product_name"]) ?? `Product ${pick(raw, ["id"])}`,
    category: pickString(raw, ["category"]) ?? null,
    subCategory: pickString(raw, ["sub_category", "subcategory"]) ?? null,
    brand: pickString(raw, ["brand", "brand_name"]) ?? null,
    raw,
  };
}

export function mapRep(raw: Json) {
  const id = pick(raw, ["id", "user", "user_id"]);
  const first = pickString(raw, ["first_name"]);
  const last = pickString(raw, ["last_name"]);
  const nameFromParts = [first, last].filter(Boolean).join(" ").trim();
  return {
    leaflinkId: String(id),
    name:
      pickString(raw, ["name", "full_name", "display_name", "username"]) ||
      (nameFromParts || null) ||
      `Rep ${id}`,
    email: pickString(raw, ["email"]) ?? null,
    raw,
  };
}

export interface MappedLineItem {
  leaflinkId: string | null;
  productLeaflinkId: string | null;
  embeddedProduct: Json | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  raw: Json;
}

export function mapLineItem(raw: Json): MappedLineItem {
  const productValue = pick(raw, ["product"]);
  const embeddedProduct = asRecord(productValue);
  const productLeaflinkId = embeddedProduct
    ? String(pick(embeddedProduct, ["id"]) ?? "")
    : productValue != null
      ? String(productValue)
      : null;

  const quantity = Number(pick(raw, ["quantity", "qty"])) || 0;
  const unitPrice = pickMoney(raw, ["ordered_unit_price", "unit_price", "sale_price", "wholesale_price"]);
  const explicitLineTotal = pickMoney(raw, ["line_total", "total", "extended_price"]);

  return {
    leaflinkId: pickString(raw, ["id"]) ?? null,
    productLeaflinkId: productLeaflinkId || null,
    embeddedProduct,
    quantity,
    unitPrice,
    lineTotal: explicitLineTotal || quantity * unitPrice,
    raw,
  };
}

export interface MappedOrder {
  leaflinkId: string;
  orderNumber: string | null;
  status: string;
  orderDate: Date;
  modifiedAt: Date;
  total: number;
  customerLeaflinkId: string | null;
  embeddedCustomer: Json | null;
  repLeaflinkIds: string[];
  embeddedReps: Json[];
  lineItems: MappedLineItem[];
  raw: Json;
}

export function mapOrder(raw: Json): MappedOrder {
  const customerValue = pick(raw, ["customer"]);
  const embeddedCustomer = asRecord(customerValue);
  const customerLeaflinkId = embeddedCustomer
    ? String(pick(embeddedCustomer, ["id"]) ?? "")
    : customerValue != null
      ? String(customerValue)
      : null;

  const salesRepsValue = pick(raw, ["sales_reps"]);
  const repsArray = Array.isArray(salesRepsValue) ? salesRepsValue : [];
  const embeddedReps = repsArray.map(asRecord).filter((r): r is Json => r !== null);
  const repLeaflinkIds = repsArray
    .map((r) => {
      const rec = asRecord(r);
      return rec ? String(pick(rec, ["id"]) ?? "") : String(r);
    })
    .filter(Boolean);

  const lineItemsValue = pick(raw, ["line_items"]);
  const lineItems = (Array.isArray(lineItemsValue) ? lineItemsValue : [])
    .map(asRecord)
    .filter((li): li is Json => li !== null)
    .map(mapLineItem);

  const lineItemTotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);
  const shipping = pickMoney(raw, ["shipping_charge", "shipping"]);
  const tax = pickMoney(raw, ["tax_amount", "tax"]);
  const discount = pickMoney(raw, ["discount"]);
  const explicitTotal = pickMoney(raw, ["total", "order_total", "grand_total"]);
  const total = explicitTotal || lineItemTotal + shipping + tax - discount;

  return {
    leaflinkId: String(pick(raw, ["id"])),
    orderNumber: pickString(raw, ["order_number", "po_number", "number"]) ?? null,
    status: pickString(raw, ["status"]) ?? "Unknown",
    orderDate: pickDate(raw, ["created", "created_at", "submitted", "order_date", "date_created"]),
    modifiedAt: pickDate(raw, ["modified", "modified_at", "updated", "updated_at"]),
    total,
    customerLeaflinkId: customerLeaflinkId || null,
    embeddedCustomer,
    repLeaflinkIds,
    embeddedReps,
    lineItems,
    raw,
  };
}
