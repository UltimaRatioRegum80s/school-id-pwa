import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, action, onBack }: PageHeaderProps) {
  return (
    <header className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
      <div className="max-w-lg mx-auto flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0 mt-0.5"
              data-testid="button-page-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground leading-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
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
