"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { Camera, Image as ImageIcon, Loader2, Trash2, Link as LinkIcon, UploadCloud, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { uploadProductImage } from "@/lib/store-service";
import { compressImageFile } from "@/lib/image-compressor";

interface ProductImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  name?: string;
}

export function ProductImageUpload({
  value = "",
  onChange,
  name = "imageUrl",
}: ProductImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string>(value);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>("");
  const [optimizedInfo, setOptimizedInfo] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateImage = (url: string) => {
    setImageUrl(url);
    if (!url) setOptimizedInfo("");
    if (onChange) onChange(url);
  };

  const handleFile = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setIsUploading(true);
    try {
      // Comprimir la imagen antes de subirla
      const result = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.82,
        outputFormat: "image/webp",
      });

      if (result.reductionPercentage > 0) {
        setOptimizedInfo(`Comprimida: ${result.formattedCompressed} (-${result.reductionPercentage}%)`);
      }

      const url = await uploadProductImage(result.file);
      updateImage(url);
    } catch (err) {
      console.error("Error al procesar la foto:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const applyUrl = () => {
    const clean = tempUrl.trim();
    if (clean) {
      updateImage(clean);
      setTempUrl("");
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input hidden para que FormData lo capture automáticamente */}
      <input type="hidden" name={name} value={imageUrl} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {imageUrl ? (
          /* Vista previa de foto cargada */
          <div className="relative group size-28 rounded-2xl overflow-hidden border-2 border-border/80 bg-muted/30 shadow-md shrink-0">
            <img
              src={imageUrl}
              alt="Foto del calzado"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Overlay de acciones */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Cambiar foto"
                className="size-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center transition-all shadow-sm"
              >
                <Camera className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => updateImage("")}
                disabled={isUploading}
                title="Quitar foto"
                className="size-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-sm"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Zona para subir / arrastrar foto */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`cursor-pointer size-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all shrink-0 text-center p-2 ${
              isDragging
                ? "border-primary bg-primary/10 scale-98"
                : "border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="size-6 text-primary animate-spin" />
                <span className="text-[10px] font-semibold text-muted-foreground text-center px-1 leading-tight">
                  Optimizando y subiendo…
                </span>
              </>
            ) : (
              <>
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Camera className="size-4" />
                </div>
                <span className="text-[11px] font-bold text-foreground">Agregar foto</span>
                <span className="text-[9px] text-muted-foreground leading-none">Click o arrastrar</span>
              </>
            )}
          </div>
        )}

        {/* Opciones y ayuda */}
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs font-bold text-foreground">Foto del modelo</p>
            <p className="text-[11px] text-muted-foreground">
              Se comprime automáticamente a formato WebP ligero para cargar rápido y ahorrar espacio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-7 text-xs rounded-lg px-2.5 shadow-2xs font-semibold gap-1.5"
            >
              <UploadCloud className="size-3.5 text-primary" />
              {imageUrl ? "Cambiar imagen" : "Elegir archivo"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="h-7 text-xs rounded-lg px-2 text-muted-foreground hover:text-foreground font-medium gap-1"
            >
              <LinkIcon className="size-3" />
              {showUrlInput ? "Ocultar URL" : "Pegar URL web"}
            </Button>

            {imageUrl && (
              <button
                type="button"
                onClick={() => updateImage("")}
                className="text-[11px] font-semibold text-destructive hover:underline ml-1"
              >
                Eliminar
              </button>
            )}
          </div>

          {optimizedInfo && imageUrl && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Badge
                variant="outline"
                className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 font-medium"
              >
                <Sparkles className="size-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                {optimizedInfo}
              </Badge>
            </div>
          )}

          {/* Campo opcional para pegar URL directa */}
          {showUrlInput && (
            <div className="flex items-center gap-1.5 pt-1">
              <Input
                type="url"
                placeholder="https://ejemplo.com/zapato.jpg"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyUrl();
                  }
                }}
                className="h-8 text-xs rounded-xl"
              />
              <Button
                type="button"
                size="sm"
                onClick={applyUrl}
                className="h-8 rounded-xl px-3 text-xs font-bold shrink-0"
              >
                <Check className="size-3.5 mr-1" />
                Usar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
