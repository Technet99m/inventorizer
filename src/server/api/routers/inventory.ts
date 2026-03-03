import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";
import { skuTable, transactionsTable } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

function quantityDelta(type: string, quantity: number): number {
    if (type === "addition") return quantity;
    if (type === "removal") return -quantity;
    return 0; // pending
}

export const inventoryRouter = createTRPCRouter({
    getAllSKUs: publicProcedure.query(async ({ ctx }) => {
        const skus = await ctx.db.query.skuTable.findMany();
        const pendingTransactions = await ctx.db.query.transactionsTable.findMany({
            where: (t, { eq }) => eq(t.type, "pending"),
        });

        const pendingMap = new Map<number, number>();
        for (const tx of pendingTransactions) {
            pendingMap.set(tx.skuId, (pendingMap.get(tx.skuId) ?? 0) + tx.quantity);
        }

        return skus.map((sku) => ({
            ...sku,
            pending: pendingMap.get(sku.id) ?? 0,
        }));
    }),
    getAllTransactions: publicProcedure.query(async ({ ctx }) => {
        return await ctx.db.query.transactionsTable.findMany({
          orderBy: (transactionsTable, { desc }) => [
            desc(transactionsTable.timestamp),
          ],
        });
    }),
    addSKU: publicProcedure
        .input(z.object({
            sku: z.string(),
            name: z.string(),
            thumbnailUrl: z.string().optional(),
            minThreshold: z.number().int().default(0),
        }))
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.db.insert(skuTable).values(input).returning();
            return result[0];
        }),
    addTransaction: publicProcedure
        .input(z.object({
            skuId: z.number().int(),
            quantity: z.number().int(),
            type: z.enum(["addition", "removal", "pending"]),
        }))
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.db.insert(transactionsTable).values({
                skuId: input.skuId,
                quantity: input.quantity,
                timestamp: new Date(),
                type: input.type,
            }).returning();

            const delta = quantityDelta(input.type, input.quantity);
            if (delta !== 0) {
                await ctx.db.update(skuTable)
                    .set({ quantity: sql`${skuTable.quantity} + ${delta}` })
                    .where(eq(skuTable.id, input.skuId));
            }

            return result[0];
        }),
    patchSKU: publicProcedure
        .input(z.object({
            id: z.number().int(),
            sku: z.string().optional(),
            name: z.string().optional(),
            thumbnailUrl: z.string().optional(),
            minThreshold: z.number().int().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input;
            const result = await ctx.db.update(skuTable).set(updateData).where(eq(skuTable.id, id)).returning();
            return result[0];
        }),
    patchTransaction: publicProcedure
        .input(z.object({
            id: z.number().int(),
            skuId: z.number().int().optional(),
            quantity: z.number().int().optional(),
            type: z.enum(["addition", "removal", "pending"]).optional(),
            timestamp: z.date().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...updateData } = input;

            // Fetch old transaction to compute quantity adjustment
            const old = await ctx.db.query.transactionsTable.findFirst({
                where: (t, { eq }) => eq(t.id, id),
            });
            if (!old) throw new Error("Transaction not found");

            const result = await ctx.db.update(transactionsTable)
                .set(updateData)
                .where(eq(transactionsTable.id, id))
                .returning();

            const newType = input.type ?? old.type;
            const newQty = input.quantity ?? old.quantity;
            const newSkuId = input.skuId ?? old.skuId;

            const oldDelta = quantityDelta(old.type, old.quantity);
            const newDelta = quantityDelta(newType, newQty);

            // If skuId changed, reverse old SKU and apply to new SKU
            if (input.skuId !== undefined && input.skuId !== old.skuId) {
                if (oldDelta !== 0) {
                    await ctx.db.update(skuTable)
                        .set({ quantity: sql`${skuTable.quantity} - ${oldDelta}` })
                        .where(eq(skuTable.id, old.skuId));
                }
                if (newDelta !== 0) {
                    await ctx.db.update(skuTable)
                        .set({ quantity: sql`${skuTable.quantity} + ${newDelta}` })
                        .where(eq(skuTable.id, newSkuId));
                }
            } else {
                // Same SKU — apply net change
                const netChange = newDelta - oldDelta;
                if (netChange !== 0) {
                    await ctx.db.update(skuTable)
                        .set({ quantity: sql`${skuTable.quantity} + ${netChange}` })
                        .where(eq(skuTable.id, old.skuId));
                }
            }

            return result[0];
        }),
    deleteSKU: publicProcedure
        .input(z.object({
            id: z.number().int(),
        }))
        .mutation(async ({ ctx, input }) => {
            const result = await ctx.db.delete(skuTable).where(eq(skuTable.id, input.id)).returning();
            return result[0];
        }),
    deleteTransaction: publicProcedure
        .input(z.object({
            id: z.number().int(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Fetch old transaction to reverse its quantity effect
            const old = await ctx.db.query.transactionsTable.findFirst({
                where: (t, { eq }) => eq(t.id, input.id),
            });

            const result = await ctx.db.delete(transactionsTable)
                .where(eq(transactionsTable.id, input.id))
                .returning();

            if (old) {
                const delta = quantityDelta(old.type, old.quantity);
                if (delta !== 0) {
                    await ctx.db.update(skuTable)
                        .set({ quantity: sql`${skuTable.quantity} - ${delta}` })
                        .where(eq(skuTable.id, old.skuId));
                }
            }

            return result[0];
        }),
});
