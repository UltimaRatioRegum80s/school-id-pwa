import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getScanTypeLabel, formatTime } from "@/lib/status";
import {
  useProcessScan,
  useCreateBehaviorLog,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import type { ScanResult } from "@workspace/api-client-react";
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  LogIn,
  LogOut,
  BookOpen,
  CalendarDays,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

const SCAN_TYPES = [
  { value: "gate_in", label: "Gate In" },
  { value: "gate_out", label: "Gate Out" },
  { value: "class", label: "Class" },
  { value: "event", label: "Event" },
  { value: "assembly", label: "Assembly" },
  { value: "activity", label: "Activity" },
  { value: "detention", label: "Detention" },
  { value: "club", label: "Club" },
];

const DEMO_QR_CODES = ["SCID-STU1001", "SCID-STU1002", "SCID-STU1003"];

export default function ScanPage() {
  const queryClient = useQueryClient();
  const [scanType, setScanType] = useState("gate_in");
  const [location, setLocation] = useState("Main Gate");
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [behaviorMessage, setBehaviorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scanMutation = useProcessScan({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setShowResult(true);
        setManualInput("");
        setBehaviorMessage(null);
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setTimeout(() => inputRef.current?.focus(), 100);
      },
    },
  });

  const behaviorMutation = useCreateBehaviorLog({
    mutation: {
      onSuccess: (_, variables) => {
        setBehaviorMessage(
          variables.data.type === "merit" ? "Merit recorded" : "Demerit recorded"
        );
      },
    },
  });

  function processScan(code: string) {
    if (!code.trim()) return;
    scanMutation.mutate({
      data: {
        qrCode: code.trim(),
        scanType,
        location: location || undefined,
      },
    });
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    processScan(manualInput);
  }

  function dismissResult() {
    setShowResult(false);
    setResult(null);
    setBehaviorMessage(null);
    inputRef.current?.focus();
  }

  function handleQuickScan(type: string) {
    if (!result) return;
    scanMutation.mutate({
      data: {
        qrCode: result.student.qrCode,
        scanType: type,
        location: location || undefined,
      },
    });
  }

  function handleBehavior(type: "merit" | "demerit") {
    if (!result) return;
    behaviorMutation.mutate({
      data: {
        studentId: result.student.id,
        type,
        points: type === "merit" ? 1 : -1,
        note: `Quick ${type} from scan`,
      },
    });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <PageHeader
        title="Scan"
        subtitle={`Mode: ${getScanTypeLabel(scanType)}`}
      />

      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Scan Type Selector */}
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Scan Type
          </label>
          <div className="relative">
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-medium pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="select-scan-type"
            >
              {SCAN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Main Gate, Block A Room 101"
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="input-location"
          />
        </div>

        {/* Manual Input */}
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Scan or Enter Student ID / QR Code
          </label>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  processScan(manualInput);
                }
              }}
              placeholder="Scan QR or type Student ID..."
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={scanMutation.isPending}
              autoComplete="off"
              data-testid="input-qr-code"
            />
            <button
              type="submit"
              disabled={scanMutation.isPending || !manualInput.trim()}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity flex-shrink-0"
              data-testid="button-scan-submit"
            >
              {scanMutation.isPending ? "..." : "Go"}
            </button>
          </form>

          {scanMutation.isError && (
            <div
              className="mt-3 flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg"
              data-testid="text-scan-error"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Scan failed. Check the student ID and try again.
            </div>
          )}
        </div>

        {/* Demo Simulate Scan */}
        <div className="bg-muted/50 border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <QrCode className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Demo Mode</p>
              <p className="text-xs text-muted-foreground">Simulate a scan with a sample student</p>
            </div>
          </div>
          <div className="flex gap-2">
            {DEMO_QR_CODES.map((qr) => (
              <button
                key={qr}
                onClick={() => processScan(qr)}
                disabled={scanMutation.isPending}
                className="flex-1 bg-card border border-border rounded-lg py-1.5 text-xs font-medium text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
                data-testid={`button-demo-scan-${qr}`}
              >
                {qr.replace("SCID-", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Scan Result */}
        {showResult && result && (
          <div
            className={`bg-card border rounded-xl p-4 ${result.warnings.length > 0 ? "border-yellow-300" : "border-green-300"}`}
            data-testid="panel-scan-result"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="font-semibold text-foreground">Scan Successful</span>
              </div>
              <button
                onClick={dismissResult}
                className="p-1 text-muted-foreground hover:text-foreground"
                data-testid="button-dismiss-result"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                {result.student.photoUrl ? (
                  <img
                    src={result.student.photoUrl}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-primary">
                    {result.student.firstName[0]}{result.student.lastName[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground text-base" data-testid="text-scanned-student-name">
                  {result.student.firstName} {result.student.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.student.studentId} · Grade {result.student.grade} · {result.student.className}
                </p>
                <div className="mt-1">
                  <StatusBadge state={result.student.currentState} />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-1.5 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scan Type</span>
                <span className="font-medium">{getScanTypeLabel(result.scanEvent.scanType)}</span>
              </div>
              {result.scanEvent.location && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{result.scanEvent.location}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{formatTime(result.scanEvent.createdAt)}</span>
              </div>
            </div>

            {/* Contextual quick actions */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Quick Actions
              </p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <button
                  onClick={() => handleQuickScan("gate_in")}
                  disabled={scanMutation.isPending}
                  className="flex flex-col items-center gap-1 bg-green-50 border border-green-200 rounded-lg py-2 px-1 text-green-800 hover:bg-green-100 transition-colors disabled:opacity-50"
                  data-testid="button-quick-check-in"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Check In</span>
                </button>
                <button
                  onClick={() => handleQuickScan("gate_out")}
                  disabled={scanMutation.isPending}
                  className="flex flex-col items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg py-2 px-1 text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  data-testid="button-quick-check-out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Check Out</span>
                </button>
                <button
                  onClick={() => handleQuickScan("class")}
                  disabled={scanMutation.isPending}
                  className="flex flex-col items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg py-2 px-1 text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  data-testid="button-quick-class"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Class</span>
                </button>
                <button
                  onClick={() => handleQuickScan("event")}
                  disabled={scanMutation.isPending}
                  className="flex flex-col items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-lg py-2 px-1 text-yellow-800 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                  data-testid="button-quick-event"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Event</span>
                </button>
                <button
                  onClick={() => handleBehavior("merit")}
                  disabled={behaviorMutation.isPending}
                  className="flex flex-col items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-1 text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  data-testid="button-quick-merit"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Merit</span>
                </button>
                <button
                  onClick={() => handleBehavior("demerit")}
                  disabled={behaviorMutation.isPending}
                  className="flex flex-col items-center gap-1 bg-red-50 border border-red-200 rounded-lg py-2 px-1 text-red-800 hover:bg-red-100 transition-colors disabled:opacity-50"
                  data-testid="button-quick-demerit"
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Demerit</span>
                </button>
              </div>
              {behaviorMessage && (
                <p className="text-xs text-green-700 text-center font-medium" data-testid="text-behavior-message">
                  {behaviorMessage}
                </p>
              )}
            </div>

            {result.warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-yellow-800 text-xs bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg"
                    data-testid={`text-scan-warning-${i}`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {w}
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
