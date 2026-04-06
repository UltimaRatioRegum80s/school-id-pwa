import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schoolsTable = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  code: text("code").notNull().unique(),
  address: text("address"),
  contactEmail: text("contact_email"),
  plan: text("plan").notNull().default("free"),
  isActive: boolean("is_active").notNull().default(true),
  logoUrl: text("logo_url"),
  colorPalette: text("color_palette").notNull().default("navy-gold"),
  customPrimaryColor: text("custom_primary_color"),
  customAccentColor: text("custom_accent_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSchoolSchema = createInsertSchema(schoolsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schoolsTable.$inferSelect;
