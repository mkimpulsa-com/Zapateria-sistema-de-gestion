"use client";

import { useState, FormEvent, useEffect } from "react";
import { Landmark, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NewBankAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onSubmit: (payload: {
    action: string;
    name: string;
    bankName: string;
    accountType: string;
    accountNumber: string;
    currency: string;
    initialBalance: number;
    notes: string;
  }) => Promise<any>;
}

export function NewBankAccountModal({
  open,
  onOpenChange,
  busy = false,
  onSubmit,
}: NewBankAccountModalProps) {
  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState("corriente");
  const [accountNumber, setAccountNumber] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [initialBalance, setInitialBalance] = useState("0");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setBankName("");
      setAccountType("corriente");
      setAccountNumber("");
      setCurrency("ARS");
      setInitialBalance("0");
      setNotes("");
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const res = await onSubmit({
      action: "create_bank_account",
      name: name.trim(),
      bankName: bankName.trim() || "Entidad general",
      accountType,
      accountNumber: accountNumber.trim(),
      currency,
      initialBalance: Math.max(0, Number(initialBalance) || 0),
      notes: notes.trim(),
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
              <Landmark className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl">Nueva cuenta bancaria / caja</DialogTitle>
              <DialogDescription>
                Registrá una cuenta bancaria, billetera o caja para recibir cobros y gestionar fondos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nombre descriptivo de la cuenta <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Ej: Banco Galicia Principal, Mercado Pago, Caja Fuerte"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Banco / Entidad
              </label>
              <Input
                placeholder="Ej: Santander, BBVA, Mercado Pago, Efectivo"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tipo de cuenta
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="h-10 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="corriente">Cuenta Corriente</option>
                <option value="ahorros">Caja de Ahorros</option>
                <option value="billetera_virtual">Billetera Virtual / FinTech</option>
                <option value="caja_efectivo">Caja / Efectivo</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Moneda de la cuenta <span className="text-destructive">*</span>
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-bold"
              >
                <option value="ARS">🇦🇷 ARS ($ - Pesos Argentinos)</option>
                <option value="BRL">🇧🇷 BRL (R$ - Reales Brasileños)</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                CBU / CVU / Alias / N° Cuenta
              </label>
              <Input
                placeholder="00000031000... o alias.zapateria"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Saldo inicial ({currency === "BRL" ? "R$ Reales" : "$ ARS"})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">
                {currency === "BRL" ? "R$" : "$"}
              </span>
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                className={currency === "BRL" ? "pl-9 font-semibold" : "pl-7 font-semibold"}
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notas u observaciones (opcional)
            </label>
            <Input
              placeholder="Titular, sucursal o destino de los fondos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
            <Button type="submit" disabled={busy || !name.trim()} className="gap-1.5">
              <Plus className="size-4" />
              {busy ? "Guardando…" : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
