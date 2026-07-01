import { Sun, Sunset, Moon } from "lucide-react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dim", label: "Dim", icon: Sunset },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle({
  showLabels = false,
  className = "",
}: {
  showLabels?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`inline-flex items-center gap-1 rounded-lg bg-muted p-1 ${className}`}
      data-testid="theme-toggle"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`button-theme-${value}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
