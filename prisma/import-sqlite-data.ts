import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

type Row = Record<string, unknown>;

function sqliteDate(value: unknown, table: string, field: string) {
  // Prisma's SQLite connector stores DateTime values as Unix epoch milliseconds.
  const raw = typeof value === "string" ? value.trim() : value;
  const numeric = typeof raw === "number" || (typeof raw === "string" && /^\d+$/.test(raw)) ? Number(raw) : NaN;
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
    : new Date(String(raw));
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid SQLite date in ${table}.${field}.`);
  return date;
}

const prisma = new PrismaClient();
const sqlitePath = resolve(process.cwd(), "prisma/dev.db");
const models = [
  { table: "Category", model: prisma.category, dates: ["createdAt", "updatedAt"], booleans: ["isActive"] },
  { table: "Brand", model: prisma.brand, dates: ["createdAt", "updatedAt"], booleans: [] },
  { table: "Product", model: prisma.product, dates: ["createdAt", "updatedAt"], booleans: ["isFeatured", "isPublished"] },
  { table: "ProductImage", model: prisma.productImage, dates: ["createdAt"], booleans: [] },
  { table: "Order", model: prisma.order, dates: ["createdAt", "updatedAt"], booleans: [] },
  { table: "OrderItem", model: prisma.orderItem, dates: [], booleans: [] },
  { table: "InventoryMovement", model: prisma.inventoryMovement, dates: ["createdAt"], booleans: [] },
  { table: "User", model: prisma.user, dates: ["createdAt", "updatedAt"], booleans: [] },
  { table: "PasswordResetToken", model: prisma.passwordResetToken, dates: ["expiresAt", "usedAt", "createdAt"], booleans: [] },
] as const;

async function main() {
  if (!existsSync(sqlitePath)) throw new Error("The SQLite source database prisma/dev.db was not found.");
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
  try {
    const tables = models.map(({ table }) => ({ table, rows: sqlite.prepare(`SELECT * FROM "${table}"`).all() as Row[] }));
    const existingCounts = await Promise.all([
      prisma.category.count(), prisma.brand.count(), prisma.product.count(), prisma.productImage.count(),
      prisma.order.count(), prisma.orderItem.count(), prisma.inventoryMovement.count(), prisma.user.count(),
      prisma.passwordResetToken.count(),
    ]);
    if (existingCounts.some(count => count > 0)) {
      throw new Error("The Neon database already contains application data. Import stopped to prevent overwriting it.");
    }

    await prisma.$transaction(async tx => {
      for (const { table, rows } of tables) {
        if (!rows.length) continue;
        const config = models.find(model => model.table === table)!;
        const prepared = rows.map(row => {
          const converted = { ...row } as Row;
          for (const field of config.dates) {
            if (converted[field] !== null && converted[field] !== undefined) converted[field] = sqliteDate(converted[field], table, field);
          }
          for (const field of config.booleans) converted[field] = Boolean(converted[field]);
          return converted;
        });
        // Models are processed in foreign-key dependency order, preserving all original IDs.
        const delegate = (tx as unknown as Record<string, unknown>)[table[0].toLowerCase() + table.slice(1)] as { createMany(args: { data: Row[] }): Promise<{ count: number }> };
        await delegate.createMany({ data: prepared });
      }
    });

    const importedCounts = tables.map(({ table, rows }) => `${table}=${rows.length}`).join(", ");
    console.log(`SQLite data imported successfully: ${importedCounts}`);
  } finally {
    sqlite.close();
  }
}

main()
  .catch(error => {
    console.error("SQLite data import failed:", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
