import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const blacklistTable = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id"),
  hwid: text("hwid"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Blacklist = typeof blacklistTable.$inferSelect;
