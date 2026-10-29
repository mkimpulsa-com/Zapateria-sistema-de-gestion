"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Barcode,
  Camera,
  CameraOff,
  Check,
  RefreshCw,
  ScanLine,
  Sparkles,
  X,
} from "lucide-react";
import {
  cleanBarcodeScan,
  generateValidEan13,
  isValidEan13,
} from "@/lib/barcode";

interface BarcodeInputScannerProps {
  value: string;
  onChange: (value: string) => void;
  modalOpen?: boolean;
  inputName?: string;
}

function playBeep() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.07;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.09);
  } catch {
    // Ignore audio errors if blocked by browser autoplay policy
  }
}

async function getBarcodeDetectorInstance() {
  const formats = [
    "ean_13",
    "ean_8",
    "upc_a",
    "upc_e",
    "code_128",
    "code_39",
    "itf",
    "qr_code",
  ];

  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const NativeDetector = (window as any).BarcodeDetector;
      return new NativeDetector({ formats });
    } catch {
      const NativeDetector = (window as any).BarcodeDetector;
      return new NativeDetector();
    }
  }

  // Fallback polyfill para navegadores de escritorio (Windows Chrome/Edge/Firefox/Safari)
  const dynamicImport = new Function("url", "return import(url)") as (
    url: string
  ) => Promise<any>;

  try {
    const mod = await dynamicImport(
      "https://cdn.jsdelivr.net/npm/barcode-detector@2/dist/es/pure.min.js"
    );
    const PolyfillDetector = mod.BarcodeDetector || mod.default;
    if (PolyfillDetector) {
      return new PolyfillDetector({ formats });
    }
  } catch {
    // Fallback secundario si jsdelivr falla
    try {
      const mod2 = await dynamicImport(
        "https://unpkg.com/barcode-detector@2/dist/es/pure.min.js"
      );
      const PolyfillDetector2 = mod2.BarcodeDetector || mod2.default;
      if (PolyfillDetector2) {
        return new PolyfillDetector2({ formats });
      }
    } catch {}
  }

  return null;
}

export function BarcodeInputScanner({
  value,
  onChange,
  modalOpen = true,
  inputName = "barcode",
}: BarcodeInputScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [readerListening, setReaderListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [lastScanSource, setLastScanSource] = useState<
    "reader" | "camera" | null
  >(null);

  // Cerrar cámara y modo lector cuando se cierra el modal padre
  useEffect(() => {
    if (!modalOpen) {
      setCameraOpen(false);
      setReaderListening(false);
      setCameraError(null);
      setLastScanSource(null);
    }
  }, [modalOpen]);

  // Escucha global para pistola lectora USB / Bluetooth cuando el modal está abierto
  useEffect(() => {
    if (!modalOpen) return;

    let scanBuffer = "";
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isCurrentBarcodeInput = target === inputRef.current;
      const isOtherInput =
        !isCurrentBarcodeInput &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "");

      // Si el usuario está escribiendo normalmente en otro input y no activó explícitamente "Usar lector", no interferir
      if (isOtherInput && !readerListening) {
        return;
      }

      const now = Date.now();

      if (e.key === "Enter") {
        // Si estaba en el input de código de barras o el buffer rápido tiene un código escaneado
        if (scanBuffer.length >= 4 && now - lastKeyTime < 120) {
          e.preventDefault();
          e.stopPropagation();
          const cleaned = cleanBarcodeScan(scanBuffer);
          scanBuffer = "";
          if (cleaned) {
            onChange(cleaned);
            setLastScanSource("reader");
            setReaderListening(false);
            playBeep();
          }
          return;
        }
        if (isCurrentBarcodeInput || readerListening) {
          e.preventDefault();
          e.stopPropagation();
          const currentVal = cleanBarcodeScan(
            inputRef.current?.value || value
          );
          if (currentVal) {
            onChange(currentVal);
            setLastScanSource("reader");
            setReaderListening(false);
            playBeep();
          }
        }
        scanBuffer = "";
      } else if (
        e.key &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        const elapsed = now - lastKeyTime;
        if (elapsed > 80) {
          scanBuffer = e.key;
        } else {
          scanBuffer += e.key;
        }
        lastKeyTime = now;

        // Si el modo lector está activo pero el foco no estaba en el input, enfocarlo
        if (readerListening && !isCurrentBarcodeInput) {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () =>
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, [modalOpen, readerListening, value, onChange]);

  // Manejo de cámara en vivo
  useEffect(() => {
    if (!cameraOpen || !modalOpen) return;

    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    const startCamera = async () => {
      setCameraLoading(true);
      setCameraError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            "Tu navegador no permite acceso a la cámara en este contexto."
          );
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback a cualquier cámara disponible (ej. webcam de PC)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = await getBarcodeDetectorInstance();
        if (!detector) {
          throw new Error(
            "No se pudo inicializar el detector de códigos en este navegador."
          );
        }

        setCameraLoading(false);

        const detectLoop = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
                const scanned = cleanBarcodeScan(barcodes[0].rawValue);
                if (scanned) {
                  playBeep();
                  onChange(scanned);
                  setLastScanSource("camera");
                  setCameraOpen(false);
                  return;
                }
              }
            }
          } catch {
            // Ignorar frames intermedios fallidos
          }
          if (!cancelled) {
            rafId = requestAnimationFrame(detectLoop);
          }
        };

        rafId = requestAnimationFrame(detectLoop);
      } catch (err: any) {
        if (!cancelled) {
          setCameraLoading(false);
          setCameraError(
            err?.message ||
              "No se pudo acceder a la cámara. Verificá los permisos del navegador."
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraOpen, facingMode, modalOpen, onChange]);

  const handleToggleReader = () => {
    if (cameraOpen) setCameraOpen(false);
    const nextState = !readerListening;
    setReaderListening(nextState);
    setLastScanSource(null);
    if (nextState) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  };

  const handleToggleCamera = () => {
    if (readerListening) setReaderListening(false);
    setLastScanSource(null);
    setCameraOpen((prev) => !prev);
  };

  return (
    <div className="grid gap-1.5 text-xs font-semibold">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label
          htmlFor="product-barcode-field"
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <Barcode className="size-3.5 text-primary" />
          <span>Código de barras (EAN-13 o propio)</span>
        </label>
        <button
          type="button"
          onClick={() => {
            onChange(generateValidEan13());
            setLastScanSource(null);
          }}
          className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="size-3" />
          Generar EAN-13 oficial GS1
        </button>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
        <div className="relative flex-1 min-w-[180px]">
          <Input
            id="product-barcode-field"
            ref={inputRef}
            name={inputName}
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw.includes("\n") || raw.includes("\r")) {
                const cleaned = cleanBarcodeScan(raw);
                onChange(cleaned);
                setLastScanSource("reader");
                setReaderListening(false);
                playBeep();
              } else {
                onChange(cleanBarcodeScan(raw));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                const cleaned = cleanBarcodeScan(e.currentTarget.value);
                if (cleaned) {
                  onChange(cleaned);
                  setLastScanSource("reader");
                  setReaderListening(false);
                  playBeep();
                }
              }
            }}
            placeholder={
              readerListening
                ? "Dispará ahora con el lector USB/Bluetooth..."
                : "EAN-13 (ej: 779...) o escaneá con lector / cámara"
            }
            className={`h-10 rounded-xl font-mono text-xs pr-8 transition-all ${
              readerListening
                ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                : ""
            }`}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setLastScanSource(null);
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-0.5 cursor-pointer"
              title="Limpiar código"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Botón Usar Lector (Pistola USB / Bluetooth) */}
        <Button
          type="button"
          variant={readerListening ? "default" : "outline"}
          size="sm"
          onClick={handleToggleReader}
          className={`h-10 px-3 text-xs shrink-0 font-semibold gap-1.5 rounded-xl cursor-pointer ${
            readerListening
              ? "bg-primary text-primary-foreground shadow-sm animate-pulse"
              : ""
          }`}
          title="Activar recepción con lector de código de barras USB o Bluetooth"
        >
          <ScanLine className="size-3.5" />
          <span>{readerListening ? "Esperando..." : "Lector"}</span>
        </Button>

        {/* Botón Usar Cámara */}
        <Button
          type="button"
          variant={cameraOpen ? "default" : "outline"}
          size="sm"
          onClick={handleToggleCamera}
          className="h-10 px-3 text-xs shrink-0 font-semibold gap-1.5 rounded-xl cursor-pointer"
          title="Escanear código de barras usando la cámara del dispositivo"
        >
          {cameraOpen ? (
            <>
              <CameraOff className="size-3.5" />
              <span>Cerrar</span>
            </>
          ) : (
            <>
              <Camera className="size-3.5" />
              <span>Cámara</span>
            </>
          )}
        </Button>

        {/* Botón Nuevo EAN */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onChange(generateValidEan13());
            setLastScanSource(null);
          }}
          className="h-10 px-3 text-xs shrink-0 font-semibold rounded-xl cursor-pointer"
          title="Generar nuevo código EAN-13 oficial con dígito verificador GS1"
        >
          Nuevo EAN
        </Button>
      </div>

      {/* Aviso de Modo Lector Activo */}
      {readerListening && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-medium text-primary animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <ScanLine className="size-4 shrink-0 animate-bounce" />
            <span>
              <strong>Lector listo:</strong> Dispará con tu pistola lectora USB o Bluetooth sobre el código del producto.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReaderListening(false)}
            className="text-[10px] font-bold underline hover:opacity-80 shrink-0 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Visor de Cámara Integrado */}
      {cameraOpen && (
        <div className="rounded-2xl border border-border/80 bg-slate-950 text-white p-3 space-y-2.5 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Escaneando código de barras con cámara</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() =>
                  setFacingMode((prev) =>
                    prev === "environment" ? "user" : "environment"
                  )
                }
                className="h-7 px-2 text-[11px] gap-1 rounded-lg cursor-pointer"
                title="Cambiar entre cámara trasera y frontal"
              >
                <RefreshCw className="size-3" />
                Girar cámara
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setCameraOpen(false)}
                className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {cameraError ? (
            <div className="rounded-xl bg-red-950/60 border border-red-500/40 p-3 text-xs text-red-200 flex items-center justify-between gap-2">
              <span>{cameraError}</span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  setCameraOpen(false);
                  setTimeout(() => setCameraOpen(true), 100);
                }}
                className="shrink-0 text-xs text-white border-red-400/50 hover:bg-red-900/50"
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl bg-black aspect-video max-h-52 w-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {/* Guía óptica de lectura láser */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-3/4 max-w-[260px] h-24 rounded-xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative flex items-center justify-center">
                  <div className="w-full h-0.5 bg-red-500/90 shadow-[0_0_8px_#ef4444] animate-pulse" />
                </div>
                <span className="mt-2 text-[10px] font-medium text-white/90 bg-black/60 px-2.5 py-0.5 rounded-full">
                  {cameraLoading
                    ? "Iniciando cámara..."
                    : "Centrá el código de barras en el recuadro"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estado de validación del código */}
      {value ? (
        <div className="text-[11px] font-medium space-y-0.5">
          {lastScanSource && (
            <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Check className="size-3" />
              {lastScanSource === "camera"
                ? "Código capturado exitosamente con la cámara."
                : "Código capturado exitosamente con el lector."}
            </div>
          )}
          {isValidEan13(value) ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="size-3" /> EAN-13 oficial GS1 válido (100% compatible con pistolas e impresoras térmicas)
            </span>
          ) : value.replace(/\D/g, "").length === 12 ? (
            <span className="text-blue-600 dark:text-blue-400">
              ℹ 12 dígitos detectados: se añadirá automáticamente el 13° verificador GS1 al guardar.
            </span>
          ) : value.replace(/\D/g, "").length === 13 ? (
            <span className="text-amber-600 dark:text-amber-400">
              ⚠ 13 dígitos: el dígito verificador se normalizará automáticamente a norma GS1 al guardar.
            </span>
          ) : (
            <span className="text-sky-600 dark:text-sky-400">
              ℹ Código alfanumérico: se procesará en estándar industrial Code 128 universal.
            </span>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground">
          Usá <strong>Lector</strong> (pistola USB/Bluetooth), <strong>Cámara</strong> o dejá vacío para autogenerar un EAN-13 oficial GS1.
        </span>
      )}
    </div>
  );
}

