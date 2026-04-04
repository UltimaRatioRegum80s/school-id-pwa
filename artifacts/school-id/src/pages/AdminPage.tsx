import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Settings,
  Users,
  Shield,
  Building2,
  Clock,
  ChevronRight,
  Check,
  AlertCircle,
  X,
} from "lucide-react";

interface SchoolSettings {
  id: number;
  schoolName: string;
  startTime: string;
  endTime: string;
  lateThresholdMinutes: string;
  timezone: string;
}

interface UserRecord {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("school-id-token");
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

type AdminView = "main" | "settings" | "users" | "create-user";

export default function AdminPage() {
  const { user } = useAuth();
  const [view, setView] = useState<AdminView>("main");

  if (view === "settings") return <SettingsView onBack={() => setView("main")} />;
  if (view === "users") return <UsersView onBack={() => setView("main")} onCreateUser={() => setView("create-user")} />;
  if (view === "create-user") return <CreateUserView onBack={() => setView("users")} />;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader title="Admin" subtitle={`${user?.role === "admin" ? "Administrator" : "Staff"}`} />

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Profile card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-base font-bold text-primary">
                {user?.firstName[0]}{user?.lastName[0]}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user?.username} · {user?.role}</p>
            </div>
          </div>
        </div>

        {/* Admin menu */}
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          <MenuRow
            icon={<Building2 className="w-4 h-4 text-blue-500" />}
            label="School Settings"
            description="Configure school name, times, and timezone"
            onClick={() => setView("settings")}
            disabled={user?.role !== "admin"}
          />
          <MenuRow
            icon={<Users className="w-4 h-4 text-purple-500" />}
            label="Staff Accounts"
            description="Manage staff users and permissions"
            onClick={() => setView("users")}
            disabled={user?.role !== "admin"}
          />
        </div>

        {user?.role !== "admin" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-3">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>Administrator access required for configuration</span>
          </div>
        )}

        {/* System info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            System
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium text-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-medium text-foreground">School ID PWA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  description,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30"
      }`}
    >
      <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

function SettingsView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SchoolSettings>("/settings"),
  });

  const [form, setForm] = useState<Partial<SchoolSettings> | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const currentForm = form ?? data ?? {};

  const saveMutation = useMutation({
    mutationFn: (d: Partial<SchoolSettings>) =>
      apiFetch<SchoolSettings>("/settings", { method: "PATCH", body: JSON.stringify(d) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings"], updated);
      setForm(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleChange(field: keyof SchoolSettings, value: string) {
    setForm((prev) => ({ ...(prev ?? data ?? {}), [field]: value }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    saveMutation.mutate(form);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">School Settings</h1>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <form onSubmit={handleSave} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <SettingsField
            label="School Name"
            value={(currentForm as SchoolSettings).schoolName ?? ""}
            onChange={(v) => handleChange("schoolName", v)}
            placeholder="e.g. Westbrook Academy"
          />
          <SettingsField
            label="Start Time"
            value={(currentForm as SchoolSettings).startTime ?? ""}
            onChange={(v) => handleChange("startTime", v)}
            placeholder="07:30"
            type="time"
          />
          <SettingsField
            label="End Time"
            value={(currentForm as SchoolSettings).endTime ?? ""}
            onChange={(v) => handleChange("endTime", v)}
            placeholder="14:30"
            type="time"
          />
          <SettingsField
            label="Late Threshold (minutes)"
            value={(currentForm as SchoolSettings).lateThresholdMinutes ?? ""}
            onChange={(v) => handleChange("lateThresholdMinutes", v)}
            placeholder="15"
            type="number"
          />
          <SettingsField
            label="Timezone"
            value={(currentForm as SchoolSettings).timezone ?? ""}
            onChange={(v) => handleChange("timezone", v)}
            placeholder="Africa/Johannesburg"
          />

          <button
            type="submit"
            disabled={saveMutation.isPending || !form}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </form>
      )}
    </div>
  );
}

function SettingsField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function UsersView({ onBack, onCreateUser }: { onBack: () => void; onCreateUser: () => void }) {
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UserRecord[]>("/users"),
  });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Staff Accounts</h1>
          <button
            onClick={onCreateUser}
            className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            Add Staff
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {(users ?? []).map((u) => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {u.firstName[0]}{u.lastName[0]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {u.firstName} {u.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.role === "admin"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateUserView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: object) =>
      apiFetch("/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onBack();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !username || !password) {
      setError("All fields are required");
      return;
    }
    createMutation.mutate({ firstName, lastName, username, password, role });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground">Add Staff Member</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <SettingsField label="First Name" value={firstName} onChange={setFirstName} placeholder="Sarah" />
          <SettingsField label="Last Name" value={lastName} onChange={setLastName} placeholder="Johnson" />
        </div>
        <SettingsField label="Username" value={username} onChange={setUsername} placeholder="sjohnson" />
        <SettingsField label="Password" value={password} onChange={setPassword} placeholder="Temporary password" type="password" />

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Role
          </label>
          <div className="flex gap-3">
            {["staff", "admin"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                  role === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
