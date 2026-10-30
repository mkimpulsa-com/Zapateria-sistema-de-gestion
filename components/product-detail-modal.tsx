"use client";

import { useState, useEffect } from "react";
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
  Boxes,
  Pencil,
  Trash2,
  Barcode,
  Tag,
  MapPin,
  Layers,
  TrendingUp,
  Package,
  Users,
  Percent,
  ShoppingBag,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";

interface ProductDetailModalProps {
  product: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
  isCashier?: boolean;
  onEdit?: (product: any) => void;
  onAdjustStock?: (product: any) => void;
  onDelete?: (product: any) => void;
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
  currency = "ARS",
  isCashier = false,
  onEdit,
  onAdjustStock,
  onDelete,
}: ProductDetailModalProps) {
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

  useEffect(() => {
    setSelectedImgIdx(0);
  }, [product?.id, open]);

  if (!product) return null;

  const money = (v: number) => formatMoney(v, currency);

  // Resolver lista de imágenes del producto
  const imagesList: string[] = (() => {
    const list: string[] = [];
    if (Array.isArray(product.images)) {
      product.images.forEach((img: any) => {
        if (typeof img === "string" && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }
    if (
      typeof product.image_url === "string" &&
      product.image_url.trim() &&
      !list.includes(product.image_url.trim())
    ) {
      list.unshift(product.image_url.trim());
    }
    return list;
  })();

  const activeImage = imagesList[selectedImgIdx] || imagesList[0] || "";

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const totalStock =
    Number(product.total_stock) ||
    variants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);
  const minStock = Number(product.min_stock) || 3;

  const cost = Number(product.cost) || 0;
  const retailPrice =
    Number(product.retail_price) || Number(product.wholesale_price) || 0;
  const wholesalePrice =
    Number(product.wholesale_price) || Number(product.retail_price) || 0;
  const vatRate = Number(product.vat_rate) || 0;

  const retailMarginAmt = retailPrice - cost;
  const retailMarginPct =
    retailPrice > 0 ? Math.round((retailMarginAmt / retailPrice) * 100) : 0;

  const wholesaleMarginAmt = wholesalePrice - cost;
  const wholesaleMarginPct =
    wholesalePrice > 0
      ? Math.round((wholesaleMarginAmt / wholesalePrice) * 100)
      : 0;

  const totalCostValue = cost * totalStock;
  const totalRetailValue = retailPrice * totalStock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto p-5 sm:p-6 gap-5">
        <DialogHeader className="border-b pb-4 pr-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-bold">
                  {product.sku || "SIN SKU"}
                </Badge>
                {product.category && (
                  <Badge className="bg-primary/15 text-primary border border-primary/25 text-xs font-bold">
                    {product.category}
                  </Badge>
                )}
                <Badge
                  variant={
                    totalStock <= 0
                      ? "destructive"
                      : totalStock <= minStock
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-xs font-bold"
                >
                  {totalStock <= 0
                    ? "Sin stock (0 u.)"
                    : totalStock <= minStock
                    ? `Stock bajo (${totalStock} u.)`
                    : `${totalStock} u. disponibles`}
                </Badge>
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground pt-1">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ficha técnica detallada de producto, precios comerciales y existencias por variante.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[240px_1fr]">
          {/* Columna Izquierda: Galería de Imágenes + Código de Barras */}
          <div className="space-y-3">
            <div className="aspect-square w-full overflow-hidden rounded-2xl border bg-muted/30 flex items-center justify-center shadow-xs">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                  <ShoppingBag className="size-12 opacity-30 mb-2" />
                  <span className="text-xs font-semibold">Sin imagen cargada</span>
                </div>
              )}
            </div>

            {imagesList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImgIdx(idx)}
                    className={`size-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      idx === selectedImgIdx
                        ? "border-primary ring-2 ring-primary/25"
                        : "border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Tarjeta de Códigos (SKU + EAN-13) */}
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-semibold flex items-center gap-1">
                  <Tag className="size-3.5 text-primary" />
                  SKU:
                </span>
                <span className="font-mono font-bold text-foreground">
                  {product.sku || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-2">
                <span className="text-muted-foreground font-semibold flex items-center gap-1">
                  <Barcode className="size-3.5 text-primary" />
                  EAN-13:
                </span>
                <span className="font-mono font-bold text-foreground">
                  {product.barcode || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Especificaciones, Precios y Variantes */}
          <div className="space-y-4">
            {/* 1. Especificaciones generales */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="rounded-xl border bg-card p-3">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Marca / Fabricante
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5 block truncate">
                  {product.brand || "Genérico / Sin marca"}
                </span>
              </div>

              <div className="rounded-xl border bg-card p-3">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Color / Presentación
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5 block truncate">
                  {product.color || "Estándar"}
                </span>
              </div>

              <div className="rounded-xl border bg-card p-3">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Categoría
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5 block truncate">
                  {product.category || "General"}
                </span>
              </div>

              <div className="rounded-xl border bg-card p-3">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-primary" />
                  Ubicación / Estante
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5 block truncate">
                  {product.location || "No especificada"}
                </span>
              </div>

              <div className="rounded-xl border bg-card p-3">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Users className="size-3 text-primary" />
                  Público / Género
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5 block truncate">
                  {product.gender || "No aplica"}
                </span>
              </div>

              <div className="rounded-xl border bg-card p-3">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Percent className="size-3 text-primary" />
                  Alícuota IVA
                </span>
                <span className="text-sm font-bold text-foreground mt-0.5 block">
                  {vatRate}% {vatRate === 0 ? "(Exento)" : ""}
                </span>
              </div>
            </div>

            {/* 2. Bloque de Precios Comerciales y Costo */}
            <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-primary" />
                Precios Comerciales y Rentabilidad
              </h4>

              <div className={`grid gap-3 ${isCashier ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                {/* Precio Minorista */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">
                    Precio Minorista
                  </span>
                  <span className="text-xl font-black text-foreground mt-0.5 block">
                    {money(retailPrice)}
                  </span>
                  {!isCashier && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-1 block">
                      Margen: {retailMarginPct}% ({money(retailMarginAmt)})
                    </span>
                  )}
                </div>

                {/* Precio Mayorista */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300 block">
                    Precio Mayorista
                  </span>
                  <span className="text-xl font-black text-foreground mt-0.5 block">
                    {money(wholesalePrice)}
                  </span>
                  {!isCashier && (
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 mt-1 block">
                      Margen: {wholesaleMarginPct}% ({money(wholesaleMarginAmt)})
                    </span>
                  )}
                </div>

                {/* Costo de Compra (solo administrador) */}
                {!isCashier && (
                  <div className="rounded-xl border bg-card p-3">
                    <span className="text-[11px] font-bold uppercase text-muted-foreground block">
                      Costo de Compra
                    </span>
                    <span className="text-xl font-black text-foreground mt-0.5 block">
                      {money(cost)}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Stock al costo: {money(totalCostValue)}
                    </span>
                  </div>
                )}
              </div>

              {!isCashier && totalStock > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <span>
                    Valor proyectado en venta minorista ({totalStock} u.):{" "}
                    <strong className="text-foreground">{money(totalRetailValue)}</strong>
                  </span>
                  <span>
                    Alerta stock mínimo: <strong className="text-foreground">{minStock} u.</strong>
                  </span>
                </div>
              )}
            </div>

            {/* 3. Stock detallado por Variante / Talle */}
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  Stock por Talle / Variante
                </h4>
                <span className="text-xs font-bold text-foreground">
                  Total: {totalStock} {totalStock === 1 ? "unidad" : "unidades"}
                </span>
              </div>

              {variants.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No hay variantes registradas para este artículo.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {variants.map((v: any) => {
                    const st = Number(v.stock) || 0;
                    const sizeLabel = ["Único", "Unico", "General"].includes(v.size)
                      ? "Stock Único"
                      : `Talle / Var. ${v.size}`;
                    return (
                      <div
                        key={v.id || v.size}
                        className={`rounded-xl border p-2.5 text-center ${
                          st <= 0
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                            : st <= 2
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                        }`}
                      >
                        <p className="text-[10px] font-semibold opacity-80 truncate">
                          {sizeLabel}
                        </p>
                        <p className="text-base font-black mt-0.5">{st} u.</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-4">
          <div>
            {!isCashier && onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onDelete(product);
                }}
                className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10 gap-1.5"
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isCashier && onAdjustStock && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onAdjustStock(product);
                }}
                className="gap-1.5 font-bold"
              >
                <Boxes className="size-4 text-amber-500" />
                Ajustar Stock
              </Button>
            )}
            {!isCashier && onEdit && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(product);
                }}
                className="gap-1.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Pencil className="size-4" />
                Editar Producto
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

