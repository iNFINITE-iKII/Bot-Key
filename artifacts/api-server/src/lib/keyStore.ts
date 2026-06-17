import { db, keysTable } from "@workspace/db";
import { eq, and, gt, isNotNull } from "drizzle-orm";

const MASTER_KEY = "MASTER-KIIBOO-123";

export async function addKey(key: string, expiresAt: Date | null = null, ip: string | null = null): Promise<void> {
  await db.insert(keysTable).values({ key, expiresAt, ip }).onConflictDoNothing();
}

export async function isValidKey(key: string): Promise<boolean> {
  if (key === MASTER_KEY) return true;
  const rows = await db
    .select()
    .from(keysTable)
    .where(eq(keysTable.key, key))
    .limit(1);
  if (rows.length === 0) return false;
  const row = rows[0];
  if (row.expiresAt && row.expiresAt < new Date()) return false;
  return true;
}

export async function findValidKeyByIp(ip: string): Promise<typeof keysTable.$inferSelect | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(keysTable)
    .where(
      and(
        eq(keysTable.ip, ip),
        isNotNull(keysTable.expiresAt),
        gt(keysTable.expiresAt, now)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getKeyInfo(key: string): Promise<typeof keysTable.$inferSelect | null> {
  const rows = await db
    .select()
    .from(keysTable)
    .where(eq(keysTable.key, key))
    .limit(1);
  return rows[0] ?? null;
}
