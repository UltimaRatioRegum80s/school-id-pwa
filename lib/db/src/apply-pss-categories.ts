import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "./schema";
import {
  SEED_BEHAVIOR_CATEGORIES,
  PLACEHOLDER_DEMERIT_NAMES,
} from "./data/behavior-categories";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const { behaviorCategoriesTable, behaviorLogsTable, schoolsTable, usersTable } = schema;

// Scope strictly to the school(s) the admin account belongs to. An optional
// TARGET_SCHOOL_CODE env var narrows further; otherwise every school that has
// an admin user is targeted. We never touch schools without an admin.
async function resolveTargetSchools() {
  const adminSchools = await db
    .selectDistinct({ id: usersTable.schoolId })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
  const adminSchoolIds = new Set(adminSchools.map((r) => r.id));

  let schools = await db.select().from(schoolsTable);
  schools = schools.filter((s) => adminSchoolIds.has(s.id));

  const targetCode = process.env.TARGET_SCHOOL_CODE;
  if (targetCode) {
    schools = schools.filter((s) => s.code === targetCode);
  }
  return schools;
}

async function apply() {
  const schools = await resolveTargetSchools();
  if (schools.length === 0) {
    console.log("No matching admin-owned school found; nothing to apply.");
    await pool.end();
    return;
  }

  for (const school of schools) {
    let inserted = 0;
    for (const cat of SEED_BEHAVIOR_CATEGORIES) {
      const existing = await db
        .select({ id: behaviorCategoriesTable.id })
        .from(behaviorCategoriesTable)
        .where(
          and(
            eq(behaviorCategoriesTable.schoolId, school.id),
            eq(behaviorCategoriesTable.name, cat.name),
            eq(behaviorCategoriesTable.type, cat.type),
          ),
        );
      if (existing.length === 0) {
        await db
          .insert(behaviorCategoriesTable)
          .values({ ...cat, schoolId: school.id });
        inserted++;
      }
    }

    const placeholders = await db
      .select({ id: behaviorCategoriesTable.id })
      .from(behaviorCategoriesTable)
      .where(
        and(
          eq(behaviorCategoriesTable.schoolId, school.id),
          eq(behaviorCategoriesTable.type, "demerit"),
          inArray(behaviorCategoriesTable.name, PLACEHOLDER_DEMERIT_NAMES),
        ),
      );
    const placeholderIds = placeholders.map((p) => p.id);
    let removed = 0;
    if (placeholderIds.length > 0) {
      const referenced = await db
        .select({ categoryId: behaviorLogsTable.categoryId })
        .from(behaviorLogsTable)
        .where(inArray(behaviorLogsTable.categoryId, placeholderIds));
      const referencedIds = new Set(
        referenced.map((r) => r.categoryId).filter((x): x is number => x != null),
      );
      const deletableIds = placeholderIds.filter((id) => !referencedIds.has(id));
      if (deletableIds.length > 0) {
        await db
          .delete(behaviorCategoriesTable)
          .where(inArray(behaviorCategoriesTable.id, deletableIds));
        removed = deletableIds.length;
      }
      if (referencedIds.size > 0) {
        console.log(
          `School ${school.id}: kept ${referencedIds.size} placeholder demerit(s) still referenced by behavior logs.`,
        );
      }
    }

    console.log(
      `School ${school.id} (${school.name}): inserted ${inserted} categories, removed ${removed} placeholder demerits.`,
    );
  }

  await pool.end();
}

apply().catch((err) => {
  console.error(err);
  process.exit(1);
});
