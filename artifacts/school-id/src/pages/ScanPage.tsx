import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { QrScanner } from "@/components/QrScanner";
import { getScanTypeLabel, formatTime } from "@/lib/status";
import {
  useProcessScan,
  useCreateBehaviorLog,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import type { ScanResult } from "@workspace/api-client-react";
import { ScanType } from "@workspace/api-client-react";
import {
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

export default function ScanPage() {
  const queryClient = useQueryClient();
  const [scanType, setScanType] = useState("gate_in");
  const [location, setLocation] = useState("Main Gate");
  const [manualInput, setManualInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [behaviorMessage, setBehaviorMessage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!cameraActive) {
      inputRef.current?.focus();
    }
  }, [cameraActive]);

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

  function handleQrScan(code: string) {
    setCameraActive(false);
    processScan(code);
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
      if (!cameraActive) {
        inputRef.current?.focus();
      }
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

  const cameraPanel = cameraActive ? (
    <div data-testid="panel-camera-placeholder">
      <QrScanner
        active={cameraActive}
        onScan={handleQrScan}
        onStop={() => setCameraActive(false)}
      />
    </div>
  ) : (
    <div
      className="bg-slate-900 rounded-2xl overflow-hidden relative cursor-pointer group"
      style={{ aspectRatio: "4/3" }}
      data-testid="panel-camera-placeholder"
      onClick={() => setCameraActive(true)}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="w-16 h-16 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors flex items-center justify-center">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <p className="text-white/80 text-sm font-semibold">Tap to scan QR code</p>
        <p className="text-slate-400 text-xs text-center px-6">
          Or use the input below to enter a Student ID manually
        </p>
      </div>
      <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl" />
      <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br" />
    </div>
  );

  const controlsPanel = (
    <div className="space-y-4">
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
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 md:pb-6">
      <PageHeader
        title="Scan"
        subtitle={`Mode: ${getScanTypeLabel(scanType)}`}
        showLogo={true}
      />

      {/* Mobile: single column */}
      <div className="md:hidden max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {cameraPanel}
        {controlsPanel}
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6 px-6 py-5">
        <div>{cameraPanel}</div>
        <div className="space-y-4">
          {controlsPanel}
          {/* Desktop inline result card */}
          {result && sheetOpen && (
            <div className="bg-card border border-border rounded-xl overflow-hidden" data-testid="panel-scan-result">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
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
              <div className="px-5 py-4">
                <ScanResultContent
                  result={result}
                  behaviorMessage={behaviorMessage}
                  scanMutation={scanMutation}
                  behaviorMutation={behaviorMutation}
                  onQuickScan={handleQuickScan}
                  onBehavior={handleBehavior}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sheet overlay - mobile only */}
      {(sheetOpen || result) && (
        <>
          {/* Backdrop */}
          <div
            className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${sheetOpen ? "opacity-100" : "opacity-0"}`}
            onClick={dismissSheet}
            data-testid="overlay-scan-result"
          />

          {/* Bottom Sheet */}
          <div
            className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${sheetOpen ? "translate-y-0" : "translate-y-full"}`}
            style={{ maxHeight: "85vh", overflowY: "auto" }}
            data-testid="panel-scan-result-mobile"
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
                <ScanResultContent
                  result={result}
                  behaviorMessage={behaviorMessage}
                  scanMutation={scanMutation}
                  behaviorMutation={behaviorMutation}
                  onQuickScan={handleQuickScan}
                  onBehavior={handleBehavior}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScanResultContent({
  result,
  behaviorMessage,
  scanMutation,
  behaviorMutation,
  onQuickScan,
  onBehavior,
}: {
  result: ScanResult;
  behaviorMessage: string | null;
  scanMutation: { isPending: boolean };
  behaviorMutation: { isPending: boolean };
  onQuickScan: (type: string) => void;
  onBehavior: (type: "merit" | "demerit") => void;
}) {
  return (
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
            <img src={result.student.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
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

      {/* Quick actions */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Quick Actions
      </p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <ActionButton
          label="Check In"
          icon={<LogIn className="w-4 h-4" />}
          colorClass="bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
          onClick={() => onQuickScan("gate_in")}
          disabled={scanMutation.isPending}
          testId="button-quick-check-in"
        />
        <ActionButton
          label="Check Out"
          icon={<LogOut className="w-4 h-4" />}
          colorClass="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
          onClick={() => onQuickScan("gate_out")}
          disabled={scanMutation.isPending}
          testId="button-quick-check-out"
        />
        <ActionButton
          label="Class"
          icon={<BookOpen className="w-4 h-4" />}
          colorClass="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
          onClick={() => onQuickScan("class")}
          disabled={scanMutation.isPending}
          testId="button-quick-class"
        />
        <ActionButton
          label="Event"
          icon={<CalendarDays className="w-4 h-4" />}
          colorClass="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
          onClick={() => onQuickScan("event")}
          disabled={scanMutation.isPending}
          testId="button-quick-event"
        />
        <ActionButton
          label="Merit"
          icon={<ThumbsUp className="w-4 h-4" />}
          colorClass="bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
          onClick={() => onBehavior("merit")}
          disabled={behaviorMutation.isPending}
          testId="button-quick-merit"
        />
        <ActionButton
          label="Demerit"
          icon={<ThumbsDown className="w-4 h-4" />}
          colorClass="bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
          onClick={() => onBehavior("demerit")}
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
