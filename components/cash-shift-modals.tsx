"use client";

import { useState, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  LockOpen,
  Lock,
  Printer,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Banknote,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { printShiftCloseThermalTicket } from "@/lib/thermal-printer";
import { toast } from "sonner";

const DENOMINATIONS = [20000, 10000, 2000, 1000, 500, 200, 100];

interface OpenCashShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { initialCash: number; openingNotes: string; cashierName: string }) => Promise<void>;
  lastClosedShift?: any;
  defaultCashierName?: string;
}

export function OpenCashShiftModal({
  open,
  onOpenChange,
  onSubmit,
  lastClosedShift,
  defaultCashierName = "Administrador",
}: OpenCashShiftModalProps) {
  const suggestedAmount = Number(lastClosedShift?.retained_cash || 0);
  const [initialCash, setInitialCash] = useState<number>(suggestedAmount > 0 ? suggestedAmount : 0);
  const [openingNotes, setOpeningNotes] = useState("");
  const [cashierName, setCashierName] = useState(defaultCashierName);
  const [showDenominations, setShowDenominations] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  const handleCountChange = (denom: number, qty: number) => {
    const nextCounts = { ...counts, [denom]: Math.max(0, qty) };
    setCounts(nextCounts);
    const sum = Object.entries(nextCounts).reduce(
      (acc, [val, q]) => acc + Number(val) * Number(q || 0),
      0
    );
    setInitialCash(sum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initialCash < 0) {
      toast.error("El monto inicial no puede ser negativo.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ initialCash, openingNotes, cashierName });
      toast.success("Turno de caja abierto correctamente.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error al abrir la caja.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <LockOpen className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">Apertura de Caja</DialogTitle>
              <DialogDescription className="text-xs">
                Registrá el fondo inicial de efectivo para comenzar el turno.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {suggestedAmount > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">
                  Fondo del turno anterior
                </span>
                <span className="text-muted-foreground">
                  Se dejaron {formatMoney(suggestedAmount, "ARS")} en el cajón.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setInitialCash(suggestedAmount)}
                className="h-7 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              >
                Usar sugerido
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="initial-cash" className="text-xs font-semibold">
              Fondo inicial en efectivo ($ ARS)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-mono text-sm">$</span>
              <Input
                id="initial-cash"
                type="number"
                min={0}
                step="any"
                value={initialCash === 0 ? "" : initialCash}
                onChange={(e) => setInitialCash(Number(e.target.value) || 0)}
                placeholder="0"
                className="pl-7 font-mono font-bold text-base"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Dinero disponible en el cajón para cambio y vueltos.
            </p>
          </div>

          {/* Calculadora rápida de billetes */}
          <div className="border rounded-xl p-2.5 bg-muted/20">
            <button
              type="button"
              onClick={() => setShowDenominations(!showDenominations)}
              className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Calculator className="size-3.5" />
                Desglose rápido de billetes
              </span>
              {showDenominations ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {showDenominations && (
              <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t">
                {DENOMINATIONS.map((denom) => (
                  <div key={denom} className="flex items-center justify-between gap-1 text-xs">
                    <span className="font-mono text-[11px] text-muted-foreground">${denom.toLocaleString("es-AR")}</span>
                    <Input
                      type="number"
                      min={0}
                      className="h-7 w-16 text-right font-mono text-xs px-1.5"
                      placeholder="0"
                      value={counts[denom] || ""}
                      onChange={(e) => handleCountChange(denom, Number(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cashier-name" className="text-xs font-semibold">
              Responsable / Cajero
            </Label>
            <Input
              id="cashier-name"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              placeholder="Nombre del cajero"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="opening-notes" className="text-xs font-semibold">
              Observaciones de apertura (opcional)
            </Label>
            <Textarea
              id="opening-notes"
              rows={2}
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="Ej: Billetes chicos para cambio, turno tarde..."
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5"
            >
              <LockOpen className="size-3.5" />
              {busy ? "Abriendo..." : "Abrir Turno de Caja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CloseCashShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeShift: any;
  settings?: any;
  defaultCashierName?: string;
  onSubmit: (data: {
    shiftId: string;
    actualCash: number;
    withdrawnCash: number;
    retainedCash: number;
    closingNotes: string;
    cashierName: string;
  }) => Promise<any>;
}

export function CloseCashShiftModal({
  open,
  onOpenChange,
  activeShift,
  settings = {},
  defaultCashierName = "Administrador",
  onSubmit,
}: CloseCashShiftModalProps) {
  if (!activeShift) return null;

  const initialCash = Number(activeShift.initial_cash || 0);
  const cashSales = Number(activeShift.cash_sales || 0);
  const otherSales = Number(activeShift.other_sales || 0);
  const totalSales = Number(activeShift.total_sales || (cashSales + otherSales));
  const salesCount = Number(activeShift.sales_count || 0);
  const cashIncomes = Number(activeShift.cash_incomes || 0);
  const cashExpenses = Number(activeShift.cash_expenses || 0);
  const expectedCash = Number(activeShift.expected_cash !== undefined ? activeShift.expected_cash : (initialCash + cashSales + cashIncomes - cashExpenses));

  const [actualCash, setActualCash] = useState<number>(expectedCash);
  const [withdrawnCash, setWithdrawnCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState("");
  const [cashierName, setCashierName] = useState(defaultCashierName);
  const [showDenominations, setShowDenominations] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  const difference = actualCash - expectedCash;
  const retainedCash = Math.max(0, actualCash - withdrawnCash);

  const handleCountChange = (denom: number, qty: number) => {
    const nextCounts = { ...counts, [denom]: Math.max(0, qty) };
    setCounts(nextCounts);
    const sum = Object.entries(nextCounts).reduce(
      (acc, [val, q]) => acc + Number(val) * Number(q || 0),
      0
    );
    setActualCash(sum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualCash < 0) {
      toast.error("El efectivo contado no puede ser negativo.");
      return;
    }
    if (withdrawnCash > actualCash) {
      toast.error("El monto retirado no puede superar el efectivo disponible en caja.");
      return;
    }

    setBusy(true);
    try {
      const result = await onSubmit({
        shiftId: activeShift.id,
        actualCash,
        withdrawnCash,
        retainedCash,
        closingNotes,
        cashierName,
      });

      toast.success("Turno de caja cerrado con éxito.");
      onOpenChange(false);

      // Ofrecer o disparar impresión del ticket térmico de cierre
      if (result?.closedShift) {
        printShiftCloseThermalTicket({
          shift: result.closedShift,
          settings,
          paperWidth: "80mm",
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Error al cerrar la caja.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-red-500/10 text-red-600">
              <Lock className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">
                Cierre y Arqueo de Caja · Turno #{activeShift.shift_number || 1}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Contá el efectivo físico del cajón para comparar con el sistema y emitir el ticket Z.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Tarjeta de Resumen en tiempo real del Turno */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold border-b pb-1.5 text-foreground">
              <span>Flujo de Efectivo del Turno</span>
              <span className="font-mono text-muted-foreground">
                Desde: {new Date(activeShift.opened_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
              </span>
            </div>

            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>(+) Fondo Inicial de Apertura:</span>
                <span className="font-mono font-semibold text-foreground">{formatMoney(initialCash, "ARS")}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) Ventas en Efectivo ({salesCount}):</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(cashSales, "ARS")}
                </span>
              </div>
              {cashIncomes > 0 && (
                <div className="flex justify-between">
                  <span>(+) Ingresos / Aportes de Caja:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    +{formatMoney(cashIncomes, "ARS")}
                  </span>
                </div>
              )}
              {cashExpenses > 0 && (
                <div className="flex justify-between">
                  <span>(-) Egresos / Gastos Menores:</span>
                  <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                    -{formatMoney(cashExpenses, "ARS")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t font-bold text-sm text-foreground">
              <span>Efectivo Esperado en Cajón:</span>
              <span className="font-mono text-base font-black text-primary">
                {formatMoney(expectedCash, "ARS")}
              </span>
            </div>

            {otherSales > 0 && (
              <div className="pt-1 border-t text-[11px] text-muted-foreground flex justify-between">
                <span>Ventas por Transferencia / Tarjeta:</span>
                <span className="font-mono font-medium">{formatMoney(otherSales, "ARS")}</span>
              </div>
            )}
          </div>

          {/* Arqueo: Ingreso del Efectivo Real */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="actual-cash" className="text-xs font-bold text-foreground">
                Efectivo Real Contado en el Cajón ($ ARS)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setActualCash(expectedCash)}
                className="text-[11px] h-6 text-primary hover:text-primary/80"
              >
                Caja exacta ({formatMoney(expectedCash, "ARS")})
              </Button>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-mono text-sm">$</span>
              <Input
                id="actual-cash"
                type="number"
                min={0}
                step="any"
                value={actualCash === 0 ? "" : actualCash}
                onChange={(e) => setActualCash(Number(e.target.value) || 0)}
                placeholder="0"
                className="pl-7 font-mono font-black text-lg"
                autoFocus
              />
            </div>

            {/* Indicador de Diferencia */}
            <div className={`rounded-xl p-3 flex items-center justify-between border text-xs font-semibold ${
              difference === 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : difference > 0
                ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
                : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
            }`}>
              <span className="flex items-center gap-1.5">
                {difference === 0 ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-4" />
                )}
                {difference === 0 ? "Caja Exacta (Sin diferencias)" : difference > 0 ? "Sobrante de Caja" : "Faltante de Caja"}
              </span>
              <span className="font-mono text-sm font-black">
                {difference > 0 ? `+${formatMoney(difference, "ARS")}` : difference < 0 ? `-${formatMoney(Math.abs(difference), "ARS")}` : "$ 0"}
              </span>
            </div>
          </div>

          {/* Calculadora de Billetes para el Arqueo */}
          <div className="border rounded-xl p-2.5 bg-muted/20">
            <button
              type="button"
              onClick={() => setShowDenominations(!showDenominations)}
              className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Calculator className="size-3.5" />
                Contar billete por billete
              </span>
              {showDenominations ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>

            {showDenominations && (
              <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t">
                {DENOMINATIONS.map((denom) => (
                  <div key={denom} className="flex items-center justify-between gap-1 text-xs">
                    <span className="font-mono text-[11px] text-muted-foreground">${denom.toLocaleString("es-AR")}</span>
                    <Input
                      type="number"
                      min={0}
                      className="h-7 w-16 text-right font-mono text-xs px-1.5"
                      placeholder="0"
                      value={counts[denom] || ""}
                      onChange={(e) => handleCountChange(denom, Number(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Destino de los Fondos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="withdrawn-cash" className="text-xs font-semibold">
                Retirar a Tesorería / Dueño
              </Label>
              <Input
                id="withdrawn-cash"
                type="number"
                min={0}
                max={actualCash}
                value={withdrawnCash === 0 ? "" : withdrawnCash}
                onChange={(e) => setWithdrawnCash(Math.min(actualCash, Number(e.target.value) || 0))}
                placeholder="0"
                className="font-mono text-xs font-bold"
              />
              <p className="text-[10px] text-muted-foreground">Efectivo que se retira del local.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="retained-cash" className="text-xs font-semibold">
                Queda en Cajón (Siguiente turno)
              </Label>
              <Input
                id="retained-cash"
                disabled
                value={formatMoney(retainedCash, "ARS")}
                className="font-mono text-xs font-bold bg-muted/40 cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground">Fondo para el próximo turno.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="closing-cashier" className="text-xs font-semibold">
              Cajero que Cierra
            </Label>
            <Input
              id="closing-cashier"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="closing-notes" className="text-xs font-semibold">
              Observaciones / Justificación de diferencias
            </Label>
            <Textarea
              id="closing-notes"
              rows={2}
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Ej: Faltante de $500 por vuelto mal dado, entrega en sobre N° 12..."
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy}
              className="bg-red-600 hover:bg-red-500 text-white font-bold gap-1.5"
            >
              <Printer className="size-3.5" />
              {busy ? "Cerrando..." : "Cerrar Turno e Imprimir Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CashShiftDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: any;
  settings?: any;
}

export function CashShiftDetailModal({
  open,
  onOpenChange,
  shift,
  settings = {},
}: CashShiftDetailModalProps) {
  if (!shift) return null;

  const initialCash = Number(shift.initial_cash || 0);
  const cashSales = Number(shift.cash_sales || 0);
  const otherSales = Number(shift.other_sales || 0);
  const totalSales = Number(shift.total_sales || (cashSales + otherSales));
  const expectedCash = Number(shift.expected_cash || 0);
  const actualCash = Number(shift.actual_cash !== undefined ? shift.actual_cash : expectedCash);
  const difference = Number(shift.difference || 0);
  const withdrawnCash = Number(shift.withdrawn_cash || 0);
  const retainedCash = Number(shift.retained_cash || 0);

  const isClosed = shift.status === "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`grid size-9 place-items-center rounded-xl ${isClosed ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-600"}`}>
                {isClosed ? <Lock className="size-5" /> : <LockOpen className="size-5" />}
              </span>
              <div>
                <DialogTitle className="text-base font-bold">
                  Turno de Caja #{shift.shift_number || 1}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {isClosed ? "Turno cerrado" : "Turno actualmente en curso"}
                </DialogDescription>
              </div>
            </div>
            <Badge variant={isClosed ? "secondary" : "default"} className={!isClosed ? "bg-emerald-600" : ""}>
              {isClosed ? "Cerrado" : "Abierto"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-3 border">
            <div>
              <span className="text-muted-foreground block text-[11px]">Apertura:</span>
              <span className="font-semibold text-foreground">
                {new Date(shift.opened_at).toLocaleDateString("es-AR")} {new Date(shift.opened_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-[10px] text-muted-foreground block">Por: {shift.opened_by_name || "Administrador"}</span>
            </div>
            {isClosed && shift.closed_at && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Cierre:</span>
                <span className="font-semibold text-foreground">
                  {new Date(shift.closed_at).toLocaleDateString("es-AR")} {new Date(shift.closed_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-[10px] text-muted-foreground block">Por: {shift.closed_by_name || "Administrador"}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fondo Inicial:</span>
              <span className="font-mono font-semibold">{formatMoney(initialCash, "ARS")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ventas en Efectivo ({shift.sales_count || 0}):</span>
              <span className="font-mono font-semibold text-emerald-600">+{formatMoney(cashSales, "ARS")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ventas Digitales / Transf:</span>
              <span className="font-mono font-semibold">{formatMoney(otherSales, "ARS")}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t">
              <span>Total Ventas Turno:</span>
              <span className="font-mono">{formatMoney(totalSales, "ARS")}</span>
            </div>
            <div className="flex justify-between pt-1 border-t">
              <span className="text-muted-foreground">Efectivo Esperado:</span>
              <span className="font-mono font-bold">{formatMoney(expectedCash, "ARS")}</span>
            </div>
            {isClosed && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Efectivo Real Contado:</span>
                  <span className="font-mono font-black">{formatMoney(actualCash, "ARS")}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t">
                  <span>Diferencia:</span>
                  <span className={`font-mono ${difference === 0 ? "text-emerald-600" : difference > 0 ? "text-blue-600" : "text-red-600"}`}>
                    {difference > 0 ? `+${formatMoney(difference, "ARS")} (Sobrante)` : difference < 0 ? `-${formatMoney(Math.abs(difference), "ARS")} (Faltante)` : "Exacta ($ 0)"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground pt-1 border-t text-[11px]">
                  <span>Retirado a tesorería:</span>
                  <span className="font-mono">{formatMoney(withdrawnCash, "ARS")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Fondo retenido en cajón:</span>
                  <span className="font-mono font-semibold">{formatMoney(retainedCash, "ARS")}</span>
                </div>
              </>
            )}
          </div>

          {shift.closing_notes && (
            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground block mb-0.5">Notas de cierre:</strong>
              {shift.closing_notes}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 gap-2 flex-row justify-between sm:justify-between">
          {isClosed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => printShiftCloseThermalTicket({ shift, settings, paperWidth: "80mm" })}
              className="gap-1.5 text-xs font-semibold"
            >
              <Printer className="size-3.5" />
              Reimprimir Ticket Z
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs ml-auto"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

