import { useEffect, useMemo, useState } from "react";
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
import type { StudentProfile, StudentWithState } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ChevronRight,
  X,
  User,
  Clock,
  MapPin,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  QrCode,
  GraduationCap,
  Users,
  Award,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const STATES = [
  { value: "", label: "All" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
];

const VALID_STATUSES = new Set(STATES.map((s) => s.value).filter(Boolean));

const GRADE_ACCENTS = [
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-pink-500",
  "border-l-cyan-500",
];

function gradeLabel(grade: string): string {
  return /^\d+$/.test(grade) ? `Grade ${grade}` : grade;
}

interface CardStats {
  total: number;
  present: number;
  absent: number;
}

function computeStats(students: StudentWithState[]): CardStats {
  let present = 0;
  let absent = 0;
  for (const s of students) {
    if (s.currentState === "present") present++;
    else absent++;
  }
  return { total: students.length, present, absent };
}

const STAT_BUCKETS = {
  present: { label: "Present", states: ["present"], dot: "bg-green-500" },
  absent: { label: "Absent", states: ["absent"], dot: "bg-slate-400" },
} as const;

type StatBucket = keyof typeof STAT_BUCKETS;

interface StatFilter {
  bucket: StatBucket;
  grade: string;
  className: string | null;
}

const VALID_BUCKETS = new Set(Object.keys(STAT_BUCKETS));

interface UrlState {
  search: string;
  status: string;
  grade: string;
  className: string;
  selectedId: number | null;
  statFilter: StatFilter | null;
}

function readInitialState(): UrlState {
  const empty: UrlState = {
    search: "",
    status: "",
    grade: "",
    className: "",
    selectedId: null,
    statFilter: null,
  };
  if (typeof window === "undefined") return empty;
  const params = new URLSearchParams(window.location.search);
  const s = params.get("status") ?? "";
  const studentRaw = params.get("student") ?? "";
  const sb = params.get("sb") ?? "";
  const sg = params.get("sg") ?? "";
  const sc = params.get("sc") ?? "";
  const statFilter: StatFilter | null =
    VALID_BUCKETS.has(sb) && sg
      ? { bucket: sb as StatBucket, grade: sg, className: sc || null }
      : null;
  return {
    search: params.get("q") ?? "",
    status: VALID_STATUSES.has(s) ? s : "",
    grade: params.get("grade") ?? "",
    className: params.get("className") ?? "",
    selectedId: /^\d+$/.test(studentRaw) ? Number(studentRaw) : null,
    statFilter,
  };
}

function buildQueryString(state: UrlState): string {
  const params = new URLSearchParams();
  const trimmedSearch = state.search.trim();
  if (trimmedSearch) params.set("q", trimmedSearch);
  if (state.status) params.set("status", state.status);
  if (state.grade) params.set("grade", state.grade);
  if (state.className) params.set("className", state.className);
  if (state.statFilter) {
    params.set("sb", state.statFilter.bucket);
    params.set("sg", state.statFilter.grade);
    if (state.statFilter.className) params.set("sc", state.statFilter.className);
  }
  if (state.selectedId != null) params.set("student", String(state.selectedId));
  return params.toString();
}

export default function StudentsPage() {
  const [initialState] = useState(readInitialState);
  const [search, setSearch] = useState(initialState.search);
  const [status, setStatus] = useState(initialState.status);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(initialState.grade || null);
  const [selectedClass, setSelectedClass] = useState<string | null>(initialState.className || null);
  const [selectedId, setSelectedId] = useState<number | null>(initialState.selectedId);
  const [statFilter, setStatFilter] = useState<StatFilter | null>(initialState.statFilter);
  const [showFilters, setShowFilters] = useState(
    Boolean(initialState.grade || initialState.status || initialState.className)
  );

  useEffect(() => {
    const qs = buildQueryString({
      search,
      status,
      grade: selectedGrade ?? "",
      className: selectedClass ?? "",
      selectedId,
      statFilter,
    });
    const newUrl = window.location.pathname + (qs ? `?${qs}` : "");
    const current = window.location.pathname + window.location.search;
    if (newUrl !== current) {
      window.history.replaceState(window.history.state, "", newUrl);
    }
  }, [search, status, selectedGrade, selectedClass, selectedId, statFilter]);

  // Full roster — drives the grade/class drill-down aggregates (computed client-side).
  const { data: allStudents, isLoading } = useListStudents(undefined, {
    query: { queryKey: getListStudentsQueryKey(), refetchInterval: 30000 },
  });
  const all = useMemo(() => allStudents ?? [], [allStudents]);

  const trimmedSearch = search.trim();
  const isSearching = trimmedSearch !== "";
  const isFiltering = status !== "";

  // Flat results: when searching or status-filtering outside a class roster,
  // query the server. Inside a class roster the search/status filter is applied
  // locally so the two-column Present/Absent layout is preserved.
  const flatParams = useMemo(() => {
    if (selectedClass != null) return undefined;
    if (isSearching) {
      const p: { search: string; status?: string } = { search: trimmedSearch };
      if (status) p.status = status;
      return p;
    }
    if (isFiltering) {
      const p: { status: string; grade?: string; className?: string } = { status };
      if (selectedGrade) p.grade = selectedGrade;
      return p;
    }
    return undefined;
  }, [isSearching, isFiltering, trimmedSearch, status, selectedGrade, selectedClass]);

  const flatEnabled = flatParams !== undefined;

  const { data: flatData, isLoading: flatLoading } = useListStudents(flatParams, {
    query: {
      queryKey: getListStudentsQueryKey(flatParams),
      enabled: flatEnabled,
      refetchInterval: 30000,
    },
  });

  const grades = useMemo(() => {
    const map = new Map<string, StudentWithState[]>();
    for (const s of all) {
      const g = s.grade || "—";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(s);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" }))
      .map(([grade, students]) => ({ grade, students, stats: computeStats(students) }));
  }, [all]);

  const classesForGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const map = new Map<string, StudentWithState[]>();
    for (const s of all) {
      if ((s.grade || "—") !== selectedGrade) continue;
      const cn = s.className || "—";
      if (!map.has(cn)) map.set(cn, []);
      map.get(cn)!.push(s);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" }))
      .map(([className, students]) => ({ className, students, stats: computeStats(students) }));
  }, [all, selectedGrade]);

  const classStudents = useMemo(() => {
    if (!selectedGrade || !selectedClass) return [];
    return all.filter(
      (s) => (s.grade || "—") === selectedGrade && (s.className || "—") === selectedClass
    );
  }, [all, selectedGrade, selectedClass]);

  const gradeOptions = useMemo(() => grades.map((g) => g.grade), [grades]);

  const statActive = statFilter != null && !isSearching && !isFiltering;

  const statFilteredList = useMemo(() => {
    if (!statFilter) return [];
    const states = STAT_BUCKETS[statFilter.bucket].states as readonly string[];
    return all.filter(
      (s) =>
        (s.grade || "—") === statFilter.grade &&
        (statFilter.className == null || (s.className || "—") === statFilter.className) &&
        states.includes(s.currentState)
    );
  }, [all, statFilter]);

  const studentLevel = statActive || flatEnabled || selectedClass != null;

  // Roster: a class is open and we're not in a stat or flat (global search) view.
  // Search and status filter are applied locally so the two-column layout stays.
  const isRoster = selectedClass != null && !statActive && !flatEnabled;

  const rosterStudents = useMemo(() => {
    if (!isRoster) return [];
    const q = trimmedSearch.toLowerCase();
    return classStudents.filter((s) => {
      if (status && s.currentState !== status) return false;
      if (q) {
        const name = `${s.firstName} ${s.lastName}`.toLowerCase();
        if (!name.includes(q) && !s.studentId.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [isRoster, classStudents, trimmedSearch, status]);

  const rosterPresent = useMemo(
    () => rosterStudents.filter((s) => s.currentState === "present"),
    [rosterStudents]
  );
  const rosterAbsent = useMemo(
    () => rosterStudents.filter((s) => s.currentState !== "present"),
    [rosterStudents]
  );

  const studentLevelList = statActive
    ? statFilteredList
    : flatEnabled
      ? flatData ?? []
      : rosterStudents;
  const studentLevelLoading = flatEnabled ? flatLoading : isLoading;

  function selectGrade(g: string | null) {
    setSelectedGrade(g);
    setSelectedClass(null);
    setSelectedId(null);
    setStatFilter(null);
  }
  function selectClass(c: string | null) {
    setSelectedClass(c);
    setSelectedId(null);
    setStatFilter(null);
  }
  function handleSearch(v: string) {
    setSearch(v);
    setSelectedId(null);
  }
  function handleStatus(v: string) {
    setStatus(v);
    setSelectedId(null);
    setStatFilter(null);
  }
  function crumbAll() {
    setSelectedGrade(null);
    setSelectedClass(null);
    setSelectedId(null);
    setStatFilter(null);
  }
  function crumbGrade() {
    setSelectedClass(null);
    setSelectedId(null);
    setStatFilter(null);
  }
  function selectStat(grade: string, className: string | null, bucket: StatBucket) {
    setStatFilter({ grade, className, bucket });
    setSelectedId(null);
    setSearch("");
    setStatus("");
  }
  function clearStatFilter() {
    setStatFilter(null);
    setSelectedId(null);
  }

  const subtitle = statActive
    ? `${gradeLabel(statFilter.grade)}${statFilter.className ? ` · ${statFilter.className}` : ""} · ${studentLevelList.length} ${STAT_BUCKETS[statFilter.bucket].label}`
    : flatEnabled
      ? `${studentLevelList.length} found`
      : isRoster
        ? `${selectedClass} · ${rosterPresent.length} present · ${rosterAbsent.length} absent`
        : selectedGrade
          ? `${gradeLabel(selectedGrade)} · ${classesForGrade.length} classes`
          : `${all.length} students · ${grades.length} grades`;

  const filterAction = (
    <button
      onClick={() => setShowFilters(!showFilters)}
      className={`p-1.5 rounded-lg transition-colors ${showFilters ? "bg-white/30 text-primary-foreground" : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"}`}
      data-testid="button-toggle-filters"
    >
      <Filter className="w-4 h-4" />
    </button>
  );

  const searchBox = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search name or student ID..."
        className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        data-testid="input-student-search"
      />
      {search && (
        <button
          onClick={() => handleSearch("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          data-testid="button-clear-search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  const filtersRow = showFilters && (
    <FiltersRow
      gradeOptions={gradeOptions}
      selectedGrade={selectedGrade}
      onGrade={selectGrade}
      status={status}
      onStatus={handleStatus}
    />
  );

  const contextRow = statActive ? (
    <StatFilterBar
      bucket={statFilter.bucket}
      grade={statFilter.grade}
      className={statFilter.className}
      count={studentLevelList.length}
      onClear={clearStatFilter}
    />
  ) : flatEnabled ? (
    <FlatResultsBar
      count={studentLevelList.length}
      isSearching={isSearching}
      query={trimmedSearch}
    />
  ) : (
    <Breadcrumb
      selectedGrade={selectedGrade}
      selectedClass={selectedClass}
      onAll={crumbAll}
      onGrade={crumbGrade}
    />
  );

  const cardsContent = (
    <DrillCards
      level={selectedGrade ? "classes" : "grades"}
      grades={grades}
      classes={classesForGrade}
      isLoading={isLoading}
      onSelectGrade={selectGrade}
      onSelectClass={selectClass}
      onStatGrade={(grade, bucket) => selectStat(grade, null, bucket)}
      onStatClass={(className, bucket) => selectStat(selectedGrade!, className, bucket)}
    />
  );

  return (
    <>
      {/* ── MOBILE (< md) ── */}
      <div className="md:hidden flex flex-col min-h-screen bg-background pb-20">
        {studentLevel && selectedId ? (
          <StudentProfileView id={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <PageHeader title="Students" subtitle={subtitle} showLogo={true} action={filterAction} />
            <div className="max-w-lg mx-auto w-full">
              <div className="px-4 pt-3 sticky top-[92px] z-30 bg-background pb-2 space-y-2">
                {searchBox}
                {filtersRow}
                {contextRow}
              </div>
              {isRoster ? (
                <RosterColumns
                  present={rosterPresent}
                  absent={rosterAbsent}
                  isLoading={studentLevelLoading}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              ) : studentLevel ? (
                <StudentListRows
                  list={studentLevelList}
                  isLoading={studentLevelLoading}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  showMeta={flatEnabled || statActive}
                />
              ) : (
                cardsContent
              )}
            </div>
          </>
        )}
      </div>

      {/* ── DESKTOP (≥ md) ── */}
      <div className="hidden md:flex flex-col min-h-screen bg-background pb-6">
        <PageHeader title="Students" subtitle={subtitle} showLogo={true} action={filterAction} />

        <div className="border-b border-border bg-background px-6 py-3 space-y-2">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">{contextRow}</div>
            <div className="w-[320px] flex-none">{searchBox}</div>
          </div>
          {filtersRow}
        </div>

        {isRoster ? (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <RosterColumns
                present={rosterPresent}
                absent={rosterAbsent}
                isLoading={studentLevelLoading}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
            {selectedId && (
              <div className="w-[400px] flex-none border-l border-border overflow-y-auto bg-background">
                <StudentProfilePanel id={selectedId} />
              </div>
            )}
          </div>
        ) : studentLevel ? (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-col w-[380px] flex-none border-r border-border overflow-y-auto">
              <StudentListRows
                list={studentLevelList}
                isLoading={studentLevelLoading}
                selectedId={selectedId}
                onSelect={setSelectedId}
                showMeta={flatEnabled || statActive}
              />
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto bg-background">
              {selectedId ? (
                <StudentProfilePanel id={selectedId} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <User className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">Select a student to view their profile</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">{cardsContent}</div>
        )}
      </div>
    </>
  );
}

function FiltersRow({
  gradeOptions,
  selectedGrade,
  onGrade,
  status,
  onStatus,
}: {
  gradeOptions: string[];
  selectedGrade: string | null;
  onGrade: (g: string | null) => void;
  status: string;
  onStatus: (s: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <select
        value={selectedGrade ?? ""}
        onChange={(e) => onGrade(e.target.value || null)}
        className="flex-1 md:flex-none md:w-48 bg-card border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        data-testid="select-grade-filter"
      >
        <option value="">All Grades</option>
        {gradeOptions.map((g) => (
          <option key={g} value={g}>
            {gradeLabel(g)}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="flex-1 md:flex-none md:w-48 bg-card border border-border rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        data-testid="select-status-filter"
      >
        {STATES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Breadcrumb({
  selectedGrade,
  selectedClass,
  onAll,
  onGrade,
}: {
  selectedGrade: string | null;
  selectedClass: string | null;
  onAll: () => void;
  onGrade: () => void;
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap" data-testid="breadcrumb">
      <button
        onClick={onAll}
        className={selectedGrade ? "text-muted-foreground hover:text-foreground transition-colors" : "text-foreground font-semibold"}
        data-testid="crumb-all"
      >
        All Grades
      </button>
      {selectedGrade && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <button
            onClick={onGrade}
            className={selectedClass ? "text-muted-foreground hover:text-foreground transition-colors" : "text-foreground font-semibold"}
            data-testid="crumb-grade"
          >
            {gradeLabel(selectedGrade)}
          </button>
        </>
      )}
      {selectedClass && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-foreground font-semibold" data-testid="crumb-class">
            {selectedClass}
          </span>
        </>
      )}
    </nav>
  );
}

function FlatResultsBar({
  count,
  isSearching,
  query,
}: {
  count: number;
  isSearching: boolean;
  query: string;
}) {
  return (
    <p className="text-sm text-muted-foreground" data-testid="flat-results-bar">
      {isSearching ? (
        <>
          {count} result{count === 1 ? "" : "s"} for{" "}
          <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>
        </>
      ) : (
        <>
          {count} student{count === 1 ? "" : "s"} match this filter
        </>
      )}
    </p>
  );
}

function StatFilterBar({
  bucket,
  grade,
  className,
  count,
  onClear,
}: {
  bucket: StatBucket;
  grade: string;
  className: string | null;
  count: number;
  onClear: () => void;
}) {
  const scope = `${gradeLabel(grade)}${className ? ` · ${className}` : ""}`;
  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="stat-filter-bar">
      <span className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{scope}</span> ·{" "}
        <span className="font-semibold text-foreground">{STAT_BUCKETS[bucket].label}</span> ·{" "}
        {count} student{count === 1 ? "" : "s"}
      </span>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-clear-stat-filter"
      >
        <X className="w-3 h-3" />
        Clear
      </button>
    </div>
  );
}

function SegBar({ stats }: { stats: CardStats }) {
  const total = stats.total || 1;
  const segs = [
    { v: stats.present, c: "bg-green-500" },
    { v: stats.absent, c: "bg-slate-300" },
  ];
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted mt-3">
      {segs.map(
        (s, i) =>
          s.v > 0 && (
            <div key={i} className={s.c} style={{ width: `${(s.v / total) * 100}%` }} />
          )
      )}
    </div>
  );
}

function StatGrid({
  stats,
  onStatClick,
  testId,
}: {
  stats: CardStats;
  onStatClick: (bucket: StatBucket) => void;
  testId: string;
}) {
  const items = [
    { bucket: "present" as const, label: "Present", value: stats.present, dot: "bg-green-500" },
    { bucket: "absent" as const, label: "Absent", value: stats.absent, dot: "bg-slate-400" },
  ];
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3">
      {items.map((it) => (
        <button
          key={it.bucket}
          type="button"
          disabled={it.value === 0}
          onClick={(e) => {
            e.stopPropagation();
            onStatClick(it.bucket);
          }}
          className={`flex items-center gap-1.5 min-w-0 -mx-1 px-1 py-1 rounded-md text-left transition-colors ${
            it.value === 0
              ? "cursor-default"
              : "cursor-pointer hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          }`}
          aria-label={`View ${it.label} students`}
          data-testid={`${testId}-stat-${it.bucket}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${it.dot} flex-shrink-0`} />
          <span className="text-sm font-semibold text-foreground">{it.value}</span>
          <span className="text-xs text-muted-foreground truncate">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function DrillCards({
  level,
  grades,
  classes,
  isLoading,
  onSelectGrade,
  onSelectClass,
  onStatGrade,
  onStatClass,
}: {
  level: "grades" | "classes";
  grades: { grade: string; stats: CardStats }[];
  classes: { className: string; stats: CardStats }[];
  isLoading: boolean;
  onSelectGrade: (g: string) => void;
  onSelectClass: (c: string) => void;
  onStatGrade: (grade: string, bucket: StatBucket) => void;
  onStatClass: (className: string, bucket: StatBucket) => void;
}) {
  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground text-sm px-4">Loading...</div>;
  }

  const items = level === "grades" ? grades : classes;
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground px-4" data-testid="empty-drill">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No {level === "grades" ? "grades" : "classes"} found</p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 px-4 py-3 md:px-0 md:py-0"
      data-testid={level === "grades" ? "grid-grade-cards" : "grid-class-cards"}
    >
      {level === "grades"
        ? grades.map((g, i) => (
            <DrillCard
              key={g.grade}
              eyebrow="Grade"
              title={g.grade}
              icon={<GraduationCap className="w-5 h-5 text-primary" />}
              accent={GRADE_ACCENTS[i % GRADE_ACCENTS.length]}
              stats={g.stats}
              cta="View classes"
              onClick={() => onSelectGrade(g.grade)}
              onStatClick={(bucket) => onStatGrade(g.grade, bucket)}
              testId={`card-grade-${g.grade}`}
            />
          ))
        : classes.map((c, i) => (
            <DrillCard
              key={c.className}
              eyebrow="Class"
              title={c.className}
              icon={<Users className="w-5 h-5 text-primary" />}
              accent={GRADE_ACCENTS[i % GRADE_ACCENTS.length]}
              stats={c.stats}
              cta="View students"
              onClick={() => onSelectClass(c.className)}
              onStatClick={(bucket) => onStatClass(c.className, bucket)}
              testId={`card-class-${c.className}`}
            />
          ))}
    </div>
  );
}

function DrillCard({
  eyebrow,
  title,
  icon,
  accent,
  stats,
  cta,
  onClick,
  onStatClick,
  testId,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  accent: string;
  stats: CardStats;
  cta: string;
  onClick: () => void;
  onStatClick: (bucket: StatBucket) => void;
  testId: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group bg-card border border-border border-l-4 ${accent} rounded-xl p-4 text-left transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
            <p className="text-lg font-bold text-foreground leading-tight truncate">{title}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-foreground leading-none">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">students</p>
        </div>
      </div>
      <SegBar stats={stats} />
      <StatGrid stats={stats} onStatClick={onStatClick} testId={testId} />
      <div className="flex items-center justify-end gap-1 text-xs font-medium text-primary mt-3 opacity-70 group-hover:opacity-100 transition-opacity">
        {cta}
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

function StudentListRows({
  list,
  isLoading,
  selectedId,
  onSelect,
  showMeta,
}: {
  list: StudentWithState[];
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  showMeta?: boolean;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm px-4">Loading...</div>;
  }
  if (list.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground px-4">
        <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No students found</p>
      </div>
    );
  }
  return (
    <div className="px-4 py-2">
      <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
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
                {showMeta ? `${s.studentId} · Gr ${s.grade} · ${s.className}` : s.studentId}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge state={s.currentState} />
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function RosterColumns({
  present,
  absent,
  isLoading,
  selectedId,
  onSelect,
}: {
  present: StudentWithState[];
  absent: StudentWithState[];
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm px-4">Loading...</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 py-3 md:px-0 md:py-0">
      <RosterColumn
        label="Present"
        dot="bg-green-500"
        list={present}
        selectedId={selectedId}
        onSelect={onSelect}
        testId="roster-column-present"
      />
      <RosterColumn
        label="Absent"
        dot="bg-slate-400"
        list={absent}
        selectedId={selectedId}
        onSelect={onSelect}
        testId="roster-column-absent"
      />
    </div>
  );
}

function RosterColumn({
  label,
  dot,
  list,
  selectedId,
  onSelect,
  testId,
}: {
  label: string;
  dot: string;
  list: StudentWithState[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  testId: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid={testId}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
        <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <span className="text-sm font-bold text-foreground ml-auto" data-testid={`${testId}-count`}>
          {list.length}
        </span>
      </div>
      {list.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground px-4">
          <p className="text-sm">No students</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
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
                <p className="text-xs text-muted-foreground">{s.studentId}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentProfilePanel({ id }: { id: number }) {
  const { data, isLoading } = useGetStudent(id, {
    query: { queryKey: getGetStudentQueryKey(id), refetchInterval: 15000 },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return <StudentProfileContent data={data} id={id} />;
}

function StudentProfileView({ id, onBack }: { id: number; onBack: () => void }) {
  const { data, isLoading } = useGetStudent(id, {
    query: { queryKey: getGetStudentQueryKey(id), refetchInterval: 15000 },
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col">
        <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-profile-back">
              <X className="w-4 h-4" />
            </button>
            <h1 className="text-base font-bold text-foreground flex-1">Student Profile</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-profile-back">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Student Profile</h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto w-full pb-4">
        <StudentProfileContent data={data} id={id} />
      </div>
    </div>
  );
}

function StudentProfileContent({
  data: s,
  id,
}: {
  data: StudentProfile;
  id: number;
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
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Grade {s.grade}</span>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{s.className}</span>
            </div>
            <div className="mt-2" data-testid="status-profile">
              <StatusBadge state={s.currentState} />
            </div>
          </div>
        </div>

        {(s.lastSeenAt || s.lastSeenLocation) && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
            {s.lastSeenAt && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatRelativeTime(s.lastSeenAt)}</span>
            )}
            {s.lastSeenLocation && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.lastSeenLocation}</span>
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

      {((s.behaviorSummary.earnedTiers && s.behaviorSummary.earnedTiers.length > 0) || s.behaviorSummary.nextTier) && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3" data-testid="panel-recognition">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-foreground">Reward Recognition</h3>
          </div>

          {s.behaviorSummary.earnedTiers && s.behaviorSummary.earnedTiers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" data-testid="list-earned-tiers">
              {s.behaviorSummary.earnedTiers.map((t) => (
                <span
                  key={t.id}
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
                  data-testid={`tier-earned-${t.id}`}
                >
                  {t.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No recognition tier reached yet.</p>
          )}

          {s.behaviorSummary.nextTier && (
            <div data-testid="next-tier-progress">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  Next: <span className="font-medium text-foreground">{s.behaviorSummary.nextTier.name}</span>
                </span>
                <span className="text-muted-foreground">
                  {s.behaviorSummary.totalMerits} / {s.behaviorSummary.nextTier.thresholdPoints} pts
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((s.behaviorSummary.totalMerits / s.behaviorSummary.nextTier.thresholdPoints) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-timeline">
        <div className="px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Today's Timeline</h3>
        </div>
        {s.todayTimeline.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No activity recorded today</div>
        ) : (
          <div className="divide-y divide-border">
            {s.todayTimeline.map((event, i) => (
              <div key={event.id} className="px-4 py-3 flex items-start gap-3" data-testid={`timeline-event-${event.id}`}>
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {i < s.todayTimeline.length - 1 && <div className="w-0.5 h-full bg-border mt-1 flex-grow" />}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-sm font-medium text-foreground">{getScanTypeLabel(event.scanType)}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatTime(event.createdAt)}</span>
                    {event.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{event.location}
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
                  {log.note && <p className="text-xs text-muted-foreground truncate">{log.note}</p>}
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
    query: { queryKey: getListStudentQrCodesQueryKey(studentId) },
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
              <QRCodeSVG value={effectiveCode} size={160} level="M" />
            </div>
            <p className="text-xs text-muted-foreground font-mono text-center break-all px-2" data-testid="text-active-qr-code">
              {effectiveCode}
            </p>
            {activeCode && (
              <p className="text-xs text-muted-foreground">Generated {formatRelativeTime(activeCode.createdAt)}</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">No active QR code</div>
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
