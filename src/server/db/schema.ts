// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, type InferSelectModel } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const skuTable = pgTable(
  "skus",
  {
    id: serial("id").primaryKey(),
    sku: varchar("sku", { length: 64 }).notNull().unique(),
    thumbnailUrl: varchar("thumbnail_url", { length: 2048 }),
    name: varchar("name", { length: 256 }).notNull(),
    minThreshold: integer("min_threshold").notNull().default(0),
    quantity: integer("quantity").notNull().default(0),
  },
  (table) => [index("skus_sku_idx").on(table.sku)],
);
export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  skuId: integer("sku_id").notNull(),
  quantity: integer("quantity").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
});

export const transactionRelations = relations(transactionsTable, ({ one }) => ({
  sku: one(skuTable, {
    fields: [transactionsTable.skuId],
    references: [skuTable.id],
  }),
}));

export const skuRelations = relations(skuTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export type SKU = InferSelectModel<typeof skuTable>;
export type Transaction = InferSelectModel<typeof transactionsTable>;

