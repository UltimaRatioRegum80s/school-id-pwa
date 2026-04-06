import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { School, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { getApiUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { UserProfile } from "@workspace/api-client-react";

interface InviteInfo {
  valid: boolean;
  schoolId: number;
  schoolName: string;
  expiresAt: string | null;
}

interface InviteRegisterResponseUser extends UserProfile {
  mustChangePassword?: boolean;
}

interface InviteRegisterResponse {
  token: string;
  user: InviteRegisterResponseUser;
}

interface InviteRegisterErrorBody {
  error?: string;
}

export default function InviteRegisterPage() {
  const { token } = useParams<{ token: string }>();
  const { login } = useAuth();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError("No invite token provided");
      setLoadingInvite(false);
      return;
    }

    fetch(`${getApiUrl()}/invites/${token}/validate`)
      .then(async (res) => {
        const data: InviteInfo | InviteRegisterErrorBody = await res.json();
        if (!res.ok) {
          setInviteError((data as InviteRegisterErrorBody).error ?? "Invalid invite link");
        } else {
          setInviteInfo(data as InviteInfo);
        }
      })
      .catch(() => setInviteError("Failed to validate invite link"))
      .finally(() => setLoadingInvite(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/auth/invite-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, firstName, lastName }),
      });

      const data: InviteRegisterResponse | InviteRegisterErrorBody = await res.json();
      if (!res.ok) {
        setError((data as InviteRegisterErrorBody).error ?? "Registration failed. Please try again.");
        return;
      }

      const successData = data as InviteRegisterResponse;
      login(successData.token, successData.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-2xl mb-4">
            <AlertCircle className="w-9 h-9 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Invite</h1>
          <p className="text-sm text-muted-foreground mb-6" data-testid="text-invite-error">{inviteError}</p>
          <Link
            to="/"
            className="block w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-center"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-md">
            <School className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-invite-title">
            Join {inviteInfo?.schoolName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            You've been invited to join the staff portal
          </p>
          {inviteInfo?.expiresAt && (
            <p className="text-xs text-amber-600 mt-1">
              Expires: {new Date(inviteInfo.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-invite-register">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2" data-testid="text-invite-register-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground">School</p>
            <p className="text-sm font-semibold text-foreground" data-testid="text-invite-school-name">{inviteInfo?.schoolName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sarah"
                required
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="input-invite-firstname"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Johnson"
                required
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="input-invite-lastname"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              autoComplete="new-password"
              minLength={6}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              data-testid="input-invite-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-60"
            data-testid="button-submit-invite-register"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
