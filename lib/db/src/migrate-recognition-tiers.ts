import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { and, eq } from "drizzle-orm";
import { SEED_RECOGNITION_TIERS } from "./data/recognition-tiers";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { schoolsTable, recognitionTiersTable } = schema;

async function migrateRecognitionTiers() {
  console.log("Adding default recognition tiers for all schools...");

  const schools = await db.select({ id: schoolsTable.id }).from(schoolsTable);
  console.log(`Found ${schools.length} schools`);

  let inserted = 0;
  let skipped = 0;

  for (const school of schools) {
    for (const tier of SEED_RECOGNITION_TIERS) {
      const existing = await db
        .select({ id: recognitionTiersTable.id })
        .from(recognitionTiersTable)
        .where(
          and(
            eq(recognitionTiersTable.schoolId, school.id),
            eq(recognitionTiersTable.name, tier.name)
          )
        );

      if (existing.length === 0) {
        await db.insert(recognitionTiersTable).values({
          schoolId: school.id,
          name: tier.name,
          thresholdPoints: tier.thresholdPoints,
          description: tier.description,
          sortOrder: tier.sortOrder,
        });
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`Done. Inserted ${inserted}, skipped ${skipped}.`);
  await pool.end();
}

migrateRecognitionTiers().catch((err) => {
  console.error(err);
  process.exit(1);
});
