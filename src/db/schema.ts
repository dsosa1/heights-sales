import {
  pgTable,
  serial,
  text,
  timestamp,
  doublePrecision,
  integer,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  leaflinkId: text("leaflink_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  city: text("city"),
  state: text("state"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reps = pgTable("reps", {
  id: serial("id").primaryKey(),
  leaflinkId: text("leaflink_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  leaflinkId: text("leaflink_id").notNull().unique(),
  sku: text("sku"),
  name: text("name").notNull(),
  category: text("category"),
  subCategory: text("sub_category"),
  brand: text("brand"),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    leaflinkId: text("leaflink_id").notNull().unique(),
    orderNumber: text("order_number"),
    status: text("status").notNull(),
    orderDate: timestamp("order_date").notNull(),
    modifiedAt: timestamp("modified_at").notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    total: doublePrecision("total").notNull().default(0),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("orders_order_date_idx").on(table.orderDate),
    index("orders_status_idx").on(table.status),
  ],
);

export const orderReps = pgTable(
  "order_reps",
  {
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    repId: integer("rep_id")
      .notNull()
      .references(() => reps.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.orderId, table.repId] })],
);

export const lineItems = pgTable(
  "line_items",
  {
    id: serial("id").primaryKey(),
    leaflinkId: text("leaflink_id"),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id),
    quantity: doublePrecision("quantity").notNull().default(0),
    unitPrice: doublePrecision("unit_price").notNull().default(0),
    lineTotal: doublePrecision("line_total").notNull().default(0),
    raw: jsonb("raw"),
  },
  (table) => [index("line_items_order_id_idx").on(table.orderId)],
);

export const syncRuns = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  entity: text("entity").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  status: text("status").notNull().default("running"),
  recordsSynced: integer("records_synced").notNull().default(0),
  cursor: text("cursor"),
  error: text("error"),
});
