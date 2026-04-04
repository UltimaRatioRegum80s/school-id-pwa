import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { BASE_URL } from "@/lib/api";
import { formatRelativeTime, getStateLabel } from "@/lib/status";
import { Users, CheckCircle, Clock, AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";

interface DashboardData {
  kpis: {
    total: number;
    present: number;
    absent: number;
    late: number;
    checkedOut: number;
    unaccounted: number;
    onCampus: number;
    inClass: number;
    atEvent: number;
  };
  statusDistribution: Array<{ state: string; count: number }>;
  exceptions: {
    unaccountedStudents: StudentCard[];
    lateArrivals: StudentCard[];
    missingFromClass: StudentCard[];
  };
  recentFeed: FeedItem[];
  lastUpdated: string;
}

interface StudentCard {
  id: number;
  firstName: string;
  lastName: string;
  studentId: string;
  grade: string;
  className: string;
  currentState: string;
  lastSeenAt: string | null;
  lastSeenLocation: string | null;
}

interface FeedItem {
  id: number;
  message: string;
  studentName: string;
  scanType: string;
  createdAt: string;
  studentId: number;
}

async function fetchDashboard(): Promise<DashboardData> {
  const token = localStorage.getItem("school-id-token");
  const res = await fetch(`${BASE_URL}/api/dashboard/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

const STATE_COLORS: Record<string, string> = {
  on_campus: "#22c55e",
  in_class: "#3b82f6",
  at_event: "#eab308",
  checked_out: "#94a3b8",
  unaccounted: "#ef4444",
  not_arrived: "#cbd5e1",
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const token = localStorage.getItem("school-id-token");
    if (!token) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    try {
      const socket = new WebSocket(`${wsProtocol}//${host}${BASE_URL.replace(window.location.origin, "")}/api/socket.io`);
      socket.onmessage = () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      };
      return () => socket.close();
    } catch {
      // Socket.IO WebSocket connection may fail in some envs - polling fallback handles it
    }
  }, [queryClient]);

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

  const d = data!;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader
        title="Dashboard"
        subtitle={`Updated ${formatRelativeTime(d.lastUpdated)}`}
        action={
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Present Today"
            value={d.kpis.present}
            total={d.kpis.total}
            icon={<CheckCircle className="w-5 h-5 text-green-500" />}
            color="green"
          />
          <KpiCard
            label="Not Arrived"
            value={d.kpis.absent}
            total={d.kpis.total}
            icon={<Clock className="w-5 h-5 text-slate-400" />}
            color="slate"
          />
          <KpiCard
            label="Unaccounted"
            value={d.kpis.unaccounted}
            total={d.kpis.total}
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            color="red"
          />
          <KpiCard
            label="Late Arrivals"
            value={d.kpis.late}
            total={d.kpis.total}
            icon={<TrendingUp className="w-5 h-5 text-yellow-500" />}
            color="yellow"
          />
        </div>

        {/* Status breakdown */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Status Breakdown</h3>
          <div className="space-y-2">
            {d.statusDistribution.map(({ state, count }) => {
              const pct = d.kpis.total > 0 ? (count / d.kpis.total) * 100 : 0;
              return (
                <div key={state} className="flex items-center gap-3">
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

        {/* Exceptions */}
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

        {/* Recent Feed */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
          {d.recentFeed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No activity today yet</p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {d.recentFeed.slice(0, 10).map((item) => (
                <div key={item.id} className="py-2.5 flex items-start gap-3">
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

function KpiCard({
  label,
  value,
  total,
  icon,
  color,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
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
    <div className={`border ${borderColor} rounded-xl overflow-hidden`}>
      <div className={`${bgColor} px-4 py-2.5 flex items-center justify-between`}>
        <h3 className={`text-sm font-semibold ${textColor}`}>{title}</h3>
        <span className={`text-xs font-bold ${textColor}`}>{students.length}</span>
      </div>
      <div className="bg-card divide-y divide-border">
        {students.slice(0, 5).map((s) => (
          <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
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
