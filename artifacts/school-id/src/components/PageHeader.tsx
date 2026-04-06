import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { School } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
  showLogo?: boolean;
}

export function PageHeader({ title, subtitle, action, onBack, showLogo = false }: PageHeaderProps) {
  const { branding } = useAuth();

  const schoolInitials = branding?.schoolName
    ? branding.schoolName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : null;

  return (
    <header className="bg-primary text-primary-foreground px-4 pt-4 pb-3 sticky top-0 z-40">
      <div className="max-w-lg mx-auto flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 transition-colors flex-shrink-0 mt-0.5"
              data-testid="button-page-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {showLogo && (
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.schoolName}
                  className="w-full h-full object-contain"
                />
              ) : schoolInitials ? (
                <span className="text-xs font-bold text-primary-foreground">{schoolInitials}</span>
              ) : (
                <School className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-primary-foreground leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-primary-foreground/70 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
