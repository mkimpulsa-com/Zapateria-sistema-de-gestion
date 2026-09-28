"use client";

import { Landmark, Plus, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BankAccountSelectFieldProps {
  accounts: any[];
  bankAccountId: string;
  setBankAccountId: (id: string) => void;
  onNewAccount: () => void;
  currency?: "ARS" | "BRL";
}

const formatMoney = (val: number, currency: "ARS" | "BRL" = "ARS") => {
  if (currency === "BRL") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(val || 0);
  }
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val || 0);
};

export function BankAccountSelectField({
  accounts = [],
  bankAccountId,
  setBankAccountId,
  onNewAccount,
  currency,
}: BankAccountSelectFieldProps) {
  const filteredAccounts = currency
    ? accounts.filter((a) => (a.currency || "ARS") === currency)
    : accounts;
  const selected = accounts.find((a) => String(a.id) === String(bankAccountId));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <span>Cuenta bancaria</span>
          <span className="text-muted-foreground font-normal text-[11px]">(opcional)</span>
        </label>
        <button
          type="button"
          onClick={onNewAccount}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
          title="Crear una nueva cuenta bancaria"
        >
          <Plus className="size-3.5" />
          + Nueva cuenta
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={bankAccountId}
          onChange={(e) => {
            if (e.target.value === "__new__") {
              onNewAccount();
            } else {
              setBankAccountId(e.target.value);
            }
          }}
          className="h-9 w-full min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">
            Sin cuenta bancaria (Caja general / Efectivo)
          </option>
          <option value="__new__" className="font-semibold text-primary">
            ＋ Registrar nueva cuenta {currency ? `(${currency})` : ""}…
          </option>
          {filteredAccounts.map((a) => {
            const accCurr = a.currency || "ARS";
            const tag = accCurr === "BRL" ? "🇧🇷 BRL" : "🇦🇷 ARS";
            return (
              <option key={a.id} value={a.id}>
                [{tag}] {a.name} · {a.bank_name || "Banco"} ({formatMoney(a.balance, accCurr)})
              </option>
            );
          })}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-2.5 text-xs font-semibold border-border/80 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
          onClick={onNewAccount}
          title="Crear nueva cuenta bancaria"
        >
          <Plus className="size-3.5 text-primary" />
          <span className="hidden sm:inline">Nueva</span>
        </Button>
      </div>

      {selected && (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 p-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-bold text-foreground truncate max-w-[140px]" title={selected.name}>
              {selected.name}
            </span>
            <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize">
              {selected.bank_name || "Banco"}
            </Badge>
            <Badge variant="secondary" className="text-[10px] py-0 px-1 font-bold">
              {selected.currency === "BRL" ? "🇧🇷 BRL" : "🇦🇷 ARS"}
            </Badge>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
              Saldo: {formatMoney(selected.balance, selected.currency || "ARS")}
            </span>
            {selected.account_number && (
              <span className="text-muted-foreground text-[10px] truncate max-w-[110px]" title={selected.account_number}>
                · {selected.account_number}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
