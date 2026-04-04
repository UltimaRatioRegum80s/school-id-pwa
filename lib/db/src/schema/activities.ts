import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  activityType: text("activity_type").notNull(),
  description: text("description"),
  responsibleStaffId: integer("responsible_staff_id").references(() => usersTable.id),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  status: text("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const activityMembersTable = pgTable("activity_members", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activitiesTable.id),
  studentId: integer("student_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityAttendanceTable = pgTable("activity_attendance", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activitiesTable.id),
  studentId: integer("student_id").notNull(),
  status: text("status").notNull().default("present"),
  markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
  markedById: integer("marked_by_id").references(() => usersTable.id),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivityMemberSchema = createInsertSchema(activityMembersTable).omit({ id: true, createdAt: true });
export const insertActivityAttendanceSchema = createInsertSchema(activityAttendanceTable).omit({ id: true, markedAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
export type ActivityMember = typeof activityMembersTable.$inferSelect;
export type ActivityAttendance = typeof activityAttendanceTable.$inferSelect;
