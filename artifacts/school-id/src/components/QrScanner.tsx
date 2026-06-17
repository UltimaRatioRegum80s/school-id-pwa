import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, X } from "lucide-react";

interface QrScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  active: boolean;
  onStop?: () => void;
  /**
   * When true, the scanner keeps running after a successful decode instead of
   * stopping. A short cooldown prevents the same code from firing repeatedly.
   */
  continuous?: boolean;
  /** Cooldown (ms) before the scanner will accept another decode in continuous mode. */
  cooldownMs?: number;
}

export function QrScanner({
  onScan,
  onError,
  active,
  onStop,
  continuous = false,
  cooldownMs = 700,
}: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const scannedRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continuousRef = useRef(continuous);
  const cooldownMsRef = useRef(cooldownMs);
  const stoppedRef = useRef(false);

  useEffect(() => {
    continuousRef.current = continuous;
    cooldownMsRef.current = cooldownMs;
  }, [continuous, cooldownMs]);

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
    if (!videoRef.current) return;
    setStatus("starting");
    scannedRef.current = false;
    stoppedRef.current = false;

    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!devices || devices.length === 0) {
        throw new Error("No camera found on this device.");
      }

      const backCamera = devices.find(
        (d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
      );
      const deviceId = backCamera ? backCamera.deviceId : devices[devices.length - 1].deviceId;

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, err) => {
          if (stoppedRef.current) return;
          if (err) {
            // NotFoundException = no QR code visible yet; all other errors are
            // transient and self-resolve, so silently skip them all.
            return;
          }
          if (!result) return;
          if (scannedRef.current) return;

          const decodedText = result.getText();
          scannedRef.current = true;

          if (continuousRef.current) {
            onScan(decodedText);
            if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = setTimeout(() => {
              scannedRef.current = false;
            }, cooldownMsRef.current);
          } else {
            stopScanner().then(() => {
              onScan(decodedText);
            });
          }
        }
      );

      if (!stoppedRef.current) {
        controlsRef.current = controls;
        setStatus("scanning");
      } else {
        controls.stop();
      }
    } catch (err: unknown) {
      if (stoppedRef.current) return;
      const msg =
        err instanceof Error
          ? err.message.includes("Permission") || err.message.includes("NotAllowed")
            ? "Camera permission denied. Please allow camera access."
            : err.message
          : "Could not start camera.";
      setErrorMsg(msg);
      setStatus("error");
      onError?.(msg);
    }
  }

  async function stopScanner() {
    stoppedRef.current = true;
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // ignore
      }
      controlsRef.current = null;
    }
    readerRef.current = null;
    setStatus("idle");
  }

  function handleStop() {
    stopScanner();
    onStop?.();
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        autoPlay
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
