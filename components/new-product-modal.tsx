"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { formatMoney } from "@/lib/currency";

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
  settings?: any;
  busy: boolean;
  onSubmit: (data: any, keepOpen?: boolean) => Promise<boolean>;
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
  "Bazar General",
  "Cocina y Mesa",
  "Hogar y Deco",
  "Juguetería",
  "Librería y Escolar",
  "Ferretería",
  "Electrónica y Accesorios",
  "Baño y Limpieza",
  "Calzado",
  "Indumentaria",
  "Accesorios y Regalería",
];

export function NewProductModal({
  open,
  onOpenChange,
  defaultSizes = "35,36,37,38,39,40",
  categories = [],
  onNewCategory,
  settings,
  busy,
  onSubmit,
}: NewProductModalProps) {
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [productType, setProductType] = useState<ProductType>("simple");
  const [simpleStock, setSimpleStock] = useState<number>(10);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("");
  const [sku, setSku] = useState("");
  const [gender, setGender] = useState("No aplica");
  const [minStock, setMinStock] = useState(3);
  const [submitMode, setSubmitMode] = useState<"close" | "continue">("close");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const currency = (settings?.currency === "BRL" ? "BRL" : "ARS");
  const isArs = currency === "ARS";
  const currLabel = isArs ? "$ AR" : "R$ BRL";
  const rateArs = Number(settings?.exchange_rate_ars || settings?.exchange_rate_brl) || 250;

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
  const defaultVat = settings?.default_vat_rate !== undefined ? Number(settings.default_vat_rate) : 0;
  const [vatRate, setVatRate] = useState<number>(defaultVat);
  const [isCustomVat, setIsCustomVat] = useState<boolean>(false);
  const [barcode, setBarcode] = useState("");

  useEffect(() => {
    if (open) {
      setBarcode("");
      setHasVariants(false);
      setProductType("simple");
      setSimpleStock(10);
      setName("");
      setCost(0);
      setWholesalePrice(0);
      setRetailPrice(0);
      const initialVat = settings?.default_vat_rate !== undefined ? Number(settings.default_vat_rate) : 0;
      setVatRate(initialVat);
      setIsCustomVat(![0, 10.5, 21, 27].includes(initialVat));
      setColor("");
      setLocation("");
      setSku("");
      setGender("No aplica");
      setSubmitMode("close");
    }
  }, [open, settings?.default_vat_rate]);

  // Cálculos de margen porcentual en tiempo real
  const wholesaleMargin = useMemo(() => {
    if (!cost || !wholesalePrice || cost <= 0) return null;
    const diff = wholesalePrice - cost;
    const pct = Math.round((diff / cost) * 100);
    return { diff, pct };
  }, [cost, wholesalePrice]);

  const retailMargin = useMemo(() => {
    if (!cost || !retailPrice || cost <= 0) return null;
    const diff = retailPrice - cost;
    const pct = Math.round((diff / cost) * 100);
    return { diff, pct };
  }, [cost, retailPrice]);

  const applyWholesaleMargin = (pct: number) => {
    if (!cost || cost <= 0) return;
    const calculated = Math.round(cost * (1 + pct / 100) * 100) / 100;
    setWholesalePrice(calculated);
  };

  const applyRetailMargin = (pct: number) => {
    if (!cost || cost <= 0) return;
    const calculated = Math.round(cost * (1 + pct / 100) * 100) / 100;
    setRetailPrice(calculated);
  };

  const handleEnableVariants = () => {
    setHasVariants(true);
    if (!variants || variants.length === 0) {
      setVariants(initialCalzadoSizes.map((size) => ({ size, stock: 2 })));
    }
  };

  const handleDisableVariants = () => {
    setHasVariants(false);
  };

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
  const totalStock = !hasVariants
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

    if (!hasVariants) {
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

    let imagesList: string[] = [];
    if (typeof data.imagesJson === "string") {
      try {
        imagesList = JSON.parse(data.imagesJson);
      } catch {}
    }
    if (imagesList.length === 0 && data.imageUrl) {
      imagesList = [String(data.imageUrl)];
    }

    const payload = {
      ...data,
      name: name.trim(),
      brand: brand.trim(),
      location: location.trim(),
      sku: sku.trim(),
      color: color.trim(),
      gender,
      barcode: barcode.trim(),
      cost: Number(cost) || 0,
      wholesalePrice: Number(wholesalePrice) || 0,
      retailPrice: Number(retailPrice) || 0,
      vatRate: isNaN(Number(vatRate)) ? 0 : Number(vatRate),
      minStock: Number(minStock) || 3,
      images: imagesList,
      imagesJson: JSON.stringify(imagesList),
      imageUrl: imagesList[0] || "",
      category: selectedCategory,
      variants: finalVariants,
      variantsJson: JSON.stringify(finalVariants),
    };

    const isContinue = submitMode === "continue";
    const ok = await onSubmit(payload, isContinue);
    if (ok) {
      if (isContinue) {
        // Modo carga rápida: limpiar datos del producto pero mantener categoría y marca
        setName("");
        setBarcode("");
        setSku("");
        setCost(0);
        setWholesalePrice(0);
        setRetailPrice(0);
        setSimpleStock(10);
        setColor("");
        setLocation("");
        setHasVariants(false);
        setProductType("simple");
        requestAnimationFrame(() => {
          nameInputRef.current?.focus();
        });
      } else {
        onOpenChange(false);
      }
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
          {/* SECCIÓN 1: DATOS GENERALES */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <span>1. Identificación y características</span>
            </h3>

            {/* Subida y preview de fotos (hasta 10 fotos) */}
            <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 shadow-2xs mb-3.5">
              <ProductImageUpload maxImages={10} />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Nombre del producto / artículo *</span>
                  <Input
                    ref={nameInputRef}
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Termo Acero 1L, Set Tazas Cerámica, Plato Playo..."
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Marca / Fabricante</span>
                  <Input
                    name="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Ej. Stanley, Tramontina, Genérico..."
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
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ej. Negro, Acero, Rojo, Pastel..."
                    className="h-10 rounded-xl"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Ubicación / Estante (Opcional)</span>
                  <Input
                    name="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej. Pasillo 2, Estante B, Vidriera..."
                    className="h-10 rounded-xl text-xs"
                  />
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Público / Género</span>
                  <select
                    name="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
                  >
                    <option value="No aplica">No aplica / General</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                    <option value="Niños">Niños / Infantil</option>
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
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
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

          {/* SECCIÓN 2: PRECIOS Y COSTOS CON CALCULADORA DE MARGEN */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
              <span>2. Precios comerciales y costo</span>
              {cost > 0 && (
                <span className="text-[11px] font-medium text-primary">
                  Calculadora de margen activa sobre costo de {formatMoney(cost, currency)}
                </span>
              )}
            </h3>
            <div className="grid gap-3.5 sm:grid-cols-5">
              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Costo compra ({currLabel}) *</span>
                  <Input
                    name="cost"
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={cost || ""}
                    onChange={(e) => setCost(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-10 rounded-xl"
                  />
                  <span className="text-[10px] text-muted-foreground">Costo reposición</span>
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                    <span>Precio Mayorista ({currLabel})*</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-orange-400 text-orange-600">
                      Venta
                    </Badge>
                  </span>
                  <Input
                    name="wholesalePrice"
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={wholesalePrice || ""}
                    onChange={(e) => setWholesalePrice(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-10 rounded-xl font-bold border-orange-400/60 text-orange-600 dark:text-orange-400"
                  />
                </label>
                {cost > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-muted-foreground mr-0.5">Margen:</span>
                    {[25, 35, 50, 70].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyWholesaleMargin(pct)}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-orange-400/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold transition-colors cursor-pointer"
                        title={`Calcular precio con +${pct}% de ganancia sobre costo`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                )}
                {wholesaleMargin && (
                  <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mt-1">
                    +{wholesaleMargin.pct}% ganancia (+{formatMoney(wholesaleMargin.diff, currency)})
                  </p>
                )}
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span className="flex items-center justify-between">
                    <span>PVP Sugerido ({currLabel})</span>
                    <span className="text-[10px] font-normal text-muted-foreground">Minorista</span>
                  </span>
                  <Input
                    name="retailPrice"
                    type="number"
                    min={0}
                    step="any"
                    value={retailPrice || ""}
                    onChange={(e) => setRetailPrice(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-10 rounded-xl"
                  />
                </label>
                {cost > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-muted-foreground mr-0.5">Margen:</span>
                    {[50, 75, 100, 150].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyRetailMargin(pct)}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/60 hover:bg-muted text-foreground font-bold transition-colors cursor-pointer"
                        title={`Calcular precio con +${pct}% de ganancia sobre costo`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                )}
                {retailMargin && (
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    +{retailMargin.pct}% ganancia (+{formatMoney(retailMargin.diff, currency)})
                  </p>
                )}
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                    <span>Alícuota IVA</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-400 text-blue-600">
                      AFIP
                    </Badge>
                  </span>
                  {isCustomVat ? (
                    <div className="flex gap-1 items-center">
                      <div className="relative flex-1">
                        <Input
                          name="vatRate"
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          value={vatRate}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVatRate(isNaN(val) ? 0 : val);
                          }}
                          placeholder="0"
                          className="h-10 rounded-xl pr-6 font-bold text-xs"
                          autoFocus
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setIsCustomVat(false);
                          setVatRate(0);
                        }}
                        className="h-10 px-2 text-[10px]"
                        title="Volver a lista de alícuotas"
                      >
                        Lista
                      </Button>
                    </div>
                  ) : (
                    <select
                      name="vatRate"
                      value={[0, 10.5, 21, 27].includes(vatRate) ? vatRate : "custom"}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setIsCustomVat(true);
                        } else {
                          const val = parseFloat(e.target.value);
                          setVatRate(isNaN(val) ? 0 : val);
                        }
                      }}
                      className="h-10 w-full rounded-xl border bg-background px-2.5 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20"
                    >
                      <option value={0}>0% (Sin IVA / Exento)</option>
                      <option value={21}>21% (Estándar AFIP)</option>
                      <option value={10.5}>10.5% (Reducido AFIP)</option>
                      <option value={27}>27% (Especial AFIP)</option>
                      <option value="custom">✏️ Personalizado (%)</option>
                    </select>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {isCustomVat ? "Alícuota personalizada" : vatRate === 0 ? "Sin IVA (Exento)" : `IVA ${vatRate}%`}
                  </span>
                </label>
              </div>

              <div>
                <label className="grid gap-1 text-xs font-semibold">
                  <span>Alerta stock bajo</span>
                  <Input
                    name="minStock"
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value) || 0)}
                    className="h-10 rounded-xl"
                  />
                  <span className="text-[10px] text-muted-foreground">Aviso pocas unidades</span>
                </label>
              </div>
            </div>

            {wholesalePrice > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Desglose fiscal (IVA {vatRate}% incluido):</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-mono font-bold">
                  Neto: {isArs ? `$ ${Math.round(wholesalePrice / (1 + vatRate / 100)).toLocaleString("es-AR")}` : `R$ ${(wholesalePrice / (1 + vatRate / 100)).toFixed(2)}`}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-mono font-bold">
                  IVA ({vatRate}%): {isArs ? `$ ${Math.round(wholesalePrice - (wholesalePrice / (1 + vatRate / 100))).toLocaleString("es-AR")}` : `R$ ${(wholesalePrice - (wholesalePrice / (1 + vatRate / 100))).toFixed(2)}`}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold ml-auto">
                  {isArs ? `🇧🇷 R$ ${(wholesalePrice / rateArs).toFixed(2)} BRL` : `🇦🇷 $ ${Math.round(wholesalePrice * rateArs).toLocaleString("es-AR")} ARS`}
                </Badge>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: GESTIÓN DE INVENTARIO Y STOCK */}
          {!hasVariants ? (
            /* MODO PREDETERMINADO: AGREGAR CANTIDAD DIRECTO */
            <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-muted/40 via-card/70 to-card p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                    <Package className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Cantidad / Stock inicial</h3>
                    <p className="text-xs text-muted-foreground">
                      Ingresá la cantidad de unidades que tenés disponible en depósito
                    </p>
                  </div>
                </div>

                {/* BOTÓN VISIBLE PARA AGREGAR VARIANTES */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEnableVariants}
                  className="gap-2 rounded-xl border-dashed border-primary/60 bg-primary/5 hover:bg-primary/15 text-primary text-xs font-bold h-10 px-4 self-start sm:self-auto shadow-2xs hover:border-primary transition-all cursor-pointer"
                >
                  <Plus className="size-4" />
                  + Agregar variantes (talles / colores)
                </Button>
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
                    {formatMoney(totalCost, currency)}
                  </strong>
                </div>
              )}
            </div>
          ) : (
            /* MODO DESPLEGADO CON VARIANTES (Si el usuario apretó '+ Agregar variantes') */
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/5 via-card/70 to-card p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      Variantes y stock por opción
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {variants.length} {variants.length === 1 ? "variante" : "variantes"}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ingresá la cantidad de unidades exacta que tenés de cada opción
                    </p>
                  </div>
                </div>

                {/* BOTÓN PARA CERRAR Y VOLVER A CANTIDAD SIMPLE */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisableVariants}
                  className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl gap-1.5 self-start sm:self-auto font-semibold"
                >
                  <Trash2 className="size-3.5" />
                  Quitar variantes (usar solo cantidad)
                </Button>
              </div>

              {/* SELECTOR DE TIPO DE VARIANTES */}
              <div className="flex flex-wrap items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-border/70">
                <button
                  type="button"
                  onClick={() => handleSelectProductType("calzado")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    productType === "calzado"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Footprints className="size-4" />
                  Calzado (curva por número)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectProductType("indumentaria")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    productType === "indumentaria"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shirt className="size-4" />
                  Ropa / Indumentaria (S, M, L)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectProductType("variantes")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    productType === "variantes"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Palette className="size-4" />
                  Variantes libres (colores / opciones)
                </button>
              </div>

              {/* Preajustes rápidos */}
              {(productType === "calzado" || productType === "indumentaria") && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1 hidden sm:inline">
                    Curvas rápidas:
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
                      {formatMoney(totalCost, currency)}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BOTONES DE ACCIÓN */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              Consejo: usá <strong>Guardar y crear otro</strong> para reponer stock masivo rápido.
            </span>
            <div className="flex items-center justify-end gap-2">
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
                variant="secondary"
                disabled={busy || (hasVariants && variants.length === 0)}
                onClick={() => setSubmitMode("continue")}
                className="rounded-xl px-4 font-bold border border-border/80 shadow-2xs hover:bg-muted cursor-pointer"
                title="Guarda este producto y mantiene el formulario listo para el siguiente manteniendo la categoría"
              >
                <Plus className="size-4 mr-1 text-primary" />
                Guardar y crear otro
              </Button>
              <Button
                type="submit"
                disabled={busy || (hasVariants && variants.length === 0)}
                onClick={() => setSubmitMode("close")}
                className="rounded-xl px-6 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-sm cursor-pointer"
              >
                {busy && submitMode === "close" ? "Guardando…" : "Crear producto"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
