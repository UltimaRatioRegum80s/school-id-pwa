import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { studentsTable } from "./students";

export const studentQrCodesTable = pgTable("student_qr_codes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("student_qr_codes_one_active_idx")
    .on(table.studentId)
    .where(sql`${table.isActive} = 1`),
]);

export type StudentQrCode = typeof studentQrCodesTable.$inferSelect;
