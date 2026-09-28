"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building,
  Receipt,
  History,
  MessageCircle,
  Coins,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Calendar,
  FileText,
} from "lucide-react";

interface CustomerDetailModalProps {
  customer: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: any[];
  customerMoves: any[];
  onAdjustDebt: (customer: any) => void;
  onEdit: (customer: any) => void;
  onSelectSale?: (sale: any) => void;
}

const money = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val || 0);

const dateFmt = (val: string) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(val));
  } catch {
    return val;
  }
};

export function CustomerDetailModal({
  customer,
  open,
  onOpenChange,
  sales = [],
  customerMoves = [],
  onAdjustDebt,
  onEdit,
  onSelectSale,
}: CustomerDetailModalProps) {
  if (!customer) return null;

  const balance = Number(customer.balance || 0);
  const creditLimit = Number(customer.credit_limit || 0);
  const creditPercent =
    creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, balance) / creditLimit) * 100)) : 0;

  // Filter sales for this customer
  const mySales = sales.filter(
    (s: any) => String(s.customer_id) === String(customer.id) || (s.customer_name && s.customer_name === customer.name)
  );

  // Filter sales with pending debt
  const debtSales = mySales.filter(
    (s: any) =>
      Number(s.pending_amount ?? s.debt_amount ?? (s.status === "con_deuda" ? s.total : 0)) > 0 ||
      s.status === "pago_parcial" ||
      s.status === "con_deuda"
  );

  // Filter movements for this customer
  const myMoves = customerMoves.filter(
    (m: any) => String(m.customer_id) === String(customer.id)
  );

  const totalSpent = mySales.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);

  // Format clean phone for WhatsApp
  const cleanPhone = String(customer.phone || "").replace(/[^0-9]/g, "");
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                {customer.name?.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold">{customer.name}</DialogTitle>
                  <Badge variant={customer.type === "mayorista" ? "default" : "secondary"}>
                    {customer.type === "mayorista" ? "Mayorista" : "Minorista"}
                  </Badge>
                </div>
                <DialogDescription className="flex items-center gap-3 mt-1 text-xs">
                  {customer.document && <span>DNI/CUIT: {customer.document}</span>}
                  {customer.city && <span>{customer.city}</span>}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {whatsappUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4 mr-1.5" />
                    WhatsApp
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(customer);
                }}
              >
                <Pencil className="size-3.5 mr-1" />
                Editar
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-[#ff7a5c] hover:bg-[#e9684c] text-white"
                onClick={() => {
                  onOpenChange(false);
                  onAdjustDebt(customer);
                }}
              >
                <Coins className="size-3.5 mr-1" />
                Ajustar / Cobrar
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tarjetas de Resumen Financiero */}
        <div className="grid gap-3 sm:grid-cols-3 pt-2">
          <div className="rounded-2xl border bg-card p-4 shadow-2xs">
            <p className="text-xs font-semibold text-muted-foreground">Deuda Total / Saldo Deudor</p>
            <p
              className={`mt-1.5 text-2xl font-black ${
                balance > 0
                  ? "text-red-600 dark:text-red-400"
                  : balance < 0
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {money(balance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-medium">
              {balance > 0
                ? `${debtSales.length} ventas con saldo pendiente`
                : balance < 0
                ? "Saldo a favor"
                : "Al día (sin deuda)"}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">Límite de crédito</span>
              <span>{creditPercent}%</span>
            </div>
            <p className="mt-1.5 text-2xl font-black text-foreground">
              {creditLimit > 0 ? money(creditLimit) : "Sin límite"}
            </p>
            {creditLimit > 0 ? (
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    creditPercent >= 90 ? "bg-red-500" : creditPercent >= 60 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${creditPercent}%` }}
                />
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Crédito no restringido</p>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-2xs">
            <p className="text-xs font-semibold text-muted-foreground">Historial de compras</p>
            <p className="mt-1.5 text-2xl font-black text-primary">{money(totalSpent)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{mySales.length} operaciones registradas</p>
          </div>
        </div>

        {/* Pestañas de detalle */}
        <Tabs defaultValue={debtSales.length > 0 ? "deudas" : "movimientos"} className="mt-4">
          <TabsList className="grid w-full grid-cols-4 rounded-xl">
            <TabsTrigger value="deudas" className="rounded-lg text-xs font-bold gap-1.5 text-red-600 dark:text-red-400">
              <FileText className="size-3.5" />
              Ventas con Deuda ({debtSales.length})
            </TabsTrigger>
            <TabsTrigger value="movimientos" className="rounded-lg text-xs font-bold gap-1.5">
              <History className="size-3.5" />
              Cuenta corriente ({myMoves.length})
            </TabsTrigger>
            <TabsTrigger value="ventas" className="rounded-lg text-xs font-bold gap-1.5">
              <Receipt className="size-3.5" />
              Compras ({mySales.length})
            </TabsTrigger>
            <TabsTrigger value="datos" className="rounded-lg text-xs font-bold gap-1.5">
              <User className="size-3.5" />
              Ficha
            </TabsTrigger>
          </TabsList>

          {/* Historial de ventas con saldo pendiente (Deudas) */}
          <TabsContent value="deudas" className="mt-3">
            <div className="rounded-2xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-red-50/50 dark:bg-red-950/20">
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total Venta</TableHead>
                    <TableHead>Monto Abonado</TableHead>
                    <TableHead className="text-right">Saldo Deudor</TableHead>
                    <TableHead>Estado</TableHead>
                    {onSelectSale && <TableHead className="text-right">Acción</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={onSelectSale ? 7 : 6} className="py-8 text-center text-sm text-muted-foreground">
                        <span className="text-emerald-600 font-bold">✓ ¡Al día!</span> Este cliente no registra ventas con saldo pendiente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    debtSales.map((s: any) => {
                      const pending = Number(s.pending_amount ?? s.debt_amount ?? (s.total - (s.paid_amount || 0)));
                      const paid = Number(s.paid_amount || 0);
                      return (
                        <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {s.receipt_no}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {dateFmt(s.created_at)}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {money(s.total)}
                          </TableCell>
                          <TableCell className="text-xs text-emerald-600 font-semibold">
                            {money(paid)}
                          </TableCell>
                          <TableCell className="text-right font-black text-xs text-red-600 dark:text-red-400">
                            {money(pending)}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              s.status === "pago_parcial"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                            }`}>
                              {s.status === "pago_parcial" ? "Pago Parcial" : "Con Deuda"}
                            </span>
                          </TableCell>
                          {onSelectSale && (
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => onSelectSale(s)}
                                className="h-7 gap-1 rounded-lg text-xs"
                                title="Ver Factura X / Remito"
                              >
                                <FileText className="size-3 text-primary" />
                                Factura X
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Historial de cuenta corriente */}
          <TabsContent value="movimientos" className="mt-3">
            <div className="rounded-2xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Concepto / Nota</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo posterior</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myMoves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No hay movimientos registrados en la cuenta corriente de este cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    myMoves.map((m: any) => {
                      const isPayment = m.type === "pago";
                      const isCharge = m.type === "cargo";
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {dateFmt(m.created_at)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                                isPayment
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                                  : isCharge
                                  ? "bg-red-50 text-red-700 dark:bg-red-950/40"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/40"
                              }`}
                            >
                              {isPayment ? (
                                <ArrowDownLeft className="size-3" />
                              ) : isCharge ? (
                                <ArrowUpRight className="size-3" />
                              ) : (
                                <SlidersHorizontal className="size-3" />
                              )}
                              {isPayment ? "Pago / Cobro" : isCharge ? "Cargo" : "Ajuste"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <p className="font-medium text-foreground">{m.note || "Sin nota"}</p>
                            {m.payment_method && (
                              <p className="text-muted-foreground text-[11px]">{m.payment_method}</p>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold text-xs ${
                              isPayment ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isPayment ? "−" : "+"}
                            {money(m.amount)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-xs whitespace-nowrap">
                            {money(m.balance_after)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Historial de ventas */}
          {/* Historial de compras */}
          <TabsContent value="ventas" className="mt-3">
            <div className="rounded-2xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comprobante</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Abonado</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    {onSelectSale && <TableHead className="text-right">Acción</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mySales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={onSelectSale ? 8 : 7} className="py-8 text-center text-sm text-muted-foreground">
                        No hay comprobantes o compras asociadas a este cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mySales.map((s: any) => {
                      const paid = Number(s.paid_amount ?? (s.status === "con_deuda" ? 0 : s.total));
                      const pending = Number(s.pending_amount ?? s.debt_amount ?? Math.max(0, s.total - paid));
                      return (
                        <TableRow key={s.id} className={onSelectSale ? "hover:bg-muted/40 transition-colors" : ""}>
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {s.receipt_no}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {dateFmt(s.created_at)}
                          </TableCell>
                          <TableCell className="capitalize text-xs">
                            <Badge variant="outline">{s.channel}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              s.status === "pagada"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                                : s.status === "pago_parcial"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                                : "bg-red-50 text-red-700 dark:bg-red-950/40"
                            }`}>
                              {s.status === "pagada" ? "Pagada" : s.status === "pago_parcial" ? "Pago Parcial" : "Con Deuda"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs">
                            {money(s.total)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-emerald-600 font-semibold">
                            {money(paid)}
                          </TableCell>
                          <TableCell className={`text-right font-bold text-xs ${pending > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                            {pending > 0 ? money(pending) : "—"}
                          </TableCell>
                          {onSelectSale && (
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => onSelectSale(s)}
                                className="h-7 gap-1 rounded-lg text-xs"
                                title="Ver Factura X / Remito"
                              >
                                <FileText className="size-3 text-primary" />
                                Factura X
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Ficha completa */}
          <TabsContent value="datos" className="mt-3">
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Teléfono / WhatsApp</span>
                  <p className="mt-1 font-medium">{customer.phone || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Correo electrónico</span>
                  <p className="mt-1 font-medium">{customer.email || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">DNI o CUIT</span>
                  <p className="mt-1 font-medium">{customer.document || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Ciudad / Localidad</span>
                  <p className="mt-1 font-medium">{customer.city || "No especificado"}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Dirección</span>
                  <p className="mt-1 font-medium">{customer.address || "No especificada"}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Notas u observaciones</span>
                  <p className="mt-1 text-sm bg-muted/30 p-3 rounded-xl border">
                    {customer.notes || "Sin observaciones adicionales."}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Fecha de alta</span>
                  <p className="mt-1 text-xs text-muted-foreground">{dateFmt(customer.created_at)}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
