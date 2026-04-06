import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { BASE_URL } from "@/lib/api";
import { School } from "lucide-react";

function toSchoolCode(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 6);
}

export default function RegisterSchoolPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (schoolName && !schoolCode) {
      setSchoolCode(toSchoolCode(schoolName));
    }
  }, [schoolName]);

  function handleSchoolNameChange(value: string) {
    setSchoolName(value);
    setSchoolCode(toSchoolCode(value));
  }

  function handleSchoolCodeChange(value: string) {
    setSchoolCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!schoolName.trim()) errors.schoolName = "School name is required";
    if (!schoolCode.trim()) errors.schoolCode = "School code is required";
    if (schoolCode.length < 2) errors.schoolCode = "School code must be at least 2 characters";
    if (!contactEmail.trim()) errors.contactEmail = "Contact email is required";
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!username.trim()) errors.username = "Username is required";
    if (!password.trim()) errors.password = "Password is required";
    if (password.length < 6) errors.password = "Password must be at least 6 characters";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register-school`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: schoolName.trim(),
          schoolCode: schoolCode.trim(),
          contactEmail: contactEmail.trim(),
          adminFirstName: firstName.trim(),
          adminLastName: lastName.trim(),
          adminUsername: username.trim(),
          adminPassword: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error) {
          const msg: string = data.error;
          if (msg.toLowerCase().includes("school code")) {
            setFieldErrors({ schoolCode: msg });
          } else if (msg.toLowerCase().includes("username")) {
            setFieldErrors({ username: msg });
          } else if (msg.toLowerCase().includes("email")) {
            setFieldErrors({ contactEmail: msg });
          } else {
            setError(msg);
          }
        } else {
          setError("Registration failed. Please try again.");
        }
        return;
      }

      login(data.token, data.user);
      navigate("/dashboard");
    } catch {
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-md">
            <School className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Register Your School</h1>
          <p className="text-sm text-muted-foreground mt-1">Set up your school's account in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-register-school">
          {error && (
            <div
              className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg"
              data-testid="text-register-error"
            >
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">School Name</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => handleSchoolNameChange(e.target.value)}
              placeholder="e.g. Westbrook Academy"
              required
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              data-testid="input-school-name"
            />
            {fieldErrors.schoolName && (
              <p className="text-xs text-destructive">{fieldErrors.schoolName}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              School Code
              <span className="text-muted-foreground font-normal ml-1">(max 6 chars, uppercase)</span>
            </label>
            <input
              type="text"
              value={schoolCode}
              onChange={(e) => handleSchoolCodeChange(e.target.value)}
              placeholder="e.g. WBK"
              required
              maxLength={6}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
              data-testid="input-school-code"
            />
            {fieldErrors.schoolCode && (
              <p className="text-xs text-destructive">{fieldErrors.schoolCode}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="principal@school.edu"
              required
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              data-testid="input-contact-email"
            />
            {fieldErrors.contactEmail && (
              <p className="text-xs text-destructive">{fieldErrors.contactEmail}</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Admin Account
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Sarah"
                  required
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  data-testid="input-admin-firstname"
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Johnson"
                  required
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  data-testid="input-admin-lastname"
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">Admin Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="principal"
                  required
                  autoComplete="username"
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  data-testid="input-admin-username"
                />
                {fieldErrors.username && (
                  <p className="text-xs text-destructive">{fieldErrors.username}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  data-testid="input-admin-password"
                />
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password}</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-60 mt-2"
            data-testid="button-submit-register"
          >
            {isLoading ? "Creating your school..." : "Register School"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <a
            href="/"
            className="text-primary font-medium hover:underline"
            data-testid="link-back-to-login"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
