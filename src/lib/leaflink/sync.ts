import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, lineItems, orderReps, orders, products, reps, syncRuns } from "@/db/schema";
import { LeafLinkClient } from "./client";
import { mapCustomer, mapOrder, mapProduct, mapRep } from "./mappers";

type Json = Record<string, unknown>;

export interface SyncSummary {
  entity: string;
  status: "success" | "error";
  recordsSynced: number;
  error?: string;
}

// Insert a placeholder row if none exists yet; never overwrites existing name/details.
// Insert or fully overwrite a row with authoritative data from LeafLink.
// Written per-table (rather than a generic helper) because each table's
// Drizzle column types differ enough that a shared generic needs unsafe casts.

async function upsertCustomerStub(leaflinkId: string, placeholderName: string) {
  const [row] = await db
    .insert(customers)
    .values({ leaflinkId, name: placeholderName })
    .onConflictDoUpdate({ target: customers.leaflinkId, set: { updatedAt: new Date() } })
    .returning({ id: customers.id });
  return row.id;
}

async function upsertCustomerRich(mapped: ReturnType<typeof mapCustomer>) {
  const [row] = await db
    .insert(customers)
    .values(mapped)
    .onConflictDoUpdate({ target: customers.leaflinkId, set: { ...mapped, updatedAt: new Date() } })
    .returning({ id: customers.id });
  return row.id;
}

async function upsertRepStub(leaflinkId: string, placeholderName: string) {
  const [row] = await db
    .insert(reps)
    .values({ leaflinkId, name: placeholderName })
    .onConflictDoUpdate({ target: reps.leaflinkId, set: { updatedAt: new Date() } })
    .returning({ id: reps.id });
  return row.id;
}

async function upsertRepRich(mapped: ReturnType<typeof mapRep>) {
  const [row] = await db
    .insert(reps)
    .values(mapped)
    .onConflictDoUpdate({ target: reps.leaflinkId, set: { ...mapped, updatedAt: new Date() } })
    .returning({ id: reps.id });
  return row.id;
}

async function upsertProductStub(leaflinkId: string, placeholderName: string) {
  const [row] = await db
    .insert(products)
    .values({ leaflinkId, name: placeholderName })
    .onConflictDoUpdate({ target: products.leaflinkId, set: { updatedAt: new Date() } })
    .returning({ id: products.id });
  return row.id;
}

async function upsertProductRich(mapped: ReturnType<typeof mapProduct>) {
  const [row] = await db
    .insert(products)
    .values(mapped)
    .onConflictDoUpdate({ target: products.leaflinkId, set: { ...mapped, updatedAt: new Date() } })
    .returning({ id: products.id });
  return row.id;
}

async function getLastCursor(entity: string): Promise<string | null> {
  const [lastRun] = await db
    .select({ cursor: syncRuns.cursor })
    .from(syncRuns)
    .where(and(eq(syncRuns.entity, entity), eq(syncRuns.status, "success")))
    .orderBy(desc(syncRuns.finishedAt))
    .limit(1);
  return lastRun?.cursor ?? null;
}

async function runTracked(entity: string, fn: (setCursor: (c: string) => void) => Promise<number>): Promise<SyncSummary> {
  const [run] = await db.insert(syncRuns).values({ entity, status: "running" }).returning({ id: syncRuns.id });
  let cursor: string | undefined;
  try {
    const recordsSynced = await fn((c) => {
      cursor = c;
    });
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), status: "success", recordsSynced, cursor: cursor ?? null })
      .where(eq(syncRuns.id, run.id));
    return { entity, status: "success", recordsSynced };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(syncRuns).set({ finishedAt: new Date(), status: "error", error: message }).where(eq(syncRuns.id, run.id));
    return { entity, status: "error", recordsSynced: 0, error: message };
  }
}

export async function syncProducts(client: LeafLinkClient): Promise<SyncSummary> {
  return runTracked("products", async () => {
    let count = 0;
    for await (const page of client.paginate<Json>("/products/")) {
      for (const raw of page) {
        await upsertProductRich(mapProduct(raw));
        count++;
      }
    }
    return count;
  });
}

export async function syncReps(client: LeafLinkClient): Promise<SyncSummary> {
  return runTracked("reps", async () => {
    let count = 0;
    try {
      for await (const page of client.paginate<Json>("/company-staff/")) {
        for (const raw of page) {
          await upsertRepRich(mapRep(raw));
          count++;
        }
      }
    } catch (err) {
      // This endpoint's exact path is unconfirmed for all accounts; reps are
      // also derived from each order's embedded sales_reps, so don't fail the
      // whole sync if this supplementary listing isn't available.
      console.warn("[sync] company-staff listing unavailable, relying on order-embedded rep data:", err);
    }
    return count;
  });
}

export async function syncOrders(client: LeafLinkClient): Promise<SyncSummary> {
  return runTracked("orders", async (setCursor) => {
    const since = await getLastCursor("orders");
    let count = 0;
    let maxModified = since ?? "";

    const params: Record<string, string> = { include_children: "line_items", ordering: "modified" };
    if (since) params.modified__gte = since;

    for await (const page of client.paginate<Json>("/orders-received/", params)) {
      for (const raw of page) {
        const mapped = mapOrder(raw);

        let customerId: number | null = null;
        if (mapped.embeddedCustomer) {
          customerId = await upsertCustomerRich(mapCustomer(mapped.embeddedCustomer));
        } else if (mapped.customerLeaflinkId) {
          customerId = await upsertCustomerStub(mapped.customerLeaflinkId, `Customer ${mapped.customerLeaflinkId}`);
        }

        const repIds: number[] = [];
        for (const embeddedRep of mapped.embeddedReps) {
          repIds.push(await upsertRepRich(mapRep(embeddedRep)));
        }
        for (const repLeaflinkId of mapped.repLeaflinkIds) {
          if (mapped.embeddedReps.some((r) => String(r.id) === repLeaflinkId)) continue;
          repIds.push(await upsertRepStub(repLeaflinkId, `Rep ${repLeaflinkId}`));
        }

        await db.transaction(async (tx) => {
          const [orderRow] = await tx
            .insert(orders)
            .values({
              leaflinkId: mapped.leaflinkId,
              orderNumber: mapped.orderNumber,
              status: mapped.status,
              orderDate: mapped.orderDate,
              modifiedAt: mapped.modifiedAt,
              customerId,
              total: mapped.total,
              raw: mapped.raw,
            })
            .onConflictDoUpdate({
              target: orders.leaflinkId,
              set: {
                orderNumber: mapped.orderNumber,
                status: mapped.status,
                orderDate: mapped.orderDate,
                modifiedAt: mapped.modifiedAt,
                customerId,
                total: mapped.total,
                raw: mapped.raw,
                updatedAt: new Date(),
              },
            })
            .returning({ id: orders.id });

          await tx.delete(lineItems).where(eq(lineItems.orderId, orderRow.id));
          await tx.delete(orderReps).where(eq(orderReps.orderId, orderRow.id));

          for (const repId of repIds) {
            await tx.insert(orderReps).values({ orderId: orderRow.id, repId }).onConflictDoNothing();
          }

          for (const li of mapped.lineItems) {
            let productId: number | null = null;
            if (li.embeddedProduct) {
              productId = await upsertProductRich(mapProduct(li.embeddedProduct));
            } else if (li.productLeaflinkId) {
              productId = await upsertProductStub(li.productLeaflinkId, `Product ${li.productLeaflinkId}`);
            }
            await tx.insert(lineItems).values({
              leaflinkId: li.leaflinkId,
              orderId: orderRow.id,
              productId,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              lineTotal: li.lineTotal,
              raw: li.raw,
            });
          }
        });

        const modifiedIso = mapped.modifiedAt.toISOString();
        if (modifiedIso > maxModified) maxModified = modifiedIso;
        count++;
      }
    }

    if (maxModified) setCursor(maxModified);
    return count;
  });
}

export async function runFullSync(): Promise<SyncSummary[]> {
  const client = new LeafLinkClient();
  const results: SyncSummary[] = [];
  results.push(await syncProducts(client));
  results.push(await syncReps(client));
  results.push(await syncOrders(client));
  return results;
}
