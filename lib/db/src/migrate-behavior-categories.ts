import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { and, eq } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { schoolsTable, behaviorCategoriesTable } = schema;

const STANDARD_MERIT_CATEGORIES: { name: string; points: number; description: string }[] = [
  { name: "Exceptional Effort", points: 4, description: "Diligence and effort beyond expectations" },
  { name: "Leadership", points: 4, description: "Demonstrating leadership and initiative" },
  { name: "Reliability & Responsibility", points: 3, description: "Dependable and accountable in duties" },
  { name: "Problem Solving", points: 3, description: "Working out difficult problems independently" },
  { name: "Class Participation", points: 2, description: "Active and constructive participation in class" },
  { name: "Helpfulness & Kindness", points: 3, description: "Supporting peers and showing kindness" },
  { name: "Teamwork & Collaboration", points: 3, description: "Working effectively with others" },
  { name: "Respect & Good Manners", points: 2, description: "Courteous and respectful conduct" },
  { name: "Most Improved", points: 3, description: "Significant improvement in work or conduct" },
  { name: "Perseverance & Resilience", points: 3, description: "Overcoming challenges with determination" },
  { name: "Creativity & Innovation", points: 4, description: "Original thinking and creative work" },
  { name: "Sportsmanship", points: 3, description: "Fair play and positive attitude in sport" },
  { name: "Community Service", points: 4, description: "Contributing to the school or wider community" },
  { name: "Honesty & Integrity", points: 4, description: "Acting truthfully and doing the right thing" },
];

async function migrateBehaviorCategories() {
  console.log("Adding standard merit behavior categories for all schools...");

  const schools = await db.select({ id: schoolsTable.id }).from(schoolsTable);
  console.log(`Found ${schools.length} schools`);

  let inserted = 0;
  let skipped = 0;

  for (const school of schools) {
    for (const cat of STANDARD_MERIT_CATEGORIES) {
      const existing = await db
        .select({ id: behaviorCategoriesTable.id })
        .from(behaviorCategoriesTable)
        .where(
          and(
            eq(behaviorCategoriesTable.schoolId, school.id),
            eq(behaviorCategoriesTable.name, cat.name)
          )
        );

      if (existing.length === 0) {
        await db.insert(behaviorCategoriesTable).values({
          schoolId: school.id,
          name: cat.name,
          type: "merit",
          points: cat.points,
          description: cat.description,
        });
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
  console.log("Migration complete!");

  await pool.end();
}

migrateBehaviorCategories().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
