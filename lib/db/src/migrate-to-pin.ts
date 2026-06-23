import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { usersTable } = schema;

async function migrateToPins() {
  console.log("Migrating users to PIN-based auth...");

  const defaultPinHash = await bcrypt.hash("1234", 10);

  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      pinHash: usersTable.pinHash,
      mustChangePassword: usersTable.mustChangePassword,
    })
    .from(usersTable);

  console.log(`Found ${users.length} users`);

  let backfilled = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.pinHash) {
      skipped++;
      continue;
    }

    await db
      .update(usersTable)
      .set({
        pinHash: defaultPinHash,
        mustChangePin: user.mustChangePassword ?? false,
      })
      .where(eq(usersTable.id, user.id));

    backfilled++;
    console.log(`  ✓ ${user.username} — PIN set (mustChangePin=${user.mustChangePassword ?? false})`);
  }

  console.log(`\nBackfilled: ${backfilled} users, Already had PIN: ${skipped} users`);
  console.log("Migration complete! All users now have a PIN (default: 1234).");

  await pool.end();
}

migrateToPins().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
