import pg from "pg";

const { Pool } = pg;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

const devUrl = requireEnv("DATABASE_URL");
const prodUrl = requireEnv("PRODUCTION_DATABASE_URL");

interface StudentRow {
  student_id: string;
  first_name: string;
  last_name: string;
  grade: string;
  class_name: string;
  photo_url: string | null;
  qr_code: string;
  is_active: number;
  active_qr_code: string | null;
}

async function migrate() {
  const devPool = new Pool({ connectionString: devUrl });
  const prodPool = new Pool({
    connectionString: prodUrl,
    ssl: prodUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to dev and production databases...");

    const devCheck = await devPool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM students"
    );
    console.log(`Dev database has ${devCheck.rows[0].count} students.`);

    const prodCheck = await prodPool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM students"
    );
    console.log(`Production database has ${prodCheck.rows[0].count} students before migration.`);

    const { rows: devStudents } = await devPool.query<StudentRow>(`
      SELECT
        s.student_id, s.first_name, s.last_name, s.grade, s.class_name,
        s.photo_url, s.qr_code, s.is_active,
        q.code AS active_qr_code
      FROM students s
      LEFT JOIN student_qr_codes q ON q.student_id = s.id AND q.is_active = 1
      ORDER BY s.grade, s.class_name, s.id
    `);

    console.log(`\nRead ${devStudents.length} students from dev database.`);

    const { rows: prodSchools } = await prodPool.query<{ id: number }>(
      "SELECT id FROM schools LIMIT 1"
    );
    if (prodSchools.length === 0) throw new Error("No school found in production database");
    const prodSchoolId = prodSchools[0].id;
    console.log(`Production school ID: ${prodSchoolId}`);

    // All writes run inside a single transaction — if anything fails, the entire
    // migration rolls back so production is never left in a partial state.
    const prodClient = await prodPool.connect();
    try {
      await prodClient.query("BEGIN");

      // Clear dependent rows first (scan_events and behavior_logs have no ON DELETE CASCADE;
      // student_qr_codes does cascade automatically when the student row is deleted).
      const { rowCount: scanDeleted } = await prodClient.query(
        "DELETE FROM scan_events WHERE student_id IN (SELECT id FROM students WHERE grade = $1)",
        ["Grade 8"]
      );
      console.log(`Deleted ${scanDeleted ?? 0} scan events for placeholder students.`);

      const { rowCount: behaviorDeleted } = await prodClient.query(
        "DELETE FROM behavior_logs WHERE student_id IN (SELECT id FROM students WHERE grade = $1)",
        ["Grade 8"]
      );
      console.log(`Deleted ${behaviorDeleted ?? 0} behavior logs for placeholder students.`);

      const { rowCount: deleted } = await prodClient.query(
        "DELETE FROM students WHERE grade = $1",
        ["Grade 8"]
      );
      console.log(`Deleted ${deleted ?? 0} placeholder 'Grade 8' students from production.`);

      let insertedStudents = 0;
      let skippedStudents = 0;

      interface IdMap {
        student_id: string;
        id: number;
      }
      const idMap: IdMap[] = [];

      for (const s of devStudents) {
        const result = await prodClient.query<{ id: number }>(
          `INSERT INTO students
             (school_id, student_id, first_name, last_name, grade, class_name, photo_url, qr_code, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (student_id) DO NOTHING
           RETURNING id`,
          [
            prodSchoolId,
            s.student_id,
            s.first_name,
            s.last_name,
            s.grade,
            s.class_name,
            s.photo_url ?? null,
            s.qr_code,
            s.is_active,
          ]
        );

        if ((result.rowCount ?? 0) > 0) {
          insertedStudents++;
          idMap.push({ student_id: s.student_id, id: result.rows[0].id });
        } else {
          skippedStudents++;
          const existing = await prodClient.query<{ id: number }>(
            "SELECT id FROM students WHERE student_id = $1",
            [s.student_id]
          );
          if (existing.rows.length > 0) {
            idMap.push({ student_id: s.student_id, id: existing.rows[0].id });
          }
        }
      }

      console.log(
        `Students: inserted ${insertedStudents}, skipped ${skippedStudents} (already existed).`
      );

      let insertedQr = 0;
      let skippedQr = 0;
      let fallbackQr = 0;

      for (const s of devStudents) {
        // Prefer the active QR code from student_qr_codes; fall back to the
        // students.qr_code field so every student always gets an active QR record.
        const qrCode = s.active_qr_code ?? s.qr_code;
        if (!qrCode) {
          console.warn(`WARNING: student ${s.student_id} has no QR code — skipping QR insert`);
          continue;
        }
        if (!s.active_qr_code) {
          fallbackQr++;
          console.warn(`INFO: using qr_code fallback for student ${s.student_id}`);
        }

        const row = idMap.find((r) => r.student_id === s.student_id);
        if (!row) continue;

        const qrResult = await prodClient.query(
          `INSERT INTO student_qr_codes (student_id, code, is_active)
           VALUES ($1, $2, 1)
           ON CONFLICT (student_id) WHERE is_active = 1 DO NOTHING`,
          [row.id, qrCode]
        );

        if ((qrResult.rowCount ?? 0) > 0) {
          insertedQr++;
        } else {
          skippedQr++;
        }
      }

      if (fallbackQr > 0) {
        console.log(`QR codes: ${fallbackQr} used qr_code field as fallback (no active student_qr_codes row).`);
      }
      console.log(
        `QR codes: inserted ${insertedQr}, skipped ${skippedQr} (already existed).`
      );

      // Integrity check: every migrated student must have an active QR code.
      const { rows: missingQr } = await prodClient.query<{ student_id: string }>(
        `SELECT s.student_id FROM students s
         WHERE NOT EXISTS (
           SELECT 1 FROM student_qr_codes q WHERE q.student_id = s.id AND q.is_active = 1
         )`
      );
      if (missingQr.length > 0) {
        throw new Error(
          `Integrity check failed: ${missingQr.length} students are missing active QR codes after migration: ` +
          missingQr.map((r) => r.student_id).join(", ")
        );
      }

      await prodClient.query("COMMIT");
      console.log("Transaction committed successfully.");
    } catch (err) {
      await prodClient.query("ROLLBACK");
      console.error("Transaction rolled back due to error.");
      throw err;
    } finally {
      prodClient.release();
    }

    const { rows: [{ count: finalCount }] } = await prodPool.query<{ count: string }>(
      "SELECT COUNT(*) as count FROM students"
    );
    console.log(`\n✓ Production database now has ${finalCount} students.`);

    const { rows: byGrade } = await prodPool.query<{
      grade: string;
      class_name: string;
      count: string;
    }>(
      "SELECT grade, class_name, COUNT(*) as count FROM students GROUP BY grade, class_name ORDER BY grade, class_name"
    );

    console.log("Breakdown by grade/class:");
    for (const row of byGrade) {
      console.log(`  Grade ${row.grade} / ${row.class_name}: ${row.count} students`);
    }

    const { rows: [{ qrCount }] } = await prodPool.query<{ qrCount: string }>(
      "SELECT COUNT(*) as \"qrCount\" FROM student_qr_codes WHERE is_active = 1"
    );
    console.log(`\nActive QR codes in production: ${qrCount}`);

    console.log("\nMigration complete.");
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
