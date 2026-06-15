import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keysTable = pgTable("keys", {
  key: text("key").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertKeySchema = createInsertSchema(keysTable).omit({ createdAt: true });
export type InsertKey = z.infer<typeof insertKeySchema>;
export type Key = typeof keysTable.$inferSelect;
