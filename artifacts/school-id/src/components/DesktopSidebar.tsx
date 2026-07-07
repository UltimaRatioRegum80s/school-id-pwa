import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { QrCode, LayoutDashboard, CalendarDays, Users, Settings, School } from "lucide-react";

const tabs = [
  { path: "/scan", icon: QrCode, label: "Scan" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/activities", icon: CalendarDays, label: "Activities" },
  { path: "/students", icon: Users, label: "Students" },
  { path: "/admin", icon: Settings, label: "Admin" },
];

export function DesktopSidebar() {
  const [location, navigate] = useLocation();
  const { branding } = useAuth();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col bg-card border-r border-border z-40">
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${branding?.logoUrl ? "bg-white p-1" : "bg-primary"}`}>
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <School className="w-4 h-4 text-primary-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate leading-tight">
              {branding?.schoolName ?? "School ID"}
            </p>
            <p className="text-[10px] text-muted-foreground">Staff Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location === path || location.startsWith(path + "/");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "stroke-[2.5]" : "stroke-2"}`} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <ThemeToggle className="w-full" />
      </div>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">School ID v1.0</p>
      </div>
    </aside>
  );
}
