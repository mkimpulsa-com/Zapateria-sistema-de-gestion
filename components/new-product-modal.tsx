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
  Layers,
  Plus,
  Minus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ProductImageUpload } from "@/components/product-image-upload";

interface VariantItem {
  size: string;
  stock: number;
}

interface NewProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSizes?: string;
  categories?: Array<any>;
  onNewCategory?: (name: string) => Promise<any>;
  busy: boolean;
  onSubmit: (data: any) => Promise<boolean>;
}

const PRESET_CURVES = [
  { label: "Dama (35-40)", sizes: ["35", "36", "37", "38", "39", "40"] },
  { label: "Hombre (39-45)", sizes: ["39", "40", "41", "42", "43", "44", "45"] },
  { label: "Unisex (36-43)", sizes: ["36", "37", "38", "39", "40", "41", "42", "43"] },
  { label: "Niños (25-34)", sizes: ["25", "26", "27", "28", "29", "30", "31", "32", "33", "34"] },
];

export function NewProductModal({
  open,
  onOpenChange,
  defaultSizes = "35,36,37,38,39,40",
  categories = [],
  onNewCategory,
  busy,
  onSubmit,
}: NewProductModalProps) {
  const initialSizes = useMemo(() => {
    return defaultSizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [defaultSizes]);

  const [variants, setVariants] = useState<VariantItem[]>(() =>
    initialSizes.map((size) => ({ size, stock: 2 }))
  );
  const [bulkQty, setBulkQty] = useState<number>(2);
  const [customSize, setCustomSize] = useState("");
  const [cost, setCost] = useState<number>(0);
  const [retailPrice, setRetailPrice] = useState<number>(0);

  const categoryNames = useMemo(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      const list: string[] = [];
      categories.forEach((c) => {
        const name = typeof c === "string" ? c : c?.name;
        if (name && !list.includes(name)) list.push(name);
      });
      return list;
    }
    return ["Zapatillas", "Zapatos", "Botas", "Sandalias", "Pantuflas", "Deportivo", "Urbano", "Infantil"];
  }, [categories]);

  const [selectedCategory, setSelectedCategory] = useState("Zapatillas");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategoryBusy, setAddingCategoryBusy] = useState(false);

  useEffect(() => {
    if (categoryNames.length > 0 && !categoryNames.includes(selectedCategory)) {
      setSelectedCategory(categoryNames[0]);
    }
  }, [categoryNames]);

  const handleCreateCategory = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    setAddingCategoryBusy(true);
    try {
      if (onNewCategory) {
        const res = await onNewCategory(clean);
        if (res === false) return;
      }
      setSelectedCategory(clean);
      setNewCategoryName("");
      setIsAddingCategory(false);
    } catch {
    } finally {
      setAddingCategoryBusy(false);
    }
  };

  // Totales calculados en tiempo real
  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const totalCost = totalStock * (Number(cost) || 0);
  const potentialRevenue = totalStock * (Number(retailPrice) || 0);

  const applyCurve = (sizes: string[]) => {
    setVariants(sizes.map((size) => ({ size, stock: bulkQty })));
  };

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
    setVariants((prev) => [...prev, { size: clean, stock: bulkQty || 1 }]);
    setCustomSize("");
  };

  const applyBulkStock = () => {
    const qty = Math.max(0, Number(bulkQty) || 0);
    setVariants((prev) => prev.map((v) => ({ ...v, stock: qty })));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const payload = {
      ...data,
      category: selectedCategory,
      variants,
      variantsJson: JSON.stringify(variants),
    };

    const ok = await onSubmit(payload);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl p-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Layers className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">Nuevo calzado / modelo</DialogTitle>
              <DialogDescription className="text-xs">
                Completá los datos del modelo y cargá las cantidades individuales por cada talle.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* SECCIÓN 1: DATOS DEL MODELO */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <span>1. Identificación y características</span>
            </h3>

            {/* Subida y preview de foto */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 shadow-2xs mb-3.5">
              <ProductImageUpload />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Nombre del modelo *</span>
                  <Input
                    name="name"
                    required
                    placeholder="Ej. Air Jordan 1, Bota Siena, Zapatilla Urban"
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Marca</span>
                  <Input
                    name="brand"
                    placeholder="Ej. Nike, Adidas, Nómade"
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold">
                    Categoría
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(true)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="size-3" />
                    Nueva
                  </button>
                </div>

                <input type="hidden" name="category" value={selectedCategory} />

                {isAddingCategory ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                    <Input
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nueva categoría..."
                      className="h-10 text-xs rounded-xl"
                      disabled={addingCategoryBusy}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory();
                        } else if (e.key === "Escape") {
                          setIsAddingCategory(false);
                          setNewCategoryName("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-10 px-3 rounded-xl text-xs shrink-0 font-bold"
                      disabled={addingCategoryBusy || !newCategoryName.trim()}
                      onClick={() => handleCreateCategory()}
                    >
                      {addingCategoryBusy ? "…" : "Crear"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 px-2 rounded-xl text-xs shrink-0 text-muted-foreground"
                      disabled={addingCategoryBusy}
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <select
                    name="category"
                    value={selectedCategory}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setIsAddingCategory(true);
                      } else {
                        setSelectedCategory(e.target.value);
                      }
                    }}
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {categoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__NEW__" className="font-semibold text-primary">
                      + Agregar otra categoría…
                    </option>
                  </select>
                )}
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Color / Variedad</span>
                  <Input
                    name="color"
                    placeholder="Ej. Negro, Blanco/Rojo, Suela"
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Género</span>
                  <select
                    name="gender"
                    defaultValue="Unisex"
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="Unisex">Unisex</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                    <option value="Niños">Niños</option>
                  </select>
                </label>
              </div>

              {/* SKU - NO OBLIGATORIO */}
              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span className="flex items-center justify-between">
                    <span>SKU (Opcional)</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Auto si está vacío</span>
                  </span>
                  <Input
                    name="sku"
                    placeholder="Auto: MOD-XXXX"
                    className="h-10 rounded-xl font-mono text-xs"
                  />
                </label>
              </div>

              {/* CÓDIGO DE BARRAS - NO OBLIGATORIO */}
              <div className="sm:col-span-2">
                <label className="grid gap-1 text-xs font-semibold">
                  <span className="flex items-center justify-between">
                    <span>Código de barras (Opcional)</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Auto si está vacío</span>
                  </span>
                  <Input
                    name="barcode"
                    placeholder="Auto: 779XXXXXXXXXX o escaneá con lector"
                    className="h-10 rounded-xl font-mono text-xs"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: PRECIOS Y COSTOS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              2. Precios y rentabilidad
            </h3>
            <div className="grid gap-3.5 sm:grid-cols-4">
              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Costo de compra ($) *</span>
                  <Input
                    name="cost"
                    type="number"
                    min={0}
                    required
                    value={cost || ""}
                    onChange={(e) => setCost(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Precio Minorista ($) *</span>
                  <Input
                    name="retailPrice"
                    type="number"
                    min={0}
                    required
                    value={retailPrice || ""}
                    onChange={(e) => setRetailPrice(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-10 rounded-xl font-semibold text-primary"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Precio Mayorista ($) *</span>
                  <Input
                    name="wholesalePrice"
                    type="number"
                    min={0}
                    required
                    placeholder="0"
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Alerta stock bajo</span>
                  <Input
                    name="minStock"
                    type="number"
                    min={0}
                    defaultValue={3}
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CURVA DE TALLES Y CANTIDADES INDIVIDUALES */}
          <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-muted/40 via-card/70 to-card p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Curva de talles y stock inicial por número
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {variants.length} {variants.length === 1 ? "talle" : "talles"}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ingresá la cantidad de pares exacta que tenés de cada talle
                  </p>
                </div>
              </div>

              {/* Botones de curva rápida */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden sm:inline">Preajustes:</span>
                {PRESET_CURVES.map((curve) => (
                  <button
                    key={curve.label}
                    type="button"
                    onClick={() => applyCurve(curve.sizes)}
                    className="rounded-xl border border-border/70 bg-card px-2.5 py-1 text-xs font-semibold hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all shadow-2xs"
                  >
                    {curve.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Herramienta de llenado rápido y agregar talle */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 bg-background/80 border border-border/60 rounded-xl px-2.5 py-1 shadow-2xs">
                <span className="text-[11px] font-medium text-muted-foreground">Llenar todos con:</span>
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
                  <RefreshCw className="size-3 inline mr-1" />
                  Aplicar
                </button>
              </div>

              <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-xl p-1 shadow-2xs focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all ml-auto">
                <input
                  type="text"
                  placeholder="Otro talle (ej. 46)"
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

            {/* Grid moderno de talles */}
            {variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/50">
                <p className="text-xs text-muted-foreground">
                  No hay talles en la curva. Seleccioná una curva rápida arriba o agregá talles individuales.
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

            {/* Resumen en vivo */}
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
                    Inversión en stock:
                  </span>
                  <strong className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                    ${new Intl.NumberFormat("es-AR").format(totalCost)}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || variants.length === 0}
              className="rounded-xl px-6"
            >
              {busy ? "Guardando modelo…" : "Crear modelo y cargar stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
