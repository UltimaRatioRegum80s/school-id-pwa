import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRelativeTime, getStateLabel } from "@/lib/status";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import type { StudentWithState } from "@workspace/api-client-react";
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  LogOut,
  X,
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

type StudentCard = StudentWithState;

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);

  const filterParams = gradeFilter || classFilter
    ? {
        ...(gradeFilter ? { grade: gradeFilter } : {}),
        ...(classFilter ? { className: classFilter } : {}),
      }
    : undefined;

  const queryKey = getGetDashboardSummaryQueryKey(filterParams);

  const { data, isLoading, refetch } = useGetDashboardSummary(filterParams, {
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
      queryClient.invalidateQueries({ queryKey });
    });

    socket.on("state_changed", () => {
      queryClient.invalidateQueries({ queryKey });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, queryKey]);

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
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <PageHeader title="Dashboard" subtitle="Live overview" />
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

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader
        title="Dashboard"
        subtitle={`Updated ${formatRelativeTime(d.lastUpdated)}`}
        action={
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid="button-refresh-dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Grade / Class filter chips */}
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

        {/* Exceptions first — most urgent */}
        {d.exceptions.unaccountedStudents.length > 0 && (
          <ExceptionCard
            title="Unaccounted Students"
            students={d.exceptions.unaccountedStudents}
            color="red"
          />
        )}

        {d.exceptions.lateArrivals.length > 0 && (
          <ExceptionCard
            title="Late Arrivals"
            students={d.exceptions.lateArrivals}
            color="yellow"
          />
        )}

        {d.exceptions.missingFromClass.length > 0 && (
          <ExceptionCard
            title="Missing From Class"
            students={d.exceptions.missingFromClass}
            color="yellow"
          />
        )}

        {/* KPI Grid — 6 cards: Total, Present, Absent, Late, Checked Out, Unaccounted */}
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

        {/* Status breakdown */}
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

        {/* Recent Feed */}
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
    <div className="bg-card border border-border rounded-xl p-3" data-testid={testId}>
      <div className="flex items-center justify-between mb-1.5">
        {icon}
        {showPct && <span className="text-[10px] text-muted-foreground">{pct}%</span>}
      </div>
      <p className="text-xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  );
}

function ExceptionCard({
  title,
  students,
  color,
}: {
  title: string;
  students: StudentCard[];
  color: string;
}) {
  const borderColor = color === "red" ? "border-red-200" : "border-yellow-200";
  const bgColor = color === "red" ? "bg-red-50" : "bg-yellow-50";
  const textColor = color === "red" ? "text-red-800" : "text-yellow-800";

  return (
    <div className={`border ${borderColor} rounded-xl overflow-hidden`} data-testid={`panel-exception-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className={`${bgColor} px-4 py-2.5 flex items-center justify-between`}>
        <h3 className={`text-sm font-semibold ${textColor}`}>{title}</h3>
        <span className={`text-xs font-bold ${textColor}`}>{students.length}</span>
      </div>
      <div className="bg-card divide-y divide-border">
        {students.slice(0, 5).map((s) => (
          <div key={s.id} className="px-4 py-2.5 flex items-center justify-between" data-testid={`exception-student-${s.id}`}>
            <div>
              <p className="text-sm font-medium text-foreground">
                {s.firstName} {s.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.studentId} · Gr {s.grade} · {s.className}
              </p>
            </div>
            <div className="text-right">
              <StatusBadge state={s.currentState} showDot={false} />
              {s.lastSeenAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(s.lastSeenAt)}
                </p>
              )}
            </div>
          </div>
        ))}
        {students.length > 5 && (
          <div className="px-4 py-2 text-center">
            <span className="text-xs text-muted-foreground">
              +{students.length - 5} more
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
