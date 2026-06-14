import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { SEED_BEHAVIOR_CATEGORIES } from "./data/behavior-categories";
import { SEED_RECOGNITION_TIERS } from "./data/recognition-tiers";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const {
  schoolsTable,
  usersTable,
  studentsTable,
  studentQrCodesTable,
  scanEventsTable,
  activitiesTable,
  schoolSettingsTable,
  behaviorCategoriesTable,
  recognitionTiersTable,
} = schema;

async function seed() {
  console.log("Seeding database...");

  await db.delete(schema.behaviorLogsTable);
  await db.delete(schema.activityAttendanceTable);
  await db.delete(schema.activityMembersTable);
  await db.delete(schema.scanEventsTable);
  await db.delete(schema.activitiesTable);
  await db.delete(schema.studentsTable);
  await db.delete(schema.behaviorCategoriesTable);
  await db.delete(schema.recognitionTiersTable);
  await db.delete(schema.usersTable);
  await db.delete(schema.schoolSettingsTable);
  await db.delete(schema.schoolsTable);

  const [demoSchool] = await db.insert(schoolsTable).values({
    name: "Westbrook Academy",
    slug: "westbrook-academy",
    code: "DEMO",
    contactEmail: "admin@westbrook.edu",
    plan: "free",
    isActive: true,
    colorPalette: "navy-gold",
  }).returning();

  console.log(`School created: ${demoSchool.name} (code: ${demoSchool.code})`);

  const adminHash = await bcrypt.hash("admin123", 10);
  const staffHash = await bcrypt.hash("staff123", 10);

  const [admin] = await db.insert(usersTable).values([
    {
      schoolId: demoSchool.id,
      username: "admin",
      passwordHash: adminHash,
      firstName: "Principal",
      lastName: "Adams",
      role: "admin",
    },
    {
      schoolId: demoSchool.id,
      username: "staff1",
      passwordHash: staffHash,
      firstName: "Sarah",
      lastName: "Johnson",
      role: "staff",
    },
    {
      schoolId: demoSchool.id,
      username: "staff2",
      passwordHash: staffHash,
      firstName: "Mike",
      lastName: "Williams",
      role: "staff",
    },
  ]).returning();

  console.log("Users created");

  const grades = ["8", "9", "10", "11", "12"];
  const classes: Record<string, string[]> = {
    "8": ["8A", "8B", "8C"],
    "9": ["9A", "9B", "9C"],
    "10": ["10A", "10B"],
    "11": ["11A", "11B"],
    "12": ["12A", "12B"],
  };

  const firstNames = [
    "Liam", "Emma", "Noah", "Olivia", "James", "Ava", "Elijah", "Isabella",
    "Oliver", "Sophia", "William", "Mia", "Benjamin", "Charlotte", "Lucas",
    "Amelia", "Henry", "Harper", "Alexander", "Evelyn", "Michael", "Abigail",
    "Daniel", "Emily", "Matthew", "Ella", "Jackson", "Elizabeth", "Sebastian",
    "Camila", "Ethan", "Luna", "David", "Sofia", "Joseph", "Avery",
    "Carter", "Mila", "Owen", "Aria"
  ];

  const lastNames = [
    "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller",
    "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White",
    "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson",
    "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen",
    "Young", "Hernandez", "King"
  ];

  const students = [];
  let studentCounter = 1000;
  for (const grade of grades) {
    for (const className of classes[grade]) {
      const count = 8;
      for (let i = 0; i < count; i++) {
        const firstName = firstNames[(studentCounter + i) % firstNames.length];
        const lastName = lastNames[(studentCounter * 3 + i) % lastNames.length];
        studentCounter++;
        students.push({
          schoolId: demoSchool.id,
          studentId: `STU${studentCounter}`,
          firstName,
          lastName,
          grade,
          className,
          qrCode: `SCID-STU${studentCounter}`,
          photoUrl: null as string | null,
        });
      }
    }
  }

  const insertedStudents = await db.insert(studentsTable).values(students).returning();
  console.log(`Created ${insertedStudents.length} students`);

  const qrCodeRecords = insertedStudents.map((s) => ({
    studentId: s.id,
    code: s.qrCode,
    isActive: 1 as const,
  }));
  await db.insert(studentQrCodesTable).values(qrCodeRecords);
  console.log(`Created ${qrCodeRecords.length} QR code records`);

  await db.insert(schoolSettingsTable).values({
    schoolId: demoSchool.id,
    schoolName: "Westbrook Academy",
    startTime: "07:30",
    endTime: "14:30",
    lateThresholdMinutes: "15",
    timezone: "Africa/Johannesburg",
  });

  await db.insert(behaviorCategoriesTable).values(
    SEED_BEHAVIOR_CATEGORIES.map((c) => ({ ...c, schoolId: demoSchool.id }))
  );

  await db.insert(recognitionTiersTable).values(
    SEED_RECOGNITION_TIERS.map((t) => ({ ...t, schoolId: demoSchool.id }))
  );

  const now = new Date();
  const today7am = new Date(now);
  today7am.setHours(7, 0, 0, 0);

  const halfStudents = insertedStudents.slice(0, Math.floor(insertedStudents.length * 0.75));
  const scanEvents = halfStudents.map((s, i) => {
    const minutesAfterOpen = Math.floor(Math.random() * 45);
    const scanTime = new Date(today7am.getTime() + minutesAfterOpen * 60000 + i * 1000);
    return {
      schoolId: demoSchool.id,
      studentId: s.id,
      scanType: "gate_in" as const,
      location: "Main Gate",
      activityId: null as number | null,
      notes: null as string | null,
      createdAt: scanTime,
    };
  });

  if (scanEvents.length > 0) {
    await db.insert(scanEventsTable).values(scanEvents);
  }

  const assembly = await db.insert(activitiesTable).values({
    schoolId: demoSchool.id,
    name: "Morning Assembly",
    activityType: "assembly",
    description: "Daily morning assembly for all students",
    responsibleStaffId: admin.id,
    startTime: new Date(today7am.getTime() + 30 * 60000),
    endTime: new Date(today7am.getTime() + 60 * 60000),
    status: "active",
  }).returning();

  await db.insert(activitiesTable).values({
    schoolId: demoSchool.id,
    name: "Inter-House Sports",
    activityType: "event",
    description: "Annual inter-house sports competition",
    responsibleStaffId: admin.id,
    startTime: new Date(now.getTime() + 2 * 60 * 60000),
    endTime: new Date(now.getTime() + 5 * 60 * 60000),
    status: "upcoming",
  });

  await db.insert(activitiesTable).values({
    schoolId: demoSchool.id,
    name: "Science Club",
    activityType: "club",
    description: "Weekly science club meeting",
    responsibleStaffId: admin.id,
    startTime: new Date(now.getTime() + 24 * 60 * 60000),
    endTime: new Date(now.getTime() + 25 * 60 * 60000),
    status: "upcoming",
  });

  console.log("Activities created");
  console.log("Seed completed!");
  console.log("\nDemo credentials:");
  console.log("  Admin: admin / admin123");
  console.log("  Staff: staff1 / staff123");
  console.log("  Staff: staff2 / staff123");
  console.log(`\nDemo school code: ${demoSchool.code}`);
  console.log(`Demo QR format: SCID-STU####`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
