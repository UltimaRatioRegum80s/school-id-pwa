import { getStateLabel, getStateColor, getStateDot } from "@/lib/status";

interface StatusBadgeProps {
  state: string;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ state, showDot = true, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getStateColor(state)} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${getStateDot(state)} flex-shrink-0`} />
      )}
      {getStateLabel(state)}
    </span>
  );
}
