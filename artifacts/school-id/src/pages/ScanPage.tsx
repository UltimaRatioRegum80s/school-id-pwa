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
import { ScanType } from "@workspace/api-client-react";
import {
  QrCode,
  Camera,
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [behaviorMessage, setBehaviorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scanMutation = useProcessScan({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setSheetOpen(true);
        setManualInput("");
        setBehaviorMessage(null);
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
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
        scanType: scanType as ScanType,
        location: location || undefined,
      },
    });
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    processScan(manualInput);
  }

  function dismissSheet() {
    setSheetOpen(false);
    setBehaviorMessage(null);
    setTimeout(() => {
      setResult(null);
      inputRef.current?.focus();
    }, 300);
  }

  function handleQuickScan(type: string) {
    if (!result) return;
    scanMutation.mutate({
      data: {
        qrCode: result.student.qrCode,
        scanType: type as ScanType,
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
        {/* Camera Placeholder */}
        <div
          className="bg-slate-900 rounded-2xl overflow-hidden relative"
          style={{ aspectRatio: "4/3" }}
          data-testid="panel-camera-placeholder"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Camera className="w-12 h-12 text-slate-500" />
            <p className="text-slate-400 text-sm font-medium">Camera not available</p>
            <p className="text-slate-500 text-xs text-center px-6">
              Use the input below to scan or enter a Student ID
            </p>
          </div>
          {/* Corner guides */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl" />
          <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br" />
        </div>

        {/* Scan Type + Location row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Scan Type
            </label>
            <div className="relative">
              <select
                value={scanType}
                onChange={(e) => setScanType(e.target.value)}
                className="w-full appearance-none bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground font-medium pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="select-scan-type"
              >
                {SCAN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Main Gate"
              className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-location"
            />
          </div>
        </div>

        {/* Manual Input */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Enter Student ID or QR Code
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
              placeholder="Scan QR or type ID..."
              className="flex-1 bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <QrCode className="w-4 h-4 text-primary" />
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
      </div>

      {/* Bottom Sheet overlay */}
      {(sheetOpen || result) && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${sheetOpen ? "opacity-100" : "opacity-0"}`}
            onClick={dismissSheet}
            data-testid="overlay-scan-result"
          />

          {/* Bottom Sheet */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${sheetOpen ? "translate-y-0" : "translate-y-full"}`}
            style={{ maxHeight: "85vh", overflowY: "auto" }}
            data-testid="panel-scan-result"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>

            <div className="px-5 pb-6 safe-bottom">
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-foreground">Scan Successful</span>
                </div>
                <button
                  onClick={dismissSheet}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  data-testid="button-dismiss-result"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {result && (
                <>
                  {/* Warning banners */}
                  {result.warnings.length > 0 && (
                    <div className="space-y-2 mb-4">
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

                  {/* Student card */}
                  <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-xl">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      {result.student.photoUrl ? (
                        <img
                          src={result.student.photoUrl}
                          alt=""
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-primary">
                          {result.student.firstName[0]}{result.student.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-base leading-tight" data-testid="text-scanned-student-name">
                        {result.student.firstName} {result.student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {result.student.studentId} · Grade {result.student.grade} · {result.student.className}
                      </p>
                      <div className="mt-1.5">
                        <StatusBadge state={result.student.currentState} />
                      </div>
                    </div>
                  </div>

                  {/* Scan details */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="bg-muted/50 rounded-lg py-2 px-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Type</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{getScanTypeLabel(result.scanEvent.scanType)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg py-2 px-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{result.scanEvent.location ?? "—"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg py-2 px-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{formatTime(result.scanEvent.createdAt)}</p>
                    </div>
                  </div>

                  {/* Contextual action buttons */}
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <ActionButton
                      label="Check In"
                      icon={<LogIn className="w-4 h-4" />}
                      colorClass="bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
                      onClick={() => handleQuickScan("gate_in")}
                      disabled={scanMutation.isPending}
                      testId="button-quick-check-in"
                    />
                    <ActionButton
                      label="Check Out"
                      icon={<LogOut className="w-4 h-4" />}
                      colorClass="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      onClick={() => handleQuickScan("gate_out")}
                      disabled={scanMutation.isPending}
                      testId="button-quick-check-out"
                    />
                    <ActionButton
                      label="Class"
                      icon={<BookOpen className="w-4 h-4" />}
                      colorClass="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                      onClick={() => handleQuickScan("class")}
                      disabled={scanMutation.isPending}
                      testId="button-quick-class"
                    />
                    <ActionButton
                      label="Event"
                      icon={<CalendarDays className="w-4 h-4" />}
                      colorClass="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
                      onClick={() => handleQuickScan("event")}
                      disabled={scanMutation.isPending}
                      testId="button-quick-event"
                    />
                    <ActionButton
                      label="Merit"
                      icon={<ThumbsUp className="w-4 h-4" />}
                      colorClass="bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                      onClick={() => handleBehavior("merit")}
                      disabled={behaviorMutation.isPending}
                      testId="button-quick-merit"
                    />
                    <ActionButton
                      label="Demerit"
                      icon={<ThumbsDown className="w-4 h-4" />}
                      colorClass="bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
                      onClick={() => handleBehavior("demerit")}
                      disabled={behaviorMutation.isPending}
                      testId="button-quick-demerit"
                    />
                  </div>

                  {behaviorMessage && (
                    <p className="text-xs text-green-700 text-center font-medium py-1" data-testid="text-behavior-message">
                      {behaviorMessage}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  colorClass,
  onClick,
  disabled,
  testId,
}: {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  onClick: () => void;
  disabled: boolean;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 border rounded-xl py-2.5 px-1 transition-colors disabled:opacity-50 ${colorClass}`}
      data-testid={testId}
    >
      {icon}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
