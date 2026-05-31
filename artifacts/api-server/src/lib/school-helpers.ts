import { eq } from "drizzle-orm";
import { db as defaultDb, schoolsTable } from "@workspace/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@workspace/db";

type Db = NodePgDatabase<typeof schema>;

/**
 * Syncs an updated school name from `school_settings` to the canonical
 * `schools` table. Call this whenever `school_settings.schoolName` is
 * written so both tables stay consistent.
 *
 * @param schoolId - The school's primary key
 * @param name     - The new school name
 * @param tx       - Optional transaction/db instance (defaults to the global db)
 */
export async function updateSchoolName(
  schoolId: number,
  name: string,
  tx: Db = defaultDb as unknown as Db
): Promise<void> {
  await tx
    .update(schoolsTable)
    .set({ name })
    .where(eq(schoolsTable.id, schoolId));
}
