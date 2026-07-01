import "dotenv/config";
import { db } from "../src/db";
import { customers, lineItems, orderReps, orders, products, reps } from "../src/db/schema";

async function main() {
  const [rep1] = await db.insert(reps).values({ leaflinkId: "r1", name: "Jordan Reyes", email: "jordan@example.com" }).returning();
  const [rep2] = await db.insert(reps).values({ leaflinkId: "r2", name: "Casey Kim", email: "casey@example.com" }).returning();

  const [prod1] = await db
    .insert(products)
    .values({ leaflinkId: "p1", sku: "GRE-BAR-100", name: "Green Bar", category: "Edibles", brand: "Heights" })
    .returning();
  const [prod2] = await db
    .insert(products)
    .values({ leaflinkId: "p2", sku: "BLU-GUM-200", name: "Blue Gummies", category: "Edibles", brand: "Heights" })
    .returning();

  const [cust1] = await db.insert(customers).values({ leaflinkId: "c1", name: "Sunset Dispensary", city: "Portland", state: "OR" }).returning();
  const [cust2] = await db.insert(customers).values({ leaflinkId: "c2", name: "River City Cannabis", city: "Salem", state: "OR" }).returning();

  const months = [
    { year: 2025, month: 6 },
    { year: 2026, month: 5 },
    { year: 2026, month: 6 },
  ];

  let n = 0;
  for (const { year, month } of months) {
    for (let i = 0; i < 3; i++) {
      n++;
      const orderDate = new Date(Date.UTC(year, month - 1, 3 + i * 7));
      const total = 1000 + n * 137;
      const [order] = await db
        .insert(orders)
        .values({
          leaflinkId: `o${year}-${month}-${i}`,
          orderNumber: `ORD-${year}${month}${i}`,
          status: "Accepted",
          orderDate,
          modifiedAt: orderDate,
          customerId: i % 2 === 0 ? cust1.id : cust2.id,
          total,
        })
        .returning();

      await db.insert(orderReps).values({ orderId: order.id, repId: i % 2 === 0 ? rep1.id : rep2.id });

      await db.insert(lineItems).values([
        { orderId: order.id, productId: prod1.id, quantity: 10 + i, unitPrice: 20, lineTotal: (10 + i) * 20 },
        { orderId: order.id, productId: prod2.id, quantity: 5 + i, unitPrice: 30, lineTotal: (5 + i) * 30 },
      ]);
    }
  }

  console.log("Seeded sample data.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
