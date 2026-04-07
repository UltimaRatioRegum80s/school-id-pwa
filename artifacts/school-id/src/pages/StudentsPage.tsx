import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRelativeTime, getScanTypeLabel, formatTime } from "@/lib/status";
import {
  useListStudents,
  useGetStudent,
  useListStudentQrCodes,
  useRegenerateStudentQrCode,
  getListStudentsQueryKey,
  getGetStudentQueryKey,
  getListStudentQrCodesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, ChevronRight, X, User, Clock, MapPin, Filter, ChevronDown, ChevronUp, RefreshCw, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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

  const listParams = {
    ...(search ? { search } : {}),
    ...(grade ? { grade } : {}),
    ...(status ? { status } : {}),
  };

  const { data: students, isLoading } = useListStudents(
    Object.keys(listParams).length > 0 ? listParams : undefined,
    {
      query: {
        queryKey: getListStudentsQueryKey(Object.keys(listParams).length > 0 ? listParams : undefined),
        refetchInterval: 30000,
      },
    }
  );

  const list = students ?? [];

  const filterAction = (
    <button
      onClick={() => setShowFilters(!showFilters)}
      className={`p-1.5 rounded-lg transition-colors ${showFilters ? "bg-white/30 text-primary-foreground" : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"}`}
      data-testid="button-toggle-filters"
    >
      <Filter className="w-4 h-4" />
    </button>
  );

  const searchAndFilters = (
    <>
      <div className="px-4 pt-3 sticky top-[64px] z-30 bg-background pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or student ID..."
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="input-student-search"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              data-testid="button-clear-search"
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
              data-testid="select-grade-filter"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>{g ? `Grade ${g}` : "All Grades"}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex-1 bg-card border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="select-status-filter"
            >
              {STATES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </>
  );

  const studentList = (
    <div className="px-4 py-2 flex-1">
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
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left ${selectedId === s.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
              data-testid={`row-student-${s.id}`}
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
                <p className="text-sm font-semibold text-foreground" data-testid={`text-student-name-${s.id}`}>
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
  );

  return (
    <>
      {/* ── MOBILE ── (hidden on md+): either list view OR profile view, never both */}
      <div className="md:hidden flex flex-col min-h-screen bg-background pb-20">
        {selectedId ? (
          /* Mobile: full-screen profile replaces the list (StudentProfileView has its own header) */
          <StudentProfileView
            id={selectedId}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          /* Mobile: list page with PageHeader */
          <>
            <PageHeader
              title="Students"
              subtitle={`${list.length} found`}
              showLogo={true}
              action={filterAction}
            />
            {searchAndFilters}
            {studentList}
          </>
        )}
      </div>

      {/* ── DESKTOP ── (hidden below md): master-detail split always visible */}
      <div className="hidden md:flex flex-col min-h-screen bg-background pb-6">
        <PageHeader
          title="Students"
          subtitle={`${list.length} found`}
          showLogo={true}
          action={filterAction}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Left column: search + student list */}
          <div className="flex flex-col w-[380px] flex-none border-r border-border overflow-y-auto">
            {searchAndFilters}
            {studentList}
          </div>

          {/* Right column: profile panel or empty state */}
          <div className="flex flex-col flex-1 overflow-y-auto bg-background">
            {selectedId ? (
              <StudentProfilePanel id={selectedId} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <User className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Select a student to view their profile</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StudentProfilePanel({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useGetStudent(id, {
    query: {
      queryKey: getGetStudentQueryKey(id),
      refetchInterval: 15000,
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return <StudentProfileContent data={data} id={id} onClose={onClose} />;
}

function StudentProfileView({ id, onBack }: { id: number; onBack: () => void }) {
  const { data, isLoading } = useGetStudent(id, {
    query: {
      queryKey: getGetStudentQueryKey(id),
      refetchInterval: 15000,
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col min-h-[60vh]">
        <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-profile-back">
              <X className="w-4 h-4" />
            </button>
            <h1 className="text-base font-bold text-foreground flex-1">Student Profile</h1>
          </div>
        </div>
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-profile-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Student Profile</h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto w-full pb-4">
        <StudentProfileContent data={data} id={id} onClose={onBack} />
      </div>
    </div>
  );
}

function StudentProfileContent({
  data: s,
  id,
  onClose: _onClose,
}: {
  data: NonNullable<ReturnType<typeof useGetStudent>["data"]>;
  id: number;
  onClose: () => void;
}) {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-card border border-border rounded-xl p-4" data-testid="panel-student-profile">
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
            <h2 className="text-lg font-bold text-foreground" data-testid="text-profile-name">
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
            <div className="mt-2" data-testid="status-profile">
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

      <QrCodeSection studentId={id} fallbackQrCode={s.qrCode} />

      {(s.behaviorSummary.totalMerits > 0 || s.behaviorSummary.totalDemerits > 0) && (
        <div className="grid grid-cols-2 gap-3" data-testid="panel-behavior-summary">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600" data-testid="text-merit-points">{s.behaviorSummary.totalMerits}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Merit Points</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-600" data-testid="text-demerit-points">{s.behaviorSummary.totalDemerits}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Demerit Points</p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-timeline">
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
              <div key={event.id} className="px-4 py-3 flex items-start gap-3" data-testid={`timeline-event-${event.id}`}>
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

      {s.behaviorSummary.recentLogs && s.behaviorSummary.recentLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-behavior-history">
          <div className="px-4 py-2.5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Behavior History</h3>
          </div>
          <div className="divide-y divide-border">
            {s.behaviorSummary.recentLogs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center justify-between" data-testid={`behavior-log-${log.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground capitalize">{log.type}</p>
                  {log.note && (
                    <p className="text-xs text-muted-foreground truncate">{log.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                </div>
                <span className={`text-sm font-bold ml-3 flex-shrink-0 ${log.type === "merit" ? "text-green-600" : "text-red-600"}`}>
                  {log.points > 0 ? "+" : ""}{log.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QrCodeSection({ studentId, fallbackQrCode }: { studentId: number; fallbackQrCode?: string }) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { data: qrCodes, isLoading } = useListStudentQrCodes(studentId, {
    query: {
      queryKey: getListStudentQrCodesQueryKey(studentId),
    },
  });

  const { mutateAsync: regenerate } = useRegenerateStudentQrCode();

  const activeCode = qrCodes?.find((c) => c.isActive === 1);
  const effectiveCode = activeCode?.code ?? fallbackQrCode;
  const historyCodes = qrCodes?.filter((c) => c.isActive === 0) ?? [];

  async function handleRegenerate() {
    setIsRegenerating(true);
    try {
      await regenerate({ id: studentId });
      await queryClient.invalidateQueries({ queryKey: getListStudentQrCodesQueryKey(studentId) });
      await queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(studentId) });
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-qr-code">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          QR Code
        </h3>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="button-regenerate-qr"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
          {isRegenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-4 text-muted-foreground text-sm">Loading...</div>
        ) : effectiveCode ? (
          <div className="flex flex-col items-center gap-3" data-testid="qr-code-image">
            <div className="bg-white p-3 rounded-xl border border-border shadow-sm">
              <QRCodeSVG
                value={effectiveCode}
                size={160}
                level="M"
              />
            </div>
            <p className="text-xs text-muted-foreground font-mono text-center break-all px-2" data-testid="text-active-qr-code">
              {effectiveCode}
            </p>
            {activeCode && (
              <p className="text-xs text-muted-foreground">
                Generated {formatRelativeTime(activeCode.createdAt)}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No active QR code
          </div>
        )}

        {historyCodes.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-qr-history"
            >
              <span>Previous codes ({historyCodes.length})</span>
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showHistory && (
              <div className="mt-2 space-y-2" data-testid="panel-qr-history">
                {historyCodes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 px-2 bg-muted/40 rounded-lg" data-testid={`qr-history-item-${c.id}`}>
                    <span className="text-xs font-mono text-muted-foreground truncate flex-1 mr-2">{c.code}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
