import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatTime } from "@/lib/status";
import {
  useListActivities,
  useGetActivity,
  useCreateActivity,
  useUpdateActivity,
  getListActivitiesQueryKey,
  getGetActivityQueryKey,
} from "@workspace/api-client-react";
import type { ActivityWithCounts } from "@workspace/api-client-react";
import {
  CalendarDays,
  ChevronRight,
  Plus,
  CheckCircle2,
  X,
  Users,
  QrCode,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-800",
};

const TYPE_TABS = [
  { value: "", label: "All" },
  { value: "class", label: "Class" },
  { value: "event", label: "Event" },
  { value: "assembly", label: "Assembly" },
  { value: "club", label: "Club" },
  { value: "detention", label: "Detention" },
];

const ACTIVITY_TYPES = [
  { value: "class", label: "Class" },
  { value: "event", label: "Event" },
  { value: "assembly", label: "Assembly" },
  { value: "activity", label: "Activity" },
  { value: "detention", label: "Detention" },
  { value: "club", label: "Club" },
];

export default function ActivitiesPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");

  const { data: activities, isLoading } = useListActivities(
    typeFilter ? { activityType: typeFilter } : undefined,
    {
      query: {
        queryKey: getListActivitiesQueryKey(typeFilter ? { activityType: typeFilter } : undefined),
        refetchInterval: 30000,
      },
    }
  );

  if (selectedId) {
    return (
      <ActivityDetailView
        id={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  if (showCreate) {
    return (
      <CreateActivityView
        onBack={() => setShowCreate(false)}
        onCreated={() => setShowCreate(false)}
      />
    );
  }

  const today = activities ?? [];
  const active = today.filter((a) => a.status === "active");
  const upcoming = today.filter((a) => a.status === "upcoming");
  const past = today.filter((a) => a.status === "completed" || a.status === "cancelled");

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-6">
      <PageHeader
        title="Activities"
        subtitle={`${active.length} active`}
        showLogo={true}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="p-1.5 rounded-lg bg-white/20 text-primary-foreground hover:bg-white/30 transition-colors"
            data-testid="button-create-activity"
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />

      {/* Type filter tabs */}
      <div className="max-w-lg md:max-w-5xl mx-auto w-full px-4 md:px-6 pt-3 pb-1">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                typeFilter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-activity-type-${tab.value || "all"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg md:max-w-5xl mx-auto w-full px-4 md:px-6 py-3 space-y-4">
        {isLoading && (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        )}

        {active.length > 0 && (
          <Section title="Active Now" count={active.length}>
            {active.map((a) => (
              <ActivityCard key={a.id} activity={a} onClick={() => setSelectedId(a.id)} />
            ))}
          </Section>
        )}

        {upcoming.length > 0 && (
          <Section title="Upcoming" count={upcoming.length}>
            {upcoming.map((a) => (
              <ActivityCard key={a.id} activity={a} onClick={() => setSelectedId(a.id)} />
            ))}
          </Section>
        )}

        {past.length > 0 && (
          <Section title="Completed" count={past.length}>
            {past.map((a) => (
              <ActivityCard key={a.id} activity={a} onClick={() => setSelectedId(a.id)} />
            ))}
          </Section>
        )}

        {!isLoading && today.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No activities scheduled</p>
            <p className="text-xs mt-1">Tap + to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h3>
        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{children}</div>
    </div>
  );
}

function ActivityCard({ activity, onClick }: { activity: ActivityWithCounts; onClick: () => void }) {
  const completion = activity.expectedCount > 0
    ? Math.round((activity.presentCount / activity.expectedCount) * 100)
    : 0;

  return (
    <button
      onClick={onClick}
      className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors"
      data-testid={`card-activity-${activity.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                STATUS_COLORS[activity.status] ?? "bg-muted text-muted-foreground"
              }`}
              data-testid={`status-activity-${activity.id}`}
            >
              {activity.status}
            </span>
            <span className="text-xs text-muted-foreground capitalize">{activity.activityType}</span>
          </div>
          <p className="font-semibold text-foreground truncate">{activity.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatTime(activity.startTime)}
            {activity.endTime && ` - ${formatTime(activity.endTime)}`}
            {activity.staffName && ` · ${activity.staffName}`}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>

      {activity.expectedCount > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Attendance
            </span>
            <span>{activity.presentCount}/{activity.expectedCount}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

function ActivityDetailView({ id, onBack }: { id: number; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetActivity(id, {
    query: {
      queryKey: getGetActivityQueryKey(id),
      refetchInterval: 15000,
    },
  });

  const updateMutation = useUpdateActivity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetActivityQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
      },
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <PageHeader title="Activity" />
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-activity-back"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-foreground truncate">{data.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">{data.activityType}</p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              STATUS_COLORS[data.status] ?? "bg-muted text-muted-foreground"
            }`}
            data-testid="status-activity-detail"
          >
            {data.status}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Time info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Start Time</p>
              <p className="font-semibold text-foreground">{formatTime(data.startTime)}</p>
            </div>
            {data.endTime && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">End Time</p>
                <p className="font-semibold text-foreground">{formatTime(data.endTime)}</p>
              </div>
            )}
          </div>
          {data.description && (
            <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
              {data.description}
            </p>
          )}
        </div>

        {/* Attendance stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center" data-testid="stat-present-count">
            <p className="text-2xl font-bold text-green-600">{data.presentCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Present</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center" data-testid="stat-missing-count">
            <p className="text-2xl font-bold text-red-600">{data.missingCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Missing</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center" data-testid="stat-expected-count">
            <p className="text-2xl font-bold text-foreground">{data.expectedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Expected</p>
          </div>
        </div>

        {/* Start scanning shortcut */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <QrCode className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Scan Attendance</p>
            <p className="text-xs text-muted-foreground">Use the Scan tab to record attendance for this activity</p>
          </div>
        </div>

        {/* Status controls */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Update Status
          </p>
          <div className="flex gap-2">
            {["upcoming", "active", "completed", "cancelled"].map((s) => (
              <button
                key={s}
                onClick={() => updateMutation.mutate({ id, data: { status: s } })}
                disabled={data.status === s || updateMutation.isPending}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  data.status === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                data-testid={`button-set-status-${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Missing students */}
        {data.missingStudents.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-missing-students">
            <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex justify-between">
              <h3 className="text-sm font-semibold text-red-800">Missing Students</h3>
              <span className="text-xs font-bold text-red-800">{data.missingStudents.length}</span>
            </div>
            <div className="divide-y divide-border">
              {data.missingStudents.slice(0, 10).map((s) => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between" data-testid={`row-missing-student-${s.id}`}>
                  <div>
                    <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-muted-foreground">{s.studentId} · {s.className}</p>
                  </div>
                  <StatusBadge state={s.currentState} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Present students */}
        {data.presentStudents.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-present-students">
            <div className="px-4 py-2.5 bg-green-50 border-b border-green-100 flex justify-between">
              <h3 className="text-sm font-semibold text-green-800">Present Students</h3>
              <span className="text-xs font-bold text-green-800">{data.presentStudents.length}</span>
            </div>
            <div className="divide-y divide-border">
              {data.presentStudents.slice(0, 10).map((s) => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between" data-testid={`row-present-student-${s.id}`}>
                  <div>
                    <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-muted-foreground">{s.studentId} · {s.className}</p>
                  </div>
                  <StatusBadge state={s.currentState} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateActivityView({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("event");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");

  const createMutation = useCreateActivity({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
        onCreated();
      },
      onError: () => setError("Failed to create activity. Please try again."),
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    createMutation.mutate({
      data: {
        name: name.trim(),
        activityType: type,
        description: description.trim() || null,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        status: "upcoming",
      },
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-create-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground">New Activity</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4" data-testid="form-create-activity">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg" data-testid="text-create-error">
            {error}
          </div>
        )}

        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grade 10 Assembly"
            className="input-field"
            data-testid="input-activity-name"
          />
        </Field>

        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-field"
            data-testid="select-activity-type"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={3}
            className="input-field resize-none"
            data-testid="input-activity-description"
          />
        </Field>

        <Field label="Start Time">
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input-field"
            data-testid="input-activity-start-time"
          />
        </Field>

        <Field label="End Time (optional)">
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input-field"
            data-testid="input-activity-end-time"
          />
        </Field>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50"
          data-testid="button-submit-create-activity"
        >
          {createMutation.isPending ? "Creating..." : "Create Activity"}
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
