import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { BASE_URL } from "@/lib/api";
import { getScanTypeLabel, formatTime } from "@/lib/status";
import { QrCode, CheckCircle2, AlertTriangle, X, Camera, ChevronDown } from "lucide-react";

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

interface ScanResult {
  student: {
    id: number;
    firstName: string;
    lastName: string;
    studentId: string;
    grade: string;
    className: string;
    photoUrl: string | null;
    currentState: string;
    lastSeenAt: string | null;
    lastSeenLocation: string | null;
  };
  scanEvent: {
    scanType: string;
    location: string | null;
    createdAt: string;
  };
  warnings: string[];
}

export default function ScanPage() {
  const [scanType, setScanType] = useState("gate_in");
  const [location, setLocation] = useState("Main Gate");
  const [manualInput, setManualInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function processScan(code: string) {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("school-id-token");
      const res = await fetch(`${BASE_URL}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qrCode: code.trim(),
          scanType,
          location: location || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Scan failed");
        return;
      }
      const data: ScanResult = await res.json();
      setResult(data);
      setShowResult(true);
      setManualInput("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    processScan(manualInput);
  }

  function dismissResult() {
    setShowResult(false);
    setResult(null);
    inputRef.current?.focus();
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
              disabled={loading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading || !manualInput.trim()}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-opacity flex-shrink-0"
            >
              {loading ? "..." : "Go"}
            </button>
          </form>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* QR Scanner hint */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">QR / Barcode Scanner Ready</p>
            <p className="text-xs text-muted-foreground">Connect a USB scanner or use the input above</p>
          </div>
        </div>

        {/* Scan Result */}
        {showResult && result && (
          <div className={`bg-card border rounded-xl p-4 ${result.warnings.length > 0 ? "border-yellow-300" : "border-green-300"}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="font-semibold text-foreground">Scan Successful</span>
              </div>
              <button onClick={dismissResult} className="p-1 text-muted-foreground hover:text-foreground">
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
                <p className="font-bold text-foreground text-base">
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

            <div className="border-t border-border pt-3 space-y-1.5 text-sm">
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

            {result.warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {result.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-yellow-800 text-xs bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg"
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
