import { useLocation } from "wouter";
import { QrCode, LayoutDashboard, CalendarDays, Users, Settings } from "lucide-react";

const tabs = [
  { path: "/scan", icon: QrCode, label: "Scan" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/activities", icon: CalendarDays, label: "Activities" },
  { path: "/students", icon: Users, label: "Students" },
  { path: "/admin", icon: Settings, label: "Admin" },
];

export function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom md:hidden">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location === path || location.startsWith(path + "/");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex-1 flex flex-col items-center py-2 pt-3 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${active ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className={`text-[10px] leading-none font-medium ${active ? "font-semibold" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
