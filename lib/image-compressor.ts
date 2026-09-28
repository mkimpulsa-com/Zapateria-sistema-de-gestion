/**
 * Utilidad de compresión y optimización de imágenes para el sistema de zapatería.
 * Reduce drásticamente el peso de las fotos tomadas con celular o cámara (habitualmente de 3-8 MB a 50-90 KB)
 * convirtiéndolas a formato WebP moderno con escalado proporcional de alta calidad.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 a 1.0 (recomendado: 0.80 a 0.85)
  outputFormat?: "image/webp" | "image/jpeg";
}

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  reductionPercentage: number;
  formattedOriginal: string;
  formattedCompressed: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    outputFormat = "image/webp",
  } = options;

  const originalSize = file.size;

  // Si no es un formato raster estándar (ej. svg o gif animado), mantener original
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    const dataUrl = await fileToDataUrl(file);
    return {
      file,
      dataUrl,
      originalSize,
      compressedSize: originalSize,
      reductionPercentage: 0,
      formattedOriginal: formatBytes(originalSize),
      formattedCompressed: formatBytes(originalSize),
    };
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Redimensionar proporcionalmente si supera los límites máximos
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({
          file,
          dataUrl: objectUrl,
          originalSize,
          compressedSize: originalSize,
          reductionPercentage: 0,
          formattedOriginal: formatBytes(originalSize),
          formattedCompressed: formatBytes(originalSize),
        });
        return;
      }

      // Suavizado bicúbico de alta calidad
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const ext = outputFormat === "image/webp" ? "webp" : "jpg";
      const newFileName = `${baseName}.webp`;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            const fallbackDataUrl = canvas.toDataURL(outputFormat, quality);
            resolve({
              file,
              dataUrl: fallbackDataUrl,
              originalSize,
              compressedSize: originalSize,
              reductionPercentage: 0,
              formattedOriginal: formatBytes(originalSize),
              formattedCompressed: formatBytes(originalSize),
            });
            return;
          }

          const compressedFile = new File([blob], newFileName, {
            type: outputFormat,
            lastModified: Date.now(),
          });

          const dataUrl = canvas.toDataURL(outputFormat, quality);
          const compressedSize = compressedFile.size;
          const reductionPercentage = Math.max(
            0,
            Math.round(((originalSize - compressedSize) / originalSize) * 100)
          );

          resolve({
            file: compressedFile,
            dataUrl,
            originalSize,
            compressedSize,
            reductionPercentage,
            formattedOriginal: formatBytes(originalSize),
            formattedCompressed: formatBytes(compressedSize),
          });
        },
        outputFormat,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        dataUrl: "",
        originalSize,
        compressedSize: originalSize,
        reductionPercentage: 0,
        formattedOriginal: formatBytes(originalSize),
        formattedCompressed: formatBytes(originalSize),
      });
    };

    img.src = objectUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
