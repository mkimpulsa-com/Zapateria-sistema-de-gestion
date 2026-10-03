"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import { ArrowRightLeft, Landmark, AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { formatMoney, convertAmount } from "@/lib/currency";

interface TransferBalanceModalProps {
  accounts: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  rates?: any;
  settings?: any;
  onSubmit: (payload: {
    action: string;
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    destinationAmount?: number;
    concept: string;
    reference: string;
  }) => Promise<any>;
}

export function TransferBalanceModal({
  accounts = [],
  open,
  onOpenChange,
  busy = false,
  rates,
  settings,
  onSubmit,
}: TransferBalanceModalProps) {
  const activeRates = rates || settings || { exchange_rate_ars: 250, exchange_rate_usd: 5.70 };
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("Transferencia entre cuentas");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && accounts.length > 0) {
      setFromId(accounts[0]?.id ? String(accounts[0].id) : "");
      setToId(accounts.length > 1 && accounts[1]?.id ? String(accounts[1].id) : "");
      setAmount("");
      setConcept("Transferencia entre cuentas");
      setReference("");
      setError("");
    }
  }, [open, accounts]);

  const fromAccount = useMemo(() => accounts.find((a) => String(a.id) === String(fromId)), [accounts, fromId]);
  const toAccount = useMemo(() => accounts.find((a) => String(a.id) === String(toId)), [accounts, toId]);

  const fromBalance = Number(fromAccount?.balance || 0);
  const transferAmount = Number(amount) || 0;
  const isBalanceExceeded = transferAmount > fromBalance;

  const isCrossCurrency = fromAccount && toAccount && (fromAccount.currency || "BRL") !== (toAccount.currency || "BRL");
  const calculatedToAmount = useMemo(() => {
    if (!fromAccount || !toAccount || transferAmount <= 0) return 0;
    if (!isCrossCurrency) return transferAmount;
    return convertAmount({
      amount: transferAmount,
      from: fromAccount.currency || "BRL",
      to: toAccount.currency || "BRL",
      rates: activeRates,
    });
  }, [fromAccount, toAccount, transferAmount, isCrossCurrency, activeRates]);

  const [customToAmount, setCustomToAmount] = useState<string>("");
  const finalToAmount = isCrossCurrency && customToAmount ? Number(customToAmount) || calculatedToAmount : calculatedToAmount;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fromId || !toId) {
      setError("Seleccioná la cuenta de origen y la de destino.");
      return;
    }
    if (fromId === toId) {
      setError("La cuenta origen y destino deben ser distintas.");
      return;
    }
    if (transferAmount <= 0) {
      setError("Ingresá un importe mayor a 0.");
      return;
    }
    if (isBalanceExceeded) {
      setError(`El importe excede el saldo disponible en ${fromAccount?.name} (${formatMoney(fromBalance, fromAccount?.currency || "BRL")}).`);
      return;
    }

    const res = await onSubmit({
      action: "transfer_bank_balance",
      fromAccountId: fromId,
      toAccountId: toId,
      amount: transferAmount,
      destinationAmount: isCrossCurrency ? finalToAmount : transferAmount,
      concept: concept.trim(),
      reference: reference.trim(),
    });

    if (res) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ArrowRightLeft className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl">Transferir entre cuentas</DialogTitle>
              <DialogDescription>
                Movimiento interno de fondos entre cuentas en Reales, Pesos o Dólares.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Cuenta Origen */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cuenta de Origen (sale dinero)
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={String(acc.id) === String(toId)}>
                    {acc.name} ({formatMoney(acc.balance, acc.currency || "BRL")})
                  </option>
                ))}
              </select>
              {fromAccount && (
                <p className="text-[11px] text-muted-foreground">
                  Saldo disponible:{" "}
                  <span className={`font-semibold ${fromBalance <= 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatMoney(fromBalance, fromAccount.currency || "BRL")}
                  </span>
                </p>
              )}
            </div>

            {/* Cuenta Destino */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cuenta de Destino (entra dinero)
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="h-10 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={String(acc.id) === String(fromId)}>
                    {acc.name} ({formatMoney(acc.balance, acc.currency || "BRL")})
                  </option>
                ))}
              </select>
              {toAccount && (
                <p className="text-[11px] text-muted-foreground">
                  Saldo actual:{" "}
                  <span className="font-semibold text-foreground">
                    {formatMoney(toAccount.balance, toAccount.currency || "BRL")}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Importe */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Importe a debitar de {fromAccount?.name || "origen"} ({fromAccount?.currency || "BRL"}) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">
                {fromAccount?.currency === "USD" ? "US$" : fromAccount?.currency === "ARS" ? "$" : "R$"}
              </span>
              <Input
                type="number"
                min="0.01"
                step="any"
                placeholder="0"
                className={`pl-9 h-11 text-lg font-bold ${isBalanceExceeded ? "border-destructive focus-visible:ring-destructive" : ""}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
            {isBalanceExceeded && (
              <p className="text-xs text-destructive font-medium">
                El importe supera el saldo disponible de {formatMoney(fromBalance, fromAccount?.currency || "BRL")}.
              </p>
            )}
          </div>

          {/* Si las cuentas son de distinta moneda */}
          {isCrossCurrency && transferAmount > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">
                  Conversión de moneda ({fromAccount?.currency} ➔ {toAccount?.currency}):
                </span>
                <span className="font-bold">
                  {formatMoney(finalToAmount, toAccount?.currency || "BRL")}
                </span>
              </div>
              <label className="block text-[11px] text-muted-foreground">
                Importe que ingresa a destino ({toAccount?.currency}):
                <Input
                  type="number"
                  step="any"
                  value={customToAmount || calculatedToAmount}
                  onChange={(e) => setCustomToAmount(e.target.value)}
                  className="mt-1 h-9 bg-background font-bold text-sm"
                />
              </label>
            </div>
          )}

          {/* Vista previa de saldos resultantes */}
          {fromAccount && toAccount && transferAmount > 0 && !isBalanceExceeded && (
            <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Saldos proyectados tras la transferencia:
              </p>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{fromAccount.name}:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatMoney(fromBalance - transferAmount, fromAccount.currency || "BRL")}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{toAccount.name}:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatMoney(Number(toAccount.balance || 0) + finalToAmount, toAccount.currency || "BRL")}
                </span>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Concepto o Motivo
              </label>
              <Input
                placeholder="Ej: Fondeo de caja, Depósito bancario"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                N° de referencia / comprobante
              </label>
              <Input
                placeholder="Ej: Transf #9821, Ticket 45"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2 sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || !transferAmount || isBalanceExceeded || fromId === toId}
              className="gap-1.5"
            >
              <ArrowRightLeft className="size-4" />
              {busy ? "Transfiriendo…" : `Transferir ${transferAmount > 0 ? formatMoney(transferAmount) : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
