import { db, usersTable, blacklistTable, keysTable } from "@workspace/db";
import { eq, or, ilike, and } from "drizzle-orm";

export async function upsertUser(data: {
  discordId: string;
  username: string;
  avatar: string | null;
}): Promise<typeof usersTable.$inferSelect> {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.discordId, data.discordId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(usersTable)
      .set({ username: data.username, avatar: data.avatar })
      .where(eq(usersTable.discordId, data.discordId));
    return { ...existing[0], username: data.username, avatar: data.avatar };
  }

  await db.insert(usersTable).values({
    discordId: data.discordId,
    username: data.username,
    avatar: data.avatar,
    role: "member",
  });
  const created = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.discordId, data.discordId))
    .limit(1);
  return created[0]!;
}

export async function getUserById(
  discordId: string
): Promise<typeof usersTable.$inferSelect | null> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.discordId, discordId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllUsers(page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  return db.select().from(usersTable).limit(limit).offset(offset);
}

export async function updateUserRole(discordId: string, role: string) {
  await db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.discordId, discordId));
}

export async function deleteUser(discordId: string) {
  await db.delete(usersTable).where(eq(usersTable.discordId, discordId));
}

export async function searchUsers(query: string) {
  return db
    .select()
    .from(usersTable)
    .where(
      or(
        ilike(usersTable.username, `%${query}%`),
        ilike(usersTable.discordId, `%${query}%`)
      )
    )
    .limit(50);
}

export async function isDiscordIdBlacklisted(discordId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(blacklistTable)
    .where(eq(blacklistTable.discordId, discordId))
    .limit(1);
  return rows.length > 0;
}

export async function isHwidBlacklisted(hwid: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(blacklistTable)
    .where(eq(blacklistTable.hwid, hwid))
    .limit(1);
  return rows.length > 0;
}

export async function addBan(data: {
  discordId?: string;
  hwid?: string;
  reason?: string;
}) {
  await db.insert(blacklistTable).values({
    discordId: data.discordId ?? null,
    hwid: data.hwid ?? null,
    reason: data.reason ?? null,
  });
}

export async function removeBan(id: number) {
  await db.delete(blacklistTable).where(eq(blacklistTable.id, id));
}

export async function getAllBans() {
  return db.select().from(blacklistTable);
}

export async function searchKeys(query: string) {
  return db
    .select()
    .from(keysTable)
    .where(
      or(
        ilike(keysTable.key, `%${query}%`),
        ilike(keysTable.discordId, `%${query}%`),
        ilike(keysTable.hwid, `%${query}%`)
      )
    )
    .limit(50);
}

export async function getAllKeys(page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  return db.select().from(keysTable).limit(limit).offset(offset);
}

export async function deleteKey(key: string) {
  await db.delete(keysTable).where(eq(keysTable.key, key));
}
