import "@/lib/api";
import { useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { IosInstallPrompt } from "@/components/IosInstallPrompt";
import { GlobalClock } from "@/components/GlobalClock";
import { useChangePin } from "@workspace/api-client-react";
import LoginPage from "@/pages/LoginPage";
import ScanPage from "@/pages/ScanPage";
import DashboardPage from "@/pages/DashboardPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import StudentsPage from "@/pages/StudentsPage";
import AdminPage from "@/pages/AdminPage";
import RegisterSchoolPage from "@/pages/RegisterSchoolPage";
import JoinSchoolPage from "@/pages/JoinSchoolPage";
import InviteRegisterPage from "@/pages/InviteRegisterPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
    },
  },
});

function PinDots({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex gap-3 justify-center my-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all ${
            i < count ? "bg-primary border-primary" : "border-muted-foreground/40"
          }`}
        />
      ))}
    </div>
  );
}

function PinPad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button
          key={d}
          onClick={() => onDigit(d)}
          className="h-14 rounded-2xl bg-muted hover:bg-muted/70 active:scale-95 transition-all text-xl font-semibold"
        >
          {d}
        </button>
      ))}
      <div />
      <button
        onClick={() => onDigit("0")}
        className="h-14 rounded-2xl bg-muted hover:bg-muted/70 active:scale-95 transition-all text-xl font-semibold"
      >
        0
      </button>
      <button
        onClick={onDelete}
        className="h-14 rounded-2xl bg-muted hover:bg-muted/70 active:scale-95 transition-all flex items-center justify-center"
      >
        ⌫
      </button>
    </div>
  );
}

function MustChangePinOverlay() {
  const { clearMustChangePin } = useAuth();
  const [step, setStep] = useState<"current" | "new" | "confirm">("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const changePinMutation = useChangePin({
    mutation: {
      onSuccess: () => {
        clearMustChangePin();
      },
      onError: async (err: unknown) => {
        try {
          const response = (err as { response?: { json?: () => Promise<{ error?: string }> } }).response;
          if (response?.json) {
            const body = await response.json();
            setError(body.error ?? "Failed to change PIN.");
            if (body.error?.includes("Current PIN")) {
              setStep("current");
              setCurrentPin("");
            }
            return;
          }
        } catch {}
        setError("Failed to change PIN. Please try again.");
      },
    },
  });

  function addDigit(pin: string, setPin: (v: string) => void, onComplete?: () => void) {
    return (d: string) => {
      if (pin.length >= 4) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => onComplete?.(), 120);
      }
    };
  }

  function delDigit(pin: string, setPin: (v: string) => void) {
    return () => setPin(pin.slice(0, -1));
  }

  function handleSubmit() {
    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      setNewPin("");
      setConfirmPin("");
      setStep("new");
      return;
    }
    setError("");
    changePinMutation.mutate({ data: { currentPin, newPin, confirmPin } });
  }

  const stepLabel = step === "current" ? "Enter current PIN (1234)" : step === "new" ? "Enter new PIN" : "Confirm new PIN";
  const activePin = step === "current" ? currentPin : step === "new" ? newPin : confirmPin;
  const onDigit = step === "current"
    ? addDigit(currentPin, setCurrentPin, () => setStep("new"))
    : step === "new"
    ? addDigit(newPin, setNewPin, () => setStep("confirm"))
    : addDigit(confirmPin, setConfirmPin);
  const onDelete = step === "current"
    ? delDigit(currentPin, setCurrentPin)
    : step === "new"
    ? delDigit(newPin, setNewPin)
    : delDigit(confirmPin, setConfirmPin);
  const allDone = currentPin.length === 4 && newPin.length === 4 && confirmPin.length === 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-background rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="text-center mb-2">
          <div className="text-2xl mb-1">🔒</div>
          <h2 className="text-lg font-bold">Set Your PIN</h2>
          <p className="text-sm text-muted-foreground mt-1">You must set a new PIN before continuing.</p>
        </div>
        <div className="mt-4">
          <p className="text-center text-sm font-medium text-foreground mb-1">{stepLabel}</p>
          <PinDots count={activePin.length} total={4} />
          <PinPad onDigit={onDigit} onDelete={onDelete} />
        </div>
        {error && <p className="text-destructive text-sm text-center mt-3">{error}</p>}
        {allDone && (
          <button
            onClick={handleSubmit}
            disabled={changePinMutation.isPending}
            className="mt-4 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
          >
            {changePinMutation.isPending ? "Saving…" : "Set PIN"}
          </button>
        )}
      </div>
    </div>
  );
}

function ProtectedApp() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Switch>
      <Route path="/register" component={RegisterSchoolPage} />
      <Route path="/join" component={JoinSchoolPage} />
      <Route path="/join/:token" component={InviteRegisterPage} />
      {!isAuthenticated ? (
        <Route component={LoginPage} />
      ) : (
        <>
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
          <Route path="/scan" component={ScanPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/activities" component={ActivitiesPage} />
          <Route path="/students" component={StudentsPage} />
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function AppShell() {
  const { isAuthenticated, user } = useAuth();
  const authenticated = isAuthenticated;

  return (
    <div className={`flex flex-col min-h-screen bg-background${authenticated ? " md:pl-56" : ""}`}>
      {authenticated && <GlobalClock />}
      <ProtectedApp />
      {authenticated && user?.mustChangePin && <MustChangePinOverlay />}
      {authenticated && (
        <>
          <DesktopSidebar />
          <BottomNav />
          <IosInstallPrompt />
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppShell />
            </WouterRouter>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
