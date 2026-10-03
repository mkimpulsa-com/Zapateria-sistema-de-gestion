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

import { formatMoney } from "@/lib/currency";

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
  currency?: string;
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
  channel?: "mayorista" | "minorista";
  storeUid: string;
}

export function PublicStore({ settings, products, channel = "minorista", storeUid }: PublicStoreProps) {
  const [activeChannel, setActiveChannel] = useState<"mayorista" | "minorista">(channel || "minorista");
  const isMayorista = activeChannel === "mayorista";

  useEffect(() => {
    if (channel) {
      setActiveChannel(channel);
    }
  }, [channel]);

  const currency = settings?.currency || "BRL";
  const money = (val: number) => formatMoney(val, currency);

  const businessName = settings?.business_name || (isMayorista ? "CR MAYORISTA" : "CR CALZADOS");
  const branchName = settings?.branch_name || "";
  const rawWhatsapp = settings?.whatsapp || settings?.phone || "";
  const rawMinQty = Number(settings?.wholesale_min_qty);
  const wholesaleMinQty = rawMinQty && rawMinQty !== 6 ? rawMinQty : 12;
  const minQty = isMayorista ? wholesaleMinQty : 1;
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

  // Selected quantities per product card (productId -> number)
  const [cardQtys, setCardQtys] = useState<Record<string, number>>({});
  const [addedAnimation, setAddedAnimation] = useState<string | null>(null);

  // Modal de vista completa del producto
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState<number>(isMayorista ? wholesaleMinQty : 1);
  const [modalAddedAnimation, setModalAddedAnimation] = useState(false);

  useEffect(() => {
    if (detailProduct) {
      setDetailQty(isMayorista ? wholesaleMinQty : 1);
      setModalAddedAnimation(false);
    }
  }, [detailProduct, isMayorista, wholesaleMinQty]);

  // Channel switch handler that preserves cart and recalculates prices
  const handleSwitchChannel = (newChannel: "minorista" | "mayorista") => {
    if (newChannel === activeChannel) return;
    setActiveChannel(newChannel);
    setCart((prev) =>
      prev.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return item;
        const newPrice = newChannel === "mayorista"
          ? Number(prod.wholesale_price || 0)
          : Number(prod.retail_price || prod.wholesale_price || 0);
        return {
          ...item,
          price: newPrice,
          size: newChannel === "mayorista" ? "Surtido / Pack mayorista" : "Venta individual",
        };
      })
    );
  };

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");

  // Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [formError, setFormError] = useState("");

  // Calculate distinct categories, genders for filters
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

      return true;
    });
  }, [products, search, selectedCategory, selectedGender]);

  // Cart calculations
  const totalCartPairs = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const totalCartAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  }, [cart]);

  const meetsWholesaleMinimum = !isMayorista || totalCartPairs >= minQty;

  // Add to cart helper (minorista por unidad o mayorista por pack/volumen)
  const handleAddToCart = (product: Product, overrideQty?: number) => {
    const maxStock = Number(product.total_stock || 0);

    if (maxStock < 1) {
      alert("Este producto no cuenta con stock disponible actualmente.");
      return;
    }

    if (isMayorista && maxStock < minQty) {
      alert(`Este producto no cuenta con la cantidad requerida para el mínimo mayorista (${minQty} unidades).`);
      return;
    }

    const defaultInitialQty = isMayorista ? minQty : 1;
    const qtyToAdd = overrideQty !== undefined && overrideQty >= (isMayorista ? minQty : 1)
      ? overrideQty
      : (cardQtys[product.id] || defaultInitialQty);

    if (qtyToAdd > maxStock) {
      alert(`No es posible agregar esa cantidad por disponibilidad de stock.`);
      return;
    }

    const price = isMayorista
      ? Number(product.wholesale_price || 0)
      : Number(product.retail_price || product.wholesale_price || 0);
    const cartItemId = product.id;

    setCart((prev) => {
      const existing = prev.find((i) => i.id === cartItemId);
      if (existing) {
        const nextQty = existing.qty + qtyToAdd;
        if (nextQty > maxStock) {
          alert(
            `Alcanzaste el límite de unidades disponibles para este producto. Ya tenés ${existing.qty} en el pedido.`
          );
          return prev;
        }
        return prev.map((i) => (i.id === cartItemId ? { ...i, qty: nextQty, price } : i));
      }
      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          name: product.name,
          brand: product.brand || "",
          size: isMayorista ? "Surtido / Pack mayorista" : "Venta individual",
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
            const itemMin = isMayorista ? minQty : 1;
            if (nextQty < itemMin) {
              if (isMayorista) {
                alert(`La compra mayorista es a partir de ${minQty} unidades por producto. Para remover el producto utilizá el botón de eliminar.`);
              } else {
                alert(`La cantidad mínima es 1 unidad. Para remover el calzado utilizá el botón de eliminar.`);
              }
              return item;
            }
            if (nextQty > item.maxStock) {
              alert(`Alcanzaste las unidades disponibles para este producto.`);
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
      setFormError(`El pedido mayorista requiere un mínimo de ${minQty} unidades.`);
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

    let message = `📦 *NUEVO PEDIDO - ${isMayorista ? "VENTA MAYORISTA" : "MINORISTA"}*\n`;
    message += `📅 *Fecha:* ${nowStr}\n`;
    message += `👤 *Cliente:* ${customerName.trim()}\n`;
    message += `📱 *Teléfono:* ${customerPhone.trim()}\n`;
    message += `📍 *Entrega:* ${deliveryType === "pickup" ? "Retiro en local / depósito" : `Envío a domicilio (${customerAddress.trim()})`}\n`;
    if (customerNotes.trim()) {
      message += `📝 *Nota:* ${customerNotes.trim()}\n`;
    }
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🛍️ *DETALLE DE PRODUCTOS:*\n`;

    cart.forEach((item, idx) => {
      const itemSubtotal = item.qty * item.price;
      message += `\n${idx + 1}. *${item.name}* ${item.brand ? `(${item.brand})` : ""}\n`;
      if (item.size) {
        message += `   • Variante / Detalle: *${item.size}*\n`;
      }
      message += `   • Cantidad: *${item.qty}* unidad${item.qty > 1 ? "es" : ""} x ${money(item.price)}\n`;
      message += `   • Subtotal: *${money(itemSubtotal)}*\n`;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📦 *TOTAL DE UNIDADES:* ${totalCartPairs}\n`;
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
            <strong>Catálogo Mayorista:</strong> Compra mínima de <strong>{minQty} unidades</strong>. {wholesaleTerms}
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

          {/* Channel Selector Toggle & Cart Trigger */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSwitchChannel("minorista")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  !isMayorista
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Ver catálogo con precios minoristas por unidad"
              >
                <span>Minorista</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchChannel("mayorista")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  isMayorista
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title={`Ver catálogo con precios mayoristas (mín. ${wholesaleMinQty} unidades)`}
              >
                <span>Mayorista</span>
              </button>
            </div>

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
                placeholder="Buscar por producto, marca, modelo o código..."
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
            Mostrando <strong>{filteredProducts.length}</strong> modelos disponibles
          </span>
          <span className={`font-semibold hidden sm:inline ${isMayorista ? "text-amber-700" : "text-indigo-700"}`}>
            {isMayorista
              ? `Venta mayorista a partir de ${minQty} unidades por modelo`
              : "Venta minorista por unidad (sin mínimo)"}
          </span>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No se encontraron productos</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Intenta cambiar los filtros de búsqueda o categoría para ver otros productos disponibles.
            </p>
            {(search || selectedCategory !== "all" || selectedGender !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setSelectedGender("all");
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
              const displayPrice = isMayorista ? p.wholesale_price : (p.retail_price || p.wholesale_price);
              const secondaryPrice = isMayorista ? p.retail_price : p.wholesale_price;

              const isJustAdded = addedAnimation === p.id;
              const inCartCount = cart
                .filter((i) => i.productId === p.id)
                .reduce((sum, i) => sum + i.qty, 0);

              const currentQty = cardQtys[p.id] || (isMayorista ? minQty : 1);
              const hasMinStock = isMayorista ? Number(p.total_stock || 0) >= minQty : Number(p.total_stock || 0) >= 1;

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
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white shadow-xs flex items-center gap-1.5 backdrop-blur">
                        <span className="size-1.5 rounded-full bg-white animate-pulse" />
                        Disponible
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
                        className={`font-bold text-slate-900 text-base leading-snug line-clamp-1 transition-colors cursor-pointer ${
                          isMayorista ? "group-hover:text-amber-600" : "group-hover:text-indigo-600"
                        }`}
                        title="Ver detalles del producto"
                      >
                        {p.name}
                      </h3>

                      {/* Pricing block */}
                      <div className="mt-2.5 mb-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black tracking-tight text-slate-900">
                            {money(displayPrice)}
                          </span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            isMayorista
                              ? "text-amber-700 bg-amber-50 border-amber-200"
                              : "text-indigo-700 bg-indigo-50 border-indigo-200"
                          }`}>
                            {isMayorista ? "Mayorista" : "Minorista"}
                          </span>
                        </div>
                        {secondaryPrice > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {isMayorista ? (
                              <>Sugerido venta minorista: <strong>{money(secondaryPrice)}</strong></>
                            ) : (
                              <>Precio por mayor: <strong>{money(secondaryPrice)}</strong> (mín. {wholesaleMinQty} u.)</>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Pack details & quantity selector */}
                      <div className="space-y-2 mb-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                          <div className="flex items-center justify-between text-xs text-slate-700">
                            <span className="font-semibold flex items-center gap-1">
                              <Sparkles className={`w-3.5 h-3.5 ${isMayorista ? "text-amber-600" : "text-indigo-600"}`} />
                              {isMayorista ? "Surtido / Pack mayorista" : "Compra individual (unidad)"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {isMayorista ? `Mín. ${minQty} u.` : "Desde 1 u."}
                            </span>
                          </div>

                          {/* Selector de cantidad */}
                          <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                            <span className="text-xs text-slate-600">Unidades a ordenar:</span>
                            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() =>
                                  setCardQtys((prev) => ({
                                    ...prev,
                                    [p.id]: Math.max(isMayorista ? minQty : 1, (prev[p.id] || (isMayorista ? minQty : 1)) - 1),
                                  }))
                                }
                                disabled={currentQty <= (isMayorista ? minQty : 1)}
                                className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-black text-slate-900">
                                {currentQty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCardQtys((prev) => ({
                                    ...prev,
                                    [p.id]: Math.min(p.total_stock, (prev[p.id] || (isMayorista ? minQty : 1)) + 1),
                                  }))
                                }
                                disabled={currentQty >= p.total_stock}
                                className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {inCartCount > 0 && (
                          <div className={`flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1 ${
                            isMayorista
                              ? "text-amber-800 bg-amber-50 border border-amber-200/70"
                              : "text-indigo-800 bg-indigo-50 border border-indigo-200/70"
                          }`}>
                            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              En tu pedido: <strong>{inCartCount}</strong> {inCartCount === 1 ? "unidad" : "unidades"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add to order button */}
                    <Button
                      type="button"
                      disabled={!hasMinStock}
                      onClick={() => handleAddToCart(p, currentQty)}
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
                          ¡Agregado al pedido!
                        </>
                      ) : !hasMinStock ? (
                        <>{isMayorista ? `Stock insuficiente (mín. ${minQty} u.)` : "Sin stock disponible"}</>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1.5" />
                          Agregar {currentQty} {currentQty === 1 ? "unidad" : "unidades"} ({money(displayPrice * currentQty)})
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
              <span>Ver Pedido ({totalCartPairs} u.)</span>
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
            <SheetDescription className="text-xs text-slate-500">
              Revisá tus productos seleccionados antes de enviar por WhatsApp
            </SheetDescription>

            {/* Wholesale minimum reminder or retail info */}
            {isMayorista ? (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-1.5">
                  <span>Mínimo mayorista: {minQty} unidades</span>
                  <span>{totalCartPairs} / {minQty} unidades</span>
                </div>
                <Progress
                  value={Math.min(100, (totalCartPairs / minQty) * 100)}
                  className="h-2 bg-amber-200"
                />
                {!meetsWholesaleMinimum ? (
                  <p className="text-[11px] text-amber-800 mt-1.5 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Te faltan {minQty - totalCartPairs} unidades para alcanzar el mínimo mayorista.
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-700 mt-1.5 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ¡Mínimo mayorista alcanzado! Podés finalizar tu pedido.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Pedido minorista por unidad
                </span>
                <span className="font-bold text-indigo-700">{totalCartPairs} {totalCartPairs === 1 ? "unidad" : "unidades"}</span>
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
                    <p className={`text-[11px] font-semibold ${isMayorista ? "text-amber-700" : "text-indigo-700"}`}>
                      {item.size || (isMayorista ? "Surtido / Pack mayorista" : "Venta individual")}
                    </p>
                    <p className="text-xs font-black text-slate-900 mt-0.5">
                      {money(item.price)} <span className="text-[10px] font-normal text-slate-400">c/u</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateCartQty(item.id, -1)}
                      disabled={item.qty <= (isMayorista ? minQty : 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      title={isMayorista ? `Mínimo ${minQty} unidades por producto` : "Mínimo 1 unidad"}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-black text-slate-900">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 flex items-center justify-center ml-1"
                      title="Quitar modelo del pedido"
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
                  <span>Total unidades:</span>
                  <span className="font-bold text-slate-900">{totalCartPairs} unidades</span>
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

      {/* Modal de Detalle de Producto con Foto Arriba e Información Prolija Abajo */}
      <Dialog open={Boolean(detailProduct)} onOpenChange={(open) => !open && setDetailProduct(null)}>
        {detailProduct && (
          <DialogContent className="max-w-xl w-full bg-white rounded-3xl p-0 overflow-hidden border-0 shadow-2xl max-h-[92vh] flex flex-col">
            {/* PARTE SUPERIOR: Foto Completa */}
            <div className="relative w-full bg-gradient-to-b from-slate-100/90 via-slate-50 to-white flex items-center justify-center p-4 sm:p-6 border-b border-slate-100 h-64 sm:h-72 shrink-0">
              {detailProduct.image_url ? (
                <img
                  src={detailProduct.image_url}
                  alt={detailProduct.name}
                  className="max-h-full max-w-full object-contain rounded-2xl drop-shadow-md transition-all hover:scale-105 duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 p-8">
                  <Store className="w-16 h-16 stroke-[1.2] mb-2" />
                  <span className="text-xs font-semibold text-slate-400">Sin foto disponible</span>
                </div>
              )}

              {/* Badges sobre la foto */}
              <div className="absolute top-3.5 left-3.5 flex flex-wrap items-center gap-1.5 pointer-events-none">
                {detailProduct.category && (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-900/90 text-white shadow-xs backdrop-blur">
                    {detailProduct.category}
                  </span>
                )}
                {detailProduct.brand && (
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-white/95 text-slate-800 shadow-xs uppercase tracking-wider backdrop-blur border border-slate-200/60">
                    {detailProduct.brand}
                  </span>
                )}
              </div>

              <div className="absolute top-3.5 right-3.5 pointer-events-none">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-white animate-pulse" />
                  En stock
                </span>
              </div>
            </div>

            {/* PARTE INFERIOR: Información completa y compra bien prolija */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 text-slate-800">
              {/* Categoría / Género / Color / SKU */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {detailProduct.gender && detailProduct.gender !== "No aplica" && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {detailProduct.gender}
                  </span>
                )}
                {detailProduct.color && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    Color: {detailProduct.color}
                  </span>
                )}
                {detailProduct.sku && (
                  <span className="font-mono text-[11px] text-slate-400">
                    SKU: {detailProduct.sku}
                  </span>
                )}
              </div>

              {/* Título y descripción */}
              <div>
                <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  {detailProduct.name}
                </DialogTitle>
                {detailProduct.description && (
                  <DialogDescription className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {detailProduct.description}
                  </DialogDescription>
                )}
              </div>

              {/* Bloque de precios ordenado */}
              <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/70 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tight text-slate-900">
                      {money(isMayorista ? detailProduct.wholesale_price : detailProduct.retail_price)}
                    </span>
                    <Badge className="bg-orange-600 text-white font-extrabold text-xs uppercase px-2.5 py-0.5">
                      {isMayorista ? "Precio Mayorista" : "Precio Minorista"}
                    </Badge>
                  </div>
                </div>

                {isMayorista ? (
                  detailProduct.retail_price > 0 && (
                    <p className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                      Precio sugerido de reventa al público: <strong className="text-slate-800">{money(detailProduct.retail_price)}</strong>
                    </p>
                  )
                ) : (
                  detailProduct.wholesale_price > 0 && (
                    <p className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-200/60">
                      Precio mayorista por volumen: <strong className="text-slate-800">{money(detailProduct.wholesale_price)}</strong> (mín. {minQty} unidades)
                    </p>
                  )
                )}
              </div>

              {/* Variantes y opciones disponibles */}
              {detailProduct.variants && detailProduct.variants.length > 0 && !(detailProduct.variants.length === 1 && ["Único", "Unico", "General", "Estándar"].includes(detailProduct.variants[0].size)) ? (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Opciones disponibles:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      Disponibles para armado de pedido
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detailProduct.variants.map((v) => {
                      const hasStock = v.stock > 0;
                      return (
                        <div
                          key={v.size}
                          className={`min-w-12 px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                            hasStock
                              ? "bg-amber-50/70 border-amber-300/80 text-slate-800"
                              : "bg-slate-100 text-slate-400 border-transparent opacity-40 line-through"
                          }`}
                        >
                          <span>{v.size}</span>
                          {hasStock && (
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 px-3.5 py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Disponibilidad para entrega
                  </span>
                  <strong className="text-emerald-700 font-bold">En stock</strong>
                </div>
              )}

              {/* Selector de cantidad */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Unidades a ordenar:</span>
                  <span className="text-slate-500 text-[11px]">
                    {isMayorista ? (
                      <>Mínimo del pedido: <strong>{minQty} unidades</strong></>
                    ) : (
                      <>Venta individual: <strong>desde 1 unidad</strong></>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setDetailQty((prev) => Math.max(isMayorista ? minQty : 1, prev - 1))}
                      disabled={detailQty <= (isMayorista ? minQty : 1)}
                      className="size-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={isMayorista ? minQty : 1}
                      max={detailProduct.total_stock}
                      value={detailQty}
                      onChange={(e) =>
                        setDetailQty(
                          Math.max(isMayorista ? minQty : 1, Math.min(detailProduct.total_stock, Number(e.target.value) || (isMayorista ? minQty : 1)))
                        )
                      }
                      className="w-14 text-center font-black text-base bg-transparent outline-none text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setDetailQty((prev) => Math.min(detailProduct.total_stock, prev + 1))}
                      disabled={detailQty >= detailProduct.total_stock}
                      className="size-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Subtotal estimado:</span>
                    <strong className="text-lg font-black text-slate-900">
                      {money((isMayorista ? (detailProduct.wholesale_price || 0) : (detailProduct.retail_price || detailProduct.wholesale_price || 0)) * detailQty)}
                    </strong>
                  </div>
                </div>

                {isMayorista ? (
                  detailProduct.total_stock > minQty && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-500 font-medium mr-1">Rápidos:</span>
                      <button
                        type="button"
                        onClick={() => setDetailQty(minQty)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                          detailQty === minQty
                            ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {minQty} u. (Mínimo)
                      </button>
                      {detailProduct.total_stock >= minQty * 2 && (
                        <button
                          type="button"
                          onClick={() => setDetailQty(minQty * 2)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                            detailQty === minQty * 2
                              ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {minQty * 2} unidades
                        </button>
                      )}
                      {detailProduct.total_stock >= minQty * 3 && (
                        <button
                          type="button"
                          onClick={() => setDetailQty(minQty * 3)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                            detailQty === minQty * 3
                              ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {minQty * 3} unidades
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  detailProduct.total_stock > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-500 font-medium mr-1">Rápidos:</span>
                      {[1, 2, 3, 6].filter((q) => q <= detailProduct.total_stock).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setDetailQty(q)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                            detailQty === q
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {q} {q === 1 ? "unidad" : "unidades"}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Botones de acción al pie */}
              <div className="pt-3 space-y-2.5 border-t border-slate-100">
                <Button
                  onClick={() => {
                    handleAddToCart(detailProduct, detailQty);
                    setModalAddedAnimation(true);
                    setTimeout(() => setModalAddedAnimation(false), 1500);
                  }}
                  disabled={detailProduct.total_stock < (isMayorista ? minQty : 1)}
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
                  ) : detailProduct.total_stock < (isMayorista ? minQty : 1) ? (
                    <>{isMayorista ? `Stock insuficiente (mínimo ${minQty} unidades)` : "Sin stock disponible"}</>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Agregar {detailQty} {detailQty === 1 ? "unidad" : "unidades"} ({money((isMayorista ? (detailProduct.wholesale_price || 0) : (detailProduct.retail_price || detailProduct.wholesale_price || 0)) * detailQty)})
                    </>
                  )}
                </Button>

                {storePhone && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const modeLabel = isMayorista ? `Mayorista (${detailQty} unidades)` : `Minorista (${detailQty} unidad${detailQty > 1 ? "es" : ""})`;
                      const textMsg = encodeURIComponent(
                        `Hola ${businessName}! Quisiera consultar por el producto *${detailProduct.name}* ${
                          detailProduct.brand ? `(${detailProduct.brand})` : ""
                        } - Pedido ${modeLabel}. ¿Tienen disponibilidad?`
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
                Total: <strong>{totalCartPairs} unidades</strong>
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
            Desarrollado con Sistema de Gestión Mayorista
          </p>
        </div>
      </footer>
    </div>
  );
}
