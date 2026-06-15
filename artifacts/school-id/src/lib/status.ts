export type StudentState = "present" | "absent";

export function getStateLabel(state: string): string {
  const map: Record<string, string> = {
    present: "Present",
    absent: "Absent",
  };
  return map[state] ?? state;
}

export function getStateColor(state: string): string {
  switch (state) {
    case "present":
      return "bg-green-100 text-green-800 border-green-200";
    case "absent":
    default:
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

export function getStateDot(state: string): string {
  switch (state) {
    case "present":
      return "bg-green-500";
    case "absent":
    default:
      return "bg-slate-400";
  }
}

export function getScanTypeLabel(scanType: string): string {
  const map: Record<string, string> = {
    gate_in: "Gate In",
    gate_out: "Gate Out",
    checkout: "Check Out",
    class: "Class",
    event: "Event",
    assembly: "Assembly",
    activity: "Activity",
    detention: "Detention",
    club: "Club",
  };
  return map[scanType] ?? scanType;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}
