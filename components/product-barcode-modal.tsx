"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Barcode, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ProductBarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any | null;
  settings?: any;
}

const code39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw",
  "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  "A": "wnnnnwnnw", "B": "nnwnnwnnw", "C": "wnwnnwnnn", "D": "nnnnwwnnw", "E": "wnnnwwnnn",
  "F": "nnwnwwnnn", "G": "nnnnnwwnw", "H": "wnnnnwwnn", "I": "nnwnnwwnn", "J": "nnnnwwwnn",
  "K": "wnnnnnnww", "L": "nnwnnnnww", "M": "wnwnnnnwn", "N": "nnnnwnnww", "O": "wnnnwnnwn",
  "P": "nnwnwnnwn", "Q": "nnnnnnwww", "R": "wnnnnnwwn", "S": "nnwnnnwwn", "T": "nnnnwnwwn",
  "U": "wwnnnnnnw", "V": "nwwnnnnnw", "W": "wwwnnnnnn", "X": "nwnnwnnnw", "Y": "wwnnwnnnn",
  "Z": "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn",
};

function renderBarcodeSvg(value: string) {
  const clean = (value || "000000").toUpperCase().replace(/[^0-9A-Z. -]/g, "-");
  const encoded = `*${clean}*`;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const char of encoded) {
    const pattern = code39[char] || code39["-"];
    pattern.split("").forEach((width, i) => {
      const w = width === "w" ? 3 : 1;
      if (i % 2 === 0) bars.push({ x, w });
      x += w;
    });
    x += 1;
  }
  return { bars, totalWidth: x, clean };
}

export function ProductBarcodeModal({
  open,
  onOpenChange,
  product,
  settings = {},
}: ProductBarcodeModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [showName, setShowName] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  if (!product) return null;

  const barcodeValue = product.barcode || product.sku || "000000";
  const { bars, totalWidth } = renderBarcodeSvg(barcodeValue);

  const handlePrintOnlyBarcode = () => {
    try {
      const existingFrame = document.getElementById("print-barcode-frame");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "print-barcode-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      // Generate stickers HTML according to the chosen quantity - strictly barcode only without price
      const stickersHtml = Array.from({ length: Math.max(1, Math.min(100, quantity)) })
        .map(
          () => `
          <div class="label-sticker">
            ${
              showName
                ? `<div class="prod-title">${product.name}</div>
                   <div class="prod-sub">${product.brand || ""} ${product.sku ? `· ${product.sku}` : ""}</div>`
                : ""
            }
            <div class="barcode-wrapper">
              <svg viewBox="0 0 ${totalWidth} 40" class="barcode-svg" preserveAspectRatio="none">
                ${bars.map((b) => `<rect x="${b.x}" y="0" width="${b.w}" height="40" fill="#000000" />`).join("")}
              </svg>
            </div>
            <div class="barcode-digits">${barcodeValue}</div>
          </div>
        `
        )
        .join("\n");

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Código de barra - ${product.name}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @page {
                size: auto;
                margin: 4mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: white !important;
                color: black !important;
                display: flex;
                flex-wrap: wrap;
                gap: 4mm;
                align-items: flex-start;
                justify-content: flex-start;
              }
              .label-sticker {
                width: 54mm;
                min-height: 28mm;
                max-width: 58mm;
                padding: 2.5mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                border: 1px dashed #d1d5db;
                border-radius: 4px;
                page-break-inside: avoid;
                margin: 0;
              }
              @media print {
                .label-sticker {
                  border: none !important;
                }
              }
              .prod-title {
                font-size: 11px;
                font-weight: 800;
                line-height: 1.1;
                max-width: 50mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 1px;
              }
              .prod-sub {
                font-size: 8.5px;
                color: #4b5563;
                margin-bottom: 2px;
                max-width: 50mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .barcode-wrapper {
                width: 100%;
                max-width: 48mm;
                height: 13mm;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .barcode-svg {
                width: 100%;
                height: 100%;
                display: block;
              }
              .barcode-digits {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.14em;
                margin-top: 1px;
              }
              .prod-price {
                font-size: 11px;
                font-weight: 900;
                margin-top: 2px;
              }
            </style>
          </head>
          <body>
            ${stickersHtml}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }, 350);
    } catch (err: any) {
      toast.error(err.message || "Error al imprimir el código");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    toast.success(`Código ${barcodeValue} copiado al portapapeles`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Barcode className="size-4" />
            Etiqueta individual
          </div>
          <DialogTitle className="text-lg font-black text-foreground">
            Imprimir Código de Barras
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Imprimí únicamente la etiqueta con el código de barra para este producto (apto impresoras térmicas y estándar).
          </DialogDescription>
        </DialogHeader>

        {/* Live Sticker Preview Box */}
        <div className="my-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-slate-50/60 dark:bg-slate-900/40 p-5">
          <div
            ref={previewRef}
            className="w-full max-w-[240px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 shadow-sm flex flex-col items-center justify-center text-center text-slate-900 dark:text-slate-100"
          >
            {showName && (
              <>
                <p className="font-extrabold text-sm truncate max-w-[210px] leading-tight" title={product.name}>
                  {product.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate max-w-[210px] mb-1">
                  {product.brand} · {product.color || product.sku}
                </p>
              </>
            )}

            <div className="w-full h-14 my-1 flex items-center justify-center">
              <svg viewBox={`0 0 ${totalWidth} 40`} className="h-full w-full max-w-[210px]" preserveAspectRatio="none">
                {bars.map((b, i) => (
                  <rect key={i} x={b.x} y="0" width={b.w} height="40" fill="currentColor" />
                ))}
              </svg>
            </div>

            <p className="font-mono text-xs font-bold tracking-widest mt-1">
              {barcodeValue}
            </p>
          </div>
          <span className="text-[11px] text-muted-foreground mt-2 font-medium">
            Vista previa exacta: solo código de barra sin precio
          </span>
        </div>

        {/* Configuration Options */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-muted-foreground">
              Cantidad de etiquetas a imprimir
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="h-9 text-xs font-bold w-32"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-semibold"
                onClick={() => setQuantity(product.total_stock || 1)}
                title="Imprimir tantas etiquetas como stock haya"
              >
                Cantidad según stock ({product.total_stock || 1} pares)
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary size-3.5"
              />
              <span>Incluir nombre y marca del calzado</span>
            </label>

            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
            >
              {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              {copied ? "Copiado" : "Copiar código"}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9"
          >
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={handlePrintOnlyBarcode}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 font-bold"
          >
            <Printer className="size-3.5" />
            Imprimir {quantity > 1 ? `${quantity} etiquetas` : "código de barra"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
