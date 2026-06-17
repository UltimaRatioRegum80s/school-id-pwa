import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { and, eq } from "drizzle-orm";
import * as schema from "./schema";
import { refreshDemoTimeSensitiveData } from "./data/demo-time-sensitive";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { schoolsTable, usersTable, studentsTable } = schema;

async function refresh() {
  console.log("Refreshing time-sensitive demo data...");

  const [demoSchool] = await db
    .select()
    .from(schoolsTable)
    .where(eq(schoolsTable.code, "DEMO"));

  if (!demoSchool) {
    throw new Error(
      'Demo school (code "DEMO") not found. Run `pnpm --filter @workspace/db run seed` first.'
    );
  }

  const [admin] = await db
    .select()
    .from(usersTable)
    .where(
      and(eq(usersTable.schoolId, demoSchool.id), eq(usersTable.role, "admin"))
    );

  if (!admin) {
    throw new Error(`No admin user found for school ${demoSchool.name}.`);
  }

  const students = await db
    .select({ id: studentsTable.id })
    .from(studentsTable)
    .where(eq(studentsTable.schoolId, demoSchool.id));

  if (students.length === 0) {
    throw new Error(
      `No students found for ${demoSchool.name}. Run the seed script first.`
    );
  }

  const { scanEvents, activities } = await refreshDemoTimeSensitiveData(db, {
    schoolId: demoSchool.id,
    adminId: admin.id,
    students,
  });

  console.log(
    `Refreshed ${scanEvents} scan events and ${activities} activities relative to today for ${demoSchool.name}.`
  );
  console.log("Refresh completed!");

  await pool.end();
}

refresh().catch((err) => {
  console.error("Refresh failed:", err);
  process.exit(1);
});
