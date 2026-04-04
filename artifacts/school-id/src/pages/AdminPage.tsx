import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetSettings,
  useUpdateSettings,
  useListUsers,
  useCreateUser,
  useListBehaviorCategories,
  useCreateBehaviorCategory,
  useCreateStudent,
  getGetSettingsQueryKey,
  getListUsersQueryKey,
  getListBehaviorCategoriesQueryKey,
  getListStudentsQueryKey,
} from "@workspace/api-client-react";
import type { SchoolSettings } from "@workspace/api-client-react";
import {
  Settings,
  Users,
  Shield,
  Building2,
  ChevronRight,
  Check,
  AlertCircle,
  X,
  Star,
  UserPlus,
  Upload,
} from "lucide-react";

type AdminView = "main" | "settings" | "users" | "create-user" | "behavior-categories" | "add-student";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<AdminView>("main");

  if (view === "settings") return <SettingsView onBack={() => setView("main")} />;
  if (view === "users") return <UsersView onBack={() => setView("main")} onCreateUser={() => setView("create-user")} />;
  if (view === "create-user") return <CreateUserView onBack={() => setView("users")} />;
  if (view === "behavior-categories") return <BehaviorCategoriesView onBack={() => setView("main")} />;
  if (view === "add-student") return <AddStudentView onBack={() => setView("main")} />;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader title="Admin" subtitle={`${user?.role === "admin" ? "Administrator" : "Staff"}`} />

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Profile card */}
        <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-admin-profile">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-base font-bold text-primary">
                {user?.firstName[0]}{user?.lastName[0]}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground" data-testid="text-admin-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{user?.username} · {user?.role}</p>
            </div>
          </div>
        </div>

        {/* Admin-only section */}
        {user?.role === "admin" && (
          <>
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              <MenuRow
                icon={<Building2 className="w-4 h-4 text-blue-500" />}
                label="School Settings"
                description="Configure school name, times, and timezone"
                onClick={() => setView("settings")}
                testId="button-nav-school-settings"
              />
              <MenuRow
                icon={<Users className="w-4 h-4 text-purple-500" />}
                label="Staff Accounts"
                description="Manage staff users and permissions"
                onClick={() => setView("users")}
                testId="button-nav-staff-accounts"
              />
              <MenuRow
                icon={<Star className="w-4 h-4 text-yellow-500" />}
                label="Behavior Categories"
                description="Configure merit and demerit categories"
                onClick={() => setView("behavior-categories")}
                testId="button-nav-behavior-categories"
              />
            </div>

            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
              <MenuRow
                icon={<UserPlus className="w-4 h-4 text-green-500" />}
                label="Add Student"
                description="Manually enroll a new student"
                onClick={() => setView("add-student")}
                testId="button-nav-add-student"
              />
              <MenuRow
                icon={<Upload className="w-4 h-4 text-indigo-500" />}
                label="Import Students (CSV)"
                description="Bulk import student data from a CSV file"
                onClick={() => alert("CSV import — coming soon")}
                testId="button-nav-import-csv"
              />
            </div>
          </>
        )}

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

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full bg-destructive/10 border border-destructive/20 text-destructive font-semibold py-2.5 rounded-xl hover:bg-destructive/20 transition-colors"
          data-testid="button-logout"
        >
          Sign Out
        </button>
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
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30"
      }`}
      data-testid={testId}
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
  const { data, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const [form, setForm] = useState<Partial<SchoolSettings> | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const currentForm = (form ?? data ?? {}) as Partial<SchoolSettings>;

  const saveMutation = useUpdateSettings({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetSettingsQueryKey(), updated);
        setForm(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
      onError: () => setError("Failed to save settings. Please try again."),
    },
  });

  function handleChange(field: keyof SchoolSettings, value: string) {
    setForm((prev) => ({ ...(prev ?? data ?? {}), [field]: value }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    saveMutation.mutate({ data: form });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-settings-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">School Settings</h1>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium" data-testid="text-settings-saved">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <form onSubmit={handleSave} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4" data-testid="form-settings">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2" data-testid="text-settings-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Field label="School Name">
            <input
              type="text"
              value={currentForm.schoolName ?? ""}
              onChange={(e) => handleChange("schoolName", e.target.value)}
              placeholder="e.g. Westbrook Academy"
              className="input-field"
              data-testid="input-school-name"
            />
          </Field>
          <Field label="Start Time">
            <input
              type="time"
              value={currentForm.startTime ?? ""}
              onChange={(e) => handleChange("startTime", e.target.value)}
              className="input-field"
              data-testid="input-start-time"
            />
          </Field>
          <Field label="End Time">
            <input
              type="time"
              value={currentForm.endTime ?? ""}
              onChange={(e) => handleChange("endTime", e.target.value)}
              className="input-field"
              data-testid="input-end-time"
            />
          </Field>
          <Field label="Late Threshold (minutes)">
            <input
              type="number"
              value={currentForm.lateThresholdMinutes ?? ""}
              onChange={(e) => handleChange("lateThresholdMinutes", e.target.value)}
              placeholder="15"
              className="input-field"
              data-testid="input-late-threshold"
            />
          </Field>
          <Field label="Timezone">
            <input
              type="text"
              value={currentForm.timezone ?? ""}
              onChange={(e) => handleChange("timezone", e.target.value)}
              placeholder="Africa/Johannesburg"
              className="input-field"
              data-testid="input-timezone"
            />
          </Field>

          <button
            type="submit"
            disabled={saveMutation.isPending || !form}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50"
            data-testid="button-save-settings"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </form>
      )}
    </div>
  );
}

function UsersView({ onBack, onCreateUser }: { onBack: () => void; onCreateUser: () => void }) {
  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-users-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Staff Accounts</h1>
          <button
            onClick={onCreateUser}
            className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg"
            data-testid="button-add-staff"
          >
            Add Staff
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden" data-testid="list-staff-users">
            {(users ?? []).map((u) => (
              <div key={u.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-user-${u.id}`}>
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

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        onBack();
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ data: { firstName, lastName, username, password, role } });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-create-user-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground">Add Staff Member</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4" data-testid="form-create-user">
        {createMutation.isError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg" data-testid="text-create-user-error">
            Failed to create user. Please try again.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Sarah"
              required
              className="input-field"
              data-testid="input-user-firstname"
            />
          </Field>
          <Field label="Last Name">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Johnson"
              required
              className="input-field"
              data-testid="input-user-lastname"
            />
          </Field>
        </div>
        <Field label="Username">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="sjohnson"
            required
            className="input-field"
            data-testid="input-user-username"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Temporary password"
            required
            className="input-field"
            data-testid="input-user-password"
          />
        </Field>

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
                data-testid={`button-role-${r}`}
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
          data-testid="button-submit-create-user"
        >
          {createMutation.isPending ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

function BehaviorCategoriesView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useListBehaviorCategories({
    query: { queryKey: getListBehaviorCategoriesQueryKey() },
  });

  const [name, setName] = useState("");
  const [type, setType] = useState("merit");
  const [points, setPoints] = useState("1");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  const createMutation = useCreateBehaviorCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBehaviorCategoriesQueryKey() });
        setName(""); setDescription(""); setPoints("1"); setType("merit");
        setShowForm(false);
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      data: { name, type, points: parseInt(points, 10), description: description || null },
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-categories-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Behavior Categories</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg"
            data-testid="button-toggle-category-form"
          >
            {showForm ? "Cancel" : "Add New"}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 space-y-3" data-testid="form-create-category">
            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Outstanding Work"
                required
                className="input-field"
                data-testid="input-category-name"
              />
            </Field>
            <div className="flex gap-3">
              {["merit", "demerit"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize ${
                    type === t
                      ? t === "merit" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`button-category-type-${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Field label="Points">
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                min="1"
                max="100"
                className="input-field"
                data-testid="input-category-points"
              />
            </Field>
            <Field label="Description (optional)">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                className="input-field"
                data-testid="input-category-description"
              />
            </Field>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-lg disabled:opacity-50 text-sm"
              data-testid="button-submit-create-category"
            >
              {createMutation.isPending ? "Creating..." : "Create Category"}
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden" data-testid="list-behavior-categories">
            {(categories ?? []).length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No categories yet. Add one above.
              </div>
            ) : (
              (categories ?? []).map((cat) => (
                <div key={cat.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-category-${cat.id}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.type === "merit" ? "bg-green-500" : "bg-red-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    cat.type === "merit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {cat.points} pts
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddStudentView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("10");
  const [className, setClassName] = useState("");

  const createMutation = useCreateStudent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        onBack();
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      data: { studentId, firstName, lastName, grade, className },
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-add-student-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground">Add Student</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4" data-testid="form-add-student">
        {createMutation.isError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg" data-testid="text-add-student-error">
            Failed to add student. Check the student ID is unique.
          </div>
        )}

        <Field label="Student ID">
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="e.g. STU2024001"
            required
            className="input-field"
            data-testid="input-new-student-id"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alice"
              required
              className="input-field"
              data-testid="input-new-student-firstname"
            />
          </Field>
          <Field label="Last Name">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Johnson"
              required
              className="input-field"
              data-testid="input-new-student-lastname"
            />
          </Field>
        </div>

        <Field label="Grade">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="input-field"
            data-testid="select-new-student-grade"
          >
            {["8", "9", "10", "11", "12"].map((g) => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
        </Field>

        <Field label="Class / Homeroom">
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="e.g. 10A"
            required
            className="input-field"
            data-testid="input-new-student-classname"
          />
        </Field>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50"
          data-testid="button-submit-add-student"
        >
          {createMutation.isPending ? "Adding..." : "Add Student"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
