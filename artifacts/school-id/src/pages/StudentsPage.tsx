import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { BASE_URL } from "@/lib/api";
import { formatRelativeTime, getScanTypeLabel, formatTime, getStateLabel } from "@/lib/status";
import { Search, ChevronRight, X, User, Clock, MapPin, Filter } from "lucide-react";

interface Student {
  id: number;
  studentId: string;
  firstName: string;
  lastName: string;
  grade: string;
  className: string;
  photoUrl: string | null;
  qrCode: string;
  currentState: string;
  lastSeenAt: string | null;
  lastSeenLocation: string | null;
}

interface StudentProfile extends Student {
  todayTimeline: TimelineEvent[];
  behaviorSummary: {
    totalMerits: number;
    totalDemerits: number;
  };
}

interface TimelineEvent {
  id: number;
  scanType: string;
  location: string | null;
  createdAt: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem("school-id-token");
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

const STATES = [
  { value: "", label: "All" },
  { value: "not_arrived", label: "Not Arrived" },
  { value: "on_campus", label: "On Campus" },
  { value: "in_class", label: "In Class" },
  { value: "at_event", label: "At Event" },
  { value: "checked_out", label: "Checked Out" },
  { value: "unaccounted", label: "Unaccounted" },
];

const GRADES = ["", "8", "9", "10", "11", "12"];

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const queryKey = ["students", search, grade, status];
  const { data: students, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (grade) params.set("grade", grade);
      if (status) params.set("status", status);
      return apiFetch<Student[]>(`/students?${params.toString()}`);
    },
    refetchInterval: 30000,
  });

  if (selectedId) {
    return (
      <StudentProfileView
        id={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const list = students ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader
        title="Students"
        subtitle={`${list.length} found`}
        action={
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg transition-colors ${showFilters ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        }
      />

      <div className="max-w-lg mx-auto w-full px-4 pt-3 sticky top-[64px] z-30 bg-background pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or student ID..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="flex gap-2 mt-2">
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="flex-1 bg-card border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>{g ? `Grade ${g}` : "All Grades"}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex-1 bg-card border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STATES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-2 flex-1">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {list.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      {s.firstName[0]}{s.lastName[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {s.firstName} {s.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.studentId} · Gr {s.grade} · {s.className}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge state={s.currentState} />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentProfileView({ id, onBack }: { id: number; onBack: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => apiFetch<StudentProfile>(`/students/${id}`),
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-20">
        <PageHeader title="Student Profile" />
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Loading...
        </div>
      </div>
    );
  }

  const s = data;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Student Profile</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Student card */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              {s.photoUrl ? (
                <img src={s.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-primary">
                  {s.firstName[0]}{s.lastName[0]}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground">
                {s.firstName} {s.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">{s.studentId}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  Grade {s.grade}
                </span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {s.className}
                </span>
              </div>
              <div className="mt-2">
                <StatusBadge state={s.currentState} />
              </div>
            </div>
          </div>

          {(s.lastSeenAt || s.lastSeenLocation) && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
              {s.lastSeenAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatRelativeTime(s.lastSeenAt)}
                </span>
              )}
              {s.lastSeenLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {s.lastSeenLocation}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Behavior summary */}
        {(s.behaviorSummary.totalMerits > 0 || s.behaviorSummary.totalDemerits > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{s.behaviorSummary.totalMerits}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Merit Points</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{s.behaviorSummary.totalDemerits}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Demerit Points</p>
            </div>
          </div>
        )}

        {/* Today's timeline */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Today's Timeline</h3>
          </div>
          {s.todayTimeline.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No activity recorded today
            </div>
          ) : (
            <div className="divide-y divide-border">
              {s.todayTimeline.map((event, i) => (
                <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    {i < s.todayTimeline.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-1 flex-grow" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-sm font-medium text-foreground">
                      {getScanTypeLabel(event.scanType)}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(event.createdAt)}
                      </span>
                      {event.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
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
