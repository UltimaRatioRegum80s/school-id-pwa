import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLogin, useChangePin } from "@workspace/api-client-react";
import type { UserProfile } from "@workspace/api-client-react";
import { School, Delete, Eye, EyeOff, X } from "lucide-react";
import { Link } from "wouter";

interface LoginErrorBody {
  error?: string;
  pending?: boolean;
}

async function parseLoginError(err: unknown): Promise<LoginErrorBody> {
  try {
    const response = (err as { response?: { json?: () => Promise<LoginErrorBody> } }).response;
    if (response?.json) {
      return await response.json();
    }
  } catch {
  }
  return {};
}

interface PinPadProps {
  value: string;
  onChange: (val: string) => void;
  label: string;
  show: boolean;
  onToggleShow: () => void;
  maxLength?: number;
  disabled?: boolean;
  testIdPrefix?: string;
}

function PinPad({ value, onChange, label, show, onToggleShow, maxLength = 4, disabled = false, testIdPrefix = "pin" }: PinPadProps) {
  function handleDigit(d: string) {
    if (value.length < maxLength && !disabled) {
      onChange(value + d);
    }
  }

  function handleBackspace() {
    if (!disabled) onChange(value.slice(0, -1));
  }

  const dots = Array.from({ length: maxLength }, (_, i) => {
    const filled = i < value.length;
    return (
      <div
        key={i}
        className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
          filled
            ? "bg-primary border-primary"
            : "bg-transparent border-muted-foreground/40"
        }`}
      />
    );
  });

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <button
          type="button"
          onClick={onToggleShow}
          className="text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
          aria-label={show ? "Hide PIN" : "Show PIN"}
          data-testid={`${testIdPrefix}-toggle-show`}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 py-2 mb-4">
        {show ? (
          <div className="text-3xl font-mono tracking-[0.5em] text-foreground min-w-[7rem] text-center select-none">
            {value.padEnd(maxLength, "·")}
          </div>
        ) : (
          dots
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {digits.map((d, i) => {
          if (d === "") {
            return <div key={i} />;
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDigit(d)}
              disabled={disabled || value.length >= maxLength}
              className="h-14 rounded-xl text-xl font-semibold bg-card border border-border text-foreground hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-40 select-none"
              data-testid={`${testIdPrefix}-digit-${d}`}
            >
              {d}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleBackspace}
          disabled={disabled || value.length === 0}
          className="h-14 rounded-xl flex items-center justify-center bg-card border border-border text-muted-foreground hover:bg-muted/50 active:bg-muted transition-colors disabled:opacity-40"
          data-testid={`${testIdPrefix}-backspace`}
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

interface ChangePinModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function ChangePinModal({ onClose, onSuccess }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"current" | "new" | "confirm">("current");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");

  const changePinMutation = useChangePin({
    mutation: {
      onSuccess: () => {
        onSuccess();
      },
      onError: async (err: unknown) => {
        try {
          const response = (err as { response?: { json?: () => Promise<{ error?: string }> } }).response;
          if (response?.json) {
            const body = await response.json();
            setError(body.error ?? "Failed to change PIN. Please try again.");
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

  function handleCurrentPinComplete(pin: string) {
    setCurrentPin(pin);
    if (pin.length === 4) setStep("new");
  }

  function handleNewPinComplete(pin: string) {
    setNewPin(pin);
    if (pin.length === 4) setStep("confirm");
  }

  function handleConfirmPinComplete(pin: string) {
    setConfirmPin(pin);
    if (pin.length === 4) {
      if (pin !== newPin) {
        setError("PINs do not match. Please try again.");
        setNewPin("");
        setConfirmPin("");
        setStep("new");
        return;
      }
    }
  }

  function handleSubmit() {
    if (currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4) return;
    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setError("");
    changePinMutation.mutate({ data: { currentPin, newPin, confirmPin } });
  }

  const allComplete = currentPin.length === 4 && newPin.length === 4 && confirmPin.length === 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-background rounded-2xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Change PIN</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {step === "current" && (
            <PinPad
              value={currentPin}
              onChange={handleCurrentPinComplete}
              label="Current PIN"
              show={showPin}
              onToggleShow={() => setShowPin(!showPin)}
              testIdPrefix="change-current"
            />
          )}
          {step === "new" && (
            <PinPad
              value={newPin}
              onChange={handleNewPinComplete}
              label="New PIN"
              show={showPin}
              onToggleShow={() => setShowPin(!showPin)}
              testIdPrefix="change-new"
            />
          )}
          {step === "confirm" && (
            <PinPad
              value={confirmPin}
              onChange={handleConfirmPinComplete}
              label="Confirm New PIN"
              show={showPin}
              onToggleShow={() => setShowPin(!showPin)}
              testIdPrefix="change-confirm"
            />
          )}
        </div>

        {allComplete && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={changePinMutation.isPending}
            className="w-full mt-4 bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-60"
            data-testid="button-change-pin-submit"
          >
            {changePinMutation.isPending ? "Changing..." : "Change PIN"}
          </button>
        )}

        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span>Step {step === "current" ? 1 : step === "new" ? 2 : 3} of 3</span>
          {step !== "current" && (
            <button
              type="button"
              onClick={() => {
                if (step === "new") { setStep("current"); setCurrentPin(""); }
                if (step === "confirm") { setStep("new"); setNewPin(""); }
              }}
              className="text-primary hover:underline"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, branding } = useAuth();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [showMustChangePin, setShowMustChangePin] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<{ token: string; user: UserProfile & { mustChangePin?: boolean } } | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        const user = data.user as UserProfile & { mustChangePin?: boolean };
        if (user.mustChangePin) {
          sessionStorage.setItem("school-id-token", data.token);
          setPendingLoginData({ token: data.token, user });
          setShowMustChangePin(true);
        } else {
          login(data.token, user, remember);
        }
      },
      onError: async (err: unknown) => {
        const body = await parseLoginError(err);
        if (body.pending) {
          setError("Your account is awaiting approval from the school administrator.");
        } else if (body.error) {
          setError(body.error);
        } else {
          setError("Invalid username or PIN");
        }
        setPin("");
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (pin.length !== 4) {
      setError("Please enter your 4-digit PIN.");
      return;
    }
    setError("");
    loginMutation.mutate({ data: { username: username.trim(), pin, remember } });
  }

  function handlePinChange(val: string) {
    setPin(val);
    if (error) setError("");
  }

  const schoolInitials = branding?.schoolName
    ? branding.schoolName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : null;

  if (showMustChangePin && pendingLoginData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-md overflow-hidden">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.schoolName} className="w-full h-full object-contain" />
              ) : schoolInitials ? (
                <span className="text-xl font-bold text-primary-foreground">{schoolInitials}</span>
              ) : (
                <School className="w-9 h-9 text-primary-foreground" />
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">Set Your PIN</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your account requires you to set a new PIN before continuing.
            </p>
          </div>
          <ChangePinModal
            onClose={() => {
              sessionStorage.removeItem("school-id-token");
              setShowMustChangePin(false);
              setPendingLoginData(null);
              setPin("");
            }}
            onSuccess={() => {
              if (pendingLoginData) {
                sessionStorage.removeItem("school-id-token");
                login(pendingLoginData.token, { ...pendingLoginData.user, mustChangePin: false }, remember);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-md overflow-hidden">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.schoolName}
                className="w-full h-full object-contain"
              />
            ) : schoolInitials ? (
              <span className="text-xl font-bold text-primary-foreground">{schoolInitials}</span>
            ) : (
              <School className="w-9 h-9 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-app-title">
            {branding?.schoolName ?? "School ID"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Staff Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-login">
          {error && (
            <div
              className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg"
              data-testid="text-login-error"
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Username
            </label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
              autoCapitalize="none"
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              data-testid="input-username"
            />
          </div>

          <PinPad
            value={pin}
            onChange={handlePinChange}
            label="PIN"
            show={showPin}
            onToggleShow={() => setShowPin(!showPin)}
            disabled={loginMutation.isPending}
            testIdPrefix="login-pin"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none" data-testid="label-stay-logged-in">
              <div
                role="checkbox"
                aria-checked={remember}
                onClick={() => setRemember(!remember)}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${remember ? "bg-primary" : "bg-muted"}`}
                data-testid="toggle-remember"
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${remember ? "translate-x-5" : "translate-x-1"}`} />
              </div>
              <span className="text-sm text-foreground">Stay logged in</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending || pin.length !== 4}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl transition-opacity disabled:opacity-60"
            data-testid="button-submit-login"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Demo: admin / PIN 1234
        </p>

        <div className="mt-4 space-y-2 text-center text-sm">
          <p>
            <Link
              to="/join"
              className="text-primary font-medium hover:underline"
              data-testid="link-join-school"
            >
              Join your school
            </Link>
          </p>
          <p>
            <Link
              to="/register"
              className="text-muted-foreground hover:text-foreground hover:underline"
              data-testid="link-register-school"
            >
              Register a new school
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
