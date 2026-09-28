"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ShoppingBag, Search, Sparkles, Filter, X, Plus, Minus, Trash2,
  CheckCircle2, AlertCircle, MessageCircle, MapPin, Truck, Store,
  ChevronRight, Phone, ShieldCheck, Tag, ArrowLeft, Send, Eye, Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";

interface Variant {
  size: string;
  stock: number;
  barcode?: string;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  gender?: string;
  retail_price: number;
  wholesale_price: number;
  cost?: number;
  image_url?: string;
  color?: string;
  sku?: string;
  variants?: Variant[];
  total_stock: number;
  description?: string;
}

interface StoreSettings {
  business_name?: string;
  branch_name?: string;
  whatsapp?: string;
  phone?: string;
  address?: string;
  wholesale_min_qty?: number;
  wholesale_terms?: string;
  logo_url?: string;
}

interface CartItem {
  id: string; // productId + size
  productId: string;
  name: string;
  brand: string;
  size: string;
  price: number;
  qty: number;
  maxStock: number;
  imageUrl?: string;
}

interface PublicStoreProps {
  settings: StoreSettings;
  products: Product[];
  channel: "mayorista" | "minorista";
  storeUid: string;
}

const money = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val || 0);

export function PublicStore({ settings, products, channel, storeUid }: PublicStoreProps) {
  const isMayorista = channel === "mayorista";
  const businessName = settings?.business_name || "Zapatería";
  const branchName = settings?.branch_name || "";
  const rawWhatsapp = settings?.whatsapp || settings?.phone || "";
  const rawMinQty = Number(settings?.wholesale_min_qty);
  const minQty = isMayorista ? (rawMinQty && rawMinQty !== 6 ? rawMinQty : 12) : 1;
  const wholesaleTerms = settings?.wholesale_terms || "Precios mayoristas por volumen.";

  // Sanitize store phone for wa.me
  const storePhone = useMemo(() => {
    let cleaned = rawWhatsapp.replace(/[^0-9]/g, "");
    if (!cleaned) return "";
    // If starts with 15 in Argentina, or 0, adjust format if needed
    if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith("54") && cleaned.length >= 10) {
      cleaned = `549${cleaned}`;
    }
    return cleaned;
  }, [rawWhatsapp]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Selected sizes per product card (productId -> size string)
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [addedAnimation, setAddedAnimation] = useState<string | null>(null);

  // Modal de vista completa del producto
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [selectedDetailSize, setSelectedDetailSize] = useState<string>("");
  const [detailWholesaleQty, setDetailWholesaleQty] = useState<number>(1);
  const [modalAddedAnimation, setModalAddedAnimation] = useState(false);

  useEffect(() => {
    if (detailProduct) {
      const firstWithStock = detailProduct.variants?.find((v) => v.stock > 0)?.size || detailProduct.variants?.[0]?.size || "";
      setSelectedDetailSize(firstWithStock);
      setDetailWholesaleQty(1);
      setModalAddedAnimation(false);
    }
  }, [detailProduct]);

  const selectedDetailVariant = useMemo(() => {
    if (!detailProduct) return null;
    return (detailProduct.variants || []).find((v) => String(v.size) === String(selectedDetailSize)) || null;
  }, [detailProduct, selectedDetailSize]);

  const detailVariantStock = selectedDetailVariant
    ? Number(selectedDetailVariant.stock || 0)
    : Number(detailProduct?.total_stock || 0);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("all");

  // Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [formError, setFormError] = useState("");

  // Calculate distinct categories, genders, sizes for filters
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const genders = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.gender) set.add(p.gender.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const availableSizesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        if (Number(v.stock || 0) > 0) set.add(String(v.size));
      });
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.localeCompare(b);
    });
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      // Must have stock
      if ((p.total_stock || 0) <= 0) return false;

      // Text search
      if (q) {
        const matchName = (p.name || "").toLowerCase().includes(q);
        const matchBrand = (p.brand || "").toLowerCase().includes(q);
        const matchCat = (p.category || "").toLowerCase().includes(q);
        if (!matchName && !matchBrand && !matchCat) return false;
      }

      // Category filter
      if (selectedCategory !== "all" && p.category !== selectedCategory) {
        return false;
      }

      // Gender filter
      if (selectedGender !== "all" && p.gender !== selectedGender) {
        return false;
      }

      // Size filter (aplicable tanto en minorista como mayorista)
      if (selectedSizeFilter !== "all") {
        const hasSize = (p.variants || []).some(
          (v) => String(v.size) === selectedSizeFilter && Number(v.stock || 0) > 0
        );
        if (!hasSize) return false;
      }

      return true;
    });
  }, [products, search, selectedCategory, selectedGender, selectedSizeFilter]);

  // Cart calculations
  const totalCartPairs = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const totalCartAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  }, [cart]);

  const meetsWholesaleMinimum = !isMayorista || totalCartPairs >= minQty;

  // Add to cart helper (permite elegir talle y cantidad en ambos canales)
  const handleAddToCart = (product: Product, overrideSize?: string, overrideQty?: number) => {
    const activeVariants = (product.variants || []).filter((v) => Number(v.stock || 0) > 0);
    const size =
      overrideSize ||
      selectedSizes[product.id] ||
      (activeVariants[0]?.size ?? (product.total_stock > 0 ? "Único" : ""));

    if (!size && activeVariants.length > 0) {
      alert("Por favor seleccioná un talle disponible.");
      return;
    }

    const variant = (product.variants || []).find((v) => String(v.size) === String(size));
    const maxStock = variant ? Number(variant.stock || 0) : Number(product.total_stock || 0);

    if (maxStock <= 0) {
      alert("Ese talle no cuenta con stock disponible actualmente.");
      return;
    }

    const qtyToAdd = overrideQty !== undefined && overrideQty > 0 ? overrideQty : 1;
    if (qtyToAdd > maxStock) {
      alert(`Stock máximo disponible para el talle ${size}: ${maxStock} pares.`);
      return;
    }

    const price = Number(isMayorista ? product.wholesale_price : product.retail_price || 0);
    const cartItemId = size ? `${product.id}_${size}` : `${product.id}_unico`;

    setCart((prev) => {
      const existing = prev.find((i) => i.id === cartItemId);
      if (existing) {
        const nextQty = existing.qty + qtyToAdd;
        if (nextQty > maxStock) {
          alert(
            `Alcanzaste el stock máximo disponible (${maxStock} pares)${size ? ` para el talle ${size}` : ""}. Ya tenés ${existing.qty} en el pedido.`
          );
          return prev;
        }
        return prev.map((i) => (i.id === cartItemId ? { ...i, qty: nextQty } : i));
      }
      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          name: product.name,
          brand: product.brand || "",
          size,
          price,
          qty: qtyToAdd,
          maxStock,
          imageUrl: product.image_url,
        },
      ];
    });

    setAddedAnimation(product.id);
    setTimeout(() => setAddedAnimation(null), 1200);
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.maxStock) {
              alert(`Stock máximo disponible: ${item.maxStock} pares.`);
              return item;
            }
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  // Build WhatsApp Message and send
  const handleConfirmAndSendWhatsapp = () => {
    if (!customerName.trim()) {
      setFormError("Por favor ingresa tu nombre completo.");
      return;
    }
    if (!customerPhone.trim()) {
      setFormError("Por favor ingresa un número de teléfono o WhatsApp de contacto.");
      return;
    }
    if (deliveryType === "delivery" && !customerAddress.trim()) {
      setFormError("Por favor ingresa la dirección de entrega.");
      return;
    }

    if (isMayorista && totalCartPairs < minQty) {
      setFormError(`El pedido mayorista requiere un mínimo de ${minQty} pares.`);
      return;
    }

    setFormError("");

    // Build structured message
    const nowStr = new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let message = `👟 *NUEVO PEDIDO DE TIENDA - ${isMayorista ? "MAYORISTA" : "MINORISTA"}*\n`;
    message += `📅 *Fecha:* ${nowStr}\n`;
    message += `👤 *Cliente:* ${customerName.trim()}\n`;
    message += `📱 *Teléfono:* ${customerPhone.trim()}\n`;
    message += `📍 *Entrega:* ${deliveryType === "pickup" ? "Retiro en local / sucursal" : `Envío a domicilio (${customerAddress.trim()})`}\n`;
    if (customerNotes.trim()) {
      message += `📝 *Nota:* ${customerNotes.trim()}\n`;
    }
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🛍️ *DETALLE DE PRODUCTOS:*\n`;

    cart.forEach((item, idx) => {
      const itemSubtotal = item.qty * item.price;
      message += `\n${idx + 1}. *${item.name}* ${item.brand ? `(${item.brand})` : ""}\n`;
      if (item.size) {
        message += `   • Talle: *${item.size}*\n`;
      }
      message += `   • Cantidad: *${item.qty}* par${item.qty > 1 ? "es" : ""} x ${money(item.price)}\n`;
      message += `   • Subtotal: *${money(itemSubtotal)}*\n`;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📦 *TOTAL DE PARES:* ${totalCartPairs}\n`;
    message += `💰 *TOTAL GENERAL:* *${money(totalCartAmount)}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `_Pedido enviado desde el catálogo online de ${businessName}._`;

    // Destination url
    const waUrl = storePhone
      ? `https://wa.me/${storePhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");

    // Close modals
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Banner for Channel Info */}
      <div
        className={`px-4 py-2 text-xs md:text-sm font-medium text-center flex items-center justify-center gap-2 ${
          isMayorista
            ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-sm"
            : "bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 text-white shadow-sm"
        }`}
      >
        <Sparkles className="w-4 h-4 shrink-0" />
        {isMayorista ? (
          <span>
            <strong>Catálogo Mayorista:</strong> Compra mínima de <strong>{minQty} pares</strong>. {wholesaleTerms}
          </span>
        ) : (
          <span>
            <strong>Catálogo Minorista:</strong> Precios por unidad con stock en tiempo real. ¡Elegí y pedí directo por WhatsApp!
          </span>
        )}
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={businessName}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                  isMayorista ? "bg-amber-600" : "bg-indigo-600"
                }`}
              >
                <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                  {businessName}
                </h1>
                <Badge
                  variant={isMayorista ? "secondary" : "default"}
                  className={
                    isMayorista
                      ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold uppercase text-[10px]"
                      : "bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold uppercase text-[10px]"
                  }
                >
                  {isMayorista ? "Mayorista" : "Minorista"}
                </Badge>
              </div>
              {branchName && (
                <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {branchName} {settings?.address ? `• ${settings.address}` : ""}
                </p>
              )}
            </div>
          </div>

          {/* Floating / Header Cart Trigger */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCartOpen(true)}
              className={`relative shadow-md font-semibold transition-all duration-200 ${
                totalCartPairs > 0
                  ? isMayorista
                    ? "bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400/40"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-400/40"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              }`}
            >
              <ShoppingBag className="w-5 h-5 mr-1.5" />
              <span className="hidden sm:inline">Ver Pedido</span>
              {totalCartPairs > 0 && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-900 shadow-xs">
                  {totalCartPairs}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* Search & Filter Controls */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por calzado, marca, modelo o código..."
                className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white text-sm rounded-xl"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Size Filter */}
            {availableSizesList.length > 0 && (
              <div className="sm:w-48">
                <select
                  value={selectedSizeFilter}
                  onChange={(e) => setSelectedSizeFilter(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todos los talles</option>
                  {availableSizesList.map((size) => (
                    <option key={size} value={size}>
                      Talle {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Categories & Gender Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Categoría:
            </span>
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}

            {genders.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-semibold text-slate-500">Público:</span>
                <button
                  onClick={() => setSelectedGender("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedGender === "all"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todos
                </button>
                {genders.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGender(g)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedGender === g
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-4 text-xs sm:text-sm text-slate-500">
          <span>
            Mostrando <strong>{filteredProducts.length}</strong> modelos disponibles con stock
          </span>
          {isMayorista && (
            <span className="text-amber-700 font-medium hidden sm:inline">
              Precios válidos llevando {minQty} pares o más
            </span>
          )}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No se encontraron calzados</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Intenta cambiar los filtros de búsqueda o categoría para ver otros modelos disponibles.
            </p>
            {(search || selectedCategory !== "all" || selectedGender !== "all" || selectedSizeFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setSelectedGender("all");
                  setSelectedSizeFilter("all");
                }}
                className="mt-4"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((p) => {
              const activeVariants = (p.variants || []).filter((v) => Number(v.stock || 0) > 0);
              const selectedSize = selectedSizes[p.id] || (activeVariants[0]?.size ?? "");
              const selectedVariant = activeVariants.find((v) => String(v.size) === String(selectedSize));
              const currentStock = selectedVariant
                ? Number(selectedVariant.stock || 0)
                : activeVariants.length === 0
                ? Number(p.total_stock || 0)
                : 0;

              const displayPrice = isMayorista ? p.wholesale_price : p.retail_price;
              const secondaryPrice = isMayorista ? p.retail_price : p.wholesale_price;

              const isJustAdded = addedAnimation === p.id;
              const inCartCount = cart
                .filter((i) => i.productId === p.id)
                .reduce((sum, i) => sum + i.qty, 0);

              return (
                <Card
                  key={p.id}
                  className="group overflow-hidden rounded-2xl border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white flex flex-col"
                >
                  {/* Image container con clic para ver completo */}
                  <div
                    onClick={() => setDetailProduct(p)}
                    className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center cursor-pointer group/img"
                    title="Hacé clic para ver la foto completa y detalles"
                  >
                    {p.image_url ? (
                      <>
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* Overlay al pasar el mouse */}
                        <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-2xs">
                          <span className="bg-slate-900/80 rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-md">
                            <Eye className="w-3.5 h-3.5" />
                            Ver foto completa
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-4">
                        <Store className="w-12 h-12 stroke-[1.5] mb-1 text-slate-300" />
                        <span className="text-[11px] font-medium text-slate-400">Sin foto</span>
                      </div>
                    )}

                    {/* Stock badge */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none">
                      {p.brand && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-slate-800 shadow-xs uppercase tracking-wider backdrop-blur">
                          {p.brand}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-600 text-white shadow-xs">
                        Stock: {p.total_stock}
                      </span>
                    </div>
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        {p.category && <span>{p.category}</span>}
                        {p.category && p.gender && <span>•</span>}
                        {p.gender && <span>{p.gender}</span>}
                      </div>

                      <h3
                        onClick={() => setDetailProduct(p)}
                        className="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Ver detalles del calzado"
                      >
                        {p.name}
                      </h3>

                      {/* Pricing block */}
                      <div className="mt-2.5 mb-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black tracking-tight text-slate-900">
                            {money(displayPrice)}
                          </span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                            {isMayorista ? "P. Mayorista" : "Minorista"}
                          </span>
                        </div>
                        {secondaryPrice > 0 && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            {isMayorista ? (
                              <span>Sugerido venta minorista: {money(secondaryPrice)}</span>
                            ) : (
                              <span>Mayorista x volumen: {money(secondaryPrice)}</span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Sizes selection */}
                      <div className="space-y-1.5 mb-4">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">Talle:</span>
                          <span className="text-slate-500">
                            Disp: <strong>{currentStock}</strong> pares
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeVariants.length === 0 ? (
                            <span className="text-xs text-rose-500 font-medium">Sin talles con stock</span>
                          ) : (
                            activeVariants.map((v) => {
                              const isSelected = String(v.size) === String(selectedSize);
                              return (
                                <button
                                  key={v.size}
                                  type="button"
                                  onClick={() =>
                                    setSelectedSizes((prev) => ({
                                      ...prev,
                                      [p.id]: String(v.size),
                                    }))
                                  }
                                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                    isSelected
                                      ? isMayorista
                                        ? "bg-amber-600 text-white border-amber-600 shadow-xs scale-105"
                                        : "bg-indigo-600 text-white border-indigo-600 shadow-xs scale-105"
                                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  {v.size}
                                </button>
                              );
                            })
                          )}
                        </div>

                        {inCartCount > 0 && (
                          <div
                            className={`mt-2 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1 ${
                              isMayorista
                                ? "text-amber-800 bg-amber-50 border border-amber-200/70"
                                : "text-indigo-800 bg-indigo-50 border border-indigo-200/70"
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              En tu pedido: <strong>{inCartCount}</strong> {inCartCount === 1 ? "par" : "pares"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add to order button */}
                    <Button
                      type="button"
                      disabled={currentStock <= 0}
                      onClick={() => handleAddToCart(p)}
                      className={`w-full font-bold h-10 rounded-xl transition-all ${
                        isJustAdded
                          ? "bg-emerald-600 text-white"
                          : isMayorista
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1.5 animate-bounce" />
                          ¡Agregado!
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1.5" />
                          Agregar al pedido {selectedSize ? `(Talle ${selectedSize})` : ""}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar for Mobile */}
      {totalCartPairs > 0 && (
        <div className="sm:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className={`w-full py-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between font-bold text-white transition-transform active:scale-95 ${
              isMayorista ? "bg-amber-600" : "bg-indigo-600"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5" />
              <span>Ver Pedido ({totalCartPairs} pares)</span>
            </div>
            <span className="text-base font-black">{money(totalCartAmount)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer / Slide-Over */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 bg-white">
          <SheetHeader className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-slate-800" />
                <SheetTitle className="text-lg font-bold text-slate-900">Tu Pedido</SheetTitle>
              </div>
              <Badge variant="outline" className="text-xs font-bold uppercase">
                {channel}
              </Badge>
            </div>
            <SheetDescription className="text-xs text-slate-500">
              Revisá tus calzados seleccionados antes de enviar por WhatsApp
            </SheetDescription>

            {/* Wholesale minimum reminder */}
            {isMayorista && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-1.5">
                  <span>Mínimo mayorista: {minQty} pares</span>
                  <span>{totalCartPairs} / {minQty} pares</span>
                </div>
                <Progress
                  value={Math.min(100, (totalCartPairs / minQty) * 100)}
                  className="h-2 bg-amber-200"
                />
                {!meetsWholesaleMinimum ? (
                  <p className="text-[11px] text-amber-800 mt-1.5 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Te faltan {minQty - totalCartPairs} pares para alcanzar el mínimo mayorista.
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-700 mt-1.5 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ¡Mínimo mayorista alcanzado! Podés finalizar tu pedido.
                  </p>
                )}
              </div>
            )}
          </SheetHeader>

          {/* Cart item list */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="text-center py-16 px-4">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Tu pedido está vacío</p>
                <p className="text-xs text-slate-400 mt-1">Elegí productos del catálogo para comenzar</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-3 flex gap-3 items-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <Store className="w-6 h-6 text-slate-300" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                    {item.size ? (
                      <p className="text-[11px] text-slate-500">
                        {item.brand ? `${item.brand} • ` : ""}Talle: <strong>{item.size}</strong>
                      </p>
                    ) : item.brand ? (
                      <p className="text-[11px] text-slate-500">{item.brand}</p>
                    ) : null}
                    <p className="text-xs font-black text-slate-900 mt-0.5">
                      {money(item.price)} <span className="text-[10px] font-normal text-slate-400">c/u</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-900">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Total pares:</span>
                  <span className="font-bold text-slate-900">{totalCartPairs} pares</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total estimado:</span>
                  <span className="text-xl text-slate-900">{money(totalCartAmount)}</span>
                </div>
              </div>

              <Button
                disabled={!meetsWholesaleMinimum}
                onClick={() => {
                  setIsCheckoutOpen(true);
                }}
                className={`w-full h-11 text-base font-bold rounded-xl shadow-md transition-all ${
                  isMayorista
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                Continuar con el pedido
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de Detalle de Producto con Foto Completa */}
      <Dialog open={Boolean(detailProduct)} onOpenChange={(open) => !open && setDetailProduct(null)}>
        {detailProduct && (
          <DialogContent className="max-w-3xl bg-white rounded-3xl p-0 overflow-hidden border-0 shadow-2xl max-h-[90vh] flex flex-col sm:flex-row">
            {/* Columna Izquierda: Foto Completa */}
            <div className="relative sm:w-1/2 bg-slate-50 flex items-center justify-center p-4 sm:p-6 border-b sm:border-b-0 sm:border-r border-slate-100 min-h-[260px] sm:min-h-[460px]">
              {detailProduct.image_url ? (
                <img
                  src={detailProduct.image_url}
                  alt={detailProduct.name}
                  className="max-h-[300px] sm:max-h-[420px] w-full object-contain rounded-2xl drop-shadow-md transition-all hover:scale-102"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 p-8">
                  <Store className="w-20 h-20 stroke-[1.2] mb-2" />
                  <span className="text-xs font-semibold text-slate-400">Sin foto disponible</span>
                </div>
              )}

              {/* Badges sobre la foto */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {detailProduct.brand && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-white/95 text-slate-800 shadow-xs uppercase tracking-wider backdrop-blur">
                    {detailProduct.brand}
                  </span>
                )}
                {detailProduct.category && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900/85 text-white shadow-xs backdrop-blur">
                    {detailProduct.category}
                  </span>
                )}
              </div>

              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xs">
                  Stock: {detailProduct.total_stock} pares
                </span>
              </div>
            </div>

            {/* Columna Derecha: Información completa y compra */}
            <div className="sm:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                {/* Categoría / Género / Color */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {detailProduct.gender && <span>{detailProduct.gender}</span>}
                  {detailProduct.gender && detailProduct.color && <span>•</span>}
                  {detailProduct.color && <span>Color: {detailProduct.color}</span>}
                  {detailProduct.sku && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-400">SKU: {detailProduct.sku}</span>
                    </>
                  )}
                </div>

                {/* Nombre del modelo */}
                <div>
                  <DialogTitle className="text-2xl font-black text-slate-900 leading-tight">
                    {detailProduct.name}
                  </DialogTitle>
                  {detailProduct.description && (
                    <DialogDescription className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {detailProduct.description}
                    </DialogDescription>
                  )}
                </div>

                {/* Bloque de precios */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight text-slate-900">
                      {money(isMayorista ? detailProduct.wholesale_price : detailProduct.retail_price)}
                    </span>
                    <Badge className="bg-indigo-600 text-white font-bold text-xs uppercase px-2 py-0.5">
                      {isMayorista ? "Precio Mayorista" : "Precio Minorista"}
                    </Badge>
                  </div>
                  {isMayorista ? (
                    detailProduct.retail_price > 0 && (
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Precio sugerido de reventa al público: <strong>{money(detailProduct.retail_price)}</strong>
                      </p>
                    )
                  ) : (
                    detailProduct.wholesale_price > 0 && (
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Precio mayorista por bulto/curva: <strong>{money(detailProduct.wholesale_price)}</strong> (mín. {minQty} pares)
                      </p>
                    )
                  )}
                </div>

                {/* Selección de talle */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Elegí tu talle:</span>
                    <span className="text-slate-500">
                      {selectedDetailSize ? `Talle ${selectedDetailSize} seleccionado` : "Seleccioná un talle"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(detailProduct.variants || []).map((v) => {
                      const hasStock = v.stock > 0;
                      const isSelected = selectedDetailSize === v.size;
                      return (
                        <button
                          key={v.size}
                          type="button"
                          disabled={!hasStock}
                          onClick={() => {
                            setSelectedDetailSize(v.size);
                            setDetailWholesaleQty(1);
                          }}
                          className={`min-w-12 h-10 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? isMayorista
                                ? "bg-amber-600 text-white border-amber-600 shadow-sm scale-105"
                                : "bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105"
                              : hasStock
                              ? "bg-white hover:border-indigo-400 text-slate-800 border-slate-200 hover:bg-slate-50"
                              : "bg-slate-100 text-slate-400 border-transparent cursor-not-allowed opacity-40 line-through"
                          }`}
                        >
                          <span>{v.size}</span>
                          <span className="text-[9px] font-normal opacity-80">
                            {hasStock ? `${v.stock} disp.` : "Agotado"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cantidad para el talle seleccionado (permite pedir varias unidades si hay stock) */}
                {detailVariantStock > 1 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">
                        Cantidad de pares {selectedDetailSize ? `(Talle ${selectedDetailSize})` : ""}:
                      </span>
                      <span className="text-slate-500">
                        Disp: <strong>{detailVariantStock}</strong> pares
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => setDetailWholesaleQty((prev) => Math.max(1, prev - 1))}
                          disabled={detailWholesaleQty <= 1}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={detailVariantStock}
                          value={detailWholesaleQty}
                          onChange={(e) =>
                            setDetailWholesaleQty(
                              Math.max(1, Math.min(detailVariantStock, Number(e.target.value) || 1))
                            )
                          }
                          className="w-16 text-center font-bold text-base bg-transparent outline-none text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setDetailWholesaleQty((prev) => Math.min(detailVariantStock, prev + 1))
                          }
                          disabled={detailWholesaleQty >= detailVariantStock}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs text-slate-500">
                        Subtotal: <strong>{money((isMayorista ? detailProduct.wholesale_price : detailProduct.retail_price) * detailWholesaleQty)}</strong>
                      </span>
                    </div>

                    {isMayorista && detailVariantStock >= 6 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-500 font-medium mr-1">Rápidos:</span>
                        <button
                          type="button"
                          onClick={() => setDetailWholesaleQty(1)}
                          className={`px-2 py-0.5 rounded-md border text-xs font-semibold transition ${detailWholesaleQty === 1 ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                        >
                          1 par
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailWholesaleQty(6)}
                          className={`px-2 py-0.5 rounded-md border text-xs font-semibold transition ${detailWholesaleQty === 6 ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                        >
                          6 pares
                        </button>
                        {detailVariantStock >= 12 && (
                          <button
                            type="button"
                            onClick={() => setDetailWholesaleQty(12)}
                            className={`px-2 py-0.5 rounded-md border text-xs font-semibold transition ${detailWholesaleQty === 12 ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                          >
                            12 pares (Mínimo)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDetailWholesaleQty(detailVariantStock)}
                          className={`px-2 py-0.5 rounded-md border text-xs font-semibold transition ${detailWholesaleQty === detailVariantStock ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
                        >
                          Todo ({detailVariantStock})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botones de acción al pie del modal */}
              <div className="pt-6 space-y-2.5 border-t border-slate-100 mt-6">
                <Button
                  onClick={() => {
                    handleAddToCart(detailProduct, selectedDetailSize, detailWholesaleQty);
                    setModalAddedAnimation(true);
                    setTimeout(() => setModalAddedAnimation(false), 1500);
                  }}
                  disabled={
                    detailProduct.total_stock <= 0 ||
                    !selectedDetailSize ||
                    detailVariantStock <= 0
                  }
                  className={`w-full h-12 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                    modalAddedAnimation
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : isMayorista
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {modalAddedAnimation ? (
                    <>
                      <Check className="w-4 h-4" />
                      ¡Agregado al pedido!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Agregar al pedido (Talle {selectedDetailSize}{detailWholesaleQty > 1 ? ` • ${detailWholesaleQty} pares` : ""})
                    </>
                  )}
                </Button>

                {storePhone && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const textMsg = encodeURIComponent(
                        isMayorista
                          ? `Hola ${businessName}! Quisiera consultar por el calzado *${detailProduct.name}* ${
                              detailProduct.brand ? `(${detailProduct.brand})` : ""
                            } - Modalidad Mayorista - Talle: ${selectedDetailSize || "a consultar"}${
                              detailWholesaleQty > 1 ? ` (${detailWholesaleQty} pares)` : ""
                            }. ¿Tienen disponibilidad?`
                          : `Hola ${businessName}! Quisiera consultar por el calzado *${detailProduct.name}* ${
                              detailProduct.brand ? `(${detailProduct.brand})` : ""
                            } - Talle: ${selectedDetailSize || "a consultar"}. ¿Tienen stock?`
                      );
                      window.open(`https://wa.me/${storePhone}?text=${textMsg}`, "_blank");
                    }}
                    className="w-full h-10 rounded-xl text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    Consultar por WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Customer Data & WhatsApp Order Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Finalizar pedido por WhatsApp
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Completá tus datos de contacto para armar el mensaje formal y enviarlo al vendedor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2">
            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre y Apellido <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ej. Martín Pérez"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono / WhatsApp de contacto <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ej. 11 4455 6677"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modalidad de entrega
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType("pickup")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    deliveryType === "pickup"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Store className="w-4 h-4" />
                  Retiro en local
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("delivery")}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    deliveryType === "delivery"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  Envío a acordar
                </button>
              </div>
            </div>

            {deliveryType === "delivery" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección o localidad de entrega <span className="text-rose-500">*</span>
                </label>
                <Input
                  placeholder="Calle, número, localidad o transporte"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="h-10 text-sm rounded-xl"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aclaraciones u observaciones (opcional)
              </label>
              <Textarea
                placeholder="Indica cualquier detalle adicional sobre colores, horarios o transporte..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="text-xs rounded-xl h-18 resize-none"
              />
            </div>

            {/* Quick summary recap */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
              <span>
                Total: <strong>{totalCartPairs} pares</strong>
              </span>
              <span className="text-sm font-black text-slate-900">{money(totalCartAmount)}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="rounded-xl">
              Volver
            </Button>
            <Button
              onClick={handleConfirmAndSendWhatsapp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md"
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Enviar a WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">{businessName}</p>
          <p>
            {isMayorista ? "Catálogo y pedidos de venta mayorista" : "Catálogo y pedidos de venta minorista"}
          </p>
          <p className="text-slate-400 text-[11px] pt-2">
            Desarrollado con Sistema de Gestión de Zapatería
          </p>
        </div>
      </footer>
    </div>
  );
}
