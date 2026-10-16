"use client";

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Link as LinkIcon,
  UploadCloud,
  Check,
  Sparkles,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { uploadProductImage } from "@/lib/store-service";
import { compressImageFile } from "@/lib/image-compressor";

interface ProductImageUploadProps {
  value?: string | string[];
  values?: string[];
  onChange?: (urls: string[]) => void;
  name?: string;
  maxImages?: number;
}

export function ProductImageUpload({
  value,
  values,
  onChange,
  name = "imageUrl",
  maxImages = 10,
}: ProductImageUploadProps) {
  // Inicializar lista de imágenes
  const parseInitialImages = (): string[] => {
    if (values && Array.isArray(values)) {
      return values.filter(Boolean).slice(0, maxImages);
    }
    if (Array.isArray(value)) {
      return value.filter(Boolean).slice(0, maxImages);
    }
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).slice(0, maxImages);
      } catch {}
      return [value.trim()];
    }
    return [];
  };

  const [images, setImages] = useState<string[]>(parseInitialImages);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>("");
  const [optimizedInfo, setOptimizedInfo] = useState<string>("");
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar si cambia la prop value/values externamente (ej: cambio de producto a editar)
  useEffect(() => {
    const updated = parseInitialImages();
    setImages(updated);
  }, [value, values, maxImages]);

  const updateImagesList = (newImages: string[]) => {
    const trimmed = newImages.slice(0, maxImages);
    setImages(trimmed);
    if (trimmed.length === 0) setOptimizedInfo("");
    if (onChange) onChange(trimmed);
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (rawFiles.length === 0) return;

    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      alert(`Ya alcanzaste el límite máximo de ${maxImages} imágenes.`);
      return;
    }

    const filesToProcess = rawFiles.slice(0, availableSlots);
    if (rawFiles.length > availableSlots) {
      setOptimizedInfo(
        `Se seleccionaron más fotos de las disponibles. Se procesarán las primeras ${availableSlots}.`
      );
    }

    setIsUploading(true);
    let uploadedUrls: string[] = [];
    let totalOriginalBytes = 0;
    let totalCompressedBytes = 0;

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setUploadProgress(`Optimizando y subiendo ${i + 1} de ${filesToProcess.length}…`);

        // Compresión a WebP de alta fidelidad y mínimo peso
        const result = await compressImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.82,
          outputFormat: "image/webp",
        });

        totalOriginalBytes += result.originalSize;
        totalCompressedBytes += result.compressedSize;

        const url = await uploadProductImage(result.file);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length > 0) {
        const nextList = [...images, ...uploadedUrls].slice(0, maxImages);
        updateImagesList(nextList);

        if (totalOriginalBytes > 0) {
          const savings = Math.max(
            0,
            Math.round(((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100)
          );
          setOptimizedInfo(
            `${uploadedUrls.length} ${uploadedUrls.length === 1 ? "foto optimizada" : "fotos optimizadas"} en WebP (-${savings}% peso)`
          );
        }
      }
    } catch (err) {
      console.error("Error al procesar las fotos:", err);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const applyUrl = () => {
    const clean = tempUrl.trim();
    if (!clean) return;

    if (images.length >= maxImages) {
      alert(`Límite de ${maxImages} imágenes alcanzado.`);
      return;
    }

    updateImagesList([...images, clean]);
    setTempUrl("");
    setShowUrlInput(false);
  };

  const removeImage = (indexToRemove: number) => {
    const nextList = images.filter((_, idx) => idx !== indexToRemove);
    updateImagesList(nextList);
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;
    const selected = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    updateImagesList([selected, ...rest]);
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    updateImagesList(copy);
  };

  const primaryImage = images[0] || "";

  return (
    <div className="space-y-3.5">
      {/* Campos ocultos compatibles con FormData */}
      <input type="hidden" name={name} value={primaryImage} />
      <input type="hidden" name="image_url" value={primaryImage} />
      <input type="hidden" name="imagesJson" value={JSON.stringify(images)} />

      {/* Input de archivo múltiple oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Cabecera y contador */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              Fotos del producto
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                images.length === maxImages
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-primary/30 bg-primary/5 text-primary"
              }`}
            >
              {images.length} de {maxImages} fotos
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Podés subir hasta 10 fotos. Se comprimen automáticamente a formato WebP ultraliviano para no ralentizar la tienda.
          </p>
        </div>

        {/* Botones de acción rápida */}
        <div className="flex items-center gap-2">
          {images.length < maxImages && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs rounded-xl px-3 font-semibold gap-1.5 border-primary/40 hover:bg-primary/10 text-primary shadow-2xs"
            >
              <UploadCloud className="size-3.5" />
              Subir fotos
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="h-8 text-xs rounded-xl px-2.5 text-muted-foreground hover:text-foreground font-medium gap-1"
          >
            <LinkIcon className="size-3" />
            {showUrlInput ? "Ocultar URL" : "Pegar link"}
          </Button>
        </div>
      </div>

      {/* Notificación de compresión optimizada */}
      {optimizedInfo && (
        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
          <Sparkles className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-semibold">{optimizedInfo}</span>
        </div>
      )}

      {/* Entrada manual por URL web */}
      {showUrlInput && (
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-muted/40 border border-border/60">
          <Input
            type="url"
            placeholder="https://ejemplo.com/foto-zapato.jpg"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyUrl();
              }
            }}
            className="h-8 text-xs rounded-xl bg-background"
          />
          <Button
            type="button"
            size="sm"
            onClick={applyUrl}
            disabled={!tempUrl.trim() || images.length >= maxImages}
            className="h-8 rounded-xl px-3 text-xs font-bold shrink-0"
          >
            <Check className="size-3.5 mr-1" />
            Agregar
          </Button>
        </div>
      )}

      {/* Grid de miniaturas y zona de drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`rounded-2xl border-2 transition-all p-3 min-h-[120px] ${
          isDragging
            ? "border-primary bg-primary/10 scale-[0.99]"
            : "border-dashed border-border/80 bg-muted/20"
        }`}
      >
        {isUploading && (
          <div className="flex flex-col items-center justify-center p-4 gap-2 text-center animate-pulse">
            <Loader2 className="size-7 text-primary animate-spin" />
            <p className="text-xs font-bold text-foreground">{uploadProgress}</p>
            <p className="text-[11px] text-muted-foreground">
              Comprimiendo fotos a formato WebP ultraliviano...
            </p>
          </div>
        )}

        {!isUploading && images.length === 0 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-6 px-4 text-center cursor-pointer hover:bg-muted/40 rounded-xl transition-colors"
          >
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 shadow-xs">
              <Camera className="size-6" />
            </div>
            <p className="text-xs font-bold text-foreground">
              Hacé clic o arrastrá hasta 10 fotos acá
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Formatos soportados: JPG, PNG, WebP. Se optimizarán automáticamente.
            </p>
          </div>
        )}

        {/* Galería de imágenes cargadas */}
        {images.length > 0 && !isUploading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {images.map((imgUrl, index) => {
              const isCover = index === 0;
              return (
                <div
                  key={`${imgUrl}-${index}`}
                  className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all shadow-xs bg-muted/30 ${
                    isCover
                      ? "border-primary ring-2 ring-primary/20 shadow-sm"
                      : "border-border/80 hover:border-border"
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Foto ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Badge de Portada / Número */}
                  <div className="absolute top-1.5 left-1.5 pointer-events-none flex items-center gap-1">
                    {isCover ? (
                      <span className="bg-primary text-primary-foreground font-black text-[9px] uppercase px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-0.5">
                        <Star className="size-2.5 fill-current" />
                        Portada
                      </span>
                    ) : (
                      <span className="bg-black/60 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Botones de acción sobre la foto (hover en PC o siempre accesible) */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                    <div className="flex items-center justify-between">
                      {/* Marcar como portada */}
                      {!isCover ? (
                        <button
                          type="button"
                          onClick={() => setAsCover(index)}
                          title="Hacer foto de portada (principal)"
                          className="size-6 rounded-lg bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center transition shadow-xs text-[10px]"
                        >
                          <Star className="size-3 text-amber-500 fill-amber-500" />
                        </button>
                      ) : <span />}

                      {/* Eliminar foto */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        title="Eliminar esta foto"
                        className="size-6 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition shadow-xs"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>

                    {/* Mover orden (izquierda / derecha) */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveImage(index, "left")}
                        title="Mover hacia adelante"
                        className="size-6 rounded-lg bg-white/80 hover:bg-white disabled:opacity-30 disabled:hover:bg-white/80 text-slate-800 flex items-center justify-center transition shadow-xs"
                      >
                        <ChevronLeft className="size-3" />
                      </button>

                      <button
                        type="button"
                        disabled={index === images.length - 1}
                        onClick={() => moveImage(index, "right")}
                        title="Mover hacia atrás"
                        className="size-6 rounded-lg bg-white/80 hover:bg-white disabled:opacity-30 disabled:hover:bg-white/80 text-slate-800 flex items-center justify-center transition shadow-xs"
                      >
                        <ChevronRight className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Tile para agregar más si aún no llegó a 10 */}
            {images.length < maxImages && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/10 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-all text-muted-foreground hover:text-primary cursor-pointer p-2"
              >
                <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="size-4" />
                </div>
                <span className="text-[11px] font-bold leading-tight">Agregar</span>
                <span className="text-[9px] opacity-70">
                  {maxImages - images.length} libres
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {images.length > 0 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
          La primera foto será la portada en el listado y la tienda. Podés reordenarlas con las flechas o cambiar la portada.
        </p>
      )}
    </div>
  );
}
