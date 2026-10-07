"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList, Search, Clock, CheckCircle2, Package, Truck,
  XCircle, ArrowRight, MessageCircle, Printer, Store, User, Phone,
  MapPin, AlertCircle, ShoppingBag, Trash2, Check, Sparkles, Filter,
  Layers, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

interface OrdersViewProps {
  orders: StoreOrder[];
  storeUid: string;
  currency?: string;
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
  currency = "BRL",
  onSelectOrderForSale,
  setToast,
}: OrdersViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [channelFilter, setChannelFilter] = useState<string>("todos");
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<StoreOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  // Imprimir comanda de preparación
  const handlePrintOrder = (order: StoreOrder) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setToast("Permití las ventanas emergentes para imprimir.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comanda de Pedido ${order.orderNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; max-width: 600px; margin: 0 auto; font-size: 14px; }
          .header { border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: bold; margin: 0 0 4px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; background: #eee; }
          .section { margin-bottom: 16px; border-bottom: 1px dashed #ccc; padding-bottom: 12px; }
          .label { font-weight: bold; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { text-align: left; border-bottom: 1px solid #000; padding: 6px 0; font-size: 12px; text-transform: uppercase; }
          td { padding: 8px 0; border-bottom: 1px solid #eee; }
          .qty { font-weight: bold; font-size: 15px; }
          .totals { margin-top: 16px; text-align: right; }
          .total-amount { font-size: 18px; font-weight: bold; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">ORDEN DE PREPARACIÓN</h1>
          <div><strong>PEDIDO:</strong> ${order.orderNumber} <span class="badge">${order.channel.toUpperCase()}</span></div>
          <div><strong>Fecha:</strong> ${formatDate(order.createdAt)}</div>
          <div><strong>Estado:</strong> ${STATUS_CONFIG[order.status].label}</div>
        </div>

        <div class="section">
          <div><span class="label">Cliente:</span> <strong>${order.customerName}</strong></div>
          <div><span class="label">Teléfono:</span> ${order.customerPhone}</div>
          <div><span class="label">Modalidad:</span> ${order.deliveryType === "pickup" ? "RETIRO EN LOCAL / DEPÓSITO" : "ENVÍO A DOMICILIO"}</div>
          ${order.customerAddress ? `<div><span class="label">Dirección:</span> ${order.customerAddress}</div>` : ""}
          ${order.customerNotes ? `<div><span class="label">Notas:</span> <em>${order.customerNotes}</em></div>` : ""}
        </div>

        <div class="section">
          <div class="label">DETALLE DE ARTÍCULOS A PREPARAR:</div>
          <table>
            <thead>
              <tr>
                <th>Cant.</th>
                <th>Producto / Detalle</th>
                <th style="text-align: right;">Unit.</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td class="qty">x${item.qty}</td>
                  <td>
                    <strong>${item.name}</strong>
                    ${item.brand ? `(${item.brand})` : ""}
                    ${item.size ? `<br><small style="color: #444;">Variante / Talle: <b>${item.size}</b></small>` : ""}
                  </td>
                  <td style="text-align: right;">${money(item.price)}</td>
                  <td style="text-align: right;"><strong>${money(item.subtotal)}</strong></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div>Total de unidades: <strong>${order.totalUnits}</strong></div>
          <div class="total-amount">TOTAL A COBRAR: ${money(order.totalAmount)}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
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
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1 text-xs scrollbar-thin">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-0.5 border-b border-border/30 last:border-0"
                        >
                          <div className="truncate pr-2">
                            <span className="font-bold text-foreground">x{item.qty}</span>{" "}
                            <span className="text-foreground/90">{item.name}</span>
                            {item.size && (
                              <span className="ml-1 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                Talle {item.size}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-foreground shrink-0 text-[11px]">
                            {money(item.subtotal)}
                          </span>
                        </div>
                      ))}
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
                <div className="border-t bg-muted/10 p-3 space-y-2">
                  {/* Selector / Botones de Cambio Rápido de Estado */}
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="text-[11px] font-bold text-muted-foreground">Estado:</span>
                    <div className="flex items-center gap-1">
                      {order.status === "pendiente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(order, "confirmado")}
                          className="h-7 text-xs border-blue-500/40 text-blue-600 hover:bg-blue-50"
                        >
                          Confirmar
                        </Button>
                      )}
                      {order.status === "confirmado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(order, "en_preparacion")}
                          className="h-7 text-xs border-purple-500/40 text-purple-600 hover:bg-purple-50"
                        >
                          A Preparación
                        </Button>
                      )}
                      {order.status === "en_preparacion" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(order, "listo")}
                          className="h-7 text-xs border-teal-500/40 text-teal-600 hover:bg-teal-50"
                        >
                          Listo / Despachar
                        </Button>
                      )}
                      {order.status === "listo" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => handleChangeStatus(order, "entregado")}
                          className="h-7 text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
                        >
                          Marcar Entregado
                        </Button>
                      )}

                      {/* Dropdown / Botón para ver más opciones de estado */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedOrder(order)}
                        className="h-7 px-2 text-xs"
                      >
                        Ver Detalle
                      </Button>
                    </div>
                  </div>

                  {/* Acciones complementarias */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePrintOrder(order)}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      title="Imprimir comanda de preparación"
                    >
                      <Printer className="size-3.5 mr-1" />
                      Imprimir
                    </Button>

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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cambiar estado del pedido (Se sincroniza en vivo con el cliente):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    const isCurrent = selectedOrder.status === st;
                    return (
                      <button
                        key={st}
                        onClick={() => handleChangeStatus(selectedOrder, st)}
                        className={`flex items-center gap-1.5 rounded-lg border p-2 text-left text-xs transition-all ${
                          isCurrent
                            ? "border-primary bg-primary/10 font-bold text-primary shadow-sm"
                            : "border-border/60 hover:bg-muted"
                        }`}
                      >
                        <cfg.icon className="size-3.5 shrink-0" style={{ color: cfg.colorHex }} />
                        <span className="truncate">{cfg.label}</span>
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
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Artículos solicitados ({selectedOrder.totalUnits} pares / unidades)
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrintOrder(selectedOrder)}
                    className="h-7 text-xs"
                  >
                    <Printer className="size-3.5 mr-1" />
                    Imprimir Comanda
                  </Button>
                </div>

                <div className="divide-y divide-border/40 text-xs">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground text-sm">{item.name}</p>
                        <p className="text-muted-foreground">
                          {item.brand && `Marca: ${item.brand} • `}
                          {item.size ? (
                            <strong className="text-foreground">Talle / Variante: {item.size}</strong>
                          ) : (
                            "Estándar"
                          )}
                        </p>
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
                  ))}
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
