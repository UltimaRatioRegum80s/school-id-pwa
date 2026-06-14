import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function resolveTimezone(tz: string | null | undefined): string | undefined {
  if (!tz) return undefined;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

export function GlobalClock() {
  const { branding } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeZone = useMemo(
    () => resolveTimezone(branding?.timezone),
    [branding?.timezone]
  );

  const { day, date, time } = useMemo(() => {
    const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone });
    const dateFmt = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone,
    });
    const timeFmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    });
    return {
      day: dayFmt.format(now),
      date: dateFmt.format(now),
      time: timeFmt.format(now),
    };
  }, [now, timeZone]);

  return (
    <div
      className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border text-foreground/80 no-print"
      data-testid="global-clock-bar"
    >
      <div className="max-w-lg md:max-w-none mx-auto px-4 h-7 flex items-center justify-center md:justify-start gap-1.5 text-[11px] font-medium tracking-wide">
        <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span data-testid="text-clock-day">{day}</span>
        <span className="text-muted-foreground">·</span>
        <span data-testid="text-clock-date">{date}</span>
        <span className="text-muted-foreground">·</span>
        <span className="tabular-nums text-foreground" data-testid="text-clock-time">
          {time}
        </span>
      </div>
    </div>
  );
}
