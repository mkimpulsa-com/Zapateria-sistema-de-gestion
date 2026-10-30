"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";

export interface ParsedCsvProduct {
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  location: string;
  gender: string;
  cost: number;
  retailPrice: number;
  wholesalePrice: number;
  vatRate: number;
  minStock: number;
  stock: number;
  variants: Array<{ size: string; stock: number }>;
  imageUrl: string;
  isUpdate?: boolean;
}

/**
 * Exporta la lista de productos actual a un archivo CSV compatible con Excel (UTF-8 con BOM y separador ';').
 */
export function exportProductsToCsv(products: any[], businessName = "CR_Bazar") {
  const headers = [
    "SKU",
    "Codigo_Barras",
    "Nombre",
    "Marca",
    "Categoria",
    "Color",
    "Ubicacion",
    "Genero",
    "Costo",
    "Precio_Minorista",
    "Precio_Mayorista",
    "IVA",
    "Stock_Minimo",
    "Stock_Total",
    "Variantes_Talles",
    "Imagen_URL",
  ];

  const escapeCsvCell = (val: any): string => {
    const str = String(val ?? "").replace(/\r?\n/g, " ").trim();
    if (str.includes(";") || str.includes('"') || str.includes(",")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = (products || []).map((p: any) => {
    const variantsArr = Array.isArray(p.variants) ? p.variants : [];
    const totalStock =
      Number(p.total_stock) ||
      variantsArr.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);
    const variantsStr = variantsArr
      .map((v: any) => `${v.size || "Único"}:${Number(v.stock) || 0}`)
      .join(" | ");

    const retail = Number(p.retail_price) || Number(p.wholesale_price) || 0;
    const wholesale = Number(p.wholesale_price) || Number(p.retail_price) || 0;

    return [
      p.sku || "",
      p.barcode || "",
      p.name || "",
      p.brand || "",
      p.category || "General",
      p.color || "",
      p.location || "",
      p.gender || "No aplica",
      Number(p.cost) || 0,
      retail,
      wholesale,
      Number(p.vat_rate) || 0,
      Number(p.min_stock) || 3,
      totalStock,
      variantsStr,
      p.image_url || "",
    ].map(escapeCsvCell);
  });

  const csvContent =
    "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanBiz = businessName.replace(/[^a-zA-Z0-9_-]/g, "_");
  link.href = url;
  link.setAttribute("download", `Productos_${cleanBiz}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Descarga una plantilla CSV de ejemplo lista para abrir en Excel.
 */
export function downloadProductsCsvTemplate() {
  const headers = [
    "SKU",
    "Codigo_Barras",
    "Nombre",
    "Marca",
    "Categoria",
    "Color",
    "Ubicacion",
    "Genero",
    "Costo",
    "Precio_Minorista",
    "Precio_Mayorista",
    "IVA",
    "Stock_Minimo",
    "Stock_Total",
    "Variantes_Talles",
    "Imagen_URL",
  ];

  const sampleRows = [
    [
      "MOD-1001",
      "7791234567895",
      "Termo Acero 1L",
      "Stanley",
      "Bazar General",
      "Negro",
      "Estante A1",
      "No aplica",
      "15000",
      "28000",
      "22000",
      "21",
      "3",
      "15",
      "Único:15",
      "",
    ],
    [
      "MOD-1002",
      "",
      "Botas Trekking Impermeables",
      "Acero",
      "Calzado",
      "Marrón",
      "Pasillo 2",
      "Unisex",
      "25000",
      "45000",
      "36000",
      "21",
      "3",
      "12",
      "38:2 | 39:3 | 40:4 | 41:3",
      "",
    ],
  ];

  const csvContent =
    "\uFEFF" +
    [headers.join(";"), ...sampleRows.map((r) => r.join(";"))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "Plantilla_Productos_CR_Bazar.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parsea una línea CSV respetando comillas dobles.
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Limpia valores numéricos provenientes de Excel (ej. "$ 12.500,50" o "12500").
 */
function parseFlexibleNumber(val: string | undefined): number {
  if (!val) return 0;
  let clean = String(val)
    .replace(/[^0-9.,-]/g, "")
    .trim();
  if (!clean) return 0;

  // Si tiene punto y coma (ej. 12.500,50 -> formato argentino)
  if (clean.includes(".") && clean.includes(",")) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    // Si termina con ,XX (decimales) o tiene múltiples comas
    const parts = clean.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      clean = clean.replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  }
  const num = Number(clean);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

/**
 * Parsea cadena de variantes como "35:2 | 36:4 | 37:1" o "35:2, 36:4"
 */
function parseVariantsField(
  variantsRaw: string,
  fallbackStock: number
): Array<{ size: string; stock: number }> {
  const clean = (variantsRaw || "").trim();
  if (!clean) {
    return [{ size: "Único", stock: Math.max(0, Math.round(fallbackStock)) }];
  }

  // Si es solo un número, tratar como stock Único
  if (/^\d+$/.test(clean)) {
    return [{ size: "Único", stock: Math.max(0, Number(clean) || 0) }];
  }

  const parts = clean
    .split(/[|,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed: Array<{ size: string; stock: number }> = [];
  for (const part of parts) {
    if (part.includes(":")) {
      const [sz, st] = part.split(":");
      const sizeName = (sz || "Único").trim();
      const stockQty = Math.max(0, Math.round(parseFlexibleNumber(st)));
      if (sizeName) {
        parsed.push({ size: sizeName, stock: stockQty });
      }
    } else if (part.includes("=")) {
      const [sz, st] = part.split("=");
      const sizeName = (sz || "Único").trim();
      const stockQty = Math.max(0, Math.round(parseFlexibleNumber(st)));
      if (sizeName) {
        parsed.push({ size: sizeName, stock: stockQty });
      }
    }
  }

  if (parsed.length > 0) return parsed;
  return [{ size: "Único", stock: Math.max(0, Math.round(fallbackStock)) }];
}

interface ProductsCsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProducts: any[];
  currency?: string;
  busy?: boolean;
  onImport: (items: ParsedCsvProduct[], updateExisting: boolean) => Promise<boolean>;
}

export function ProductsCsvModal({
  open,
  onOpenChange,
  existingProducts = [],
  currency = "ARS",
  busy = false,
  onImport,
}: ProductsCsvModalProps) {
  const [parsedItems, setParsedItems] = useState<ParsedCsvProduct[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const money = (v: number) => formatMoney(v, currency);

  const processCsvText = (text: string, uploadedName: string) => {
    setParseError("");
    setFileName(uploadedName);

    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setParseError(
        "El archivo CSV está vacío o no contiene filas de productos debajo del encabezado."
      );
      setParsedItems([]);
      return;
    }

    // Detectar delimitador (';', ',' o '\t') en la primera línea
    const headerLine = lines[0];
    const countSemi = (headerLine.match(/;/g) || []).length;
    const countComma = (headerLine.match(/,/g) || []).length;
    const countTab = (headerLine.match(/\t/g) || []).length;

    let delimiter = ";";
    if (countTab > countSemi && countTab > countComma) delimiter = "\t";
    else if (countComma > countSemi) delimiter = ",";

    const rawHeaders = splitCsvLine(headerLine, delimiter).map((h) =>
      h
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
    );

    const findColIndex = (candidates: string[]): number => {
      for (const cand of candidates) {
        const idx = rawHeaders.findIndex((h) => h === cand || h.includes(cand));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxName = findColIndex(["nombre", "producto", "articulo", "modelo", "name", "descripcion"]);
    const idxSku = findColIndex(["sku", "codigo", "codigointerno", "code"]);
    const idxBarcode = findColIndex(["codigobarras", "barcode", "ean", "ean13"]);
    const idxBrand = findColIndex(["marca", "fabricante", "brand"]);
    const idxCategory = findColIndex(["categoria", "rubro", "category"]);
    const idxColor = findColIndex(["color", "presentacion"]);
    const idxLocation = findColIndex(["ubicacion", "estante", "deposito", "location"]);
    const idxGender = findColIndex(["genero", "publico", "gender"]);
    const idxCost = findColIndex(["costo", "costocompra", "cost"]);
    const idxRetail = findColIndex(["preciominorista", "minorista", "pvp", "pvpsugerido", "retail", "precio"]);
    const idxWholesale = findColIndex(["preciomayorista", "mayorista", "wholesale"]);
    const idxVat = findColIndex(["iva", "alicuotaiva", "vat"]);
    const idxMinStock = findColIndex(["stockminimo", "minstock", "alertastock"]);
    const idxStock = findColIndex(["stocktotal", "stock", "cantidad", "unidades", "existencia"]);
    const idxVariants = findColIndex(["variantestalles", "variantes", "talles", "curva"]);
    const idxImage = findColIndex(["imagenurl", "imagen", "foto", "imageurl"]);

    if (idxName === -1) {
      setParseError(
        "No se encontró la columna 'Nombre' o 'Producto' en el archivo CSV. Descargá la plantilla de ejemplo para ver las columnas."
      );
      setParsedItems([]);
      return;
    }

    const items: ParsedCsvProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i], delimiter);
      const name = (cols[idxName] || "").trim();
      if (!name) continue;

      const sku = idxSku !== -1 ? (cols[idxSku] || "").trim() : "";
      const barcode = idxBarcode !== -1 ? (cols[idxBarcode] || "").trim() : "";
      const brand = idxBrand !== -1 ? (cols[idxBrand] || "").trim() : "";
      const category =
        idxCategory !== -1 && (cols[idxCategory] || "").trim()
          ? (cols[idxCategory] || "").trim()
          : "General";
      const color = idxColor !== -1 ? (cols[idxColor] || "").trim() : "";
      const location = idxLocation !== -1 ? (cols[idxLocation] || "").trim() : "";
      const gender =
        idxGender !== -1 && (cols[idxGender] || "").trim()
          ? (cols[idxGender] || "").trim()
          : "No aplica";

      const cost = idxCost !== -1 ? parseFlexibleNumber(cols[idxCost]) : 0;
      const rawRetail = idxRetail !== -1 ? parseFlexibleNumber(cols[idxRetail]) : 0;
      const rawWholesale =
        idxWholesale !== -1 ? parseFlexibleNumber(cols[idxWholesale]) : 0;

      const retailPrice = rawRetail > 0 ? rawRetail : rawWholesale;
      const wholesalePrice = rawWholesale > 0 ? rawWholesale : rawRetail;

      const vatRate = idxVat !== -1 ? parseFlexibleNumber(cols[idxVat]) : 0;
      const minStock =
        idxMinStock !== -1 && cols[idxMinStock]
          ? Math.round(parseFlexibleNumber(cols[idxMinStock]))
          : 3;

      const fallbackStock =
        idxStock !== -1 ? Math.round(parseFlexibleNumber(cols[idxStock])) : 0;
      const variantsRaw = idxVariants !== -1 ? cols[idxVariants] || "" : "";
      const variants = parseVariantsField(variantsRaw, fallbackStock);
      const totalStock = variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
      const imageUrl = idxImage !== -1 ? (cols[idxImage] || "").trim() : "";

      const existsInCatalog = existingProducts.some(
        (p: any) =>
          (sku && String(p.sku || "").toLowerCase() === sku.toLowerCase()) ||
          (barcode && String(p.barcode || "") === barcode)
      );

      items.push({
        sku,
        barcode,
        name,
        brand,
        category,
        color,
        location,
        gender,
        cost,
        retailPrice,
        wholesalePrice,
        vatRate,
        minStock,
        stock: totalStock,
        variants,
        imageUrl,
        isUpdate: existsInCatalog,
      });
    }

    if (items.length === 0) {
      setParseError("No se encontraron productos válidos en las filas del archivo.");
      setParsedItems([]);
      return;
    }

    setParsedItems(items);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || "");
      processCsvText(content, file.name);
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || "");
      processCsvText(content, file.name);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleConfirmImport = async () => {
    if (parsedItems.length === 0) return;
    const ok = await onImport(parsedItems, updateExisting);
    if (ok) {
      setParsedItems([]);
      setFileName("");
      setParseError("");
      onOpenChange(false);
    }
  };

  const updatesCount = parsedItems.filter((i) => i.isUpdate).length;
  const newCount = parsedItems.length - updatesCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader className="border-b pb-4 pr-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/15 text-primary border border-primary/25 shrink-0">
                <FileSpreadsheet className="size-6" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl font-black tracking-tight">
                  Importar y Exportar Productos (.CSV)
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
                  Cargá productos masivamente desde Excel / CSV o actualizá precios y stock en segundos.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadProductsCsvTemplate}
                className="h-8 text-xs font-bold gap-1.5 rounded-lg"
              >
                <Download className="size-3.5 text-primary" />
                Descargar Plantilla .CSV
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zona de carga Drag & Drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="size-6" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {fileName
                ? `Archivo cargado: ${fileName}`
                : "Hacé clic acá o arrastrá tu archivo .CSV de productos"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Compatible con archivos guardados como CSV desde Excel (separados por punto y coma <code className="font-mono">;</code> o coma <code className="font-mono">,</code>).
            </p>
          </div>

          {parseError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error al leer el archivo CSV</p>
                <p className="mt-0.5">{parseError}</p>
              </div>
            </div>
          )}

          {/* Vista previa de productos detectados */}
          {parsedItems.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-bold">
                    <CheckCircle2 className="size-3.5 mr-1" />
                    {parsedItems.length} productos listos
                  </Badge>
                  {newCount > 0 && (
                    <Badge variant="outline" className="text-xs font-bold border-sky-500/40 text-sky-600 dark:text-sky-300">
                      {newCount} nuevos
                    </Badge>
                  )}
                  {updatesCount > 0 && (
                    <Badge variant="outline" className="text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-300">
                      {updatesCount} existentes por SKU/EAN
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary size-4"
                    />
                    <span>Actualizar existentes si coincide SKU o EAN</span>
                  </label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setParsedItems([]);
                      setFileName("");
                    }}
                    className="text-xs text-rose-500 hover:text-rose-600 gap-1"
                  >
                    <Trash2 className="size-3.5" />
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2.5">Acción</th>
                      <th className="p-2.5">Producto</th>
                      <th className="p-2.5">SKU / EAN</th>
                      <th className="p-2.5">Stock / Variantes</th>
                      <th className="p-2.5 text-right">Costo</th>
                      <th className="p-2.5 text-right">Minorista</th>
                      <th className="p-2.5 text-right">Mayorista</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {parsedItems.slice(0, 60).map((it, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2.5">
                          {it.isUpdate && updateExisting ? (
                            <span className="inline-flex items-center rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              Actualiza
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              Nuevo
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <p className="font-bold text-foreground">{it.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {[it.brand, it.color, it.category].filter(Boolean).join(" · ")}
                          </p>
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          <div>{it.sku || <span className="text-muted-foreground">Auto SKU</span>}</div>
                          <div className="text-muted-foreground">
                            {it.barcode || "Auto EAN-13"}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap gap-1">
                            {it.variants.map((v, vi) => (
                              <span
                                key={vi}
                                className="inline-flex items-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold"
                              >
                                {v.size}: {v.stock}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono">{money(it.cost)}</td>
                        <td className="p-2.5 text-right font-bold text-foreground">
                          {money(it.retailPrice)}
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {money(it.wholesalePrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedItems.length > 60 && (
                <p className="text-[11px] text-center text-muted-foreground">
                  Mostrando primeros 60 de {parsedItems.length} productos detectados.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-4">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary shrink-0" />
            Si dejás SKU o Código de barras vacío, el sistema los genera automáticamente.
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy || parsedItems.length === 0}
              onClick={handleConfirmImport}
              className="gap-1.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importando…
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Confirmar e Importar ({parsedItems.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

