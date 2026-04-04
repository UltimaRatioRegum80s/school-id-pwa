import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
      <div className="max-w-lg mx-auto flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {action}
          {user && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
