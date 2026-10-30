"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ClipboardList, Search, Clock, CheckCircle2, Package, Truck,
  XCircle, ArrowRight, MessageCircle, Printer, Store, User, Phone,
  MapPin, AlertCircle, ShoppingBag, Trash2, Check, Sparkles, Filter,
  Layers, RefreshCw, Bell, BellRing, Volume2, VolumeX, Eye, Image as ImageIcon,
  Download, FileText, Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  playOrderAlertSound,
  requestOrderNotificationPermission,
  getNotificationPermissionStatus,
  isSoundAlertEnabled,
  setSoundAlertEnabled,
} from "@/lib/order-notifications";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { formatMoney } from "@/lib/currency";
import { StoreOrder, OrderStatus, updateStoreOrderStatus, deleteStoreOrder } from "@/lib/store-service";
import { downloadOrderControlPdf } from "@/lib/order-pdf";

interface OrdersViewProps {
  orders: StoreOrder[];
  storeUid: string;
  currency?: string;
  products?: any[];
  businessSettings?: any;
  onSelectOrderForSale?: (order: StoreOrder) => void;
  setToast: (msg: string) => void;
}

const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  badgeClass: string;
  icon: any;
  colorHex: string;
  description: string;
}> = {
  pendiente: {
    label: "Pendiente",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: Clock,
    colorHex: "#f59e0b",
    description: "Recibido de la tienda web, pendiente de confirmación",
  },
  confirmado: {
    label: "Confirmado",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: CheckCircle2,
    colorHex: "#3b82f6",
    description: "Pedido verificado y aceptado por la tienda",
  },
  en_preparacion: {
    label: "En preparación",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    icon: Package,
    colorHex: "#a855f7",
    description: "Empaquetando productos en depósito / local",
  },
  listo: {
    label: "Listo para entrega",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
    icon: Truck,
    colorHex: "#14b8a6",
    description: "Listo para retirar o despachado al transporte",
  },
  entregado: {
    label: "Entregado",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: Check,
    colorHex: "#10b981",
    description: "Pedido entregado con éxito al cliente",
  },
  cancelado: {
    label: "Cancelado",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    icon: XCircle,
    colorHex: "#f43f5e",
    description: "Pedido rechazado o cancelado",
  },
};

export function OrdersView({
  orders,
  storeUid,
  currency = "ARS",
  products = [],
  businessSettings,
  onSelectOrderForSale,
  setToast,
}: OrdersViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [channelFilter, setChannelFilter] = useState<string>("todos");
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<StoreOrder | null>(null);
  const [prepModalOrder, setPrepModalOrder] = useState<StoreOrder | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [includePhotosPrint, setIncludePhotosPrint] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Obtener producto completo del catálogo para mostrar todas las especificaciones
  const resolveProductDetails = (item: { productId?: string | number; name?: string }) => {
    if (!products || !products.length) return null;
    return (
      products.find(
        (p: any) =>
          (item.productId !== undefined && String(p.id) === String(item.productId)) ||
          (item.name && p.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
      ) || null
    );
  };

  // Descargar Remito / Ficha de Control en PDF profesional con imágenes y especificaciones
  const handleDownloadOrderPdf = async (order: StoreOrder, withPhotos: boolean = true) => {
    try {
      setDownloadingPdfId(order.id);
      setToast(`Generando PDF profesional de ${order.orderNumber} con imágenes...`);
      await downloadOrderControlPdf({
        order,
        products,
        businessSettings,
        currency,
        checkedItems,
        includePhotos: withPhotos,
      });
      setToast(`PDF de ${order.orderNumber} descargado con éxito.`);
    } catch (err: any) {
      console.error("Error al generar PDF del pedido:", err);
      setToast("No se pudo generar el PDF del pedido.");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Obtener foto del calzado desde el item del pedido o catálogo de productos
  const resolveItemImage = (item: { productId?: string | number; name?: string; imageUrl?: string }) => {
    if (item.imageUrl && item.imageUrl.trim()) return item.imageUrl;
    if (!products || !products.length) return "";
    const found = products.find((p: any) =>
      (item.productId !== undefined && String(p.id) === String(item.productId)) ||
      (item.name && p.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    return found?.image_url || found?.images?.[0] || "";
  };

  // Obtener SKU o código de barra
  const resolveItemSku = (item: { productId?: string | number; name?: string }) => {
    if (!products || !products.length) return "";
    const found = products.find((p: any) =>
      (item.productId !== undefined && String(p.id) === String(item.productId)) ||
      (item.name && p.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    return found?.sku || found?.barcode || "";
  };
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    setSoundEnabledState(isSoundAlertEnabled());
    setNotifPermission(getNotificationPermissionStatus());
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundAlertEnabled(next);
    if (next) {
      playOrderAlertSound();
      setToast("🔔 Avisos sonoros activados");
    } else {
      setToast("Avisos sonoros silenciados");
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestOrderNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      setToast("¡Notificaciones de escritorio permitidas con éxito!");
      playOrderAlertSound();
    } else if (perm === "denied") {
      setToast("Las notificaciones fueron bloqueadas en el navegador.");
    }
  };

  const handleTestSound = () => {
    playOrderAlertSound();
    setToast("🔔 Campanita de aviso reproducida");
  };

  // Formato de moneda
  const money = (val: number) => formatMoney(val, currency);

  // Formateador de fecha amigable
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return isoStr;
    }
  };

  // Contadores por estado
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      todos: orders.length,
      pendiente: 0,
      confirmado: 0,
      en_preparacion: 0,
      listo: 0,
      entregado: 0,
      cancelado: 0,
    };
    orders.forEach((o) => {
      if (c[o.status] !== undefined) c[o.status]++;
    });
    return c;
  }, [orders]);

  // Filtrado de pedidos
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Estado
      if (statusFilter !== "todos" && order.status !== statusFilter) {
        return false;
      }
      // Canal
      if (channelFilter !== "todos" && order.channel !== channelFilter) {
        return false;
      }
      // Búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.toLowerCase().includes(q);
        const matchesAddress = (order.customerAddress || "").toLowerCase().includes(q);
        const matchesItem = order.items.some((it) => it.name.toLowerCase().includes(q));
        if (!matchesNumber && !matchesCustomer && !matchesPhone && !matchesAddress && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, channelFilter, searchTerm]);

  // Cambiar estado de un pedido
  const handleChangeStatus = async (order: StoreOrder, newStatus: OrderStatus) => {
    if (order.status === newStatus) return;
    try {
      setUpdatingId(order.id);
      await updateStoreOrderStatus(storeUid, order.id, newStatus);
      setToast(`Pedido ${order.orderNumber} actualizado a "${STATUS_CONFIG[newStatus].label}"`);
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      console.error("Error al actualizar estado:", err);
      setToast("Error al actualizar el estado del pedido.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Eliminar pedido
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await deleteStoreOrder(storeUid, orderToDelete.id);
      setToast(`Pedido ${orderToDelete.orderNumber} eliminado correctamente.`);
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }
      setOrderToDelete(null);
    } catch (err: any) {
      console.error("Error al eliminar pedido:", err);
      setToast("No se pudo eliminar el pedido.");
    }
  };

  // Imprimir comanda / hoja de control interno de preparación
  const handlePrintOrder = (order: StoreOrder, withPhotos: boolean = true) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setToast("Permití las ventanas emergentes en tu navegador para imprimir.");
      return;
    }

    const businessName = businessSettings?.business_name || "CR BAZAR";
    const branchName = businessSettings?.branch_name || "";
    const businessPhone = businessSettings?.phone || businessSettings?.whatsapp || "";
    const businessAddress = businessSettings?.address || "";
    const businessLogo = businessSettings?.logo_url || "";

    const itemsWithImages = order.items.map((item) => {
      const prod = resolveProductDetails(item);
      const img = resolveItemImage(item);
      const sku = prod?.sku || resolveItemSku(item);
      return {
        ...item,
        resolvedImage: img,
        sku,
        barcode: prod?.barcode || "",
        category: prod?.category || "",
        color: prod?.color || "",
        location: prod?.location || "",
        brand: item.brand || prod?.brand || "",
      };
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Control Interno - Pedido ${order.orderNumber}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            padding: 24px;
            color: #111827;
            background: #ffffff;
            max-width: 820px;
            margin: 0 auto;
            font-size: 13px;
            line-height: 1.4;
          }
          
          /* Toolbar no imprimible */
          .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f1f5f9;
            padding: 10px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #cbd5e1;
          }
          .toolbar button {
            cursor: pointer;
            font-weight: 700;
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            font-size: 13px;
          }
          .btn-print { background: #7c3aed; color: #fff; }
          .btn-close { background: #e2e8f0; color: #334155; margin-left: 8px; }

          /* Cabecera */
          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 16px;
          }
          .business-title { font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }
          .business-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
          .logo-img { max-height: 48px; max-width: 140px; object-fit: contain; margin-bottom: 4px; }

          .doc-type-badge {
            background: #581c87;
            color: #ffffff;
            font-weight: 900;
            font-size: 12px;
            padding: 5px 12px;
            border-radius: 6px;
            display: inline-block;
            letter-spacing: 0.5px;
            text-align: right;
          }
          .order-ref { font-size: 18px; font-weight: 900; margin-top: 4px; color: #1e293b; text-align: right; }

          /* Grilla de información */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
          }
          .info-block p { margin: 2px 0; font-size: 12px; }
          .info-label { font-weight: 700; color: #475569; }
          .badge-channel {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            background: #f3e8ff;
            color: #6b21a8;
          }

          .alert-notes {
            grid-column: 1 / -1;
            background: #fffbeb;
            border: 1px solid #fde68a;
            padding: 8px 12px;
            border-radius: 6px;
            color: #92400e;
            font-size: 12px;
            margin-top: 4px;
          }

          /* Tabla de preparación */
          .table-title {
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            color: #0f172a;
            letter-spacing: 0.5px;
            margin: 16px 0 8px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th {
            background: #f1f5f9;
            color: #334155;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            padding: 8px 6px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #94a3b8;
            text-align: left;
          }
          td {
            padding: 8px 6px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          tr:nth-child(even) { background-color: #fbfcfe; }

          .check-box {
            width: 22px;
            height: 22px;
            border: 2px solid #475569;
            border-radius: 4px;
            margin: 0 auto;
            background: #fff;
          }
          .img-cell { width: 76px; text-align: center; }
          .product-thumb {
            width: 66px;
            height: 66px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
            background: #fff;
            display: block;
            margin: 0 auto;
          }
          .no-img {
            width: 66px;
            height: 66px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #94a3b8;
            font-size: 9px;
            font-weight: 700;
            border-radius: 6px;
            border: 1px dashed #cbd5e1;
            text-align: center;
            margin: 0 auto;
          }

          .qty-box {
            font-size: 17px;
            font-weight: 900;
            color: #0f172a;
            text-align: center;
            white-space: nowrap;
          }
          .item-name { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
          .item-meta { font-size: 11px; color: #475569; }
          .size-badge {
            display: inline-block;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
            font-size: 11px;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 4px;
            margin-top: 3px;
          }
          .sku-tag {
            font-size: 10px;
            color: #64748b;
            font-family: monospace;
            margin-left: 6px;
          }

          /* Totales y Firmas */
          .summary-section {
            margin-top: 20px;
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 16px;
            align-items: start;
          }
          .signatures-box {
            border: 1px dashed #94a3b8;
            border-radius: 8px;
            padding: 12px;
            background: #fff;
          }
          .signature-line {
            margin-top: 18px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #334155;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 2px;
          }
          .totals-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            text-align: right;
          }
          .total-units { font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 4px; }
          .total-price { font-size: 18px; font-weight: 900; color: #0f172a; }

          @media print {
            body { padding: 0; font-size: 12px; max-width: 100%; }
            .no-print { display: none !important; }
            @page { margin: 10mm; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar no-print">
          <div>
            <strong>Hoja de Control Interno y Preparación de Pedido</strong>
            <p style="margin:2px 0 0; font-size:11px; color:#64748b;">
              ${withPhotos ? "✓ Incluye fotos del calzado para control visual en depósito" : "Modo compacto (sin fotos)"}
            </p>
          </div>
          <div>
            <button class="btn-print" onclick="window.print()">🖨️ Imprimir Hoja</button>
            <button class="btn-close" onclick="window.close()">Cerrar</button>
          </div>
        </div>

        <div class="header">
          <div>
            ${businessLogo ? `<img src="${businessLogo}" alt="${businessName}" class="logo-img" />` : ""}
            <h1 class="business-title">${businessName}</h1>
            ${branchName ? `<div class="business-sub">${branchName}</div>` : ""}
            ${businessAddress ? `<div class="business-sub">${businessAddress}</div>` : ""}
            ${businessPhone ? `<div class="business-sub">Tel / WhatsApp: ${businessPhone}</div>` : ""}
          </div>
          <div style="text-align: right;">
            <div class="doc-type-badge">CONTROL INTERNO / PREPARACIÓN</div>
            <div class="order-ref">${order.orderNumber}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Fecha: <b>${formatDate(order.createdAt)}</b>
            </div>
            <div style="margin-top: 4px;">
              <span class="badge-channel">Canal ${order.channel.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <p><span class="info-label">Cliente:</span> <b>${order.customerName}</b></p>
            <p><span class="info-label">Teléfono:</span> ${order.customerPhone}</p>
          </div>
          <div class="info-block">
            <p><span class="info-label">Modalidad:</span> <b>${order.deliveryType === "pickup" ? "RETIRO EN DEPÓSITO / LOCAL" : "ENVÍO A DOMICILIO"}</b></p>
            ${order.customerAddress ? `<p><span class="info-label">Dirección:</span> <b>${order.customerAddress}</b></p>` : ""}
          </div>
          ${order.customerNotes ? `
            <div class="alert-notes">
              <b>Indicaciones del cliente:</b> "${order.customerNotes}"
            </div>
          ` : ""}
        </div>

        <div class="table-title">
          <span>Artículos a Preparar y Empacar (${order.totalUnits} pares / unidades)</span>
          <span style="font-size: 11px; font-weight: normal; color: #64748b;">Marcar con [✓] cada calzado verificado</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">OK</th>
              ${withPhotos ? `<th style="width: 80px; text-align: center;">Foto</th>` : ""}
              <th style="width: 70px; text-align: center;">Cant.</th>
              <th>Calzado / Detalle</th>
              <th style="text-align: right; width: 90px;">P. Unit.</th>
              <th style="text-align: right; width: 100px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsWithImages
              .map(
                (item) => `
              <tr>
                <td style="text-align: center;">
                  <div class="check-box"></div>
                </td>
                ${
                  withPhotos
                    ? `
                  <td class="img-cell">
                    ${
                      item.resolvedImage
                        ? `<img src="${item.resolvedImage}" alt="${item.name}" class="product-thumb" />`
                        : `<div class="no-img">Sin foto</div>`
                    }
                  </td>
                `
                    : ""
                }
                <td class="qty-box">x ${item.qty}</td>
                <td>
                  <div class="item-name">${item.name}</div>
                  <div class="item-meta">
                    ${item.brand ? `Marca: <b>${item.brand}</b>` : ""}
                    ${item.category ? ` · Cat.: <b>${item.category}</b>` : ""}
                    ${item.color ? ` · Color/Pres.: <b>${item.color}</b>` : ""}
                  </div>
                  <div class="item-meta" style="margin-top:2px;">
                    ${item.sku ? `<span class="sku-tag" style="margin-left:0;">SKU: ${item.sku}</span>` : ""}
                    ${item.barcode ? `<span class="sku-tag">EAN: ${item.barcode}</span>` : ""}
                    ${item.location ? `<span class="sku-tag">Ubicación: ${item.location}</span>` : ""}
                  </div>
                  ${
                    item.size
                      ? `<div class="size-badge">VARIANTE / TALLE: ${item.size}</div>`
                      : `<div style="font-size: 11px; color: #64748b;">Estándar / Único</div>`
                  }
                </td>
                <td style="text-align: right; font-size: 12px;">${money(item.price)}</td>
                <td style="text-align: right; font-size: 13px; font-weight: 800;">${money(item.subtotal)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary-section" style="display: flex; justify-content: flex-end;">
          <div class="totals-box" style="min-width: 280px;">
            <div class="total-units">Total de unidades: <b>${order.totalUnits} unidades</b></div>
            <div class="total-price">TOTAL: ${money(order.totalAmount)}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Estado: <b>${STATUS_CONFIG[order.status]?.label || order.status}</b>
            </div>
          </div>
        </div>

        <script>
          window.addEventListener("load", function() {
            const images = Array.from(document.querySelectorAll("img.product-thumb"));
            if (images.length === 0) {
              setTimeout(function() { window.print(); }, 250);
              return;
            }
            let loaded = 0;
            const total = images.length;
            function checkDone() {
              loaded++;
              if (loaded >= total) {
                setTimeout(function() { window.print(); }, 350);
              }
            }
            images.forEach(function(img) {
              if (img.complete && img.naturalHeight !== 0) {
                checkDone();
              } else {
                img.addEventListener("load", checkDone);
                img.addEventListener("error", checkDone);
              }
            });
            setTimeout(function() {
              if (loaded < total) {
                window.print();
              }
            }, 2500);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Abrir chat de WhatsApp con el cliente
  const openCustomerWhatsApp = (order: StoreOrder) => {
    let clean = order.customerPhone.replace(/[^0-9]/g, "");
    if (!clean) {
      setToast("El teléfono no contiene números válidos.");
      return;
    }
    const msg = `¡Hola ${order.customerName}! Te escribimos de la tienda sobre tu pedido ${order.orderNumber}.`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Titular */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Pedidos de Clientes
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronización en vivo
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Recepción automática de pedidos desde la tienda online mayorista y minorista.
          </p>
        </div>

        {/* Resumen rápido de pendientes */}
        {counts.pendiente > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-700 dark:text-amber-400">
            <span className="relative flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-3 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold">
              {counts.pendiente} pedido{counts.pendiente > 1 ? "s" : ""} nuevo{counts.pendiente > 1 ? "s" : ""} pendiente{counts.pendiente > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Barra de Notificaciones y Avisos Sonoros en Vivo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <BellRing className="size-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Avisos sonoros y notificaciones web</span>
              <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                En vivo
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Suena una campanita y emite notificación emergente al ingresar un nuevo pedido web.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón de Sonido */}
          <Button
            type="button"
            variant={soundEnabled ? "default" : "outline"}
            size="sm"
            onClick={handleToggleSound}
            className={`h-9 gap-1.5 rounded-xl text-xs font-bold transition-all ${
              soundEnabled
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            title="Activar o silenciar el sonido de campana"
          >
            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            <span>{soundEnabled ? "Sonido activado" : "Silenciado"}</span>
          </Button>

          {/* Botón Probar Sonido */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestSound}
            className="h-9 gap-1.5 rounded-xl text-xs font-semibold hover:border-amber-500/40"
            title="Escuchar sonido de prueba en tus parlantes"
          >
            <Bell className="size-3.5 text-amber-600" />
            <span>Probar timbre</span>
          </Button>

          {/* Botón Notificación de Navegador */}
          {notifPermission !== "granted" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRequestPermission}
              className="h-9 gap-1.5 rounded-xl text-xs font-bold border-indigo-500/40 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
            >
              <BellRing className="size-3.5" />
              <span>Activar avisos en este equipo</span>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Check className="size-3.5" />
              <span>Notificaciones web activas</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Input de búsqueda */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por N° pedido, cliente, talle o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Filtro Canal */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Canal:
            </span>
            <div className="flex rounded-lg border bg-muted/30 p-1">
              <button
                onClick={() => setChannelFilter("todos")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  channelFilter === "todos"
                    ? "bg-background text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setChannelFilter("minorista")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  channelFilter === "minorista"
                    ? "bg-background text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Minorista
              </button>
              <button
                onClick={() => setChannelFilter("mayorista")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  channelFilter === "mayorista"
                    ? "bg-background text-foreground shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mayorista
              </button>
            </div>
          </div>
        </div>

        {/* Pestañas de Estados */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setStatusFilter("todos")}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === "todos"
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>Todos</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {counts.todos}
            </Badge>
          </button>

          {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((statusKey) => {
            const config = STATUS_CONFIG[statusKey];
            const count = counts[statusKey] || 0;
            const Icon = config.icon;
            const isActive = statusFilter === statusKey;

            return (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-foreground text-background shadow"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-3.5" style={{ color: isActive ? "inherit" : config.colorHex }} />
                <span>{config.label}</span>
                {count > 0 && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      statusKey === "pendiente"
                        ? "bg-amber-500 text-white"
                        : "bg-muted-foreground/20 text-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Listado de Pedidos */}
      {filteredOrders.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-muted p-4">
              <ClipboardList className="size-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                No se encontraron pedidos
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {searchTerm || statusFilter !== "todos" || channelFilter !== "todos"
                  ? "Probá cambiando los filtros o el término de búsqueda."
                  : "Los pedidos que confirmen tus clientes desde la tienda online aparecerán acá en tiempo real."}
              </p>
            </div>
            {(searchTerm || statusFilter !== "todos" || channelFilter !== "todos") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("todos");
                  setChannelFilter("todos");
                }}
              >
                Limpiar todos los filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendiente;
            const StatusIcon = statusCfg.icon;
            const isUpdating = updatingId === order.id;

            return (
              <Card
                key={order.id}
                className="overflow-hidden border transition-all hover:shadow-md flex flex-col justify-between"
              >
                {/* Cabecera de la Tarjeta */}
                <div className="border-b bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black tracking-tight text-foreground">
                          {order.orderNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            order.channel === "mayorista"
                              ? "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                              : "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {order.channel}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>

                    {/* Badge de Estado actual */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.badgeClass}`}
                      >
                        <StatusIcon className="size-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contenido / Datos del Cliente y Resumen */}
                <CardContent className="p-4 space-y-3.5 flex-1">
                  {/* Datos de contacto */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <User className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{order.customerName}</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 shrink-0" />
                        <span>{order.customerPhone}</span>
                      </div>
                      <button
                        onClick={() => openCustomerWhatsApp(order)}
                        title="Abrir WhatsApp con el cliente"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        <MessageCircle className="size-3" />
                        WhatsApp
                      </button>
                    </div>

                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {order.deliveryType === "pickup" ? (
                          <strong className="text-foreground">Retiro en local / depósito</strong>
                        ) : (
                          `Envío a: ${order.customerAddress || "Sin dirección especificada"}`
                        )}
                      </span>
                    </div>

                    {order.customerNotes && (
                      <div className="rounded-md bg-muted/40 p-2 text-[11px] italic text-muted-foreground border border-border/40">
                        "{order.customerNotes}"
                      </div>
                    )}
                  </div>

                  {/* Resumen de items */}
                  <div className="border-t pt-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Artículos ({order.totalUnits} un.)
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs scrollbar-thin">
                      {order.items.map((item, idx) => {
                        const itemImg = resolveItemImage(item);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0"
                          >
                            {itemImg ? (
                              <img
                                src={itemImg}
                                alt={item.name}
                                className="size-8 rounded-md object-cover border shrink-0 bg-muted/40 shadow-xs"
                                loading="lazy"
                              />
                            ) : (
                              <div className="size-8 rounded-md bg-muted/60 border flex items-center justify-center shrink-0 text-muted-foreground">
                                <Package className="size-3.5 opacity-60" />
                              </div>
                            )}
                            <div className="truncate flex-1 min-w-0">
                              <span className="font-bold text-foreground">x{item.qty}</span>{" "}
                              <span className="text-foreground/90 font-medium">{item.name}</span>
                              {item.size && (
                                <span className="ml-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/20 px-1.5 py-0.2 rounded">
                                  Talle {item.size}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-foreground shrink-0 text-[11px]">
                              {money(item.subtotal)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-xs font-bold text-muted-foreground">TOTAL:</span>
                    <span className="text-lg font-black text-foreground">
                      {money(order.totalAmount)}
                    </span>
                  </div>
                </CardContent>

                {/* Barra de Acciones */}
                <div className="border-t bg-muted/20 p-3 space-y-2.5">
                  {/* Selector / Botón Destacado de Cambio de Estado */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-muted-foreground">Estado actual:</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold shadow-xs ${statusCfg.badgeClass}`}
                      >
                        <StatusIcon className="size-3" />
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {order.status === "pendiente" && (
                        <Button
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => handleChangeStatus(order, "confirmado")}
                          className="h-8 px-3 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5 rounded-lg transition-transform active:scale-95"
                          title="Confirmar y aceptar este pedido"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Confirmar Pedido
                        </Button>
                      )}
                      {order.status === "confirmado" && (
                        <Button
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => {
                            handleChangeStatus(order, "en_preparacion");
                            setPrepModalOrder(order);
                          }}
                          className="h-8 px-3 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-sm gap-1.5 rounded-lg transition-transform active:scale-95 animate-pulse hover:animate-none"
                          title="Cambiar a En Preparación y abrir control"
                        >
                          <Package className="size-3.5" />
                          A Preparación
                        </Button>
                      )}
                      {order.status === "en_preparacion" && (
                        <Button
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => handleChangeStatus(order, "listo")}
                          className="h-8 px-3 text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-sm gap-1.5 rounded-lg transition-transform active:scale-95"
                          title="Marcar pedido empaquetado y listo para despacho"
                        >
                          <Truck className="size-3.5" />
                          Listo / Despachar
                        </Button>
                      )}
                      {order.status === "listo" && (
                        <Button
                          size="sm"
                          disabled={updatingId === order.id}
                          onClick={() => handleChangeStatus(order, "entregado")}
                          className="h-8 px-3 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5 rounded-lg transition-transform active:scale-95"
                          title="Marcar pedido como entregado"
                        >
                          <Check className="size-3.5 stroke-[3]" />
                          Marcar Entregado
                        </Button>
                      )}
                      {order.status === "entregado" && (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          <Check className="size-3.5 stroke-[3]" /> Completado
                        </span>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedOrder(order)}
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground font-bold"
                      >
                        Ver Detalle
                      </Button>
                    </div>
                  </div>

                  {/* Acciones complementarias */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrepModalOrder(order)}
                        className="h-7 px-2.5 text-xs font-bold border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 gap-1"
                        title="Control interno y preparación del pedido"
                      >
                        <ClipboardList className="size-3.5 text-purple-600 dark:text-purple-400" />
                        Control Interno
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingPdfId === order.id}
                        onClick={() => handleDownloadOrderPdf(order, true)}
                        className="h-7 px-2.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 gap-1"
                        title="Descargar Remito / Ficha de Control en PDF profesional con fotos y especificaciones"
                      >
                        {downloadingPdfId === order.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Download className="size-3.5" />
                        )}
                        PDF con Fotos
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePrintOrder(order, true)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="Imprimir hoja de control interno con fotos"
                      >
                        <Printer className="size-3.5 mr-1" />
                        Imprimir
                      </Button>
                    </div>

                    {onSelectOrderForSale && order.status !== "cancelado" && (
                      <Button
                        size="sm"
                        onClick={() => onSelectOrderForSale(order)}
                        className="h-7 text-xs font-bold gap-1"
                      >
                        <ShoppingBag className="size-3.5" />
                        Cargar a Venta
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Detalle Completo de Pedido */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-xl font-black">
                    Pedido {selectedOrder.orderNumber}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Creado el {formatDate(selectedOrder.createdAt)} • Canal {selectedOrder.channel.toUpperCase()}
                  </DialogDescription>
                </div>
                <Badge
                  className={`text-xs font-bold ${
                    STATUS_CONFIG[selectedOrder.status]?.badgeClass
                  }`}
                >
                  {STATUS_CONFIG[selectedOrder.status]?.label}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Cambiar Estado Manual */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Cambiar estado del pedido:
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    (Se sincroniza en tiempo real con la tienda web)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    const isCurrent = selectedOrder.status === st;
                    
                    const activeBg =
                      st === "pendiente" ? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400/40" :
                      st === "confirmado" ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/40" :
                      st === "en_preparacion" ? "bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400/40" :
                      st === "listo" ? "bg-teal-600 text-white border-teal-700 shadow-md ring-2 ring-teal-400/40" :
                      st === "entregado" ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40" :
                      "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400/40";

                    const inactiveStyle =
                      st === "pendiente" ? "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15" :
                      st === "confirmado" ? "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200 hover:bg-blue-500/15" :
                      st === "en_preparacion" ? "border-purple-500/30 bg-purple-500/5 text-purple-900 dark:text-purple-200 hover:bg-purple-500/15" :
                      st === "listo" ? "border-teal-500/30 bg-teal-500/5 text-teal-900 dark:text-teal-200 hover:bg-teal-500/15" :
                      st === "entregado" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/15" :
                      "border-rose-500/30 bg-rose-500/5 text-rose-900 dark:text-rose-200 hover:bg-rose-500/15";

                    return (
                      <button
                        key={st}
                        onClick={() => handleChangeStatus(selectedOrder, st)}
                        className={`flex items-center justify-between gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all active:scale-95 ${
                          isCurrent ? activeBg : inactiveStyle
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <cfg.icon className="size-4 shrink-0" style={{ color: isCurrent ? "#ffffff" : cfg.colorHex }} />
                          <span className="truncate">{cfg.label}</span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0">
                            Actual
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Información del Cliente */}
              <div className="rounded-xl border p-4 space-y-2 text-xs">
                <p className="font-bold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Información del Cliente
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Nombre:</span>
                    <p className="font-bold text-foreground text-sm">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Teléfono:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="font-bold text-foreground">{selectedOrder.customerPhone}</p>
                      <button
                        onClick={() => openCustomerWhatsApp(selectedOrder)}
                        className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 hover:bg-emerald-500/20"
                      >
                        <MessageCircle className="size-3" />
                        Chat
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">Tipo de Entrega:</span>
                    <p className="font-medium text-foreground">
                      {selectedOrder.deliveryType === "pickup"
                        ? "Retiro en local / depósito"
                        : `Envío a domicilio: ${selectedOrder.customerAddress || "Sin dirección"}`}
                    </p>
                  </div>
                  {selectedOrder.customerNotes && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Notas / Aclaraciones:</span>
                      <p className="italic text-foreground mt-0.5 rounded bg-muted/40 p-2">
                        {selectedOrder.customerNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detalle de Artículos */}
              <div className="rounded-xl border p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Artículos solicitados ({selectedOrder.totalUnits} pares / unidades)
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPrepModalOrder(selectedOrder)}
                      className="h-7 text-xs font-bold border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 gap-1"
                    >
                      <ClipboardList className="size-3.5 text-purple-600 dark:text-purple-400" />
                      Control Interno
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingPdfId === selectedOrder.id}
                      onClick={() => handleDownloadOrderPdf(selectedOrder, true)}
                      className="h-7 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 gap-1"
                    >
                      {downloadingPdfId === selectedOrder.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      Descargar PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintOrder(selectedOrder, true)}
                      className="h-7 text-xs gap-1"
                    >
                      <Printer className="size-3.5 mr-1" />
                      Imprimir Hoja
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-border/40 text-xs">
                  {selectedOrder.items.map((item, idx) => {
                    const itemImg = resolveItemImage(item);
                    const prod = resolveProductDetails(item);
                    const itemBrand = item.brand || prod?.brand || "";
                    const itemCategory = prod?.category || "";
                    const itemColor = prod?.color || "";
                    const itemSku = prod?.sku || resolveItemSku(item);
                    const itemBarcode = prod?.barcode || "";
                    const itemLocation = prod?.location || "";
                    return (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {itemImg ? (
                            <img
                              src={itemImg}
                              alt={item.name}
                              className="size-14 rounded-lg object-cover border shrink-0 bg-muted/40 shadow-xs"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-14 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground border">
                              <Package className="size-5 opacity-40" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-sm truncate">{item.name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-xs mt-1">
                              {item.size ? (
                                <strong className="text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold">
                                  Variante / Talle: {item.size}
                                </strong>
                              ) : (
                                <span className="bg-muted px-1.5 py-0.5 rounded">Único / Estándar</span>
                              )}
                              {itemBrand && <span>• Marca: <b className="text-foreground">{itemBrand}</b></span>}
                              {itemCategory && <span>• Cat.: <b className="text-foreground">{itemCategory}</b></span>}
                              {itemColor && <span>• Color/Pres.: <b className="text-foreground">{itemColor}</b></span>}
                            </div>
                            {(itemSku || itemBarcode || itemLocation) && (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground mt-0.5">
                                {itemSku && <span>SKU: {itemSku}</span>}
                                {itemBarcode && <span>EAN: {itemBarcode}</span>}
                                {itemLocation && <span className="font-sans text-primary font-semibold">Ubicación: {itemLocation}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-foreground">
                            {item.qty} un. x {money(item.price)}
                          </p>
                          <p className="text-xs font-black text-foreground">
                            {money(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="font-bold text-muted-foreground">TOTAL GENERAL:</span>
                  <span className="text-xl font-black text-foreground">
                    {money(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setOrderToDelete(selectedOrder)}
                className="gap-1.5"
              >
                <Trash2 className="size-4" />
                Eliminar Pedido
              </Button>

              <div className="flex items-center gap-2">
                {onSelectOrderForSale && selectedOrder.status !== "cancelado" && (
                  <Button
                    onClick={() => {
                      onSelectOrderForSale(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    className="gap-1.5 font-bold"
                  >
                    <ShoppingBag className="size-4" />
                    Cargar a Venta / POS
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Cerrar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Control Interno y Preparación con Fotos */}
      {prepModalOrder && (() => {
        const totalItemsCount = prepModalOrder.items.length;
        const checkedCount = prepModalOrder.items.filter(
          (_, idx) => !!checkedItems[`${prepModalOrder.id}-${idx}`]
        ).length;
        const allChecked = totalItemsCount > 0 && checkedCount === totalItemsCount;

        const toggleAllItems = () => {
          const nextState = !allChecked;
          setCheckedItems((prev) => {
            const updated = { ...prev };
            prepModalOrder.items.forEach((_, idx) => {
              updated[`${prepModalOrder.id}-${idx}`] = nextState;
            });
            return updated;
          });
        };

        return (
          <Dialog open={!!prepModalOrder} onOpenChange={(open) => !open && setPrepModalOrder(null)}>
            <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-5 sm:p-6 gap-5">
              {/* Cabecera amplia y despejada */}
              <DialogHeader className="border-b pb-4 pr-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 shrink-0 mt-0.5">
                      <ClipboardList className="size-6" />
                    </div>
                    <div className="space-y-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <DialogTitle className="text-xl font-black tracking-tight">
                          Control Interno de Pedido
                        </DialogTitle>
                        <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-md bg-muted border text-foreground">
                          {prepModalOrder.orderNumber}
                        </span>
                      </div>
                      <DialogDescription className="text-xs flex flex-wrap items-center gap-2">
                        <span>Creado el <strong>{formatDate(prepModalOrder.createdAt)}</strong></span>
                        <span>•</span>
                        <span className="uppercase font-bold text-foreground/80">
                          Canal {prepModalOrder.channel}
                        </span>
                      </DialogDescription>
                    </div>
                  </div>

                  <Badge
                    className={`text-xs font-bold px-3 py-1 rounded-full w-fit shrink-0 ${
                      STATUS_CONFIG[prepModalOrder.status]?.badgeClass
                    }`}
                  >
                    {STATUS_CONFIG[prepModalOrder.status]?.label}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-5">
                {/* Tarjeta de Cliente y Logística en 2 columnas bien separadas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      <User className="size-3.5 text-purple-600 dark:text-purple-400" />
                      Cliente / Destinatario
                    </div>
                    <p className="font-black text-base text-foreground">
                      {prepModalOrder.customerName}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="size-3.5" />
                        <strong className="text-foreground">{prepModalOrder.customerPhone || "—"}</strong>
                      </span>
                      {prepModalOrder.customerPhone && (
                        <button
                          type="button"
                          onClick={() => openCustomerWhatsApp(prepModalOrder)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      <Truck className="size-3.5 text-purple-600 dark:text-purple-400" />
                      Logística y Entrega
                    </div>
                    <p className="font-black text-base text-foreground">
                      {prepModalOrder.deliveryType === "pickup"
                        ? "Retiro en depósito / local"
                        : "Envío a domicilio / transporte"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                      <MapPin className="size-3.5 shrink-0 mt-0.5" />
                      <span>
                        {prepModalOrder.deliveryType === "pickup"
                          ? "El cliente retira por mostrador / depósito"
                          : prepModalOrder.customerAddress || "Dirección a coordinar"}
                      </span>
                    </p>
                  </div>

                  {prepModalOrder.customerNotes && (
                    <div className="md:col-span-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <span className="font-black uppercase tracking-wide">Observaciones del cliente: </span>
                        <span className="italic">"{prepModalOrder.customerNotes}"</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sección de Artículos con barra de progreso y controles claros */}
                <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-base text-foreground flex items-center gap-2">
                          <Package className="size-4 text-purple-600 dark:text-purple-400" />
                          Artículos a Verificar ({prepModalOrder.totalUnits} {prepModalOrder.totalUnits === 1 ? "unidad" : "unidades"})
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold ${
                            allChecked
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                          }`}
                        >
                          {checkedCount} de {totalItemsCount} verificados
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Revisá la foto, variante y código de cada producto antes de marcarlo como preparado.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={toggleAllItems}
                        className="h-8 text-xs font-bold gap-1.5"
                      >
                        <Check className="size-3.5" />
                        {allChecked ? "Desmarcar todos" : "Marcar todos"}
                      </Button>

                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-muted-foreground hover:text-foreground bg-muted/40 px-3 py-1.5 rounded-lg border h-8">
                        <input
                          type="checkbox"
                          checked={includePhotosPrint}
                          onChange={(e) => setIncludePhotosPrint(e.target.checked)}
                          className="rounded border-border text-purple-600 focus:ring-purple-500 size-3.5"
                        />
                        Incluir fotos en PDF / Impresión
                      </label>
                    </div>
                  </div>

                  {/* Tarjetas individuales por producto (sin amontonar) */}
                  <div className="space-y-3">
                    {prepModalOrder.items.map((item, idx) => {
                      const itemImg = resolveItemImage(item);
                      const prod = resolveProductDetails(item);
                      const itemBrand = item.brand || prod?.brand || "";
                      const itemCategory = prod?.category || "";
                      const itemColor = prod?.color || "";
                      const itemLocation = prod?.location || "";
                      const itemSku = prod?.sku || resolveItemSku(item);
                      const itemBarcode = prod?.barcode || "";
                      const isChecked = !!checkedItems[`${prepModalOrder.id}-${idx}`];

                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border p-3.5 sm:p-4 transition-all ${
                            isChecked
                              ? "bg-emerald-500/10 border-emerald-500/35 shadow-xs"
                              : "bg-background hover:bg-muted/20 border-border"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Bloque Izquierdo + Central: Checkbox, Foto y Especificaciones ordenadas por líneas */}
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                              {/* Checkbox grande */}
                              <button
                                type="button"
                                onClick={() =>
                                  setCheckedItems((prev) => ({
                                    ...prev,
                                    [`${prepModalOrder.id}-${idx}`]: !prev[`${prepModalOrder.id}-${idx}`],
                                  }))
                                }
                                className={`size-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer mt-1 sm:mt-0 ${
                                  isChecked
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                    : "border-muted-foreground/40 hover:border-purple-500 bg-background"
                                }`}
                                title={isChecked ? "Marcado como preparado" : "Marcar como preparado"}
                              >
                                {isChecked ? <Check className="size-4 stroke-[3]" /> : <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>}
                              </button>

                              {/* Miniatura cuadrada grande */}
                              <div className="relative size-20 sm:size-22 rounded-xl overflow-hidden border bg-muted/30 shrink-0 shadow-xs">
                                {itemImg ? (
                                  <img
                                    src={itemImg}
                                    alt={item.name}
                                    className="size-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="size-full flex flex-col items-center justify-center text-muted-foreground">
                                    <Package className="size-6 opacity-40" />
                                    <span className="text-[10px] font-semibold mt-1">Sin foto</span>
                                  </div>
                                )}
                              </div>

                              {/* Información del Producto en 3 renglones limpios */}
                              <div className="min-w-0 flex-1 space-y-2">
                                {/* Renglón 1: Nombre del Artículo */}
                                <div>
                                  <p
                                    className={`font-black text-base leading-snug text-foreground ${
                                      isChecked ? "line-through opacity-75" : ""
                                    }`}
                                  >
                                    {idx + 1}. {item.name}
                                  </p>
                                </div>

                                {/* Renglón 2: Variante / Talle + Atributos principales en píldoras separadas */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center rounded-lg bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 text-xs font-black text-blue-700 dark:text-blue-300">
                                    Variante / Talle: {item.size || "Único"}
                                  </span>

                                  {itemBrand && (
                                    <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground border border-border/60">
                                      Marca: <strong className="ml-1 font-bold">{itemBrand}</strong>
                                    </span>
                                  )}

                                  {itemColor && (
                                    <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground border border-border/60">
                                      Color/Pres.: <strong className="ml-1 font-bold">{itemColor}</strong>
                                    </span>
                                  )}

                                  {itemCategory && (
                                    <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground border border-border/60">
                                      Cat.: <strong className="ml-1 font-bold">{itemCategory}</strong>
                                    </span>
                                  )}
                                </div>

                                {/* Renglón 3: Códigos técnicos (SKU, EAN-13 y Ubicación) */}
                                {(itemSku || itemBarcode || itemLocation) && (
                                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                                    {itemSku && (
                                      <span className="font-mono text-[11px] bg-muted/60 border px-2 py-0.5 rounded text-muted-foreground">
                                        SKU: <strong className="text-foreground">{itemSku}</strong>
                                      </span>
                                    )}
                                    {itemBarcode && (
                                      <span className="font-mono text-[11px] bg-muted/60 border px-2 py-0.5 rounded text-muted-foreground">
                                        EAN: <strong className="text-foreground">{itemBarcode}</strong>
                                      </span>
                                    )}
                                    {itemLocation && (
                                      <span className="font-semibold text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                                        Ubicación: {itemLocation}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bloque Derecho: Cantidad, Subtotal y Botón de Verificación */}
                            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-border/50 md:pl-4 shrink-0">
                              <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-0.5">
                                <div className="inline-flex items-center justify-center rounded-xl bg-muted border px-3 py-1 text-base font-black text-foreground">
                                  x{item.qty} {item.qty === 1 ? "un." : "un."}
                                </div>
                                <div className="text-right">
                                  <p className="text-[11px] text-muted-foreground">
                                    {money(item.price)} c/u
                                  </p>
                                  <p className="text-sm font-black text-foreground">
                                    Subt.: {money(item.subtotal)}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setCheckedItems((prev) => ({
                                    ...prev,
                                    [`${prepModalOrder.id}-${idx}`]: !prev[`${prepModalOrder.id}-${idx}`],
                                  }))
                                }
                                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 min-w-[155px] ${
                                  isChecked
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                    : "bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25"
                                }`}
                              >
                                {isChecked ? (
                                  <>
                                    <Check className="size-4 stroke-[3]" />
                                    <span>Preparado / En Caja</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                                    <span>Pendiente de Armar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resumen Total al pie de la lista */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-muted/30 border p-4 mt-2">
                    <div className="text-xs text-muted-foreground">
                      Total del pedido:{" "}
                      <strong className="text-foreground">
                        {prepModalOrder.items.length} {prepModalOrder.items.length === 1 ? "artículo" : "artículos"} ({prepModalOrder.totalUnits} unidades)
                      </strong>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        TOTAL A COBRAR / ENTREGAR:
                      </span>
                      <span className="text-2xl font-black text-foreground">
                        {money(prepModalOrder.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie de acciones espaciado */}
              <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  {prepModalOrder.status !== "en_preparacion" && (
                    <Button
                      size="sm"
                      disabled={updatingId === prepModalOrder.id}
                      onClick={async () => {
                        await handleChangeStatus(prepModalOrder, "en_preparacion");
                        setPrepModalOrder({ ...prepModalOrder, status: "en_preparacion" });
                      }}
                      className="h-9 px-4 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-sm gap-1.5 rounded-lg active:scale-95"
                    >
                      <Package className="size-4" />
                      Marcar "En Preparación"
                    </Button>
                  )}
                  {prepModalOrder.status === "en_preparacion" && (
                    <Button
                      size="sm"
                      disabled={updatingId === prepModalOrder.id}
                      onClick={async () => {
                        await handleChangeStatus(prepModalOrder, "listo");
                        setPrepModalOrder({ ...prepModalOrder, status: "listo" });
                      }}
                      className="h-9 px-4 text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-sm gap-1.5 rounded-lg active:scale-95"
                    >
                      <Truck className="size-4" />
                      Marcar "Listo para Entrega"
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    disabled={downloadingPdfId === prepModalOrder.id}
                    onClick={() => handleDownloadOrderPdf(prepModalOrder, includePhotosPrint)}
                    className="h-9 gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                  >
                    {downloadingPdfId === prepModalOrder.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    Descargar PDF Profesional
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handlePrintOrder(prepModalOrder, includePhotosPrint)}
                    className="h-9 gap-1.5 text-xs font-bold border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  >
                    <Printer className="size-4" />
                    Imprimir Hoja
                  </Button>
                  <Button variant="outline" className="h-9 text-xs" onClick={() => setPrepModalOrder(null)}>
                    Cerrar
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Confirmar Eliminación */}
      {orderToDelete && (
        <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar pedido {orderToDelete.orderNumber}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el registro del pedido de la base de datos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
