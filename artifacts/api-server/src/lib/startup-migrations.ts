import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, schoolsTable } from "@workspace/db";
import { logger } from "./logger";

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

const PSS_STAFF: Array<{ firstName: string; lastName: string; role: "admin" | "staff"; username?: string }> = [
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

async function backfillPins(): Promise<void> {
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, pinHash: usersTable.pinHash, mustChangePassword: usersTable.mustChangePassword })
    .from(usersTable);

  const needPin = users.filter((u) => !u.pinHash);
  if (needPin.length === 0) return;

  const defaultPinHash = await bcrypt.hash("1234", 10);
  for (const user of needPin) {
    await db
      .update(usersTable)
      .set({ pinHash: defaultPinHash, mustChangePin: user.mustChangePassword ?? false })
      .where(eq(usersTable.id, user.id));
  }
  logger.info({ count: needPin.length }, "startup-migrations: backfilled PIN for users without one");
}

async function ensurePssStaff(): Promise<void> {
  const schools = await db
    .select({ id: schoolsTable.id })
    .from(schoolsTable)
    .where(eq(schoolsTable.code, "PSS"));

  if (schools.length === 0) return;
  const schoolId = schools[0].id;

  const existing = await db
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.schoolId, schoolId));

  const existingSet = new Set(existing.map((u) => u.username.trim().toLowerCase()));
  const defaultPinHash = await bcrypt.hash("1234", 10);
  const seen = new Set<string>();
  let inserted = 0;

  for (const raw of PSS_STAFF) {
    let base = raw.username ?? generateUsername(raw.firstName, raw.lastName);
    let attempt = base;
    let suffix = 1;
    while (seen.has(attempt)) { attempt = `${base}${suffix++}`; }
    seen.add(attempt);

    if (existingSet.has(attempt.toLowerCase())) continue;

    await db.insert(usersTable).values({
      schoolId,
      username: attempt,
      pinHash: defaultPinHash,
      firstName: raw.firstName,
      lastName: raw.lastName,
      role: raw.role,
      status: "active",
      mustChangePin: true,
    });
    inserted++;
  }

  if (inserted > 0) {
    logger.info({ inserted }, "startup-migrations: seeded missing PSS staff");
  }
}

export async function runStartupMigrations(): Promise<void> {
  try {
    await backfillPins();
    await ensurePssStaff();
  } catch (err) {
    logger.error({ err }, "startup-migrations: error (non-fatal, server continues)");
  }
}
