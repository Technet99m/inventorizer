import postgres from "postgres";

const conn = postgres(process.env.DATABASE_URL!);

await conn`
  UPDATE "skus" SET "quantity" = COALESCE((
    SELECT SUM(
      CASE
        WHEN "type" = 'addition' THEN "quantity"
        WHEN "type" = 'removal' THEN -"quantity"
        ELSE 0
      END
    )
    FROM "transactions" WHERE "transactions"."sku_id" = "skus"."id"
  ), 0)
`;

console.log("Backfill complete");
await conn.end();
