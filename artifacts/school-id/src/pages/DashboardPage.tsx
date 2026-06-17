import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { io } from "socket.io-client";
import { PageHeader } from "@/components/PageHeader";
import { formatRelativeTime } from "@/lib/status";
import {
  useGetDashboardSummary,
  useGetDashboardTrends,
} from "@workspace/api-client-react";
import type { StudentWithState, DashboardStudentsByState, DashboardKpis, TodayCheckpoint } from "@workspace/api-client-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Users,
  CheckCircle,
  Clock,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  LogIn,
  BookOpen,
  Calendar,
  Star,
  AlertCircle,
  Megaphone,
} from "lucide-react";

const COLOR_PRESENT = "#22c55e";
const COLOR_ABSENT = "#94a3b8";

function sortGrades(grades: string[]): string[] {
  return [...grades].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

function gradeLabel(grade: string): string {
  return /^\d+$/.test(grade) ? `Gr ${grade}` : grade;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function trendDateLabel(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3) return isoDate;
  const [, m, d] = parts;
  return `${MONTH_NAMES[m - 1] ?? ""} ${d}`;
}

const TREND_RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);

  const filterKey = useMemo(
    () => JSON.stringify({ grade: gradeFilter ?? null, className: classFilter ?? null }),
    [gradeFilter, classFilter]
  );

  const filterParams = useMemo(() => {
    const p: { grade?: string; className?: string } = {};
    if (gradeFilter) p.grade = gradeFilter;
    if (classFilter) p.className = classFilter;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [filterKey]);

  const queryKey = useMemo(
    () => ["/api/dashboard/summary", filterKey] as const,
    [filterKey]
  );

  const { data, isLoading, isFetching, refetch } = useGetDashboardSummary(filterParams, {
    query: {
      queryKey,
      refetchInterval: 30000,
    },
  });

  const [trendDays, setTrendDays] = useState(7);

  const trendParams = useMemo(() => {
    const p: { days: number; grade?: string; className?: string } = { days: trendDays };
    if (gradeFilter) p.grade = gradeFilter;
    if (classFilter) p.className = classFilter;
    return p;
  }, [trendDays, filterKey]);

  const trendQueryKey = useMemo(
    () => ["/api/dashboard/trends", trendDays, filterKey] as const,
    [trendDays, filterKey]
  );

  const { data: trendData, isLoading: trendLoading } = useGetDashboardTrends(trendParams, {
    query: { queryKey: trendQueryKey, refetchInterval: 60000 },
  });

  useEffect(() => {
    const token = localStorage.getItem("school-id-token");
    if (!token) return;

    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const invalidateDashboard = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/trends"] });
    };

    socket.on("dashboard_update", invalidateDashboard);
    socket.on("state_changed", invalidateDashboard);

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const classOptions: string[] =
    gradeFilter && data?.availableClassesByGrade
      ? (data.availableClassesByGrade as Record<string, string[]>)[gradeFilter] ?? []
      : [];

  function handleGradeChip(g: string) {
    if (gradeFilter === g) {
      setGradeFilter(null);
      setClassFilter(null);
    } else {
      setGradeFilter(g);
      setClassFilter(null);
    }
  }

  function handleClassChip(c: string) {
    setClassFilter(classFilter === c ? null : c);
  }

  function goToStudents(status: string) {
    const params = new URLSearchParams();
    params.set("status", status);
    if (gradeFilter) params.set("grade", gradeFilter);
    if (classFilter) params.set("className", classFilter);
    setLocation(`/students?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-6">
        <PageHeader title="Dashboard" subtitle="Live overview" showLogo={true} />
        <div className="flex items-center justify-center flex-1">
          <div className="text-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const d = data;
  const availableGrades = sortGrades(
    Object.keys(d.availableClassesByGrade as Record<string, string[]>)
  );
  const isEmpty = d.kpis.total === 0;

  const presentPct = d.kpis.total > 0 ? Math.round((d.kpis.present / d.kpis.total) * 100) : 0;
  const donutData = [
    { name: "Present", value: d.kpis.present, color: COLOR_PRESENT },
    { name: "Absent", value: d.kpis.absent, color: COLOR_ABSENT },
  ].filter((s) => s.value > 0);

  const byGradeData = d.byGrade.map((g) => ({
    grade: gradeLabel(g.grade),
    Present: g.present,
    Absent: g.absent,
  }));

  const trendChartData = (trendData ?? []).map((p) => ({
    date: trendDateLabel(p.date),
    Present: p.present,
    Absent: p.absent,
  }));
  const hasTrendData = trendChartData.length > 0;

  const filterSection = (
    <div data-testid="panel-filter-chips">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <FilterChip
          label="All Grades"
          active={gradeFilter === null}
          onClick={() => { setGradeFilter(null); setClassFilter(null); }}
          testId="chip-grade-all"
        />
        {availableGrades.map((g) => (
          <FilterChip
            key={g}
            label={gradeLabel(g)}
            active={gradeFilter === g}
            onClick={() => handleGradeChip(g)}
            testId={`chip-grade-${g}`}
          />
        ))}
      </div>
      {gradeFilter && classOptions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mt-2 scrollbar-hide" data-testid="panel-class-chips">
          {classOptions.map((c) => (
            <FilterChip
              key={c}
              label={c}
              active={classFilter === c}
              onClick={() => handleClassChip(c)}
              testId={`chip-class-${c}`}
            />
          ))}
        </div>
      )}
      {(gradeFilter || classFilter) && (
        <button
          className="mt-2 text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
          onClick={() => { setGradeFilter(null); setClassFilter(null); }}
          data-testid="button-clear-filters"
        >
          <X className="w-3 h-3" />
          Clear filter
        </button>
      )}
    </div>
  );

  const kpiSection = (
    <div>
      {isFetching && !isLoading && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Updating{gradeFilter ? ` Grade ${gradeFilter}` : ""}...</span>
        </div>
      )}
      {isEmpty && gradeFilter ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center" data-testid="grid-kpis">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
          <p className="text-sm font-medium text-muted-foreground">No students in Grade {gradeFilter}</p>
          <p className="text-xs text-muted-foreground mt-1">Try selecting a different grade or All Grades</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3" data-testid="grid-kpis">
          <KpiCard
            label="Total"
            value={d.kpis.total}
            total={d.kpis.total}
            icon={<Users className="w-4 h-4 text-slate-500" />}
            accentClass="border-l-slate-400"
            showPct={false}
            testId="kpi-total"
          />
          <KpiCard
            label="Present"
            value={d.kpis.present}
            total={d.kpis.total}
            icon={<CheckCircle className="w-4 h-4 text-green-500" />}
            accentClass="border-l-green-500"
            testId="kpi-present"
          />
          <KpiCard
            label="Absent"
            value={d.kpis.absent}
            total={d.kpis.total}
            icon={<Clock className="w-4 h-4 text-slate-500" />}
            accentClass="border-l-slate-400"
            testId="kpi-absent"
          />
        </div>
      )}
    </div>
  );

  const donutSection = (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-attendance-donut">
      <h3 className="text-sm font-semibold text-foreground mb-2">Attendance</h3>
      {isEmpty || donutData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
          No attendance data
        </div>
      ) : (
        <>
          <div className="relative" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={donutData.length > 1 ? 2 : 0}
                  stroke="none"
                >
                  {donutData.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-foreground leading-none" data-testid="text-present-pct">
                {presentPct}%
              </span>
              <span className="text-xs text-muted-foreground mt-1">present</span>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-3 flex-wrap">
            {donutData.map((e) => (
              <div key={e.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="text-xs text-muted-foreground">{e.name}</span>
                <span className="text-xs font-semibold text-foreground">{e.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const byGradeSection = (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-by-grade">
      <h3 className="text-sm font-semibold text-foreground mb-2">By Grade</h3>
      {byGradeData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
          No grade data
        </div>
      ) : (
        <>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byGradeData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.4} />
                <XAxis
                  dataKey="grade"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                <Bar dataKey="Present" stackId="a" fill={COLOR_PRESENT} maxBarSize={44} />
                <Bar dataKey="Absent" stackId="a" fill={COLOR_ABSENT} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_PRESENT }} />
              <span className="text-xs text-muted-foreground">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_ABSENT }} />
              <span className="text-xs text-muted-foreground">Absent</span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const trendsSection = (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-trends">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">Attendance Trends</h3>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5" data-testid="trend-range-selector">
          {TREND_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setTrendDays(r.days)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                trendDays === r.days
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`trend-range-${r.days}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {trendLoading ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
      ) : !hasTrendData ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
          No trend data
        </div>
      ) : (
        <>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Present"
                  stroke={COLOR_PRESENT}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Absent"
                  stroke={COLOR_ABSENT}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-3 flex-wrap">
            {[
              { name: "Present", color: COLOR_PRESENT },
              { name: "Absent", color: COLOR_ABSENT },
            ].map((e) => (
              <div key={e.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="text-xs text-muted-foreground">{e.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const checkpointsSection = (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-today-checkpoints">
      <h3 className="text-sm font-semibold text-foreground mb-3">Today's Checkpoints</h3>
      {d.todayCheckpoints.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No checkpoints scheduled today</p>
      ) : (
        <div className="space-y-0 divide-y divide-border">
          {d.todayCheckpoints.map((cp) => (
            <CheckpointRow key={cp.id} checkpoint={cp} />
          ))}
        </div>
      )}
    </div>
  );

  const exceptionsSection = (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-exceptions">
      <h3 className="text-sm font-semibold text-foreground mb-2">Needs Attention</h3>
      <div className="divide-y divide-border">
        <ExceptionRow
          label="Absent today"
          count={d.kpis.absent}
          dotColor={COLOR_ABSENT}
          onClick={() => goToStudents("absent")}
          testId="exception-absent"
        />
      </div>
      {d.kpis.absent === 0 && (
        <div className="flex items-center gap-2 mt-2 pt-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>All students present</span>
        </div>
      )}
    </div>
  );

  const studentSummarySection =
    gradeFilter && d.studentsByState ? (
      <StudentSummarySection
        studentsByState={d.studentsByState}
        grade={gradeFilter}
        kpis={d.kpis}
      />
    ) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Updated ${formatRelativeTime(d.lastUpdated)}`}
        showLogo={true}
        action={
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 transition-colors"
            data-testid="button-refresh-dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="mx-auto w-full max-w-lg md:max-w-none px-4 md:px-6 py-4 md:py-5 space-y-4 md:space-y-5 flex-1">
        {filterSection}
        {kpiSection}
        {!isEmpty && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {donutSection}
            {byGradeSection}
          </div>
        )}
        {studentSummarySection}
        {!isEmpty && trendsSection}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          {checkpointsSection}
          {exceptionsSection}
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: { color?: string } }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-md">
      {label !== undefined && label !== "" && (
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color ?? p.payload?.color ?? "#94a3b8" }}
          />
          <span>{p.name}</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
      }`}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

function KpiCard({
  label,
  value,
  total,
  icon,
  accentClass,
  testId,
  showPct = true,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  accentClass: string;
  testId: string;
  showPct?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={`bg-card border border-border border-l-4 ${accentClass} rounded-xl p-3 md:p-4`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-1.5">
        {icon}
        {showPct && <span className="text-[10px] text-muted-foreground">{pct}%</span>}
      </div>
      <p className="text-xl md:text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  );
}

function checkpointVisualState(cp: TodayCheckpoint): "done" | "in_progress" | "upcoming" {
  if (cp.status === "completed") return "done";
  const scheduled = new Date(cp.scheduledTime);
  const now = new Date();
  if (scheduled > now && cp.scannedCount === 0) return "upcoming";
  return "in_progress";
}

function checkpointTypeIcon(type: string) {
  switch (type) {
    case "gate_in": return <LogIn className="w-3.5 h-3.5" />;
    case "assembly": return <Megaphone className="w-3.5 h-3.5" />;
    case "class": return <BookOpen className="w-3.5 h-3.5" />;
    case "event": return <Calendar className="w-3.5 h-3.5" />;
    case "club": return <Star className="w-3.5 h-3.5" />;
    case "detention": return <AlertCircle className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
}

function formatCheckpointTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function CheckpointRow({ checkpoint: cp }: { checkpoint: TodayCheckpoint }) {
  const state = checkpointVisualState(cp);
  const typeName = cp.type === "gate_in" ? "Gate In" : cp.type.charAt(0).toUpperCase() + cp.type.slice(1);

  const stateStyles = {
    done: {
      dot: "bg-green-500",
      badge: "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30",
      label: "Done",
      progress: "text-green-700 dark:text-green-400",
    },
    in_progress: {
      dot: "bg-primary animate-pulse",
      badge: "text-primary bg-primary/10",
      label: "In progress",
      progress: "text-foreground",
    },
    upcoming: {
      dot: "bg-muted-foreground/40",
      badge: "text-muted-foreground bg-muted/60",
      label: "Upcoming",
      progress: "text-muted-foreground",
    },
  }[state];

  const progressText =
    cp.totalStudents != null
      ? `${cp.scannedCount} / ${cp.totalStudents} scanned`
      : `${cp.scannedCount} scanned`;

  return (
    <div
      className="py-3 flex items-center gap-3"
      data-testid={`checkpoint-row-${cp.id}`}
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stateStyles.dot}`} />
      <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0 text-muted-foreground">
        {checkpointTypeIcon(cp.type)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground leading-tight truncate">{cp.name}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${stateStyles.badge}`}>
            {typeName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{formatCheckpointTime(cp.scheduledTime)}</span>
          {state !== "upcoming" && (
            <>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className={`text-xs font-medium ${stateStyles.progress}`}>{progressText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ExceptionRow({
  label,
  count,
  dotColor,
  onClick,
  testId,
}: {
  label: string;
  count: number;
  dotColor: string;
  onClick: () => void;
  testId: string;
}) {
  const disabled = count === 0;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between py-2.5 transition-colors enabled:hover:bg-muted/50 disabled:opacity-50 rounded-lg px-1 -mx-1"
      data-testid={testId}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-foreground">{count}</span>
        {!disabled && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>
    </button>
  );
}

const PREVIEW_COUNT = 4;

function StudentSummarySection({
  studentsByState,
  grade,
  kpis,
}: {
  studentsByState: DashboardStudentsByState;
  grade: string;
  kpis: DashboardKpis;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-student-summary">
      <div className="px-4 py-2.5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Grade {grade} Students</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-border">
        <div className="divide-y divide-border">
          <StudentSummaryGroup
            label="Present"
            totalCount={kpis.present}
            students={studentsByState.present}
            colorClass="text-green-700 dark:text-green-400"
            bgClass="bg-green-100 dark:bg-green-900/30"
            testId="summary-group-present"
          />
        </div>
        <div className="divide-y divide-border border-t md:border-t-0 border-border">
          <StudentSummaryGroup
            label="Absent"
            totalCount={kpis.absent}
            students={studentsByState.absent}
            colorClass="text-slate-600 dark:text-slate-400"
            bgClass="bg-slate-100 dark:bg-slate-800/50"
            testId="summary-group-absent"
          />
        </div>
      </div>
    </div>
  );
}

function StudentSummaryGroup({
  label,
  totalCount,
  students,
  colorClass,
  bgClass,
  testId,
}: {
  label: string;
  totalCount: number;
  students: StudentWithState[];
  colorClass: string;
  bgClass: string;
  testId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const previewStudents = students.slice(0, PREVIEW_COUNT);
  const extraStudents = students.slice(PREVIEW_COUNT);
  const hasExtra = students.length > PREVIEW_COUNT;
  const totalBeyondApi = totalCount - students.length;

  if (totalCount === 0) {
    return (
      <div className="px-4 py-3 flex items-center gap-2" data-testid={testId}>
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${bgClass} ${colorClass}`}>0</span>
      </div>
    );
  }

  return (
    <div data-testid={testId}>
      {/* Header row — shows count badge and optional expand toggle */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${bgClass} ${colorClass}`}>
            {totalCount}
          </span>
        </div>
        {hasExtra && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Show fewer" : "Show all"}
          >
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Always-visible preview: first 4 students */}
      <div className="px-4 pb-3 space-y-0.5">
        {previewStudents.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between py-1 border-b border-border/40 last:border-b-0"
            data-testid={`summary-student-${s.id}`}
          >
            <span className="text-sm text-foreground">{s.firstName} {s.lastName}</span>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{s.className}</span>
          </div>
        ))}

        {/* "X more" affordance in collapsed state */}
        {!expanded && hasExtra && (
          <button
            className="text-xs text-primary mt-1 hover:underline"
            onClick={() => setExpanded(true)}
          >
            +{students.length - PREVIEW_COUNT} more
          </button>
        )}

        {/* Extra names shown only when expanded */}
        {expanded && extraStudents.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between py-1 border-b border-border/40 last:border-b-0"
            data-testid={`summary-student-${s.id}`}
          >
            <span className="text-sm text-foreground">{s.firstName} {s.lastName}</span>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{s.className}</span>
          </div>
        ))}

        {/* Students beyond what the API returned */}
        {expanded && totalBeyondApi > 0 && (
          <p className="text-xs text-muted-foreground pt-1">
            +{totalBeyondApi} more — view in Students tab
          </p>
        )}
      </div>
    </div>
  );
}
