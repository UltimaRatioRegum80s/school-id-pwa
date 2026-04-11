import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { PageHeader } from "@/components/PageHeader";
import { formatRelativeTime, getStateLabel } from "@/lib/status";
import {
  useGetDashboardSummary,
} from "@workspace/api-client-react";
import type { StudentWithState, DashboardStudentsByState, DashboardKpis } from "@workspace/api-client-react";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  LogOut,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const STATE_COLORS: Record<string, string> = {
  on_campus: "#22c55e",
  in_class: "#3b82f6",
  at_event: "#eab308",
  checked_out: "#94a3b8",
  unaccounted: "#ef4444",
  not_arrived: "#cbd5e1",
};

const GRADES = ["8", "9", "10", "11", "12"];

export default function DashboardPage() {
  const queryClient = useQueryClient();
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

  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const { data, isLoading, isFetching, refetch } = useGetDashboardSummary(filterParams, {
    query: {
      queryKey,
      refetchInterval: 30000,
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("school-id-token");
    if (!token) return;

    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("dashboard_update", () => {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
    });

    socket.on("state_changed", () => {
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
    });

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

  const filterSection = (
    <div data-testid="panel-filter-chips">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <FilterChip
          label="All Grades"
          active={gradeFilter === null}
          onClick={() => { setGradeFilter(null); setClassFilter(null); }}
          testId="chip-grade-all"
        />
        {GRADES.map((g) => (
          <FilterChip
            key={g}
            label={`Gr ${g}`}
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
      {d.kpis.total === 0 && gradeFilter ? (
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
            icon={<Users className="w-4 h-4 text-primary" />}
            showPct={false}
            testId="kpi-total"
          />
          <KpiCard
            label="Present"
            value={d.kpis.present}
            total={d.kpis.total}
            icon={<CheckCircle className="w-4 h-4 text-green-500" />}
            testId="kpi-present"
          />
          <KpiCard
            label="Not Arrived"
            value={d.kpis.absent}
            total={d.kpis.total}
            icon={<Clock className="w-4 h-4 text-slate-400" />}
            testId="kpi-absent"
          />
          <KpiCard
            label="Late"
            value={d.kpis.late}
            total={d.kpis.total}
            icon={<TrendingUp className="w-4 h-4 text-yellow-500" />}
            testId="kpi-late"
          />
          <KpiCard
            label="Checked Out"
            value={d.kpis.checkedOut}
            total={d.kpis.total}
            icon={<LogOut className="w-4 h-4 text-slate-500" />}
            testId="kpi-checked-out"
          />
          <KpiCard
            label="Unaccounted"
            value={d.kpis.unaccounted}
            total={d.kpis.total}
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            testId="kpi-unaccounted"
          />
        </div>
      )}
    </div>
  );

  const statusSection = (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-status-breakdown">
      <h3 className="text-sm font-semibold text-foreground mb-3">Status Breakdown</h3>
      <div className="space-y-2">
        {d.statusDistribution.map(({ state, count }) => {
          const pct = d.kpis.total > 0 ? (count / d.kpis.total) * 100 : 0;
          return (
            <div key={state} className="flex items-center gap-3" data-testid={`status-row-${state}`}>
              <span className="text-xs text-muted-foreground w-24 flex-shrink-0">
                {getStateLabel(state)}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: STATE_COLORS[state] ?? "#94a3b8",
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground w-6 text-right">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const feedSection = (
    <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-recent-feed">
      <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
      {d.recentFeed.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No activity today yet</p>
      ) : (
        <div className="space-y-0 divide-y divide-border">
          {d.recentFeed.slice(0, 10).map((item) => (
            <div key={item.id} className="py-2.5 flex items-start gap-3" data-testid={`feed-item-${item.id}`}>
              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground leading-tight">{item.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(item.createdAt)}
                </p>
              </div>
            </div>
          ))}
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

      {/* Mobile: single column */}
      <div className="md:hidden max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {filterSection}
        {kpiSection}
        {statusSection}
        {studentSummarySection}
        {feedSection}
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:grid md:grid-cols-[280px,1fr] md:gap-6 px-6 py-5 flex-1">
        {/* Left column: filters only */}
        <div className="space-y-3 min-w-0">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</h2>
          {filterSection}
        </div>

        {/* Right column: KPIs + status + [student summary if grade] + activity */}
        <div className="space-y-4 min-w-0">
          {kpiSection}
          {statusSection}
          {studentSummarySection}
          {feedSection}
        </div>
      </div>
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
  testId,
  showPct = true,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  testId: string;
  showPct?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-xl p-3 md:p-4" data-testid={testId}>
      <div className="flex items-center justify-between mb-1.5">
        {icon}
        {showPct && <span className="text-[10px] text-muted-foreground">{pct}%</span>}
      </div>
      <p className="text-xl md:text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
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
  const onCampusCount = kpis.onCampus + kpis.inClass + kpis.atEvent;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-student-summary">
      <div className="px-4 py-2.5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Grade {grade} Students</h3>
      </div>
      <div className="divide-y divide-border">
        <StudentSummaryGroup
          label="Present"
          totalCount={onCampusCount}
          students={studentsByState.present}
          colorClass="text-green-700 dark:text-green-400"
          bgClass="bg-green-100 dark:bg-green-900/30"
          testId="summary-group-present"
        />
        <StudentSummaryGroup
          label="Not Arrived"
          totalCount={kpis.absent}
          students={studentsByState.notArrived}
          colorClass="text-slate-600 dark:text-slate-400"
          bgClass="bg-slate-100 dark:bg-slate-800/50"
          testId="summary-group-not-arrived"
        />
        <StudentSummaryGroup
          label="Late"
          totalCount={kpis.late}
          students={studentsByState.late}
          colorClass="text-yellow-700 dark:text-yellow-400"
          bgClass="bg-yellow-100 dark:bg-yellow-900/30"
          testId="summary-group-late"
        />
        <StudentSummaryGroup
          label="Unaccounted"
          totalCount={kpis.unaccounted}
          students={studentsByState.unaccounted}
          colorClass="text-red-700 dark:text-red-400"
          bgClass="bg-red-100 dark:bg-red-900/30"
          testId="summary-group-unaccounted"
        />
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
