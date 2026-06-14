import { useState, useRef, useMemo, lazy, Suspense } from "react";
const PrintCardsPage = lazy(() => import("./PrintCardsPage"));
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { PALETTES, applyPalette, applyCustomPalette } from "@/lib/palettes";
import { getApiUrl } from "@/lib/api";
import {
  useGetSettings,
  useUpdateSettings,
  useListUsers,
  useListStudentIds,
  useListBehaviorCategories,
  useCreateBehaviorCategory,
  useListRecognitionTiers,
  useCreateRecognitionTier,
  useUpdateRecognitionTier,
  useDeleteRecognitionTier,
  useListRecognitionQualifiers,
  useAwardRecognition,
  useRemoveRecognitionAward,
  useCreateStudent,
  useListActivities,
  useCreateActivity,
  useUpdateActivity,
  useImportStudents,
  getGetSettingsQueryKey,
  getListUsersQueryKey,
  getListBehaviorCategoriesQueryKey,
  getListRecognitionTiersQueryKey,
  getListRecognitionQualifiersQueryKey,
  getListStudentsQueryKey,
  getListStudentIdsQueryKey,
  getListActivitiesQueryKey,
} from "@workspace/api-client-react";
import type { SchoolSettings, Activity, ImportStudentRow, ImportFailure, RecognitionTier } from "@workspace/api-client-react";
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
  Download,
  FileText,
  Table,
  Link2,
  Copy,
  Trash2,
  Clock,
  CreditCard,
  Award,
  Trophy,
  CheckCircle2,
  Undo2,
} from "lucide-react";

type AdminView =
  | "main"
  | "settings"
  | "users"
  | "create-user"
  | "behavior-categories"
  | "recognition-tiers"
  | "reward-recognition"
  | "add-student"
  | "import-students"
  | "print-cards"
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
  if (view === "recognition-tiers") return <RecognitionTiersView onBack={() => setView("main")} />;
  if (view === "reward-recognition") return <RewardRecognitionView onBack={() => setView("main")} />;
  if (view === "add-student") return <AddStudentView onBack={() => setView("main")} />;
  if (view === "import-students") return <ImportStudentsView onBack={() => setView("main")} />;
  if (view === "print-cards") return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Loading...</div>}>
      <PrintCardsPage onBack={() => setView("main")} />
    </Suspense>
  );
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
    <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-6">
      <PageHeader title="Admin" subtitle={`${user?.role === "admin" ? "Administrator" : "Staff"}`} showLogo={true} />

      <div className="max-w-lg md:max-w-4xl mx-auto w-full px-4 md:px-6 py-4 space-y-4">
        {/* Top row: school identity + profile */}
        <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
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
        </div>

        {/* Admin-only section */}
        {user?.role === "admin" && (
          <>
            {/* Desktop: 2-column card grid for menu items */}
            <div className="md:grid md:grid-cols-2 md:gap-4 space-y-4 md:space-y-0">
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
                <MenuRow
                  icon={<Award className="w-4 h-4 text-amber-500" />}
                  label="Recognition Tiers"
                  description="Set merit thresholds for letters, certificates, and nominations"
                  onClick={() => setView("recognition-tiers")}
                  testId="button-nav-recognition-tiers"
                />
                <MenuRow
                  icon={<Trophy className="w-4 h-4 text-amber-600" />}
                  label="Reward Recognition"
                  description="See which students qualify for a recognition action"
                  onClick={() => setView("reward-recognition")}
                  testId="button-nav-reward-recognition"
                />
              </div>

              <div className="space-y-4 md:space-y-4">
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
                    description="Bulk import student data from a CSV, Excel, or Word file"
                    onClick={() => setView("import-students")}
                    testId="button-nav-import-csv"
                  />
                  <MenuRow
                    icon={<CreditCard className="w-4 h-4 text-teal-500" />}
                    label="Print ID Cards"
                    description="Print credit-card sized ID cards with QR codes by grade"
                    onClick={() => setView("print-cards")}
                    testId="button-nav-print-cards"
                  />
                </div>
              </div>
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
  const { refreshBranding } = useAuth();
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
        refreshBranding();
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
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
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

interface StaffUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: string;
  status?: string;
  schoolId: number;
  createdAt: string;
}

function UsersView({ onBack, onCreateUser }: { onBack: () => void; onCreateUser: () => void }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });

  const [approvingId, setApprovingId] = useState<number | null>(null);

  const allUsers = (users ?? []) as StaffUser[];
  const activeUsers = allUsers.filter((u) => !u.status || u.status === "active");
  const pendingUsers = allUsers.filter((u) => u.status === "pending");
  const rejectedUsers = allUsers.filter((u) => u.status === "rejected");

  async function updateStatus(userId: number, status: string) {
    setApprovingId(userId);
    try {
      await fetch(`${getApiUrl()}/users/${userId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
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

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <>
            {pendingUsers.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" data-testid="heading-pending-requests">
                  Pending Requests ({pendingUsers.length})
                </h2>
                <div className="bg-amber-50 border border-amber-200 rounded-xl divide-y divide-amber-100 overflow-hidden" data-testid="list-pending-users">
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="px-4 py-3" data-testid={`row-pending-user-${u.id}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-amber-700">
                            {u.firstName[0]}{u.lastName[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">
                          pending
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(u.id, "active")}
                          disabled={approvingId === u.id}
                          className="flex-1 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                          data-testid={`button-approve-user-${u.id}`}
                        >
                          {approvingId === u.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => updateStatus(u.id, "rejected")}
                          disabled={approvingId === u.id}
                          className="flex-1 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg disabled:opacity-50"
                          data-testid={`button-reject-user-${u.id}`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              {pendingUsers.length > 0 && (
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Active Staff
                </h2>
              )}
              <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden" data-testid="list-staff-users">
                {activeUsers.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">No active staff yet.</div>
                ) : (
                  activeUsers.map((u) => (
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
                  ))
                )}
              </div>
            </div>

            {rejectedUsers.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Rejected
                </h2>
                <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden" data-testid="list-rejected-users">
                  {rejectedUsers.map((u) => (
                    <div key={u.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-rejected-user-${u.id}`}>
                      <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">
                          {u.firstName[0]}{u.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800">
                        rejected
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <InviteLinkManager />
      </div>
    </div>
  );
}

interface CreatedUserResult {
  id: number;
  username: string;
  tempPassword: string;
  firstName: string;
  lastName: string;
  role: string;
}

function CreateUserView({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedUserResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create user. Please try again.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      setCreated(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyCredentials() {
    if (!created) return;
    navigator.clipboard.writeText(`Username: ${created.username}\nPassword: ${created.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (created) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-create-user-back">
              <X className="w-4 h-4" />
            </button>
            <h1 className="text-base font-bold text-foreground">Account Created</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center" data-testid="panel-created-user-info">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {created.firstName} {created.lastName}
            </p>
            <p className="text-xs text-muted-foreground mb-4">Account created successfully</p>

            <div className="bg-white border border-green-200 rounded-lg p-3 text-left space-y-2" data-testid="panel-temp-credentials">
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm font-mono font-semibold text-foreground" data-testid="text-created-username">{created.username}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Temporary Password</p>
                <p className="text-sm font-mono font-semibold text-foreground" data-testid="text-created-password">{created.tempPassword}</p>
              </div>
            </div>

            <p className="text-xs text-amber-600 mt-3">
              Share these credentials with {created.firstName}. They will be asked to change their password on first login.
            </p>

            <button
              onClick={copyCredentials}
              className="mt-3 flex items-center gap-2 mx-auto text-xs text-primary font-semibold"
              data-testid="button-copy-credentials"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy credentials"}
            </button>
          </div>

          <button
            onClick={onBack}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg"
            data-testid="button-done-create-user"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-create-user-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground">Add Staff Member</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4" data-testid="form-create-user">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2" data-testid="text-create-user-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-sm text-muted-foreground">
          A username and temporary password will be auto-generated. The staff member must change their password on first login.
        </div>

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
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50"
          data-testid="button-submit-create-user"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

interface Invite {
  id: number;
  token: string;
  expiresAt: string | null;
  createdAt: string;
}

function InviteLinkManager() {
  const { token } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function loadInvites() {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInvites(data);
    } finally {
      setLoading(false);
    }
  }

  async function createInvite() {
    setCreating(true);
    try {
      const body: Record<string, unknown> = {};
      if (expiresInDays) body.expiresInDays = parseInt(expiresInDays, 10);

      const res = await fetch(`${getApiUrl()}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setInvites((prev) => [data, ...prev]);
    } finally {
      setCreating(false);
    }
  }

  async function revokeInvite(id: number) {
    await fetch(`${getApiUrl()}/invites/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  function getInviteUrl(inviteToken: string): string {
    const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${base}/join/${inviteToken}`;
  }

  function copyLink(invite: Invite) {
    navigator.clipboard.writeText(getInviteUrl(invite.token));
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleExpanded() {
    if (!expanded) {
      loadInvites();
    }
    setExpanded(!expanded);
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-invite-links">
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
        data-testid="button-toggle-invite-manager"
      >
        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <Link2 className="w-4 h-4 text-teal-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Invite Links</p>
          <p className="text-xs text-muted-foreground">Generate links to invite staff directly</p>
        </div>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Expires in (days, optional)</label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="Never"
                min="1"
                className="input-field text-sm"
                data-testid="input-invite-expires"
              />
            </div>
            <button
              onClick={createInvite}
              disabled={creating}
              className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 flex-shrink-0"
              data-testid="button-generate-invite"
            >
              {creating ? "..." : "Generate Link"}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-xs">Loading...</div>
          ) : invites.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2" data-testid="text-no-invites">
              No active invite links. Generate one above.
            </p>
          ) : (
            <div className="space-y-2" data-testid="list-invites">
              {invites.map((invite) => (
                <div key={invite.id} className="bg-muted/40 rounded-lg px-3 py-2.5 flex items-center gap-2" data-testid={`row-invite-${invite.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-foreground truncate">{getInviteUrl(invite.token)}</p>
                    {invite.expiresAt && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => copyLink(invite)}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors text-primary"
                    data-testid={`button-copy-invite-${invite.id}`}
                    title="Copy link"
                  >
                    {copiedId === invite.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => revokeInvite(invite.id)}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors text-destructive"
                    data-testid={`button-revoke-invite-${invite.id}`}
                    title="Revoke link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
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

function RecognitionTiersView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: tiers, isLoading } = useListRecognitionTiers({
    query: { queryKey: getListRecognitionTiersQueryKey() },
  });

  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListRecognitionTiersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListRecognitionQualifiersQueryKey() });
  };

  const createMutation = useCreateRecognitionTier({
    mutation: {
      onSuccess: () => { invalidate(); resetForm(); },
    },
  });
  const updateMutation = useUpdateRecognitionTier({
    mutation: {
      onSuccess: () => { invalidate(); resetForm(); },
    },
  });
  const deleteMutation = useDeleteRecognitionTier({
    mutation: { onSuccess: invalidate },
  });

  function resetForm() {
    setName(""); setThreshold("10"); setDescription("");
    setShowForm(false); setEditingId(null);
  }

  function startEdit(tier: RecognitionTier) {
    setEditingId(tier.id);
    setName(tier.name);
    setThreshold(String(tier.thresholdPoints));
    setDescription(tier.description ?? "");
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { name, thresholdPoints: parseInt(threshold, 10), description: description || null };
    if (editingId != null) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate({ data });
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-tiers-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Recognition Tiers</h1>
          <button
            onClick={() => { if (showForm) { resetForm(); } else { setShowForm(true); } }}
            className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg"
            data-testid="button-toggle-tier-form"
          >
            {showForm ? "Cancel" : "Add New"}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Define the merit-point thresholds at which a student earns a recognition action — e.g. a letter to parents, a newsletter mention, a certificate, or a trophy nomination.
        </p>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 space-y-3" data-testid="form-create-tier">
            <Field label="Action name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Letter to Parents"
                required
                className="input-field"
                data-testid="input-tier-name"
              />
            </Field>
            <Field label="Merit points threshold">
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                min="1"
                max="1000"
                required
                className="input-field"
                data-testid="input-tier-threshold"
              />
            </Field>
            <Field label="Description (optional)">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What action staff should take..."
                className="input-field"
                data-testid="input-tier-description"
              />
            </Field>
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-lg disabled:opacity-50 text-sm"
              data-testid="button-submit-tier"
            >
              {pending ? "Saving..." : editingId != null ? "Save Changes" : "Create Tier"}
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden" data-testid="list-recognition-tiers">
            {(tiers ?? []).length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No recognition tiers yet. Add one above.
              </div>
            ) : (
              (tiers ?? []).map((tier) => (
                <div key={tier.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-tier-${tier.id}`}>
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{tier.name}</p>
                    {tier.description && (
                      <p className="text-xs text-muted-foreground truncate">{tier.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex-shrink-0">
                    {tier.thresholdPoints} pts
                  </span>
                  <button
                    onClick={() => startEdit(tier)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                    data-testid={`button-edit-tier-${tier.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${tier.name}"?`)) deleteMutation.mutate({ id: tier.id }); }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors flex-shrink-0"
                    data-testid={`button-delete-tier-${tier.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RewardRecognitionView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: qualifiers, isLoading } = useListRecognitionQualifiers({
    query: { queryKey: getListRecognitionQualifiersQueryKey() },
  });
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListRecognitionQualifiersQueryKey() });
  }

  const awardMutation = useAwardRecognition({
    mutation: { onSettled: () => { refresh(); setBusyKey(null); } },
  });
  const removeMutation = useRemoveRecognitionAward({
    mutation: { onSettled: () => { refresh(); setBusyKey(null); } },
  });

  function markActioned(studentId: number, tierId: number) {
    setBusyKey(`${studentId}:${tierId}`);
    awardMutation.mutate({ data: { studentId, tierId } });
  }

  function undoActioned(studentId: number, tierId: number, awardId: number) {
    setBusyKey(`${studentId}:${tierId}`);
    removeMutation.mutate({ id: awardId });
  }

  const allQualifiers = qualifiers ?? [];
  const visible = filter === "pending"
    ? allQualifiers.filter((q) => q.pendingCount > 0)
    : allQualifiers;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-recognition-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Reward Recognition</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Students who have crossed a recognition threshold. Mark each tier as actioned once the letter, certificate, or nomination has been handled.
        </p>

        <div className="flex gap-2" data-testid="recognition-filter-tabs">
          <button
            onClick={() => setFilter("pending")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter === "pending" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            data-testid="button-filter-pending"
          >
            Pending action
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
            data-testid="button-filter-all"
          >
            All qualifiers
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : visible.length === 0 ? (
          <div className="bg-card border border-border rounded-xl px-4 py-10 text-center" data-testid="empty-recognition">
            <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              {filter === "pending" ? "Nothing pending" : "No students qualify yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "pending"
                ? "All recognitions have been actioned. Switch to All qualifiers to review them."
                : "Once students earn enough merit points, they'll appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="list-recognition-qualifiers">
            {visible.map((q) => (
              <div key={q.studentId} className="bg-card border border-border rounded-xl p-4" data-testid={`row-qualifier-${q.studentId}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Award className="w-4.5 h-4.5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{q.studentName}</p>
                      <span className="text-xs font-bold text-green-600 flex-shrink-0">{q.totalMerits} pts</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{q.studentCode} · Grade {q.grade} {q.className}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {q.earnedTiers.map((t) => {
                    const key = `${q.studentId}:${t.id}`;
                    const busy = busyKey === key;
                    return (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
                          t.actioned ? "bg-green-50 border border-green-200" : "bg-muted/50 border border-border"
                        }`}
                        data-testid={`tier-row-${q.studentId}-${t.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">{t.name}</span>
                            {t.id === q.highestTier.id && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500 text-white flex-shrink-0">Highest</span>
                            )}
                          </div>
                          {t.actioned ? (
                            <p className="text-[11px] text-green-700 mt-0.5" data-testid={`tier-actioned-${q.studentId}-${t.id}`}>
                              Actioned{t.awardedAt ? ` ${new Date(t.awardedAt).toLocaleDateString()}` : ""}
                              {t.awardedByName ? ` by ${t.awardedByName}` : ""}
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground mt-0.5">Threshold {t.thresholdPoints} pts · pending</p>
                          )}
                        </div>
                        {t.actioned ? (
                          <button
                            onClick={() => t.awardId != null && undoActioned(q.studentId, t.id, t.awardId)}
                            disabled={busy || t.awardId == null}
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0"
                            data-testid={`button-undo-${q.studentId}-${t.id}`}
                          >
                            <Undo2 className="w-3 h-3" /> Undo
                          </button>
                        ) : (
                          <button
                            onClick={() => markActioned(q.studentId, t.id)}
                            disabled={busy}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
                            data-testid={`button-mark-actioned-${q.studentId}-${t.id}`}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Mark done
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
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
            <option value="AS Level">AS Level</option>
            <option value="A2 Level">A2 Level</option>
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

type ParsedRow = ImportStudentRow & { _rowIndex: number; _errors: string[] };

async function parseFileToRows(file: File): Promise<ParsedRow[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const parser = new DOMParser();
    const doc = parser.parseFromString(result.value, "text/html");
    const tables = doc.querySelectorAll("table");
    if (tables.length > 0) {
      const rows = Array.from(tables[0].querySelectorAll("tr"));
      const header = Array.from(rows[0]?.querySelectorAll("td,th") ?? []).map((td) =>
        td.textContent?.trim().toLowerCase() ?? ""
      );
      return rows.slice(1).map((tr, i) => {
        const cells = Array.from(tr.querySelectorAll("td,th")).map((td) => td.textContent?.trim() ?? "");
        const obj: Record<string, string> = {};
        header.forEach((h, hi) => { obj[h] = cells[hi] ?? ""; });
        return normaliseRow(obj, i + 2);
      });
    }
    const nameLinePattern = /^([A-Z][a-zA-Z'-]+)([,\s]+([A-Z][a-zA-Z'-]+)){1,2}$/;
    const paragraphs = Array.from(doc.querySelectorAll("p"))
      .map((p) => p.textContent?.trim() ?? "")
      .filter((line) => line.length > 0 && nameLinePattern.test(line) && !/\d/.test(line));
    if (paragraphs.length === 0) throw new Error("No tables or name lines found in Word document");
    return paragraphs.map((line, i) => {
      const { firstName, lastName } = splitFullName(line);
      return normaliseRow({ "first name": firstName, "last name": lastName }, i + 1);
    });
  }

  const XLSX = await import("xlsx");
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  return jsonRows.map((row, i) => normaliseRow(row, i + 2));
}

function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  let matches = 0;
  const usedB = new Array(b.length).fill(false);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (!usedB[j] && a[i] === b[j]) { matches++; usedB[j] = true; break; }
    }
  }
  return matches / Math.max(a.length, b.length);
}

const FIELD_SYNONYMS: Record<string, string[]> = {
  studentId: ["studentid", "student_id", "student id", "student number", "studentnumber", "id", "no", "no.", "number", "roll", "roll number", "rollnumber"],
  firstName: ["firstname", "first_name", "first name", "given name", "givenname", "given_name", "forename", "fore name", "preferred name"],
  lastName: ["lastname", "last_name", "last name", "surname", "family name", "familyname", "family_name"],
  fullName: ["name", "full name", "fullname", "full_name", "student name", "student's name", "student full name", "student's full name"],
  grade: ["grade", "year", "level", "year level", "yearlevel", "year_level", "grade level"],
  className: ["classname", "class_name", "class", "classroom", "room", "homeroom", "home room", "section"],
};

function fuzzyFind(raw: Record<string, string>, field: keyof typeof FIELD_SYNONYMS): string {
  const synonyms = FIELD_SYNONYMS[field];
  const rawKeys = Object.keys(raw);
  for (const k of synonyms) {
    const exact = rawKeys.find((rk) => rk.trim().toLowerCase() === k);
    if (exact) return String(raw[exact]).trim();
  }
  let bestKey = "";
  let bestScore = 0;
  for (const rk of rawKeys) {
    const normalised = rk.trim().toLowerCase();
    for (const k of synonyms) {
      const score = similarityScore(normalised, k);
      if (score > bestScore && score >= 0.75) { bestScore = score; bestKey = rk; }
    }
  }
  return bestKey ? String(raw[bestKey]).trim() : "";
}

const TITLE_RE = /^\s*(mr\.?|mrs\.?|ms\.?|miss\.?|dr\.?|prof\.?|rev\.?)\s+/i;

function stripTitle(name: string): string {
  return name.replace(TITLE_RE, "").trim();
}

const LOWERCASE_PARTICLES = new Set(["van", "de", "der", "den", "du", "von", "la", "le", "ter"]);

function titleCaseSegment(segment: string, isFirst: boolean): string {
  if (!segment) return segment;
  if (segment.includes("-")) {
    return segment.split("-").map((p, i) => titleCaseSegment(p, i === 0)).join("-");
  }
  if (segment.includes("'")) {
    return segment.split("'").map((p) => p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : "").join("'");
  }
  const lower = segment.toLowerCase();
  if (!isFirst && LOWERCASE_PARTICLES.has(lower)) return lower;
  return segment[0].toUpperCase() + segment.slice(1).toLowerCase();
}

function toTitleCase(name: string): string {
  if (!name) return name;
  return name.split(/\s+/).map((token, i) => titleCaseSegment(token, i === 0)).join(" ");
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = stripTitle(fullName.trim());
  if (!trimmed) return { firstName: "", lastName: "" };
  if (trimmed.includes(",")) {
    const [last, ...firstParts] = trimmed.split(",").map((s) => s.trim());
    return { firstName: toTitleCase(firstParts.join(" ")), lastName: toTitleCase(last) };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: toTitleCase(parts[0]), lastName: "" };
  const firstToken = parts[0];
  const firstIsAllCaps = firstToken === firstToken.toUpperCase() && /[A-Z]/.test(firstToken);
  if (firstIsAllCaps) {
    return { firstName: toTitleCase(parts.slice(1).join(" ")), lastName: toTitleCase(firstToken) };
  }
  return { firstName: toTitleCase(parts.slice(0, parts.length - 1).join(" ")), lastName: toTitleCase(parts[parts.length - 1]) };
}

function normaliseGradeValue(raw: string): string {
  const v = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (["as", "aslevel", "aslvl", "alevel"].includes(v)) return "AS Level";
  if (["a2", "a2level", "a2lvl"].includes(v)) return "A2 Level";
  const numMatch = raw.trim().match(/^(?:grade\s*)?(\d+)$/i);
  if (numMatch) return numMatch[1];
  return raw.trim();
}

function normaliseRow(raw: Record<string, string>, rowIndex: number): ParsedRow {
  const rawStudentId = fuzzyFind(raw, "studentId");
  const studentId = rawStudentId || `AUTO-${String(rowIndex).padStart(3, "0")}`;
  let firstName = toTitleCase(stripTitle(fuzzyFind(raw, "firstName")));
  let lastName = toTitleCase(stripTitle(fuzzyFind(raw, "lastName")));

  if (!firstName && !lastName) {
    const fullName = fuzzyFind(raw, "fullName");
    if (fullName) {
      const split = splitFullName(fullName);
      firstName = split.firstName;
      lastName = split.lastName;
    }
  }

  const grade = normaliseGradeValue(fuzzyFind(raw, "grade"));
  const className = fuzzyFind(raw, "className");

  const errors: string[] = [];
  if (!firstName) errors.push("Missing First Name");
  if (!lastName) errors.push("Missing Last Name");
  if (!grade) errors.push("Missing Grade");
  if (!className) errors.push("Missing Class");

  return { studentId, firstName, lastName, grade, className, _rowIndex: rowIndex, _errors: errors };
}

function recomputeErrors(row: Omit<ParsedRow, "_errors">): string[] {
  const errors: string[] = [];
  if (!row.firstName) errors.push("Missing First Name");
  if (!row.lastName) errors.push("Missing Last Name");
  if (!row.grade) errors.push("Missing Grade");
  if (!row.className) errors.push("Missing Class");
  return errors;
}

function ImportEditableCell({
  field,
  value,
  rowIndex,
  isInvalid,
  isAuto,
  errorMessage,
  mono,
  onChange,
}: {
  field: string;
  value: string;
  rowIndex: number;
  isInvalid: boolean;
  isAuto?: boolean;
  errorMessage?: string;
  mono?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <input
        type="text"
        defaultValue={value}
        placeholder={isInvalid ? "required" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-w-0 bg-transparent border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary ${
          mono ? "font-mono" : ""
        } ${
          isInvalid
            ? "border-destructive/60 placeholder:text-destructive/50 text-destructive"
            : isAuto
              ? "border-border/50 text-muted-foreground italic"
              : "border-border/50 text-foreground"
        }`}
        data-testid={`edit-${field}-${rowIndex}`}
      />
      {errorMessage && (
        <span className="text-[10px] leading-tight text-destructive font-medium" data-testid={`error-${field}-${rowIndex}`}>
          {errorMessage}
        </span>
      )}
    </div>
  );
}

function downloadTemplate() {
  const csv = [
    "studentId,firstName,lastName,grade,className",
    "2024001,Jane,Doe,Grade 10,10A",
    "2024002,John,Smith,AS Level,AS1",
    "# --- OR use a single 'name' column instead of firstName+lastName ---",
    "# name,studentId,grade,className",
    "# BANDA Peter,2024003,10,10B   <- ALL CAPS first token = surname-first: firstName=Peter lastName=Banda",
    "# BANDA PETER,2024004,10,10B   <- ALL CAPS first token = surname-first: firstName=Peter lastName=Banda",
    "# Doe Jane,2024005,10,10B      <- mixed case first token = natural order: firstName=Doe lastName=Jane",
    "# Doe, Jane,2024006,10,10B     <- comma-separated: firstName=Jane lastName=Doe",
    "# Mr John Smith,2024007,10,10B <- title stripped automatically: firstName=John lastName=Smith",
  ].join("\n") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "student_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ResultsSummary({ result, onReset }: { result: { imported: number; updated: number; failed: ImportFailure[] }; onReset: () => void }) {
  const skippedRows = result.failed.filter((f) => f.reason === "Duplicate student ID");
  const errorRows = result.failed.filter((f) => f.reason !== "Duplicate student ID");
  return (
    <div className="space-y-3" data-testid="section-import-results">
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 space-y-1">
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-green-800">Import complete</p>
        </div>
        {result.imported > 0 && (
          <p className="text-sm text-green-700 ml-7" data-testid="text-imported-count">
            {result.imported} student{result.imported !== 1 ? "s" : ""} added.
          </p>
        )}
        {result.updated > 0 && (
          <p className="text-sm text-green-700 ml-7" data-testid="text-updated-count">
            {result.updated} student{result.updated !== 1 ? "s" : ""} updated.
          </p>
        )}
        {result.imported === 0 && result.updated === 0 && (
          <p className="text-sm text-green-700 ml-7">No students were added or updated.</p>
        )}
        {skippedRows.length > 0 && (
          <p className="text-sm text-amber-700 ml-7" data-testid="text-skipped-count">
            {skippedRows.length} already existed and {skippedRows.length === 1 ? "was" : "were"} skipped.
          </p>
        )}
        {errorRows.length > 0 && (
          <p className="text-sm text-destructive ml-7">
            {errorRows.length} row{errorRows.length !== 1 ? "s" : ""} failed with errors.
          </p>
        )}
      </div>

      {skippedRows.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden" data-testid="table-skipped-rows">
          <div className="px-4 py-3 border-b border-amber-200">
            <p className="text-sm font-semibold text-amber-800">Already existed (skipped)</p>
          </div>
          <div className="divide-y divide-amber-100">
            {skippedRows.map((f) => (
              <div key={f.row} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0">Already exists</span>
                <p className="text-xs text-amber-800">Row {f.row} — <span className="font-mono">{f.studentId}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorRows.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="table-failed-rows">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Failed rows</p>
          </div>
          <div className="divide-y divide-border">
            {errorRows.map((f) => (
              <div key={f.row} className="px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Row {f.row} — {f.studentId}</p>
                  <p className="text-xs text-muted-foreground">{f.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full bg-muted text-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/70 transition-colors"
        data-testid="button-import-another"
      >
        Import Another File
      </button>
    </div>
  );
}

function ImportStudentsView({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<{ imported: number; updated: number; failed: ImportFailure[] } | null>(null);

  const { data: existingStudentIds } = useListStudentIds();

  const existingStudentIdSet = useMemo(() => {
    const set = new Set<string>();
    if (!existingStudentIds) return set;
    for (const studentId of existingStudentIds) {
      const idx = studentId.indexOf("-");
      const raw = idx !== -1 ? studentId.substring(idx + 1) : studentId;
      set.add(raw.toLowerCase());
    }
    return set;
  }, [existingStudentIds]);

  const importMutation = useImportStudents({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListStudentIdsQueryKey() });
      },
    },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setRows(null);
    setResult(null);
    setFileName(file.name);
    setIsParsing(true);
    try {
      const parsed = await parseFileToRows(file);
      setRows(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  }

  function handleImport() {
    if (!rows || invalidRows.length > 0) return;
    importMutation.mutate({
      data: {
        rows: rows.map(({ studentId, firstName, lastName, grade, className, _rowIndex }) => ({
          studentId: studentId.startsWith("AUTO-") ? "" : studentId,
          firstName,
          lastName,
          grade,
          className,
          _rowIndex,
        })) as import("@workspace/api-client-react").ImportStudentRow[],
        updateExisting,
      },
    });
  }

  function updateRow(rowIndex: number, field: keyof Omit<ParsedRow, "_rowIndex" | "_errors">, value: string) {
    setRows((prev) =>
      prev
        ? prev.map((r) => {
            if (r._rowIndex !== rowIndex) return r;
            const updated = { ...r, [field]: value.trim() };
            return { ...updated, _errors: recomputeErrors(updated) };
          })
        : prev
    );
  }

  const duplicateRowIndices = useMemo(() => {
    if (!rows) return new Set<number>();
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    for (const row of rows) {
      if (!row.studentId || row.studentId.startsWith("AUTO-")) continue;
      const key = row.studentId.trim().toLowerCase();
      if (seen.has(key)) {
        dupes.add(row._rowIndex);
      } else {
        seen.set(key, row._rowIndex);
      }
    }
    return dupes;
  }, [rows]);

  const existingRowIndices = useMemo(() => {
    if (!rows) return new Set<number>();
    const set = new Set<number>();
    for (const row of rows) {
      if (row.studentId && existingStudentIdSet.has(row.studentId.trim().toLowerCase())) {
        set.add(row._rowIndex);
      }
    }
    return set;
  }, [rows, existingStudentIdSet]);

  const validRows = rows?.filter((r) => r._errors.length === 0 && !duplicateRowIndices.has(r._rowIndex)) ?? [];
  const invalidRows = rows?.filter((r) => r._errors.length > 0 || duplicateRowIndices.has(r._rowIndex)) ?? [];
  const existingCount = existingRowIndices.size;
  const newCount = validRows.filter((r) => !existingRowIndices.has(r._rowIndex)).length;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-import-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Import Students</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Info card */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Accepted formats</p>
              <p className="text-xs text-muted-foreground">CSV (.csv), Excel (.xlsx, .xls), Word (.docx)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Table className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Required columns</p>
              <p className="text-xs text-muted-foreground font-mono">firstName, lastName, grade, className</p>
              <p className="text-xs text-muted-foreground">studentId is optional — auto-assigned if omitted</p>
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
            data-testid="button-download-template"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV Template
          </button>
        </div>

        {/* Update existing toggle */}
        {!result && (
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">Update existing students</p>
              <p className="text-xs text-muted-foreground">When on, rows with a matching ID update the student's name, grade and class instead of being skipped.</p>
            </div>
            <button
              role="switch"
              aria-checked={updateExisting}
              onClick={() => setUpdateExisting((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${updateExisting ? "bg-primary" : "bg-muted"}`}
              data-testid="toggle-update-existing"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${updateExisting ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>
        )}

        {/* File picker */}
        {!result && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Select file</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.docx"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-import-file"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="w-full border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/20 transition-colors disabled:opacity-50"
              data-testid="button-pick-file"
            >
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {isParsing ? "Parsing file..." : fileName || "Tap to choose a file"}
              </span>
              {fileName && !isParsing && (
                <span className="text-xs text-muted-foreground">{fileName}</span>
              )}
            </button>
          </div>
        )}

        {parseError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl flex items-center gap-2" data-testid="text-parse-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {parseError}
          </div>
        )}

        {/* Preview table */}
        {rows && rows.length > 0 && !result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Preview — {rows.length} row{rows.length !== 1 ? "s" : ""} found
              </p>
              <div className="flex items-center gap-2">
                {existingCount > 0 && (
                  <span className="text-xs text-amber-600 font-medium" data-testid="label-existing-count">{existingCount} already exist</span>
                )}
                {invalidRows.length > 0 && (
                  <span className="text-xs text-destructive font-medium">{invalidRows.length} invalid</span>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs" data-testid="table-preview">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Row</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">First</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Last</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Grade</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => {
                      const isDuplicate = duplicateRowIndices.has(row._rowIndex);
                      const isExisting = !isDuplicate && existingRowIndices.has(row._rowIndex);
                      const hasErrors = row._errors.length > 0 || isDuplicate;
                      return (
                        <tr
                          key={row._rowIndex}
                          className={hasErrors ? "bg-destructive/5" : isExisting ? "bg-amber-50/60" : ""}
                          data-testid={`preview-row-${row._rowIndex}`}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{row._rowIndex}</td>
                          <td className="px-2 py-1.5 max-w-[110px]">
                            <div className="flex flex-col gap-0.5">
                              <ImportEditableCell field="studentId" value={row.studentId} rowIndex={row._rowIndex} isInvalid={isDuplicate} isAuto={row.studentId.startsWith("AUTO-")} errorMessage={isDuplicate ? "Duplicate Student ID" : undefined} mono onChange={(v) => updateRow(row._rowIndex, "studentId", v)} />
                              {row.studentId.startsWith("AUTO-") && !isDuplicate && (
                                <span className="inline-block text-[10px] font-semibold rounded px-1 py-0 leading-4 w-fit border text-indigo-600 bg-indigo-50 border-indigo-200" data-testid={`badge-auto-${row._rowIndex}`}>
                                  auto
                                </span>
                              )}
                              {isExisting && (
                                <span className={`inline-block text-[10px] font-semibold rounded px-1 py-0 leading-4 w-fit border ${updateExisting ? "text-blue-700 bg-blue-50 border-blue-200" : "text-amber-700 bg-amber-100 border-amber-200"}`} data-testid={`badge-existing-${row._rowIndex}`}>
                                  {updateExisting ? "Will update" : "Already exists"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 max-w-[70px]">
                            <ImportEditableCell field="firstName" value={row.firstName} rowIndex={row._rowIndex} isInvalid={!row.firstName} onChange={(v) => updateRow(row._rowIndex, "firstName", v)} />
                          </td>
                          <td className="px-2 py-1.5 max-w-[70px]">
                            <ImportEditableCell field="lastName" value={row.lastName} rowIndex={row._rowIndex} isInvalid={!row.lastName} onChange={(v) => updateRow(row._rowIndex, "lastName", v)} />
                          </td>
                          <td className="px-2 py-1.5 max-w-[60px]">
                            <ImportEditableCell field="grade" value={row.grade} rowIndex={row._rowIndex} isInvalid={!row.grade} onChange={(v) => updateRow(row._rowIndex, "grade", v)} />
                          </td>
                          <td className="px-2 py-1.5 max-w-[60px]">
                            <ImportEditableCell field="className" value={row.className} rowIndex={row._rowIndex} isInvalid={!row.className} onChange={(v) => updateRow(row._rowIndex, "className", v)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {existingCount > 0 && invalidRows.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1" data-testid="notice-existing-rows">
                <p className="text-xs font-semibold text-amber-800">
                  {existingCount} student{existingCount !== 1 ? "s" : ""} already exist in the system
                </p>
                {updateExisting
                  ? <p className="text-xs text-amber-700">These rows will be <span className="font-semibold">updated</span> with the new values. {newCount} new student{newCount !== 1 ? "s" : ""} will be added.</p>
                  : <p className="text-xs text-amber-700">These rows will be skipped during import. Only {newCount} new student{newCount !== 1 ? "s" : ""} will be added.</p>
                }
              </div>
            )}

            {existingCount > 0 && invalidRows.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1" data-testid="notice-existing-rows">
                <p className="text-xs font-semibold text-amber-800">
                  {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} {invalidRows.length === 1 ? "has" : "have"} errors
                  {duplicateRowIndices.size > 0 && (
                    <span className="font-normal"> ({duplicateRowIndices.size} duplicate ID{duplicateRowIndices.size !== 1 ? "s" : ""})</span>
                  )}
                  {" · "}{existingCount} already exist ({updateExisting ? "will be updated" : "will be skipped"})
                </p>
                <p className="text-xs text-amber-700">Fix highlighted cells inline — edit the Student ID to make it unique, or fix missing fields. Import enables once all rows are valid.</p>
              </div>
            )}

            {invalidRows.length > 0 && existingCount === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-amber-800">
                  {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} {invalidRows.length === 1 ? "has" : "have"} errors
                  {duplicateRowIndices.size > 0 && (
                    <span className="font-normal"> ({duplicateRowIndices.size} duplicate ID{duplicateRowIndices.size !== 1 ? "s" : ""})</span>
                  )}
                </p>
                <p className="text-xs text-amber-700">Fix highlighted cells inline — edit the Student ID to make it unique, or fix missing fields. Import enables once all rows are valid.</p>
              </div>
            )}

            {importMutation.isError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl flex items-center gap-2" data-testid="text-import-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Import failed. Please try again.
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={importMutation.isPending || rows.length === 0 || invalidRows.length > 0}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50 transition-opacity"
              data-testid="button-confirm-import"
            >
              {importMutation.isPending
                ? "Importing..."
                : updateExisting && existingCount > 0
                  ? `Import — add ${newCount}, update ${existingCount}`
                  : existingCount > 0
                    ? `Import ${newCount} new student${newCount !== 1 ? "s" : ""} (${existingCount} will be skipped)`
                    : `Import ${rows.length} student${rows.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {rows && rows.length === 0 && !isParsing && (
          <div className="bg-card border border-border rounded-xl px-4 py-6 text-center text-sm text-muted-foreground" data-testid="text-empty-file">
            No data rows found in the file. Check the file format.
          </div>
        )}

        {/* Results summary */}
        {result && (
          <ResultsSummary result={result} onReset={() => {
            setRows(null);
            setFileName("");
            setResult(null);
            setParseError("");
            importMutation.reset();
            if (fileInputRef.current) fileInputRef.current.value = "";
          }} />
        )}
      </div>
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

  const [customPrimary, setCustomPrimary] = useState<string>(branding?.customPrimaryColor ?? "#1a56db");
  const [customAccent, setCustomAccent] = useState<string>(branding?.customAccentColor ?? "#f59e0b");

  function applyCurrentSelection(paletteName: string, primary: string, accent: string) {
    if (paletteName === "custom") {
      applyCustomPalette(primary, accent);
    } else {
      applyPalette(paletteName);
    }
  }

  function handlePaletteHover(paletteName: string) {
    applyPalette(paletteName);
    setPreviewPalette(paletteName);
  }

  function handlePaletteLeave() {
    setPreviewPalette(null);
    applyCurrentSelection(selectedPalette, customPrimary, customAccent);
  }

  function handlePaletteSelect(paletteName: string) {
    setSelectedPalette(paletteName);
    applyPalette(paletteName);
    setPreviewPalette(null);
  }

  function handleCustomPrimaryChange(hex: string) {
    setCustomPrimary(hex);
    setSelectedPalette("custom");
    setPreviewPalette(null);
    applyCustomPalette(hex, customAccent);
  }

  function handleCustomAccentChange(hex: string) {
    setCustomAccent(hex);
    setSelectedPalette("custom");
    setPreviewPalette(null);
    applyCustomPalette(customPrimary, hex);
  }

  function handleSelectCustom() {
    setSelectedPalette("custom");
    setPreviewPalette(null);
    applyCustomPalette(customPrimary, customAccent);
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
      const body: Record<string, string | null> = { colorPalette: selectedPalette };
      if (selectedPalette === "custom") {
        body.customPrimaryColor = customPrimary;
        body.customAccentColor = customAccent;
      }

      const res = await fetch(`${getApiUrl()}/school/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
      <div className="bg-primary text-primary-foreground px-4 pt-4 pb-3 sticky top-7 z-40">
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

          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
              selectedPalette === "custom"
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/40"
            }`}
            onClick={handleSelectCustom}
            data-testid="palette-option-custom"
          >
            <div className="flex gap-1 flex-shrink-0">
              <div className="w-5 h-5 rounded-md border border-border/50" style={{ background: customPrimary }} />
              <div className="w-5 h-5 rounded-md border border-border/50" style={{ background: customAccent }} />
            </div>
            <span className="text-xs font-medium text-foreground flex-1">Custom Colours</span>
            {selectedPalette === "custom" && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </div>

          {selectedPalette === "custom" && (
            <div className="bg-muted/30 border border-border rounded-lg p-3 space-y-3" data-testid="custom-colour-picker">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground block mb-1">Primary Colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customPrimary}
                      onChange={(e) => handleCustomPrimaryChange(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0.5"
                      data-testid="input-custom-primary"
                    />
                    <span className="text-xs text-muted-foreground font-mono uppercase">{customPrimary}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-foreground block mb-1">Accent Colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customAccent}
                      onChange={(e) => handleCustomAccentChange(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0.5"
                      data-testid="input-custom-accent"
                    />
                    <span className="text-xs text-muted-foreground font-mono uppercase">{customAccent}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSavePalette}
            disabled={
              saving ||
              (selectedPalette === (branding?.colorPalette ?? "navy-gold") &&
                (selectedPalette !== "custom" ||
                  (customPrimary === (branding?.customPrimaryColor ?? "#1a56db") &&
                    customAccent === (branding?.customAccentColor ?? "#f59e0b"))))
            }
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
