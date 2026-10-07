"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ShoppingBag, Search, Sparkles, Filter, X, Plus, Minus, Trash2,
  CheckCircle2, AlertCircle, MessageCircle, MapPin, Truck, Store,
  ChevronRight, Phone, ShieldCheck, Tag, ArrowLeft, Send, Eye, Check, Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { formatMoney } from "@/lib/currency";
import {
  createStoreOrder,
  subscribeOrder,
  type StoreOrder,
  type OrderStatus,
} from "@/lib/store-service";

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
  const wholesaleMinQty = rawMinQty && rawMinQty > 1 && rawMinQty !== 6 ? rawMinQty : 1;
  const minQty = 1;
  const wholesaleTerms = settings?.wholesale_terms || "Precios mayoristas directos sin mínimo de compra.";

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
  const [detailQty, setDetailQty] = useState<number>(1);
  const [modalAddedAnimation, setModalAddedAnimation] = useState(false);

  useEffect(() => {
    if (detailProduct) {
      setDetailQty(1);
      setModalAddedAnimation(false);
    }
  }, [detailProduct]);

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

  // Estados de pedido directo y tracking en tiempo real para el cliente
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeTrackOrder, setActiveTrackOrder] = useState<StoreOrder | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [lastStoredOrderId, setLastStoredOrderId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`cr_order_${storeUid}`) || localStorage.getItem("cr_last_order_id") || "";
      if (saved) setLastStoredOrderId(saved);
    }
  }, [storeUid]);

  // Listener en tiempo real del estado del pedido
  useEffect(() => {
    const orderIdToTrack = activeTrackOrder?.id || (isTrackingModalOpen ? lastStoredOrderId : "");
    if (!orderIdToTrack || !storeUid) return;

    const unsub = subscribeOrder(
      storeUid,
      orderIdToTrack,
      (orderLive) => {
        if (orderLive) {
          setActiveTrackOrder(orderLive);
        }
      },
      (err) => console.error("Error siguiendo pedido en vivo:", err)
    );
    return () => unsub();
  }, [activeTrackOrder?.id, isTrackingModalOpen, lastStoredOrderId, storeUid]);

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

  const meetsWholesaleMinimum = totalCartPairs >= 1;

  // Add to cart helper (minorista por unidad o mayorista por pack/volumen)
  const handleAddToCart = (product: Product, overrideQty?: number) => {
    const maxStock = Number(product.total_stock || 0);

    if (maxStock < 1) {
      alert("Este producto no cuenta con stock disponible actualmente.");
      return;
    }

    const defaultInitialQty = 1;
    const qtyToAdd = overrideQty !== undefined && overrideQty >= 1
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
            if (nextQty < 1) {
              alert(`La cantidad mínima es 1 unidad. Para remover el producto utilizá el botón de eliminar.`);
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

  // Registrar pedido directo en la base de datos (Panel Admin)
  const handleConfirmOrderDirectly = async () => {
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

    if (totalCartPairs < 1) {
      setFormError("Por favor agrega al menos un producto a tu pedido.");
      return;
    }

    setFormError("");
    setIsSubmittingOrder(true);

    try {
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        brand: item.brand || "",
        size: item.size || "",
        qty: item.qty,
        price: item.price,
        subtotal: item.qty * item.price,
        imageUrl: item.imageUrl || "",
      }));

      const newOrder = await createStoreOrder(storeUid, {
        channel: isMayorista ? "mayorista" : "minorista",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        deliveryType,
        customerNotes: customerNotes.trim(),
        items: orderItems,
        totalUnits: totalCartPairs,
        totalAmount: totalCartAmount,
        currency,
      });

      // Guardar en almacenamiento local para seguimiento
      if (typeof window !== "undefined") {
        localStorage.setItem(`cr_order_${storeUid}`, newOrder.id);
        localStorage.setItem("cr_last_order_id", newOrder.id);
      }
      setLastStoredOrderId(newOrder.id);
      setActiveTrackOrder(newOrder);

      // Limpiar carrito y cerrar checkout
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setIsTrackingModalOpen(true);
    } catch (err: any) {
      console.error("Error al registrar pedido:", err);
      setFormError(err.message || "Ocurrió un error al procesar el pedido. Por favor intentá nuevamente.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Enviar copia informativa a WhatsApp (opcional para el cliente)
  const handleSendCopyWhatsApp = (order: StoreOrder) => {
    let message = `📦 *PEDIDO REGISTRADO: ${order.orderNumber}*\n`;
    message += `👤 *Cliente:* ${order.customerName}\n`;
    message += `📱 *Teléfono:* ${order.customerPhone}\n`;
    message += `📍 *Modalidad:* ${order.deliveryType === "pickup" ? "Retiro en local" : `Envío a domicilio (${order.customerAddress})`}\n`;
    if (order.customerNotes) {
      message += `📝 *Nota:* ${order.customerNotes}\n`;
    }
    message += `\n🛍️ *Resumen:* ${order.totalUnits} unidades • *Total: ${money(order.totalAmount)}*\n\n`;
    message += `_Hola! Ya confirmé mi pedido en su web y les escribo para coordinar pago o entrega._`;

    const waUrl = storePhone
      ? `https://wa.me/${storePhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");
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
            <strong>Catálogo Mayorista:</strong> Precios mayoristas directos sin mínimo de compra. {wholesaleTerms}
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

            {(lastStoredOrderId || activeTrackOrder) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTrackingModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 font-bold rounded-xl h-10 px-3 text-xs"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Mi Pedido</span>
              </Button>
            )}

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
              ? "Venta mayorista sin mínimo de compra requerido"
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

              const currentQty = cardQtys[p.id] || 1;
              const hasMinStock = Number(p.total_stock || 0) >= 1;

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
                              <>Precio por mayor: <strong>{money(secondaryPrice)}</strong></>
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
                              {isMayorista ? "Precio mayorista directo" : "Compra individual (unidad)"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {isMayorista ? "Sin mínimo" : "Desde 1 u."}
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
                                    [p.id]: Math.max(1, (prev[p.id] || 1) - 1),
                                  }))
                                }
                                disabled={currentQty <= 1}
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
                                    [p.id]: Math.min(p.total_stock, (prev[p.id] || 1) + 1),
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
                        <>Sin stock disponible</>
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

            {/* Wholesale or retail cart badge */}
            {isMayorista ? (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Precios mayoristas (sin mínimo de compra)
                </span>
                <span className="font-bold text-amber-800">{totalCartPairs} {totalCartPairs === 1 ? "unidad" : "unidades"}</span>
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
                      disabled={item.qty <= 1}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      title="Mínimo 1 unidad"
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
                      <>Compra mayorista: <strong>sin mínimo</strong></>
                    ) : (
                      <>Venta individual: <strong>desde 1 unidad</strong></>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setDetailQty((prev) => Math.max(1, prev - 1))}
                      disabled={detailQty <= 1}
                      className="size-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={detailProduct.total_stock}
                      value={detailQty}
                      onChange={(e) =>
                        setDetailQty(
                          Math.max(1, Math.min(detailProduct.total_stock, Number(e.target.value) || 1))
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

                {detailProduct.total_stock > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium mr-1">Rápidos:</span>
                    {[1, 2, 3, 6, 12].filter((q) => q <= detailProduct.total_stock).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setDetailQty(q)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                          detailQty === q
                            ? isMayorista
                              ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                              : "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {q} {q === 1 ? "unidad" : "unidades"}
                      </button>
                    ))}
                  </div>
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
                  disabled={detailProduct.total_stock < 1}
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
                  ) : detailProduct.total_stock < 1 ? (
                    <>Sin stock disponible</>
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

      {/* Customer Data & Direct Order Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${isMayorista ? "bg-amber-600" : "bg-indigo-600"}`}>
                <Store className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Confirmar pedido
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Completá tus datos de contacto y entrega. El pedido se enviará directamente al panel de administración para su preparación.
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
                Teléfono de contacto <span className="text-rose-500">*</span>
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
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
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
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
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
            <Button
              variant="outline"
              disabled={isSubmittingOrder}
              onClick={() => setIsCheckoutOpen(false)}
              className="rounded-xl"
            >
              Volver
            </Button>
            <Button
              disabled={isSubmittingOrder}
              onClick={handleConfirmOrderDirectly}
              className={`font-bold rounded-xl shadow-md text-white ${
                isMayorista
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isSubmittingOrder ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando pedido...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Pedido
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Seguimiento en Tiempo Real para el Cliente */}
      <Dialog open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-slate-900">
                    {activeTrackOrder ? `Pedido ${activeTrackOrder.orderNumber}` : "Seguimiento de Pedido"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Sincronización en vivo con la tienda
                  </DialogDescription>
                </div>
              </div>
              {activeTrackOrder && (
                <Badge
                  className={`text-xs font-bold uppercase tracking-wider ${
                    activeTrackOrder.status === "pendiente"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : activeTrackOrder.status === "confirmado"
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : activeTrackOrder.status === "en_preparacion"
                      ? "bg-purple-100 text-purple-800 border-purple-300"
                      : activeTrackOrder.status === "listo"
                      ? "bg-teal-100 text-teal-800 border-teal-300"
                      : activeTrackOrder.status === "entregado"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-rose-100 text-rose-800 border-rose-300"
                  }`}
                >
                  {activeTrackOrder.status === "pendiente"
                    ? "🟡 Pendiente"
                    : activeTrackOrder.status === "confirmado"
                    ? "🔵 Confirmado"
                    : activeTrackOrder.status === "en_preparacion"
                    ? "🟣 En preparación"
                    : activeTrackOrder.status === "listo"
                    ? "🟢 Listo para entrega"
                    : activeTrackOrder.status === "entregado"
                    ? "✅ Entregado"
                    : "🔴 Cancelado"}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {activeTrackOrder ? (
            <div className="space-y-4 my-2 text-xs">
              {/* Barra de progreso interactiva en vivo */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-3">
                  Progreso de tu pedido en tiempo real:
                </p>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                  {/* Paso 1: Recibido */}
                  <div className="flex flex-col items-center">
                    <div className="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold mb-1 shadow-xs">
                      ✓
                    </div>
                    <span className="text-slate-800">Recibido</span>
                  </div>

                  {/* Paso 2: Confirmado */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center font-bold mb-1 shadow-xs transition-colors ${
                        ["confirmado", "en_preparacion", "listo", "entregado"].includes(
                          activeTrackOrder.status
                        )
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {["confirmado", "en_preparacion", "listo", "entregado"].includes(
                        activeTrackOrder.status
                      )
                        ? "✓"
                        : "2"}
                    </div>
                    <span
                      className={
                        ["confirmado", "en_preparacion", "listo", "entregado"].includes(
                          activeTrackOrder.status
                        )
                          ? "text-blue-700 font-bold"
                          : "text-slate-400"
                      }
                    >
                      Confirmado
                    </span>
                  </div>

                  {/* Paso 3: En preparación */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center font-bold mb-1 shadow-xs transition-colors ${
                        ["en_preparacion", "listo", "entregado"].includes(
                          activeTrackOrder.status
                        )
                          ? "bg-purple-600 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {["en_preparacion", "listo", "entregado"].includes(
                        activeTrackOrder.status
                      )
                        ? "✓"
                        : "3"}
                    </div>
                    <span
                      className={
                        ["en_preparacion", "listo", "entregado"].includes(
                          activeTrackOrder.status
                        )
                          ? "text-purple-700 font-bold"
                          : "text-slate-400"
                      }
                    >
                      Preparando
                    </span>
                  </div>

                  {/* Paso 4: Listo / Entregado */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center font-bold mb-1 shadow-xs transition-colors ${
                        ["listo", "entregado"].includes(activeTrackOrder.status)
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {activeTrackOrder.status === "entregado" ? "✓" : "4"}
                    </div>
                    <span
                      className={
                        ["listo", "entregado"].includes(activeTrackOrder.status)
                          ? "text-emerald-700 font-bold"
                          : "text-slate-400"
                      }
                    >
                      {activeTrackOrder.status === "entregado" ? "Entregado" : "Listo"}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-center text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                  {activeTrackOrder.status === "pendiente" &&
                    "Tu pedido ya ingresó a nuestro sistema. El vendedor lo confirmará a la brevedad."}
                  {activeTrackOrder.status === "confirmado" &&
                    "¡Tu pedido ha sido confirmado por la tienda! En breve iniciaremos el empaque."}
                  {activeTrackOrder.status === "en_preparacion" &&
                    "Estamos empaquetando tus productos en el depósito / sucursal."}
                  {activeTrackOrder.status === "listo" &&
                    (activeTrackOrder.deliveryType === "pickup"
                      ? "¡Tu pedido está listo para ser retirado en el local!"
                      : "¡Tu pedido está listo y despachado para la entrega!")}
                  {activeTrackOrder.status === "entregado" &&
                    "¡Pedido completado y entregado! Muchas gracias por tu compra."}
                  {activeTrackOrder.status === "cancelado" &&
                    "Este pedido fue cancelado. Consultanos para más información."}
                </div>
              </div>

              {/* Detalle de articulos del pedido */}
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Resumen de lo solicitado ({activeTrackOrder.totalUnits} un.):
                </p>
                <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto pr-1">
                  {activeTrackOrder.items.map((item, idx) => (
                    <div key={idx} className="py-1.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800">x{item.qty}</span>{" "}
                        <span className="text-slate-700">{item.name}</span>
                        {item.size && (
                          <span className="ml-1 text-[10px] text-slate-500 bg-slate-100 px-1 rounded">
                            Talle {item.size}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-slate-900">{money(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
                  <span>Total general:</span>
                  <span>{money(activeTrackOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Botón opcional de contacto vía WhatsApp */}
              <div className="pt-1">
                <Button
                  onClick={() => handleSendCopyWhatsApp(activeTrackOrder)}
                  variant="outline"
                  className="w-full h-10 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl gap-2 text-xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  Enviar copia o consultar por WhatsApp
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              No hay un pedido activo seleccionado.
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setIsTrackingModalOpen(false)}
              className="w-full rounded-xl bg-slate-900 text-white font-bold"
            >
              Cerrar y seguir navegando
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
