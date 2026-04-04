export type StudentState =
  | "not_arrived"
  | "on_campus"
  | "in_class"
  | "at_event"
  | "checked_out"
  | "unaccounted";

export function getStateLabel(state: string): string {
  const map: Record<string, string> = {
    not_arrived: "Not Arrived",
    on_campus: "On Campus",
    in_class: "In Class",
    at_event: "At Event",
    checked_out: "Checked Out",
    unaccounted: "Unaccounted",
  };
  return map[state] ?? state;
}

export function getStateColor(state: string): string {
  switch (state) {
    case "on_campus":
      return "bg-green-100 text-green-800 border-green-200";
    case "in_class":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "at_event":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "checked_out":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "unaccounted":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}

export function getStateDot(state: string): string {
  switch (state) {
    case "on_campus":
      return "bg-green-500";
    case "in_class":
      return "bg-blue-500";
    case "at_event":
      return "bg-yellow-500";
    case "checked_out":
      return "bg-gray-400";
    case "unaccounted":
      return "bg-red-500";
    default:
      return "bg-slate-300";
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
