import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, X } from "lucide-react";

// ---------------------------------------------------------------------------
// BarcodeDetector type declarations (not yet in standard lib.dom.d.ts)
// ---------------------------------------------------------------------------
interface BarcodeDetectorResult {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
}

interface NativeBarcodeDetector {
  detect(
    source:
      | HTMLVideoElement
      | HTMLCanvasElement
      | ImageBitmap
      | ImageData
      | Blob
  ): Promise<BarcodeDetectorResult[]>;
}

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats(): Promise<string[]>;
}

/**
 * Formats we want to detect. The student QR codes are plain QR codes
 * (`SCID-{id}` strings), but we also accept common 1-D formats so that
 * printed barcodes on existing ID cards keep working.
 */
const DESIRED_FORMATS = ["qr_code", "code_128", "code_39", "ean_13"];

/** Returns a BarcodeDetector instance if the platform supports it, or null. */
async function buildNativeDetector(): Promise<NativeBarcodeDetector | null> {
  const BarcodeDetectorCtor = (
    window as unknown as { BarcodeDetector?: NativeBarcodeDetectorConstructor }
  ).BarcodeDetector;
  if (!BarcodeDetectorCtor) return null;

  try {
    const supported = await BarcodeDetectorCtor.getSupportedFormats();
    const formats = DESIRED_FORMATS.filter((f) => supported.includes(f));
    if (formats.length === 0) return null;
    return new BarcodeDetectorCtor({ formats });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

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

  // ZXing path
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  // Native BarcodeDetector path
  const nativeStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const scannedRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continuousRef = useRef(continuous);
  const cooldownMsRef = useRef(cooldownMs);
  const stoppedRef = useRef(false);
  /** true when using the native BarcodeDetector path */
  const usingNativeRef = useRef(false);

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

  // -------------------------------------------------------------------------
  // Shared callback — called by both native and ZXing paths
  // -------------------------------------------------------------------------
  function handleDecoded(decodedText: string) {
    if (stoppedRef.current) return;
    if (scannedRef.current) return;

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

  // -------------------------------------------------------------------------
  // Native BarcodeDetector path
  // -------------------------------------------------------------------------
  async function startNativeScanner(detector: NativeBarcodeDetector) {
    const video = videoRef.current;
    if (!video) return;

    // Pick the back camera the same way as the ZXing path.
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");
    if (videoDevices.length === 0) throw new Error("No camera found on this device.");

    const backCamera = videoDevices.find(
      (d) =>
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("environment")
    );

    const constraints: MediaStreamConstraints = {
      video: backCamera
        ? { deviceId: { exact: backCamera.deviceId } }
        : { facingMode: { ideal: "environment" } },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (stoppedRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    nativeStreamRef.current = stream;
    video.srcObject = stream;
    await video.play();

    if (stoppedRef.current) return;
    setStatus("scanning");

    function tick() {
      if (stoppedRef.current) return;
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      detector
        .detect(video)
        .then((results) => {
          if (results.length > 0) {
            handleDecoded(results[0].rawValue);
          }
        })
        .catch(() => {
          // detection errors are transient — just skip this frame
        })
        .finally(() => {
          if (!stoppedRef.current) {
            rafRef.current = requestAnimationFrame(tick);
          }
        });
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  // -------------------------------------------------------------------------
  // ZXing path (unchanged logic, extracted for clarity)
  // -------------------------------------------------------------------------
  async function startZxingScanner() {
    const video = videoRef.current;
    if (!video) return;

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
      video,
      (result, err) => {
        if (stoppedRef.current) return;
        if (err) return; // NotFoundException / transient errors — skip silently
        if (!result) return;
        handleDecoded(result.getText());
      }
    );

    if (!stoppedRef.current) {
      controlsRef.current = controls;
      setStatus("scanning");
    } else {
      controls.stop();
    }
  }

  // -------------------------------------------------------------------------
  // Main start / stop
  // -------------------------------------------------------------------------
  async function startScanner() {
    if (!videoRef.current) return;
    setStatus("starting");
    scannedRef.current = false;
    stoppedRef.current = false;
    usingNativeRef.current = false;

    try {
      const nativeDetector = await buildNativeDetector();

      if (nativeDetector) {
        usingNativeRef.current = true;
        await startNativeScanner(nativeDetector);
      } else {
        await startZxingScanner();
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

    // Native path cleanup
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (nativeStreamRef.current) {
      nativeStreamRef.current.getTracks().forEach((t) => t.stop());
      nativeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // ZXing path cleanup
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
