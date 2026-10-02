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
  Package,
  Footprints,
  Shirt,
  Palette,
  Plus,
  Minus,
  RefreshCw,
  Sparkles,
  Trash2,
  Check,
  Barcode,
} from "lucide-react";
import { cleanBarcodeScan, isValidEan13, generateValidEan13 } from "@/lib/barcode";
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

type ProductType = "simple" | "calzado" | "indumentaria" | "variantes";

const CALZADO_CURVES = [
  { label: "Dama (35-40)", sizes: ["35", "36", "37", "38", "39", "40"] },
  { label: "Hombre (39-45)", sizes: ["39", "40", "41", "42", "43", "44", "45"] },
  { label: "Unisex (36-43)", sizes: ["36", "37", "38", "39", "40", "41", "42", "43"] },
  { label: "Niños (25-34)", sizes: ["25", "26", "27", "28", "29", "30", "31", "32", "33", "34"] },
];

const ROPA_CURVES = [
  { label: "Estándar (S-XXL)", sizes: ["S", "M", "L", "XL", "XXL"] },
  { label: "Completo (XS-3XL)", sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
  { label: "Numérico (38-50)", sizes: ["38", "40", "42", "44", "46", "48", "50"] },
  { label: "Infantil (2-14)", sizes: ["2", "4", "6", "8", "10", "12", "14"] },
];

const DEFAULT_CATEGORIES = [
  "General",
  "Bazar",
  "Indumentaria",
  "Calzado",
  "Accesorios",
  "Marroquinería",
  "Electrónica",
  "Hogar",
  "Juguetería",
  "Librería",
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
  const [productType, setProductType] = useState<ProductType>("simple");
  const [simpleStock, setSimpleStock] = useState<number>(10);

  const initialCalzadoSizes = useMemo(() => {
    return defaultSizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [defaultSizes]);

  const [variants, setVariants] = useState<VariantItem[]>(() =>
    initialCalzadoSizes.map((size) => ({ size, stock: 2 }))
  );
  const [bulkQty, setBulkQty] = useState<number>(2);
  const [customSize, setCustomSize] = useState("");
  const [cost, setCost] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [barcode, setBarcode] = useState("");

  useEffect(() => {
    if (open) {
      setBarcode("");
    }
  }, [open]);

  const categoryNames = useMemo(() => {
    if (Array.isArray(categories) && categories.length > 0) {
      const list: string[] = [];
      categories.forEach((c) => {
        const name = typeof c === "string" ? c : c?.name;
        if (name && !list.includes(name)) list.push(name);
      });
      DEFAULT_CATEGORIES.forEach((cat) => {
        if (!list.includes(cat)) list.push(cat);
      });
      return list;
    }
    return DEFAULT_CATEGORIES;
  }, [categories]);

  const [selectedCategory, setSelectedCategory] = useState("General");
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

  // Switch de tipo de producto y adaptación de valores por defecto
  const handleSelectProductType = (type: ProductType) => {
    setProductType(type);
    if (type === "calzado") {
      setVariants(initialCalzadoSizes.map((size) => ({ size, stock: 2 })));
      if (selectedCategory === "General") setSelectedCategory("Calzado");
    } else if (type === "indumentaria") {
      setVariants(["S", "M", "L", "XL", "XXL"].map((size) => ({ size, stock: 2 })));
      if (selectedCategory === "General") setSelectedCategory("Indumentaria");
    } else if (type === "variantes") {
      setVariants([
        { size: "Opción 1", stock: 5 },
        { size: "Opción 2", stock: 5 },
      ]);
    }
  };

  // Totales calculados en tiempo real
  const totalStock =
    productType === "simple"
      ? Math.max(0, Number(simpleStock) || 0)
      : variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  const totalCost = totalStock * (Number(cost) || 0);

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

    let finalVariants: VariantItem[] = [];

    if (productType === "simple") {
      finalVariants = [
        {
          size: "Único",
          stock: Math.max(0, Number(simpleStock) || 0),
        },
      ];
    } else {
      finalVariants = variants.map((v) => ({
        size: String(v.size).trim(),
        stock: Math.max(0, Number(v.stock) || 0),
      }));
      if (finalVariants.length === 0) {
        finalVariants = [{ size: "Único", stock: 0 }];
      }
    }

    const payload = {
      ...data,
      category: selectedCategory,
      variants: finalVariants,
      variantsJson: JSON.stringify(finalVariants),
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
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-orange-600/10 text-orange-600 dark:text-orange-400">
              <Package className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">Nuevo Producto / Artículo</DialogTitle>
              <DialogDescription className="text-xs">
                Cargá cualquier tipo de artículo (general, bazar, calzado, ropa) con o sin variantes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* SELECTOR DE TIPO DE ARTÍCULO */}
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Tipo de artículo / Inventario
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSelectProductType("simple")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  productType === "simple"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                    : "bg-card hover:bg-muted text-foreground border-border/80"
                }`}
              >
                <Package className="size-5" />
                <span className="text-xs font-bold">Artículo Simple</span>
                <span className="text-[10px] opacity-80 leading-tight">Sin talles (stock único)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProductType("calzado")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  productType === "calzado"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                    : "bg-card hover:bg-muted text-foreground border-border/80"
                }`}
              >
                <Footprints className="size-5" />
                <span className="text-xs font-bold">Calzado</span>
                <span className="text-[10px] opacity-80 leading-tight">Curva por número</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProductType("indumentaria")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  productType === "indumentaria"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                    : "bg-card hover:bg-muted text-foreground border-border/80"
                }`}
              >
                <Shirt className="size-5" />
                <span className="text-xs font-bold">Ropa / Indumentaria</span>
                <span className="text-[10px] opacity-80 leading-tight">Talles S, M, L, XL...</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProductType("variantes")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  productType === "variantes"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                    : "bg-card hover:bg-muted text-foreground border-border/80"
                }`}
              >
                <Palette className="size-5" />
                <span className="text-xs font-bold">Variantes Libres</span>
                <span className="text-[10px] opacity-80 leading-tight">Colores o medidas</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN 1: DATOS GENERALES */}
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
                  <span>Nombre del producto / artículo *</span>
                  <Input
                    name="name"
                    required
                    placeholder={
                      productType === "calzado"
                        ? "Ej. Zapatilla Urban Pro, Bota Siena..."
                        : productType === "indumentaria"
                        ? "Ej. Remera Oversize, Buzo Hoodie..."
                        : "Ej. Termo Acero 1L, Auriculares Pro, Mochila..."
                    }
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Marca / Fabricante</span>
                  <Input
                    name="brand"
                    placeholder="Ej. Stanley, Nike, Genérico..."
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold">Categoría</label>
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
                  <span>Color / Presentación (Opcional)</span>
                  <Input
                    name="color"
                    placeholder="Ej. Negro, Acero, Rojo, Estampado..."
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Público / Género</span>
                  <select
                    name="gender"
                    defaultValue="No aplica"
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="No aplica">No aplica / General</option>
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
                <label className="grid gap-1.5 text-xs font-semibold">
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Barcode className="size-3.5 text-primary" />
                      Código de barras (EAN-13 o propio)
                    </span>
                    <button
                      type="button"
                      onClick={() => setBarcode(generateValidEan13())}
                      className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="size-3" />
                      Generar EAN-13 oficial GS1
                    </button>
                  </span>
                  <div className="flex gap-2">
                    <Input
                      name="barcode"
                      value={barcode}
                      onChange={(e) => setBarcode(cleanBarcodeScan(e.target.value))}
                      placeholder="EAN-13 (ej: 779...) o escaneá con pistola lectora"
                      className="h-10 rounded-xl font-mono text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBarcode(generateValidEan13())}
                      className="h-10 px-3 text-xs shrink-0 font-semibold"
                      title="Generar nuevo código EAN-13 oficial con dígito verificador GS1"
                    >
                      Nuevo EAN
                    </Button>
                  </div>
                  {barcode ? (
                    <div className="text-[11px] font-medium">
                      {isValidEan13(barcode) ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="size-3" /> EAN-13 oficial GS1 válido (100% compatible con pistolas e impresoras térmicas)
                        </span>
                      ) : barcode.replace(/\D/g, "").length === 12 ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          ℹ 12 dígitos detectados: se añadirá automáticamente el 13° verificador GS1 al guardar.
                        </span>
                      ) : barcode.replace(/\D/g, "").length === 13 ? (
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
                      Dejá vacío para autogenerar un EAN-13 oficial GS1, o dispará con tu pistola lectora.
                    </span>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: PRECIOS Y COSTOS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              2. Precios comerciales y costo
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
                  <span className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                    <span>Precio Mayorista ($) *</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-400 text-orange-600">
                      Venta
                    </Badge>
                  </span>
                  <Input
                    name="wholesalePrice"
                    type="number"
                    min={0}
                    required
                    value={wholesalePrice || ""}
                    onChange={(e) => setWholesalePrice(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="h-10 rounded-xl font-bold border-orange-400/60 text-orange-600 dark:text-orange-400"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span className="flex items-center justify-between">
                    <span>PVP Sugerido ($)</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Minorista</span>
                  </span>
                  <Input
                    name="retailPrice"
                    type="number"
                    min={0}
                    value={retailPrice || ""}
                    onChange={(e) => setRetailPrice(Number(e.target.value) || 0)}
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

          {/* SECCIÓN 3: GESTIÓN DE INVENTARIO SEGÚN TIPO */}
          {productType === "simple" ? (
            /* MODO SIMPLE (Bazar, termos, electrónica, accesorios, etc.) */
            <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-muted/40 via-card/70 to-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/60 pb-3.5">
                <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                  <Package className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Stock inicial del artículo</h3>
                  <p className="text-xs text-muted-foreground">
                    Cantidad total disponible en depósito. Al vender en el Punto de Venta se sumará con 1 solo clic.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/80 border border-border/60 p-4 rounded-2xl">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSimpleStock(Math.max(0, simpleStock - 1))}
                    disabled={simpleStock <= 0}
                    className="size-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground font-bold border border-border/50 disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={simpleStock}
                    onChange={(e) => setSimpleStock(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 h-10 text-center text-xl font-black bg-transparent border-2 border-primary/40 rounded-xl focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setSimpleStock(simpleStock + 1)}
                    className="size-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center font-bold"
                  >
                    <Plus className="size-4" />
                  </button>
                  <span className="text-sm font-bold text-muted-foreground ml-2">unidades</span>
                </div>

                <div className="flex items-center gap-1.5 sm:ml-auto">
                  <span className="text-xs text-muted-foreground mr-1">Rápido:</span>
                  {[5, 10, 20, 50, 100].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setSimpleStock(qty)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                        simpleStock === qty
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card hover:bg-muted border-border/60"
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {cost > 0 && (
                <div className="flex items-center justify-between text-xs pt-2 text-muted-foreground">
                  <span>Valor en costo de este inventario:</span>
                  <strong className="font-bold text-foreground text-sm">
                    ${new Intl.NumberFormat("es-AR").format(totalCost)}
                  </strong>
                </div>
              )}
            </div>
          ) : (
            /* MODO CON VARIANTES (Calzado, Ropa o Libres) */
            <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-muted/40 via-card/70 to-card p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      {productType === "calzado"
                        ? "Curva de talles y stock por número"
                        : productType === "indumentaria"
                        ? "Talles de indumentaria y stock inicial"
                        : "Variantes personalizadas y stock"}
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {variants.length} {variants.length === 1 ? "variante" : "variantes"}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ingresá la cantidad de unidades exacta que tenés de cada opción
                    </p>
                  </div>
                </div>

                {/* Preajustes rápidos */}
                {(productType === "calzado" || productType === "indumentaria") && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden sm:inline">
                      Preajustes:
                    </span>
                    {(productType === "calzado" ? CALZADO_CURVES : ROPA_CURVES).map((curve) => (
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
                )}
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
                    placeholder={
                      productType === "calzado"
                        ? "Otro número (ej. 46)"
                        : productType === "indumentaria"
                        ? "Otro talle (ej. 4XL)"
                        : "Nueva variante (ej. Azul, 1L)"
                    }
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSize();
                      }
                    }}
                    className="w-40 bg-transparent px-2.5 text-xs font-medium focus:outline-none placeholder:text-muted-foreground/60"
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

              {/* Grid de variantes */}
              {variants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/50">
                  <p className="text-xs text-muted-foreground">
                    No hay variantes agregadas. Seleccioná un preajuste arriba o escribí una opción personalizada.
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
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                              Variante
                            </span>
                            <span className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight mt-0.5 truncate">
                              {v.size}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSize(v.size)}
                            title={`Quitar ${v.size}`}
                            className="opacity-40 hover:opacity-100 group-hover:opacity-80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-all shrink-0"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        {/* Stepper numérico */}
                        <div className="flex items-center justify-between bg-muted/60 dark:bg-muted/40 rounded-xl p-1 border border-border/50">
                          <button
                            type="button"
                            onClick={() => setStockForSize(v.size, v.stock - 1)}
                            disabled={v.stock <= 0}
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
                            className="size-7 rounded-lg bg-background hover:bg-primary hover:text-primary-foreground active:scale-95 text-foreground shadow-2xs font-bold text-xs flex items-center justify-center transition-all border border-border/40"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>

                        {/* Estado visual */}
                        <div className="flex items-center justify-center text-[11px] font-medium pt-0.5">
                          {hasStock ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              {v.stock} u.
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
                    <span className="text-xs text-primary font-medium">Total unidades:</span>
                    <strong className="text-sm font-black text-primary">{totalStock} u.</strong>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-3 py-1.5 rounded-xl text-xs">
                    <span className="text-muted-foreground">Opciones:</span>
                    <strong className="font-bold text-foreground">
                      {variants.filter((v) => v.stock > 0).length} de {variants.length} activas
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
          )}

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
              disabled={busy || (productType !== "simple" && variants.length === 0)}
              className="rounded-xl px-6 bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              {busy ? "Guardando producto…" : "Crear producto y guardar stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
