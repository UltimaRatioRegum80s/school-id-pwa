import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { schoolsTable, usersTable } = schema;

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function generateUsername(firstName: string, lastName: string): string {
  const firstInitials = firstName
    .split(/\s+/)
    .map((w) => stripAccents(w[0]))
    .join("")
    .toLowerCase();
  const last = stripAccents(lastName).toLowerCase().replace(/[^a-z0-9]/g, "");
  return firstInitials + last;
}

const PSS_STAFF_RAW: Array<{ firstName: string; lastName: string; role: "admin" | "staff"; username?: string }> = [
  { firstName: "De Wet", lastName: "Moolman", role: "admin" },
  { firstName: "Ilse", lastName: "Liechti", role: "staff" },
  { firstName: "Anica", lastName: "Jooné", role: "staff" },
  { firstName: "Antoinette", lastName: "Golombowski", role: "staff" },
  { firstName: "Charlotte", lastName: "Heydenrych", role: "staff" },
  { firstName: "Francois Jacques", lastName: "Malan", role: "staff" },
  { firstName: "Katharina", lastName: "Berner", role: "staff" },
  { firstName: "Yolandi", lastName: "Louw", role: "staff" },
  { firstName: "Marieke", lastName: "Mackintosh", role: "staff" },
  { firstName: "Mimi", lastName: "Linde", role: "staff" },
  { firstName: "Monica", lastName: "PSS", role: "staff", username: "mpss" },
  { firstName: "Nicole", lastName: "Rautenbach", role: "staff" },
  { firstName: "Ruth", lastName: "Steenkamp", role: "staff" },
  { firstName: "René", lastName: "Conradie", role: "staff" },
  { firstName: "Taonga", lastName: "Namate", role: "staff" },
  { firstName: "Vida", lastName: "de Vos", role: "staff" },
  { firstName: "Wikus", lastName: "van Zyl", role: "staff" },
  { firstName: "Cari", lastName: "Kotze", role: "staff" },
  { firstName: "Christian", lastName: "Ngandu", role: "staff" },
  { firstName: "Danielle", lastName: "Risser", role: "staff" },
  { firstName: "Emily", lastName: "Steyn", role: "staff" },
  { firstName: "Iris", lastName: "Grädler", role: "staff" },
  { firstName: "Ilze", lastName: "Vermaak", role: "staff" },
  { firstName: "Karin", lastName: "Küchemann", role: "staff" },
  { firstName: "Lu", lastName: "Bo", role: "staff" },
  { firstName: "Monika", lastName: "Grabowsky", role: "staff" },
  { firstName: "Meagan", lastName: "Smith", role: "staff" },
  { firstName: "Nadia", lastName: "Jansen van Rensburg", role: "staff" },
  { firstName: "Renate", lastName: "Strzelecki", role: "staff" },
  { firstName: "Shannon", lastName: "Louw", role: "staff" },
  { firstName: "Sylvia", lastName: "Berry", role: "staff" },
  { firstName: "Thomas", lastName: "Keller", role: "staff" },
  { firstName: "Ulrike", lastName: "Ulrich", role: "staff" },
];

async function seedPssStaff() {
  console.log("Seeding PSS staff (idempotent — skips existing usernames)...");

  const defaultPinHash = await bcrypt.hash("1234", 10);

  const school = await db
    .select({ id: schoolsTable.id, name: schoolsTable.name })
    .from(schoolsTable)
    .where(eq(schoolsTable.code, "PSS"));

  if (school.length === 0) {
    console.log("PSS school not found — nothing to do.");
    await pool.end();
    return;
  }

  const pssSchool = school[0];
  console.log(`Found PSS school: ${pssSchool.name} (id: ${pssSchool.id})`);

  const existingUsers = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.schoolId, pssSchool.id));

  const existingUsernames = new Set(existingUsers.map((u) => u.username.trim().toLowerCase()));
  console.log(`Existing accounts: ${existingUsernames.size}`);

  const usernamesSeen = new Set<string>();
  let inserted = 0;
  let skipped = 0;

  for (const raw of PSS_STAFF_RAW) {
    let base = raw.username ?? generateUsername(raw.firstName, raw.lastName);
    let attempt = base;
    let suffix = 1;
    while (usernamesSeen.has(attempt)) {
      attempt = `${base}${suffix}`;
      suffix++;
    }
    usernamesSeen.add(attempt);

    if (existingUsernames.has(attempt.toLowerCase())) {
      console.log(`  skip  ${attempt} (already exists)`);
      skipped++;
      continue;
    }

    await db.insert(usersTable).values({
      schoolId: pssSchool.id,
      username: attempt,
      pinHash: defaultPinHash,
      firstName: raw.firstName,
      lastName: raw.lastName,
      role: raw.role,
      status: "active",
      mustChangePin: true,
    });

    console.log(`  added ${raw.role === "admin" ? "[ADMIN]" : "[staff]"} ${attempt}: ${raw.firstName} ${raw.lastName}`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await pool.end();
}

seedPssStaff().catch((err) => {
  console.error("PSS staff seed failed:", err);
  process.exit(1);
});
