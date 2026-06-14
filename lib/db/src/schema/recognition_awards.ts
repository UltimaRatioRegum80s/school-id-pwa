import { pgTable, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { schoolsTable } from "./schools";
import { studentsTable } from "./students";
import { usersTable } from "./users";
import { recognitionTiersTable } from "./recognition_tiers";

export const recognitionAwardsTable = pgTable(
  "recognition_awards",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
    studentId: integer("student_id").notNull().references(() => studentsTable.id),
    tierId: integer("tier_id").notNull().references(() => recognitionTiersTable.id),
    awardedById: integer("awarded_by_id").references(() => usersTable.id),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("recognition_awards_student_tier_unique").on(t.studentId, t.tierId)],
);

export const insertRecognitionAwardSchema = createInsertSchema(recognitionAwardsTable).omit({ id: true, awardedAt: true });
export type InsertRecognitionAward = z.infer<typeof insertRecognitionAwardSchema>;
export type RecognitionAward = typeof recognitionAwardsTable.$inferSelect;
