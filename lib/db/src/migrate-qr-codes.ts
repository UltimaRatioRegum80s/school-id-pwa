import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { studentsTable, studentQrCodesTable } = schema;

async function backfillQrCodes() {
  console.log("Backfilling student_qr_codes from students.qr_code...");

  const students = await db
    .select({ id: studentsTable.id, qrCode: studentsTable.qrCode })
    .from(studentsTable);

  console.log(`Found ${students.length} students`);

  let backfilled = 0;
  let skipped = 0;

  for (const s of students) {
    const existing = await db
      .select({ id: studentQrCodesTable.id })
      .from(studentQrCodesTable)
      .where(eq(studentQrCodesTable.studentId, s.id));

    if (existing.length === 0) {
      await db.insert(studentQrCodesTable).values({
        studentId: s.id,
        code: s.qrCode,
        isActive: 1,
      });
      backfilled++;
    } else {
      skipped++;
    }
  }

  console.log(`Backfilled: ${backfilled}, Skipped (already had records): ${skipped}`);

  const totalActive = await db
    .select({ id: studentQrCodesTable.id })
    .from(studentQrCodesTable)
    .where(eq(studentQrCodesTable.isActive, 1));

  console.log(`Verification: ${totalActive.length} active QR code records (should equal ${students.length})`);
  console.log("Migration complete!");

  await pool.end();
}

backfillQrCodes().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
