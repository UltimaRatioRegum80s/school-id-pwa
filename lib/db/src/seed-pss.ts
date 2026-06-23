import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { SEED_BEHAVIOR_CATEGORIES } from "./data/behavior-categories";
import { SEED_RECOGNITION_TIERS } from "./data/recognition-tiers";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { schoolsTable, usersTable, schoolSettingsTable, behaviorCategoriesTable, recognitionTiersTable } = schema;

interface StaffMember {
  firstName: string;
  lastName: string;
  role: "admin" | "staff";
  username: string;
}

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

async function seedPss() {
  console.log("Seeding Private School Swakopmund (PSS)...");

  const defaultPinHash = await bcrypt.hash("1234", 10);

  const existing = await db
    .select({ id: schoolsTable.id, name: schoolsTable.name })
    .from(schoolsTable)
    .where(eq(schoolsTable.code, "PSS"));

  if (existing.length > 0) {
    console.log(`PSS school already exists (id: ${existing[0].id}). Skipping school creation.`);
    console.log("To re-seed, manually remove the PSS school from the database first.");
    await pool.end();
    return;
  }

  const [pssSchool] = await db.insert(schoolsTable).values({
    name: "Private School Swakopmund",
    slug: "private-school-swakopmund",
    code: "PSS",
    contactEmail: null,
    plan: "free",
    isActive: true,
    colorPalette: "navy-gold",
  }).returning();

  console.log(`Created school: ${pssSchool.name} (code: ${pssSchool.code}, id: ${pssSchool.id})`);

  await db.insert(schoolSettingsTable).values({
    schoolId: pssSchool.id,
    schoolName: "Private School Swakopmund",
    startTime: "07:30",
    endTime: "14:30",
    lateThresholdMinutes: "15",
    timezone: "Africa/Windhoek",
  });

  const usernamesSeen = new Set<string>();
  const staffToInsert: StaffMember[] = [];

  for (const raw of PSS_STAFF_RAW) {
    let username = raw.username ?? generateUsername(raw.firstName, raw.lastName);

    if (raw.username === "mpss") {
      console.warn(
        "[WARNING] Staff member 'Monica PSS' has an uncertain surname. " +
        "Her username has been set to 'mpss' as a placeholder. " +
        "Update her record (username, firstName, lastName) once her surname is confirmed."
      );
    }

    let attempt = username;
    let suffix = 1;
    while (usernamesSeen.has(attempt)) {
      attempt = `${username}${suffix}`;
      suffix++;
    }
    usernamesSeen.add(attempt);

    staffToInsert.push({
      firstName: raw.firstName,
      lastName: raw.lastName,
      role: raw.role,
      username: attempt,
    });
  }

  const insertedUsers = await db.insert(usersTable).values(
    staffToInsert.map((s) => ({
      schoolId: pssSchool.id,
      username: s.username,
      pinHash: defaultPinHash,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
      status: "active" as const,
      mustChangePin: true,
    }))
  ).returning();

  console.log(`Created ${insertedUsers.length} staff members`);

  await db.insert(behaviorCategoriesTable).values(
    SEED_BEHAVIOR_CATEGORIES.map((c) => ({ ...c, schoolId: pssSchool.id }))
  );

  await db.insert(recognitionTiersTable).values(
    SEED_RECOGNITION_TIERS.map((t) => ({ ...t, schoolId: pssSchool.id }))
  );

  console.log("\nPSS staff accounts created (default PIN: 1234, must change on first login):");
  for (const u of insertedUsers) {
    const marker = u.username === "mpss" ? " *** PLACEHOLDER - UPDATE SURNAME ***" : "";
    console.log(`  ${u.role === "admin" ? "[ADMIN]" : "[staff]"} ${u.username}: ${u.firstName} ${u.lastName}${marker}`);
  }

  console.log("\nPSS seed complete!");
  await pool.end();
}

seedPss().catch((err) => {
  console.error("PSS seed failed:", err);
  process.exit(1);
});
