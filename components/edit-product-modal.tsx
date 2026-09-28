"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Plus,
  Minus,
  Trash2,
  Layers,
  Sparkles,
  RefreshCw,
  Tag,
  DollarSign,
  PackageCheck,
} from "lucide-react";
import { ProductImageUpload } from "@/components/product-image-upload";

interface VariantItem {
  id?: string;
  size: string;
  stock: number;
}

interface EditProductModalProps {
  product: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: Array<any>;
  busy: boolean;
  onSubmit: (payload: any) => Promise<boolean>;
}

export function EditProductModal({
  product,
  open,
  onOpenChange,
  categories = [],
  busy,
  onSubmit,
}: EditProductModalProps) {
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [customSize, setCustomSize] = useState("");
  const [bulkQty, setBulkQty] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [retailPrice, setRetailPrice] = useState<number>(0);

  const categoryNames = useMemo(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      const list: string[] = [];
      categories.forEach((c) => {
        const name = typeof c === "string" ? c : c?.name;
        if (name && !list.includes(name)) list.push(name);
      });
      if (product?.category && !list.includes(product.category)) {
        list.unshift(product.category);
      }
      return list;
    }
    const defaultList = ["Zapatillas", "Zapatos", "Botas", "Sandalias", "Pantuflas", "Deportivo", "Urbano", "Infantil"];
    if (product?.category && !defaultList.includes(product.category)) {
      defaultList.unshift(product.category);
    }
    return defaultList;
  }, [categories, product]);

  useEffect(() => {
    if (product) {
      setVariants(
        (product.variants || []).map((v: any) => ({
          id: v.id,
          size: String(v.size),
          stock: Number(v.stock) || 0,
        }))
      );
      setCost(Number(product.cost) || 0);
      setRetailPrice(Number(product.retail_price) || 0);
    }
  }, [product]);

  if (!product) return null;

  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  const setStockForSize = (size: string, stock: number) => {
    setVariants((prev) =>
      prev.map((v) => (v.size === size ? { ...v, stock: Math.max(0, stock) } : v))
    );
  };

  const removeSize = (size: string) => {
    setVariants((prev) => prev.filter((v) => v.size !== size));
  };

  const addCustomSize = () => {
    const clean = customSize.trim();
    if (!clean) return;
    if (variants.some((v) => v.size.toLowerCase() === clean.toLowerCase())) {
      setCustomSize("");
      return;
    }
    setVariants((prev) => [...prev, { size: clean, stock: 0 }]);
    setCustomSize("");
  };

  const applyBulkStock = () => {
    setVariants((prev) =>
      prev.map((v) => ({ ...v, stock: Math.max(0, bulkQty) }))
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const payload = {
      action: "edit_product",
      productId: product.id,
      ...data,
      variants,
      variantsJson: JSON.stringify(variants),
    };

    const ok = await onSubmit(payload);
    if (ok) {
      onOpenChange(false);
    }
  };

  const marginAmount = retailPrice - cost;
  const marginPercent = cost > 0 ? Math.round((marginAmount / cost) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl p-6 sm:p-7 rounded-3xl border border-border/80 shadow-2xl">
        <DialogHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 text-primary shadow-xs">
              <Pencil className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Editar producto: {product.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Modificá los datos generales, precios y curva de inventario por talle.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-3">
          {/* SECCIÓN 1: DATOS DEL MODELO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-[11px] font-black text-primary">
                1
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Identificación del calzado
              </h3>
            </div>

            {/* Subida y preview de foto */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 shadow-2xs">
              <ProductImageUpload value={product.image_url || ""} />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Nombre del modelo *</span>
                  <Input
                    name="name"
                    required
                    defaultValue={product.name}
                    className="h-10 rounded-xl bg-card border-border/70 focus-visible:ring-primary/20"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Marca</span>
                  <Input
                    name="brand"
                    defaultValue={product.brand || ""}
                    className="h-10 rounded-xl bg-card border-border/70 focus-visible:ring-primary/20"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Categoría</span>
                  <select
                    name="category"
                    defaultValue={product.category || categoryNames[0] || "Zapatillas"}
                    className="h-10 w-full rounded-xl border border-border/70 bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {categoryNames.map((cat: string) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Color / Variedad</span>
                  <Input
                    name="color"
                    defaultValue={product.color || ""}
                    className="h-10 rounded-xl bg-card border-border/70 focus-visible:ring-primary/20"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Género</span>
                  <select
                    name="gender"
                    defaultValue={product.gender || "Unisex"}
                    className="h-10 w-full rounded-xl border border-border/70 bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                    <option value="Niños">Niños</option>
                  </select>
                </label>
              </div>

              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>SKU (Opcional)</span>
                  <Input
                    name="sku"
                    defaultValue={product.sku || ""}
                    className="h-10 rounded-xl font-mono text-xs bg-card border-border/70 focus-visible:ring-primary/20"
                  />
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Código de barras</span>
                  <Input
                    name="barcode"
                    defaultValue={product.barcode || ""}
                    className="h-10 rounded-xl font-mono text-xs bg-card border-border/70 focus-visible:ring-primary/20"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: PRECIOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-[11px] font-black text-primary">
                  2
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Precios y rentabilidad
                </h3>
              </div>
              {cost > 0 && retailPrice > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Margen:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md ${
                      marginAmount >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    +${marginAmount.toLocaleString("es-AR")} ({marginPercent}%)
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-3.5 sm:grid-cols-4">
              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Costo ($) *</span>
                  <Input
                    name="cost"
                    type="number"
                    min={0}
                    required
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value) || 0)}
                    className="h-10 rounded-xl bg-card border-border/70 font-semibold focus-visible:ring-primary/20"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Precio Minorista ($) *</span>
                  <Input
                    name="retailPrice"
                    type="number"
                    min={0}
                    required
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(Number(e.target.value) || 0)}
                    className="h-10 rounded-xl bg-card border-primary/40 font-bold text-primary focus-visible:ring-primary/30"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Precio Mayorista ($) *</span>
                  <Input
                    name="wholesalePrice"
                    type="number"
                    min={0}
                    required
                    defaultValue={product.wholesale_price || 0}
                    className="h-10 rounded-xl bg-card border-border/70 focus-visible:ring-primary/20"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1.5 text-xs font-semibold text-foreground/90">
                  <span>Alerta stock bajo</span>
                  <Input
                    name="minStock"
                    type="number"
                    min={0}
                    defaultValue={product.min_stock || 3}
                    className="h-10 rounded-xl bg-card border-border/70 focus-visible:ring-primary/20"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CURVA DE TALLES Y CANTIDADES - ULTRA PREMIUM */}
          <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-muted/40 via-card/70 to-card p-5 space-y-4 shadow-sm">
            {/* Header del bloque */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Stock actual por talle
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {variants.length} {variants.length === 1 ? "talle" : "talles"}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ajustá la cantidad directa de cada número o incorporá nuevos talles
                  </p>
                </div>
              </div>

              {/* Agregar nuevo talle */}
              <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl p-1 shadow-2xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <input
                  type="text"
                  placeholder="Nuevo talle (ej. 46)"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomSize();
                    }
                  }}
                  className="w-32 bg-transparent px-2.5 text-xs font-medium focus:outline-none placeholder:text-muted-foreground/60"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomSize}
                  className="h-7 rounded-lg text-xs font-semibold px-2.5 shadow-xs"
                >
                  <Plus className="size-3.5 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Herramienta de fijar stock masivo rápido */}
            <div className="flex items-center justify-between gap-2 text-xs px-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                Inventario unitario por número:
              </span>

              <div className="flex items-center gap-2 bg-background/80 border border-border/60 rounded-xl px-2.5 py-1 shadow-2xs">
                <span className="text-[11px] font-medium text-muted-foreground">Fijar todos a:</span>
                <input
                  type="number"
                  min={0}
                  value={bulkQty}
                  onChange={(e) => setBulkQty(Number(e.target.value) || 0)}
                  className="w-10 text-center font-bold border-b border-border text-xs bg-transparent focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={applyBulkStock}
                  className="rounded-md bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 font-bold text-[11px] transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {/* Grid moderno de talles */}
            {variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/50">
                <p className="text-xs text-muted-foreground">
                  No hay talles configurados para este producto. Agregá al menos uno con el botón superior.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
                {variants.map((v) => {
                  const hasStock = v.stock > 0;
                  return (
                    <div
                      key={v.size}
                      className="group relative rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 p-3 flex flex-col justify-between gap-2.5 overflow-hidden"
                    >
                      {/* Cabecera de la tarjeta: Talle y Botón Eliminar */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                            Talle
                          </span>
                          <span className="text-xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight mt-0.5">
                            {v.size}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSize(v.size)}
                          title={`Quitar talle ${v.size}`}
                          className="opacity-40 hover:opacity-100 group-hover:opacity-80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-all"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      {/* Stepper numérico unificado */}
                      <div className="flex items-center justify-between bg-muted/60 dark:bg-muted/40 rounded-xl p-1 border border-border/50">
                        <button
                          type="button"
                          onClick={() => setStockForSize(v.size, v.stock - 1)}
                          disabled={v.stock <= 0}
                          aria-label="Restar 1"
                          className="size-7 rounded-lg bg-background hover:bg-muted active:scale-95 text-foreground disabled:opacity-25 disabled:pointer-events-none shadow-2xs font-bold text-xs flex items-center justify-center transition-all border border-border/40"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={v.stock}
                          onChange={(e) => setStockForSize(v.size, Number(e.target.value) || 0)}
                          className="w-12 text-center text-sm font-black text-foreground bg-transparent focus:outline-none tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => setStockForSize(v.size, v.stock + 1)}
                          aria-label="Sumar 1"
                          className="size-7 rounded-lg bg-background hover:bg-primary hover:text-primary-foreground active:scale-95 text-foreground shadow-2xs font-bold text-xs flex items-center justify-center transition-all border border-border/40"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>

                      {/* Estado visual de stock */}
                      <div className="flex items-center justify-center text-[11px] font-medium pt-0.5">
                        {hasStock ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {v.stock} {v.stock === 1 ? "par" : "pares"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-md">
                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Sin stock
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Barra de totales y métricas al pie */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl">
                  <span className="text-xs text-primary font-medium">Total stock:</span>
                  <strong className="text-sm font-black text-primary">{totalStock} pares</strong>
                </div>
                <div className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-muted-foreground">Disponibilidad:</span>
                  <strong className="font-bold text-foreground">
                    {variants.filter((v) => v.stock > 0).length} de {variants.length} talles activos
                  </strong>
                </div>
              </div>

              {cost > 0 && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Capital en mercadería:
                  </span>
                  <strong className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                    ${new Intl.NumberFormat("es-AR").format(totalStock * cost)}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-xl px-5 h-10 font-semibold border-border/80 hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || variants.length === 0}
              className="rounded-xl px-7 h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 transition-all"
            >
              {busy ? "Guardando cambios…" : "Actualizar producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
