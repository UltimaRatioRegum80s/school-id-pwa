import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { PALETTES, applyPalette } from "@/lib/palettes";
import { getApiUrl } from "@/lib/api";
import {
  useGetSettings,
  useUpdateSettings,
  useListUsers,
  useCreateUser,
  useListBehaviorCategories,
  useCreateBehaviorCategory,
  useCreateStudent,
  useListActivities,
  useCreateActivity,
  useUpdateActivity,
  getGetSettingsQueryKey,
  getListUsersQueryKey,
  getListBehaviorCategoriesQueryKey,
  getListStudentsQueryKey,
  getListActivitiesQueryKey,
} from "@workspace/api-client-react";
import type { SchoolSettings, Activity } from "@workspace/api-client-react";
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
  CalendarRange,
  Plus,
  Pencil,
  Palette,
  School,
} from "lucide-react";

type AdminView =
  | "main"
  | "settings"
  | "users"
  | "create-user"
  | "behavior-categories"
  | "add-student"
  | "activity-management"
  | "create-activity"
  | "edit-activity"
  | "appearance";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<AdminView>("main");
  const { data: settings } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  if (view === "settings") return <SettingsView onBack={() => setView("main")} />;
  if (view === "users") return <UsersView onBack={() => setView("main")} onCreateUser={() => setView("create-user")} />;
  if (view === "create-user") return <CreateUserView onBack={() => setView("users")} />;
  if (view === "behavior-categories") return <BehaviorCategoriesView onBack={() => setView("main")} />;
  if (view === "add-student") return <AddStudentView onBack={() => setView("main")} />;
  if (view === "activity-management") return (
    <ActivityManagementView
      onBack={() => setView("main")}
      onCreate={() => setView("create-activity")}
      onEdit={(a) => { setEditingActivity(a); setView("edit-activity"); }}
    />
  );
  if (view === "create-activity") return (
    <CreateActivityView onBack={() => setView("activity-management")} />
  );
  if (view === "edit-activity" && editingActivity) return (
    <EditActivityView activity={editingActivity} onBack={() => setView("activity-management")} />
  );
  if (view === "appearance") return <AppearanceView onBack={() => setView("main")} />;

  const schoolDisplayName = settings?.schoolName ?? user?.schoolName;
  const schoolCode = user?.schoolCode;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader title="Admin" subtitle={`${user?.role === "admin" ? "Administrator" : "Staff"}`} showLogo={true} />

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* School identity banner */}
        {schoolDisplayName && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3" data-testid="panel-school-identity">
            <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate" data-testid="text-school-name">
                {schoolDisplayName}
              </p>
              {schoolCode && (
                <p className="text-xs text-muted-foreground font-mono">{schoolCode}</p>
              )}
            </div>
          </div>
        )}

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
                icon={<Palette className="w-4 h-4 text-pink-500" />}
                label="Appearance"
                description="Logo and colour palette for your school"
                onClick={() => setView("appearance")}
                testId="button-nav-appearance"
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
                icon={<CalendarRange className="w-4 h-4 text-orange-500" />}
                label="Activity Management"
                description="Create and edit assemblies, events, clubs, detention"
                onClick={() => setView("activity-management")}
                testId="button-nav-activity-management"
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

const ACTIVITY_TYPES = [
  { value: "assembly", label: "Assembly" },
  { value: "event", label: "Event" },
  { value: "club", label: "Club" },
  { value: "detention", label: "Detention" },
  { value: "class", label: "Class" },
  { value: "activity", label: "Activity" },
];

const ACTIVITY_STATUSES = [
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function ActivityManagementView({
  onBack,
  onCreate,
  onEdit,
}: {
  onBack: () => void;
  onCreate: () => void;
  onEdit: (a: Activity) => void;
}) {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { data, isLoading } = useListActivities(
    typeFilter !== "all" ? { activityType: typeFilter } : {},
    {
      query: {
        queryKey: getListActivitiesQueryKey(
          typeFilter !== "all" ? { activityType: typeFilter } : {}
        ),
      },
    }
  );

  const activities = (data ?? []) as Activity[];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader
        title="Activity Management"
        subtitle="Create and manage activities"
        onBack={onBack}
        action={
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold"
            data-testid="button-create-activity-admin"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        }
      />
      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Type filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" data-testid="panel-activity-type-tabs">
          {[{ value: "all", label: "All" }, ...ACTIVITY_TYPES].map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                typeFilter === t.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
              data-testid={`tab-activity-type-${t.value}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarRange className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No activities found</p>
            <button
              onClick={onCreate}
              className="mt-3 text-primary text-sm font-semibold"
              data-testid="button-create-first-activity"
            >
              Create your first activity
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => (
              <div
                key={a.id}
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3"
                data-testid={`activity-row-${a.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {a.activityType} · {a.status}
                  </p>
                </div>
                <button
                  onClick={() => onEdit(a)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  data-testid={`button-edit-activity-${a.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateActivityView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [activityType, setActivityType] = useState("assembly");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(
    () => new Date().toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const createMutation = useCreateActivity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        setSaved(true);
        setTimeout(() => onBack(), 1200);
      },
      onError: () => setError("Failed to create activity. Please try again."),
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    createMutation.mutate({
      data: {
        name: name.trim(),
        activityType,
        description: description || null,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        status,
      },
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader title="New Activity" subtitle="Create a new activity" onBack={onBack} />
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {saved && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-xl" data-testid="text-create-activity-success">
            <Check className="w-4 h-4" />
            Activity created!
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl" data-testid="text-create-activity-error">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <Field label="Activity Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Assembly"
            required
            className="input-field"
            data-testid="input-activity-name"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="input-field"
              data-testid="select-activity-type"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field"
              data-testid="select-activity-status"
            >
              {ACTIVITY_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="input-field"
            data-testid="input-activity-description"
          />
        </Field>
        <Field label="Start Time">
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="input-field"
            data-testid="input-activity-start"
          />
        </Field>
        <Field label="End Time (optional)">
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input-field"
            data-testid="input-activity-end"
          />
        </Field>
        <button
          type="submit"
          disabled={createMutation.isPending || !name.trim()}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50 transition-opacity"
          data-testid="button-save-activity"
        >
          {createMutation.isPending ? "Creating..." : "Create Activity"}
        </button>
      </form>
    </div>
  );
}

function EditActivityView({ activity, onBack }: { activity: Activity; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(activity.name);
  const [activityType, setActivityType] = useState(activity.activityType);
  const [description, setDescription] = useState(activity.description ?? "");
  const [startTime, setStartTime] = useState(
    () => new Date(activity.startTime).toISOString().slice(0, 16)
  );
  const [endTime, setEndTime] = useState(
    activity.endTime ? new Date(activity.endTime).toISOString().slice(0, 16) : ""
  );
  const [status, setStatus] = useState(activity.status);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const updateMutation = useUpdateActivity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        setSaved(true);
        setTimeout(() => onBack(), 1200);
      },
      onError: () => setError("Failed to update activity. Please try again."),
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    updateMutation.mutate({
      id: activity.id,
      data: {
        name: name.trim(),
        activityType,
        description: description || null,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        status,
      },
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader title="Edit Activity" subtitle={activity.name} onBack={onBack} />
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {saved && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-xl" data-testid="text-edit-activity-success">
            <Check className="w-4 h-4" />
            Activity updated!
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl" data-testid="text-edit-activity-error">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        <Field label="Activity Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Assembly"
            required
            className="input-field"
            data-testid="input-edit-activity-name"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="input-field"
              data-testid="select-edit-activity-type"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-field"
              data-testid="select-edit-activity-status"
            >
              {ACTIVITY_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="input-field"
            data-testid="input-edit-activity-description"
          />
        </Field>
        <Field label="Start Time">
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="input-field"
            data-testid="input-edit-activity-start"
          />
        </Field>
        <Field label="End Time (optional)">
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input-field"
            data-testid="input-edit-activity-end"
          />
        </Field>
        <button
          type="submit"
          disabled={updateMutation.isPending || !name.trim()}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50 transition-opacity"
          data-testid="button-update-activity"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function AppearanceView({ onBack }: { onBack: () => void }) {
  const { branding, token, refreshBranding } = useAuth();
  const [selectedPalette, setSelectedPalette] = useState<string>(branding?.colorPalette ?? "navy-gold");
  const [previewPalette, setPreviewPalette] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePalette = previewPalette ?? selectedPalette;

  function handlePaletteHover(paletteName: string) {
    applyPalette(paletteName);
    setPreviewPalette(paletteName);
  }

  function handlePaletteLeave() {
    applyPalette(activePalette);
    setPreviewPalette(null);
  }

  function handlePaletteSelect(paletteName: string) {
    setSelectedPalette(paletteName);
    applyPalette(paletteName);
    setPreviewPalette(null);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setError("");

    try {
      const urlRes = await fetch(`${getApiUrl()}/school/branding/logo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });

      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      const brandingRes = await fetch(`${getApiUrl()}/school/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ logoObjectPath: objectPath }),
      });

      if (!brandingRes.ok) throw new Error("Failed to save logo");

      await refreshBranding();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError("Logo upload failed. Please try again.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSavePalette() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${getApiUrl()}/school/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ colorPalette: selectedPalette }),
      });

      if (!res.ok) throw new Error("Failed to save");

      await refreshBranding();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const schoolInitials = branding?.schoolName
    ? branding.schoolName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : "SC";

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 transition-colors"
            data-testid="button-appearance-back"
          >
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold flex-1">Appearance</h1>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-primary-foreground/80 font-medium" data-testid="text-appearance-saved">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">School Logo</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt="School logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xl font-bold text-primary-foreground">{schoolInitials}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-2">
                {branding?.logoUrl ? "Your school logo is set." : "No logo uploaded yet. Your initials will be shown."}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                data-testid="input-logo-upload"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
                data-testid="button-upload-logo"
              >
                {logoUploading ? "Uploading..." : branding?.logoUrl ? "Replace Logo" : "Upload Logo"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Colour Palette</h2>
          <p className="text-xs text-muted-foreground">Hover to preview, click to select.</p>
          <div className="grid grid-cols-2 gap-2" data-testid="palette-picker">
            {Object.values(PALETTES).map((palette) => {
              const isSelected = selectedPalette === palette.name;
              return (
                <button
                  key={palette.name}
                  onMouseEnter={() => handlePaletteHover(palette.name)}
                  onMouseLeave={handlePaletteLeave}
                  onClick={() => handlePaletteSelect(palette.name)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-primary/40"
                  }`}
                  data-testid={`palette-option-${palette.name}`}
                >
                  <div className="flex gap-1 flex-shrink-0">
                    <div
                      className="w-5 h-5 rounded-md"
                      style={{ background: `hsl(${palette.primary})` }}
                    />
                    <div
                      className="w-5 h-5 rounded-md"
                      style={{ background: `hsl(${palette.accent})` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate">{palette.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleSavePalette}
            disabled={saving || selectedPalette === (branding?.colorPalette ?? "navy-gold")}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-opacity"
            data-testid="button-save-palette"
          >
            {saving ? "Saving..." : "Save Palette"}
          </button>
        </div>
      </div>
    </div>
  );
}
