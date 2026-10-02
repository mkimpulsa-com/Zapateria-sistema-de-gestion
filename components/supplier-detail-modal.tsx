"use client";

import { useState } from "react";
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
  Truck,
  User,
  Phone,
  Mail,
  MapPin,
  Landmark,
  History,
  MessageCircle,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Copy,
  Check,
  Tag,
  CreditCard,
} from "lucide-react";

interface SupplierDetailModalProps {
  supplier: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierMoves: any[];
  onAdjustDebt: (supplier: any) => void;
  onEdit: (supplier: any) => void;
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

export function SupplierDetailModal({
  supplier,
  open,
  onOpenChange,
  supplierMoves = [],
  onAdjustDebt,
  onEdit,
}: SupplierDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!supplier) return null;

  const balance = Number(supplier.balance || 0);

  // Filter movements for this supplier
  const myMoves = supplierMoves.filter(
    (m: any) => String(m.supplier_id) === String(supplier.id)
  );

  const totalPaid = myMoves
    .filter((m: any) => m.type === "pago")
    .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

  // Format clean phone for WhatsApp
  const cleanPhone = String(supplier.phone || "").replace(/[^0-9]/g, "");
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

  const handleCopyBank = () => {
    if (!supplier.bank_info) return;
    navigator.clipboard.writeText(supplier.bank_info);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary font-bold text-lg">
                <Truck className="size-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold">{supplier.name}</DialogTitle>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {supplier.category || "Calzado"}
                  </Badge>
                </div>
                <DialogDescription className="flex items-center gap-3 mt-1 text-xs">
                  {supplier.contact && <span>Contacto: {supplier.contact}</span>}
                  {supplier.document && <span>CUIT: {supplier.document}</span>}
                  {supplier.city && <span>{supplier.city}</span>}
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
                  onEdit(supplier);
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
                  onAdjustDebt(supplier);
                }}
              >
                <CreditCard className="size-3.5 mr-1" />
                Pagar / Saldo
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tarjetas de Resumen Financiero */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <div className="rounded-2xl border bg-card p-4 shadow-2xs">
            <p className="text-xs font-semibold text-muted-foreground">Saldo adeudado al proveedor</p>
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
            <p className="mt-1 text-xs text-muted-foreground">
              {balance > 0 ? "Pendiente de pago por la empresa" : balance < 0 ? "Saldo a favor nuestro" : "Al día (sin deuda pendiente)"}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-2xs">
            <p className="text-xs font-semibold text-muted-foreground">Total abonado históricamente</p>
            <p className="mt-1.5 text-2xl font-black text-primary">{money(totalPaid)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{myMoves.filter((m: any) => m.type === "pago").length} pagos registrados</p>
          </div>
        </div>

        {/* Datos Bancarios destacados con botón para Copiar */}
        {supplier.bank_info && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Landmark className="size-4.5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Datos para transferir (CBU / CVU / Alias)
                </p>
                <p className="font-mono text-sm font-bold text-foreground mt-0.5 select-all">
                  {supplier.bank_info}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl shrink-0 gap-1.5 bg-background"
              onClick={handleCopyBank}
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copiar CBU/Alias</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Pestañas */}
        <Tabs defaultValue="movimientos" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="movimientos" className="rounded-lg text-xs font-bold gap-1.5">
              <History className="size-3.5" />
              Cuenta corriente / Pagos ({myMoves.length})
            </TabsTrigger>
            <TabsTrigger value="datos" className="rounded-lg text-xs font-bold gap-1.5">
              <User className="size-3.5" />
              Ficha comercial y contacto
            </TabsTrigger>
          </TabsList>

          {/* Historial de movimientos */}
          <TabsContent value="movimientos" className="mt-3">
            <div className="rounded-2xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Concepto / Referencia</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo posterior</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myMoves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No hay movimientos registrados en la cuenta corriente de este proveedor.
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
                              {isPayment ? "Pago realizado" : isCharge ? "Factura / Compra" : "Ajuste"}
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

          {/* Ficha comercial */}
          <TabsContent value="datos" className="mt-3">
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Persona de contacto</span>
                  <p className="mt-1 font-medium">{supplier.contact || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Teléfono / WhatsApp</span>
                  <p className="mt-1 font-medium">{supplier.phone || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Correo electrónico</span>
                  <p className="mt-1 font-medium">{supplier.email || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">CUIT / Identificación</span>
                  <p className="mt-1 font-medium">{supplier.document || "No especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Rubro principal</span>
                  <p className="mt-1 font-medium">{supplier.category || "Calzado"}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Ciudad / Provincia</span>
                  <p className="mt-1 font-medium">{supplier.city || "No especificado"}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Dirección de fábrica / depósito</span>
                  <p className="mt-1 font-medium">{supplier.address || "No especificada"}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Observaciones y acuerdos</span>
                  <p className="mt-1 text-sm bg-muted/30 p-3 rounded-xl border">
                    {supplier.notes || "Sin observaciones adicionales."}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">Fecha de registro</span>
                  <p className="mt-1 text-xs text-muted-foreground">{dateFmt(supplier.created_at)}</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
