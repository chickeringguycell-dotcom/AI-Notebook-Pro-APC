import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, RefreshCw, Upload, X, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraScanDialogProps {
  open: boolean;
  isScanning: boolean;
  onClose: () => void;
  onCaptureDataUrl: (dataUrl: string, mimeType: string) => void;
  onPickFileFallback: () => void;
}

export function CameraScanDialog({
  open,
  isScanning,
  onClose,
  onCaptureDataUrl,
  onPickFileFallback,
}: CameraScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => {
        try {
          tr.stop();
        } catch {
          /* ignore */
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode: "environment" | "user") => {
      stopCamera();
      setCameraError(null);
      setStarting(true);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera access is not supported in this browser.");
        }
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch {
          // Fallback to any available camera (e.g. desktop USB webcam)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setCameraError(
          err instanceof Error && err.message
            ? err.message
            : "Could not access camera. Check camera permissions or upload a photo below."
        );
      } finally {
        setStarting(false);
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    if (open) {
      void startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, facingMode, startCamera, stopCamera]);

  const handleSnapAndScan = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopCamera();
    onCaptureDataUrl(dataUrl, "image/jpeg");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan Text with Camera"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-4 shadow-2xl space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif font-semibold text-base text-foreground">
            <ScanLine className="h-5 w-5 text-primary" />
            <span>Scan Words from Book or Page</span>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            aria-label="Close scanner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Point your camera at any book, recipe card, or printed page and tap <strong>Capture & Scan Words</strong> to pull the text straight onto your stationery.
        </p>

        {/* Live Camera Viewfinder */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-border">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />

          {/* Framing guide corners */}
          {!cameraError && (
            <div className="pointer-events-none absolute inset-5 border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]" />
          )}

          {(starting || isScanning) && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white text-sm font-medium">
              <Loader2 className="h-7 w-7 animate-spin" />
              <span>{isScanning ? "Reading words off image…" : "Opening camera…"}</span>
            </div>
          )}

          {cameraError && !starting && (
            <div className="absolute inset-0 bg-zinc-900/95 p-6 flex flex-col items-center justify-center text-center gap-3">
              <Camera className="h-8 w-8 text-amber-400" />
              <p className="text-xs text-zinc-200 leading-relaxed">{cameraError}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  stopCamera();
                  onClose();
                  onPickFileFallback();
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Choose Photo from Device
              </Button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
            disabled={isScanning || !!cameraError}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Flip Camera
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              stopCamera();
              onClose();
              onPickFileFallback();
            }}
            disabled={isScanning}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Upload className="h-3.5 w-3.5" />
            Existing Photo
          </Button>

          <Button
            type="button"
            onClick={handleSnapAndScan}
            disabled={isScanning || starting || !!cameraError}
            className="ml-auto font-semibold gap-1.5"
            data-testid="button-camera-capture-scan"
          >
            <Camera className="h-4 w-4" />
            Capture & Scan Words
          </Button>
        </div>
      </div>
    </div>
  );
}
