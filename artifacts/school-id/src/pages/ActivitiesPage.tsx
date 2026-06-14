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
import type { ActivityWithCounts, RecurrenceRule } from "@workspace/api-client-react";
import {
  CalendarDays,
  ChevronRight,
  Plus,
  X,
  Users,
  QrCode,
  CalendarCheck,
  Trophy,
  Megaphone,
  Clock3,
  GraduationCap,
  FlaskConical,
  Sparkles,
  CalendarPlus,
  Repeat,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_ACCENT: Record<string, string> = {
  upcoming: "border-l-blue-500",
  active: "border-l-green-500",
  completed: "border-l-slate-400",
  cancelled: "border-l-red-500",
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

type EventTemplate = {
  id: string;
  name: string;
  activityType: string;
  description: string;
  durationMinutes: number;
  icon: React.ReactNode;
  accent: string;
  defaultRecurrence?: RecurrenceRule;
};

// Standard event templates available to every school (not seeded demo data).
const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: "assembly",
    name: "School Assembly",
    activityType: "assembly",
    description: "Whole-school morning assembly.",
    durationMinutes: 30,
    icon: <Megaphone className="w-5 h-5" />,
    accent: "text-amber-600 bg-amber-50 border-amber-200",
    defaultRecurrence: { frequency: "weekly", weekdays: [1] },
  },
  {
    id: "sports-day",
    name: "Sports Day",
    activityType: "event",
    description: "Inter-house sports competition.",
    durationMinutes: 180,
    icon: <Trophy className="w-5 h-5" />,
    accent: "text-green-600 bg-green-50 border-green-200",
  },
  {
    id: "detention",
    name: "Detention",
    activityType: "detention",
    description: "After-school detention session.",
    durationMinutes: 60,
    icon: <Clock3 className="w-5 h-5" />,
    accent: "text-red-600 bg-red-50 border-red-200",
    defaultRecurrence: { frequency: "weekly", weekdays: [5] },
  },
  {
    id: "exam",
    name: "Exam Session",
    activityType: "event",
    description: "Supervised examination sitting.",
    durationMinutes: 120,
    icon: <CalendarCheck className="w-5 h-5" />,
    accent: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    id: "class",
    name: "Lesson / Class",
    activityType: "class",
    description: "Scheduled class period.",
    durationMinutes: 45,
    icon: <GraduationCap className="w-5 h-5" />,
    accent: "text-blue-600 bg-blue-50 border-blue-200",
    defaultRecurrence: { frequency: "weekly", weekdays: [1, 2, 3, 4, 5] },
  },
  {
    id: "club",
    name: "Club Meeting",
    activityType: "club",
    description: "Recurring club or society meeting.",
    durationMinutes: 60,
    icon: <FlaskConical className="w-5 h-5" />,
    accent: "text-teal-600 bg-teal-50 border-teal-200",
    defaultRecurrence: { frequency: "weekly", weekdays: [3] },
  },
];

export default function ActivitiesPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createTemplate, setCreateTemplate] = useState<EventTemplate | null | "custom">(null);
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

  if (createTemplate !== null) {
    return (
      <CreateActivityView
        template={createTemplate === "custom" ? null : createTemplate}
        onBack={() => setCreateTemplate(null)}
        onCreated={() => setCreateTemplate(null)}
      />
    );
  }

  const all = activities ?? [];
  const active = all.filter((a) => a.status === "active");
  const upcoming = all.filter((a) => a.status === "upcoming");
  const past = all.filter((a) => a.status === "completed" || a.status === "cancelled");
  const isEmpty = !isLoading && all.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-6">
      <PageHeader
        title="Activities"
        subtitle={`${active.length} active · ${upcoming.length} upcoming`}
        showLogo={true}
        action={
          <button
            onClick={() => setCreateTemplate("custom")}
            className="p-1.5 rounded-lg bg-white/20 text-primary-foreground hover:bg-white/30 transition-colors"
            data-testid="button-create-activity"
            aria-label="Create activity"
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />

      <div className="max-w-lg md:max-w-5xl mx-auto w-full px-4 md:px-6 py-4 space-y-5">
        {/* Intro / description */}
        <div className="bg-card border border-border rounded-xl p-4 md:p-5" data-testid="panel-activities-intro">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-foreground">Track attendance for school activities &amp; events</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create one-off or recurring events, then scan students in to record attendance.
                Standard events below come ready to use — just pick a date and time.
              </p>
            </div>
          </div>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="grid-activity-kpis">
          <KpiCard label="Total" value={all.length} accentClass="border-l-slate-400" testId="kpi-activities-total" />
          <KpiCard label="Active Now" value={active.length} accentClass="border-l-green-500" testId="kpi-activities-active" />
          <KpiCard label="Upcoming" value={upcoming.length} accentClass="border-l-blue-500" testId="kpi-activities-upcoming" />
          <KpiCard label="Completed" value={past.length} accentClass="border-l-slate-400" testId="kpi-activities-completed" />
        </div>

        {/* Quick-start standard events */}
        <div data-testid="panel-quick-start">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick start</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EVENT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setCreateTemplate(t)}
                className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                data-testid={`card-template-${t.id}`}
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-2 ${t.accent}`}>
                  {t.icon}
                </div>
                <p className="font-semibold text-foreground text-sm leading-tight">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                {t.defaultRecurrence && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium mt-1.5">
                    <Repeat className="w-3 h-3" /> Repeats
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Prominent create custom button */}
        <button
          onClick={() => setCreateTemplate("custom")}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm"
          data-testid="button-create-custom-activity"
        >
          <CalendarPlus className="w-5 h-5" />
          Create custom event / activity
        </button>

        {/* Type filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" data-testid="panel-type-tabs">
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

        {isEmpty && (
          <div
            className="bg-card border border-dashed border-border rounded-xl px-6 py-10 text-center"
            data-testid="panel-empty-state"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <CalendarDays className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">No activities scheduled yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Get started fast by tapping one of the <span className="font-medium text-foreground">Quick start</span> events
              above, or build your own with the button below.
            </p>
            <button
              onClick={() => setCreateTemplate("custom")}
              className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              data-testid="button-empty-create"
            >
              <CalendarPlus className="w-4 h-4" />
              Create your first event
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accentClass,
  testId,
}: {
  label: string;
  value: number;
  accentClass: string;
  testId: string;
}) {
  return (
    <div className={`bg-card border border-border border-l-4 ${accentClass} rounded-xl p-3 md:p-4`} data-testid={testId}>
      <p className="text-xl md:text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] md:text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function ActivityCard({ activity, onClick }: { activity: ActivityWithCounts; onClick: () => void }) {
  const completion = activity.expectedCount > 0
    ? Math.round((activity.presentCount / activity.expectedCount) * 100)
    : 0;
  const accent = STATUS_ACCENT[activity.status] ?? "border-l-slate-400";
  const repeats = activity.recurrencePattern && activity.recurrencePattern !== "none";

  return (
    <button
      onClick={onClick}
      className={`w-full bg-card border border-border border-l-4 ${accent} rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all`}
      data-testid={`card-activity-${activity.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                STATUS_COLORS[activity.status] ?? "bg-muted text-muted-foreground"
              }`}
              data-testid={`status-activity-${activity.id}`}
            >
              {activity.status}
            </span>
            <span className="text-xs text-muted-foreground capitalize">{activity.activityType}</span>
            {repeats && (
              <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium" data-testid={`badge-recurring-${activity.id}`}>
                <Repeat className="w-3 h-3" />
                {activity.recurrencePattern}
              </span>
            )}
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
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
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
          {data.recurrencePattern && data.recurrencePattern !== "none" && (
            <p className="text-xs text-primary font-medium mt-3 pt-3 border-t border-border flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              Part of a {data.recurrencePattern} series
            </p>
          )}
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

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function localDateTimeValue(base: Date): string {
  const off = base.getTimezoneOffset();
  return new Date(base.getTime() - off * 60000).toISOString().slice(0, 16);
}

function nextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

function CreateActivityView({
  template,
  onBack,
  onCreated,
}: {
  template: EventTemplate | null;
  onBack: () => void;
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name ?? "");
  const [type, setType] = useState(template?.activityType ?? "event");
  const [description, setDescription] = useState(template?.description ?? "");
  const [startTime, setStartTime] = useState(() => localDateTimeValue(nextHour()));
  const [endTime, setEndTime] = useState(() => {
    if (template?.durationMinutes) {
      const start = nextHour();
      return localDateTimeValue(new Date(start.getTime() + template.durationMinutes * 60000));
    }
    return "";
  });

  // Scheduling
  const [repeat, setRepeat] = useState<boolean>(!!template?.defaultRecurrence);
  const [frequency, setFrequency] = useState<"daily" | "weekly">(
    template?.defaultRecurrence?.frequency ?? "weekly"
  );
  const [weekdays, setWeekdays] = useState<number[]>(template?.defaultRecurrence?.weekdays ?? [1]);
  const [endMode, setEndMode] = useState<"until" | "count">("until");
  const [until, setUntil] = useState<string>("");
  const [count, setCount] = useState<string>("8");

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

  function toggleWeekday(d: number) {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }

    let recurrence: RecurrenceRule | null = null;
    if (repeat) {
      if (frequency === "weekly" && weekdays.length === 0) {
        setError("Pick at least one weekday for a weekly event");
        return;
      }
      if (endMode === "count") {
        const n = parseInt(count, 10);
        if (isNaN(n) || n < 1) { setError("Enter a valid number of occurrences"); return; }
        recurrence = {
          frequency,
          ...(frequency === "weekly" ? { weekdays } : {}),
          count: n,
        };
      } else {
        if (!until) { setError("Pick an end date for the repeat schedule"); return; }
        recurrence = {
          frequency,
          ...(frequency === "weekly" ? { weekdays } : {}),
          until,
        };
      }
    }

    createMutation.mutate({
      data: {
        name: name.trim(),
        activityType: type,
        description: description.trim() || null,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        status: "upcoming",
        recurrence,
      },
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-create-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground">
            {template ? `New ${template.name}` : "New Activity"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto w-full px-4 py-4 space-y-4" data-testid="form-create-activity">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg" data-testid="text-create-error">
            {error}
          </div>
        )}

        {template && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-foreground" data-testid="panel-template-banner">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Pre-filled from the <span className="font-semibold">{template.name}</span> template — just confirm the details.</span>
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

        {/* Scheduling: one-off vs repeating */}
        <Field label="Schedule">
          <div className="grid grid-cols-2 gap-2" data-testid="toggle-schedule-mode">
            <button
              type="button"
              onClick={() => setRepeat(false)}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                !repeat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-schedule-oneoff"
            >
              One-off
            </button>
            <button
              type="button"
              onClick={() => setRepeat(true)}
              className={`py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                repeat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              data-testid="button-schedule-repeat"
            >
              <Repeat className="w-4 h-4" />
              Repeating
            </button>
          </div>
        </Field>

        {repeat && (
          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-4" data-testid="panel-recurrence">
            <Field label="Frequency">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
                className="input-field"
                data-testid="select-recurrence-frequency"
              >
                <option value="daily">Every day</option>
                <option value="weekly">Weekly on selected days</option>
              </select>
            </Field>

            {frequency === "weekly" && (
              <Field label="Repeat on">
                <div className="flex flex-wrap gap-1.5" data-testid="panel-weekday-picker">
                  {WEEKDAYS.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => toggleWeekday(w.value)}
                      className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${
                        weekdays.includes(w.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`button-weekday-${w.value}`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Ends">
              <div className="grid grid-cols-2 gap-2 mb-2" data-testid="toggle-end-mode">
                <button
                  type="button"
                  onClick={() => setEndMode("until")}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                    endMode === "until" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="button-end-until"
                >
                  On date
                </button>
                <button
                  type="button"
                  onClick={() => setEndMode("count")}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                    endMode === "count" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid="button-end-count"
                >
                  After N times
                </button>
              </div>
              {endMode === "until" ? (
                <input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="input-field"
                  data-testid="input-recurrence-until"
                />
              ) : (
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="input-field"
                  placeholder="Number of occurrences"
                  data-testid="input-recurrence-count"
                />
              )}
            </Field>
          </div>
        )}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50"
          data-testid="button-submit-create-activity"
        >
          {createMutation.isPending ? "Creating..." : repeat ? "Create Repeating Event" : "Create Activity"}
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
