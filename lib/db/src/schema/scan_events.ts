import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { usersTable } from "./users";

export const scanEventsTable = pgTable("scan_events", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  scannedById: integer("scanned_by_id").references(() => usersTable.id),
  scanType: text("scan_type").notNull(),
  location: text("location"),
  activityId: integer("activity_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScanEventSchema = createInsertSchema(scanEventsTable).omit({ id: true, createdAt: true });
export type InsertScanEvent = z.infer<typeof insertScanEventSchema>;
export type ScanEvent = typeof scanEventsTable.$inferSelect;
