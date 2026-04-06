import { useState, useEffect } from "react";
import { School, Search, X, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { getApiUrl } from "@/lib/api";

interface PublicSchool {
  id: number;
  name: string;
  slug: string;
}

type View = "form" | "pending";

export default function JoinSchoolPage() {
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<PublicSchool | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("form");

  useEffect(() => {
    fetch(`${getApiUrl()}/schools/public`)
      .then((r) => r.json())
      .then((data) => setSchools(data))
      .catch(() => {});
  }, []);

  const filtered = schools.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  function selectSchool(school: PublicSchool) {
    setSelectedSchool(school);
    setSearch(school.name);
    setShowDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSchool) {
      setError("Please select a school");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/auth/self-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          username,
          password,
          firstName,
          lastName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      setView("pending");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (view === "pending") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
            <CheckCircle className="w-9 h-9 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-pending-title">
            Request Submitted
          </h1>
          <p className="text-sm text-muted-foreground mb-6" data-testid="text-pending-message">
            Your registration request has been sent to the school administrator. You'll be able to sign in once they approve your account.
          </p>
          <Link
            to="/"
            className="block w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-center"
            data-testid="link-back-to-login"
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
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-join-title">
            Join Your School
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Request access to your school's portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-join-school">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2" data-testid="text-join-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              School
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedSchool(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search for your school..."
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm pr-8"
                data-testid="input-school-search"
                autoComplete="off"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto" data-testid="dropdown-schools">
                {filtered.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSchool(s)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                    data-testid={`option-school-${s.id}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
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
                data-testid="input-join-firstname"
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
                data-testid="input-join-lastname"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sjohnson"
              required
              autoComplete="username"
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              data-testid="input-join-username"
            />
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
              data-testid="input-join-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-60"
            data-testid="button-submit-join"
          >
            {loading ? "Submitting..." : "Request Access"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground hover:underline"
            data-testid="link-back-to-login-form"
          >
            Already have an account? Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
