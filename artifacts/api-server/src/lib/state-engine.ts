import type { ScanEvent } from "@workspace/db";

export type StudentState =
  | "not_arrived"
  | "on_campus"
  | "in_class"
  | "at_event"
  | "checked_out"
  | "unaccounted";

export function computeStudentState(events: ScanEvent[]): {
  state: StudentState;
  lastSeenAt: Date | null;
  lastSeenLocation: string | null;
} {
  if (!events || events.length === 0) {
    return { state: "not_arrived", lastSeenAt: null, lastSeenLocation: null };
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const last = sorted[sorted.length - 1];
  const lastSeenAt = new Date(last.createdAt);
  const lastSeenLocation = last.location ?? null;

  let state: StudentState;

  switch (last.scanType) {
    case "gate_in":
      state = "on_campus";
      break;
    case "gate_out":
    case "checkout":
      state = "checked_out";
      break;
    case "class":
      state = "in_class";
      break;
    case "event":
    case "assembly":
    case "activity":
    case "detention":
    case "club":
      state = "at_event";
      break;
    default:
      // Unknown scan type after gate-in: student is on campus but location unclear
      state = "unaccounted";
  }

  return { state, lastSeenAt, lastSeenLocation };
}

export function generateWarnings(
  student: { firstName: string; lastName: string },
  todayEvents: ScanEvent[],
  scanType: string
): string[] {
  const warnings: string[] = [];
  const hasGateIn = todayEvents.some((e) => e.scanType === "gate_in");
  const hasCheckout = todayEvents.some(
    (e) => e.scanType === "gate_out" || e.scanType === "checkout"
  );

  if (!hasGateIn && scanType !== "gate_in") {
    warnings.push(
      `${student.firstName} ${student.lastName} has not checked in today`
    );
  }

  if (hasCheckout && scanType !== "gate_in") {
    warnings.push(
      `${student.firstName} ${student.lastName} has already checked out`
    );
  }

  return warnings;
}

export function formatScanType(scanType: string): string {
  const map: Record<string, string> = {
    gate_in: "checked in",
    gate_out: "checked out",
    checkout: "checked out",
    class: "marked present in class",
    event: "recorded at event",
    assembly: "recorded at assembly",
    activity: "registered for activity",
    detention: "registered for detention",
    club: "registered for club",
  };
  return map[scanType] ?? scanType;
}

export function isLateArrival(
  events: ScanEvent[],
  schoolStartTime: string
): boolean {
  const gateIns = events.filter((e) => e.scanType === "gate_in");
  if (gateIns.length === 0) return false;
  const earliestGateIn = gateIns.reduce((earliest, e) =>
    new Date(e.createdAt) < new Date(earliest.createdAt) ? e : earliest
  );

  const today = new Date();
  const [hours, minutes] = schoolStartTime.split(":").map(Number);
  const startTime = new Date(today);
  startTime.setHours(hours, minutes + 15, 0, 0);

  return new Date(earliestGateIn.createdAt) > startTime;
}
