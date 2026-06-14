import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";

export const recognitionTiersTable = pgTable("recognition_tiers", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  name: text("name").notNull(),
  thresholdPoints: integer("threshold_points").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecognitionTierSchema = createInsertSchema(recognitionTiersTable).omit({ id: true, createdAt: true });
export type InsertRecognitionTier = z.infer<typeof insertRecognitionTierSchema>;
export type RecognitionTier = typeof recognitionTiersTable.$inferSelect;
