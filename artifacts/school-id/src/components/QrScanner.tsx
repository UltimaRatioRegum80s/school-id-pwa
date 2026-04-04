import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "lucide-react";

interface QrScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  active: boolean;
  onStop?: () => void;
}

export function QrScanner({ onScan, onError, active, onStop }: QrScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const scannedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      stopScanner();
      return;
    }
    startScanner();
    return () => {
      stopScanner();
    };
  }, [active]);

  async function startScanner() {
    if (!containerRef.current) return;
    setStatus("starting");
    scannedRef.current = false;

    try {
      const scannerId = "qr-scanner-" + Math.random().toString(36).slice(2);
      if (containerRef.current) {
        containerRef.current.id = scannerId;
      }

      const scanner = new Html5Qrcode(scannerId, { verbose: false });
      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found on this device.");
      }

      const backCamera = cameras.find(
        (c) =>
          c.label.toLowerCase().includes("back") ||
          c.label.toLowerCase().includes("rear") ||
          c.label.toLowerCase().includes("environment")
      );
      const cameraId = backCamera ? backCamera.id : cameras[cameras.length - 1].id;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.333,
          disableFlip: false,
        },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          stopScanner().then(() => {
            onScan(decodedText);
          });
        },
        () => {}
      );

      setStatus("scanning");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.includes("Permission")
            ? "Camera permission denied. Please allow camera access."
            : err.message
          : "Could not start camera.";
      setErrorMsg(msg);
      setStatus("error");
      onError?.(msg);
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setStatus("idle");
  }

  function handleStop() {
    stopScanner();
    onStop?.();
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: "100%" }}
      />

      {status === "starting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-3 z-10">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm">Starting camera…</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-3 z-10 px-6">
          <Camera className="w-10 h-10 text-slate-500" />
          <p className="text-slate-300 text-sm font-medium text-center">{errorMsg}</p>
        </div>
      )}

      {status === "scanning" && (
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full z-10 pointer-events-none">
            Point camera at QR code or barcode
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
            style={{ width: 220, height: 220 }}>
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br" />
          </div>
        </>
      )}

      {(status === "scanning" || status === "starting") && (
        <button
          onClick={handleStop}
          className="absolute top-3 right-3 z-20 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
          aria-label="Stop scanning"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
