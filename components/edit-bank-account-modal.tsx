"use client";

import { useState, FormEvent, useEffect } from "react";
import { Landmark, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditBankAccountModalProps {
  account: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onSubmit: (payload: {
    action: string;
    accountId: string;
    name: string;
    bankName: string;
    accountType: string;
    accountNumber: string;
    currency: string;
    notes: string;
  }) => Promise<any>;
}

export function EditBankAccountModal({
  account,
  open,
  onOpenChange,
  busy = false,
  onSubmit,
}: EditBankAccountModalProps) {
  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState("corriente");
  const [accountNumber, setAccountNumber] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (account && open) {
      setName(account.name || "");
      setBankName(account.bank_name || "");
      setAccountType(account.account_type || "corriente");
      setAccountNumber(account.account_number || "");
      setCurrency(account.currency || "ARS");
      setNotes(account.notes || "");
    }
  }, [account, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !account?.id) return;

    const res = await onSubmit({
      action: "edit_bank_account",
      accountId: account.id,
      name: name.trim(),
      bankName: bankName.trim(),
      accountType,
      accountNumber: accountNumber.trim(),
      currency,
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
              <Pencil className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl">Editar cuenta bancaria</DialogTitle>
              <DialogDescription>
                Modificá los datos identificatorios de la cuenta. El saldo se actualiza con movimientos o transferencias.
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
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              CBU / CVU / Alias / N° Cuenta
            </label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notas u observaciones
            </label>
            <Input
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
              {busy ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
