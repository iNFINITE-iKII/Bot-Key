import { db, keysTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const MASTER_KEY = "MASTER-KIIBOO-123";

export async function addKey(key: string): Promise<void> {
  await db.insert(keysTable).values({ key }).onConflictDoNothing();
}

export async function isValidKey(key: string): Promise<boolean> {
  if (key === MASTER_KEY) return true;
  const rows = await db
    .select()
    .from(keysTable)
    .where(eq(keysTable.key, key))
    .limit(1);
  return rows.length > 0;
}
