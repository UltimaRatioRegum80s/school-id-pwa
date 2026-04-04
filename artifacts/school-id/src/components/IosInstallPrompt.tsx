import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

const STORAGE_KEY = "ios-install-prompt-dismissed";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    "standalone" in navigator &&
    (navigator as unknown as { standalone: boolean }).standalone === true
  );
}

export function IosInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIos() && !isInStandaloneMode()) {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        const t = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(t);
      }
    }
    return undefined;
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl shadow-xl p-4"
      data-testid="ios-install-prompt"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">Add to Home Screen</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Install this app on your iPhone: tap the{" "}
            <Share className="inline w-3.5 h-3.5 align-text-bottom text-blue-500" />{" "}
            <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Dismiss"
          data-testid="ios-install-prompt-dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
