import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { usersTable } from "./users";
import { schoolsTable } from "./schools";

export const behaviorCategoriesTable = pgTable("behavior_categories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  points: integer("points").notNull().default(1),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const behaviorLogsTable = pgTable("behavior_logs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schoolsTable.id),
  studentId: integer("student_id").notNull().references(() => studentsTable.id),
  categoryId: integer("category_id").references(() => behaviorCategoriesTable.id),
  type: text("type").notNull(),
  points: integer("points").notNull().default(1),
  note: text("note"),
  loggedById: integer("logged_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBehaviorCategorySchema = createInsertSchema(behaviorCategoriesTable).omit({ id: true, createdAt: true });
export const insertBehaviorLogSchema = createInsertSchema(behaviorLogsTable).omit({ id: true, createdAt: true });
export type InsertBehaviorCategory = z.infer<typeof insertBehaviorCategorySchema>;
export type BehaviorCategory = typeof behaviorCategoriesTable.$inferSelect;
export type InsertBehaviorLog = z.infer<typeof insertBehaviorLogSchema>;
export type BehaviorLog = typeof behaviorLogsTable.$inferSelect;
