"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  WalletCards,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface AdjustCustomerDebtModalProps {
  customer: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (payload: any) => Promise<boolean>;
}

const money = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val || 0);

export function AdjustCustomerDebtModal({
  customer,
  open,
  onOpenChange,
  busy,
  onSubmit,
}: AdjustCustomerDebtModalProps) {
  const [type, setType] = useState<"pago" | "cargo" | "ajuste_manual">("pago");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [registerCash, setRegisterCash] = useState(true);
  const [note, setNote] = useState("");

  const currentBalance = Number(customer?.balance || 0);
  const numericAmount = Math.abs(Number(amount) || 0);

  let resultingBalance = currentBalance;
  if (type === "pago") {
    resultingBalance = currentBalance - numericAmount;
  } else if (type === "cargo") {
    resultingBalance = currentBalance + numericAmount;
  } else if (type === "ajuste_manual") {
    resultingBalance = Number(amount) || 0;
  }

  useEffect(() => {
    if (open && customer) {
      // Default to "pago" if customer has debt, or "cargo" if customer balance is 0
      setType(currentBalance > 0 ? "pago" : "cargo");
      setAmount("");
      setNote("");
      setRegisterCash(true);
      setPaymentMethod("Efectivo");
    }
  }, [open, customer, currentBalance]);

  if (!customer) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (type !== "ajuste_manual" && numericAmount <= 0) return;

    const payload = {
      action: "adjust_customer_debt",
      customerId: customer.id,
      type,
      amount: numericAmount,
      newBalance: type === "ajuste_manual" ? Number(amount) || 0 : undefined,
      paymentMethod,
      registerCashMovement: type === "pago" ? registerCash : false,
      note: note.trim() || (type === "pago" ? "Pago a cuenta de saldo" : type === "cargo" ? "Cargo en cuenta corriente" : "Ajuste manual de saldo"),
    };

    const ok = await onSubmit(payload);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <Coins className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl">Ajustar saldo / Cobrar</DialogTitle>
              <DialogDescription>
                Cuenta corriente de <span className="font-semibold text-foreground">{customer.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Selector de operación */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType("pago")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                type === "pago"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <ArrowDownLeft className="size-4 text-emerald-600" />
              <span>Cobrar / Pago</span>
              <span className="text-[10px] font-normal text-muted-foreground">Baja deuda</span>
            </button>

            <button
              type="button"
              onClick={() => setType("cargo")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                type === "cargo"
                  ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <ArrowUpRight className="size-4 text-red-600" />
              <span>Nuevo cargo</span>
              <span className="text-[10px] font-normal text-muted-foreground">Suma deuda</span>
            </button>

            <button
              type="button"
              onClick={() => setType("ajuste_manual")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                type === "ajuste_manual"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <SlidersHorizontal className="size-4" />
              <span>Fijar saldo</span>
              <span className="text-[10px] font-normal text-muted-foreground">Saldo exacto</span>
            </button>
          </div>

          {/* Tarjeta de simulación de saldos */}
          <div className="rounded-2xl border bg-muted/25 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Saldo actual</span>
              <span>{type === "pago" ? "Menos entrega" : type === "cargo" ? "Más nuevo cargo" : "Nuevo saldo"}</span>
              <span className="font-bold">Saldo resultante</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className={`text-base ${currentBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {money(currentBalance)}
              </span>
              <span className="text-muted-foreground text-sm font-normal">
                {type === "pago" && `− ${money(numericAmount)}`}
                {type === "cargo" && `+ ${money(numericAmount)}`}
                {type === "ajuste_manual" && "➔"}
              </span>
              <span className={`text-lg font-black ${resultingBalance > 0 ? "text-red-600" : resultingBalance < 0 ? "text-blue-600" : "text-emerald-600"}`}>
                {money(resultingBalance)}
              </span>
            </div>
            <div className="mt-2 text-xs flex items-center gap-1.5 text-muted-foreground">
              {resultingBalance === 0 ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="size-3.5" /> El cliente quedará al día (sin deuda).
                </span>
              ) : resultingBalance < 0 ? (
                <span className="text-blue-600 font-medium">
                  El cliente quedará con saldo a favor de {money(Math.abs(resultingBalance))}.
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <AlertTriangle className="size-3.5" /> Saldo pendiente restante: {money(resultingBalance)}.
                </span>
              )}
            </div>
          </div>

          {/* Campo de Importe */}
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>
              {type === "pago"
                ? "Monto a cobrar / entregar *"
                : type === "cargo"
                ? "Monto a cargar a la cuenta *"
                : "Nuevo saldo exacto en cuenta *"}
            </span>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                $
              </span>
              <Input
                type="number"
                min={type === "ajuste_manual" ? undefined : "1"}
                step="1"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pl-8 text-lg font-bold rounded-xl h-11"
              />
            </div>
          </label>

          {/* Opciones para Pago / Cobro */}
          {type === "pago" && (
            <div className="space-y-3 rounded-xl border bg-card p-3">
              <label className="grid gap-1.5 text-xs font-semibold">
                <span>Medio de cobro</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-10 rounded-xl border bg-background px-3 text-sm font-medium"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </label>

              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <WalletCards className="size-3.5 text-primary" />
                    Registrar ingreso en Caja diaria
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Suma este cobro automáticamente a la caja de la sucursal.
                  </p>
                </div>
                <Switch
                  checked={registerCash}
                  onCheckedChange={setRegisterCash}
                />
              </div>
            </div>
          )}

          {/* Motivo o Nota */}
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Concepto o nota de referencia</span>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                type === "pago"
                  ? "Ej. Pago cuota 1 / Cancelación de deuda en efectivo"
                  : type === "cargo"
                  ? "Ej. Retiro de mercadería adicional / Flete especial"
                  : "Ej. Regularización de saldo acordado"
              }
              className="rounded-xl"
            />
          </label>

          <div className="flex justify-end gap-2 border-t pt-4">
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
              disabled={busy || (type !== "ajuste_manual" && numericAmount <= 0)}
              className="rounded-xl bg-[#ff7a5c] hover:bg-[#e9684c] text-white"
            >
              {busy
                ? "Guardando..."
                : type === "pago"
                ? `Registrar cobro de ${money(numericAmount)}`
                : type === "cargo"
                ? `Cargar ${money(numericAmount)} a la cuenta`
                : "Aplicar ajuste de saldo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
