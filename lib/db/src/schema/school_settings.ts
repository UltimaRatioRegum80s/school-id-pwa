import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolSettingsTable = pgTable("school_settings", {
  id: serial("id").primaryKey(),
  schoolName: text("school_name").notNull().default("Springfield Academy"),
  startTime: text("start_time").notNull().default("07:30"),
  endTime: text("end_time").notNull().default("14:30"),
  lateThresholdMinutes: text("late_threshold_minutes").notNull().default("15"),
  timezone: text("timezone").notNull().default("Africa/Johannesburg"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSchoolSettingsSchema = createInsertSchema(schoolSettingsTable).omit({ id: true, updatedAt: true });
export type InsertSchoolSettings = z.infer<typeof insertSchoolSettingsSchema>;
export type SchoolSettings = typeof schoolSettingsTable.$inferSelect;
