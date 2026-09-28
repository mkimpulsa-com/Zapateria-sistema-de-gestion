"use client";

import { useMemo, useState } from "react";
import {
  Landmark, Plus, ArrowRightLeft, Wallet, CreditCard, Building2,
  TrendingUp, TrendingDown, Pencil, Trash2, ArrowUpRight, ArrowDownLeft,
  Search, ShieldCheck, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface BankAccountsViewProps {
  accounts: any[];
  movements: any[];
  onNewAccount: () => void;
  onEditAccount: (account: any) => void;
  onDeleteAccount: (account: any) => void;
  onTransfer: () => void;
}

const formatMoney = (val: number, currency = "ARS") => {
  if (currency === "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(val || 0);
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

const formatDate = (val: string) => {
  if (!val) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(val));
  } catch {
    return val;
  }
};

const accountTypeLabel: Record<string, string> = {
  corriente: "Cta. Corriente",
  ahorros: "Caja de Ahorros",
  billetera_virtual: "Billetera Virtual",
  caja_efectivo: "Caja / Efectivo",
};

export function BankAccountsView({
  accounts = [],
  movements = [],
  onNewAccount,
  onEditAccount,
  onDeleteAccount,
  onTransfer,
}: BankAccountsViewProps) {
  const [query, setQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [deletingAccount, setDeletingAccount] = useState<any | null>(null);

  const totalBalanceArs = useMemo(
    () => accounts.filter((a) => a.currency !== "BRL").reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [accounts]
  );
  const totalBalanceBrl = useMemo(
    () => accounts.filter((a) => a.currency === "BRL").reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [accounts]
  );

  const filteredAccounts = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return accounts;
    return accounts.filter((a) =>
      [a.name, a.bank_name, a.account_number, a.account_type, a.currency, a.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [accounts, query]);

  const filteredMovements = useMemo(() => {
    let list = movements;
    if (selectedAccountId !== "all") {
      list = list.filter((m) => String(m.account_id) === selectedAccountId);
    }
    return list.slice(0, 50);
  }, [movements, selectedAccountId]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Cuentas Bancarias y Fondos</h2>
          <p className="text-sm text-muted-foreground">
            Administrá cuentas, billeteras y cajas en Pesos ($ ARS) y Reales (R$ BRL), transferí fondos y auditá saldos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={onTransfer}
            disabled={accounts.length < 2}
            className="gap-2 rounded-xl"
            title={accounts.length < 2 ? "Se requieren al menos 2 cuentas para transferir" : "Transferir saldo entre cuentas"}
          >
            <ArrowRightLeft className="size-4 text-primary" />
            Transferir saldo
          </Button>
          <Button onClick={onNewAccount} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" />
            Nueva cuenta
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo Total Pesos ($ ARS)</p>
              <p className="mt-1 text-2xl font-black text-foreground">{formatMoney(totalBalanceArs, "ARS")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{accounts.filter(a => a.currency !== "BRL").length} cuentas en pesos</p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <Wallet className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Saldo Total Reales (R$ BRL)</p>
              <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatMoney(totalBalanceBrl, "BRL")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{accounts.filter(a => a.currency === "BRL").length} cuentas / PIX en reales</p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <Landmark className="size-6" />
            </span>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/30 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Movimientos y Transferencias</p>
              <p className="mt-1 text-2xl font-black text-foreground">{movements.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{accounts.length} cuentas registradas en total</p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40">
              <History className="size-6" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Grid of Bank Accounts */}
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            Cuentas Disponibles ({filteredAccounts.length})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar cuenta..."
              className="h-9 pl-8 text-xs rounded-xl bg-card"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <Card className="border border-dashed p-8 text-center shadow-none">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Landmark className="size-6" />
            </div>
            <h4 className="mt-3 font-semibold text-foreground">No hay cuentas bancarias registradas</h4>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Creá tu primera cuenta bancaria o caja para poder asignar los ingresos de ventas y hacer transferencias.
            </p>
            <Button onClick={onNewAccount} className="mt-4 gap-2">
              <Plus className="size-4" />
              Crear cuenta bancaria
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAccounts.map((account) => {
              const bal = Number(account.balance || 0);
              return (
                <Card
                  key={account.id}
                  className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary to-primary/60" />
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                            {accountTypeLabel[account.account_type] || account.account_type || "Cuenta"}
                          </Badge>
                          {account.currency === "BRL" ? (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold">
                              🇧🇷 BRL
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10 text-[10px] font-bold">
                              🇦🇷 ARS
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight font-bold text-foreground">
                          {account.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {account.bank_name || "Banco"}
                        </p>
                      </div>
                      <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                        <Landmark className="size-4" />
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 pb-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Saldo disponible ({account.currency === "BRL" ? "R$ BRL" : "$ ARS"})
                      </p>
                      <p className={`text-2xl font-extrabold tracking-tight ${bal < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {formatMoney(bal, account.currency || "ARS")}
                      </p>
                    </div>

                    {account.account_number && (
                      <div className="rounded-xl bg-muted/50 px-3 py-1.5 text-xs font-mono text-muted-foreground truncate" title={account.account_number}>
                        {account.account_number}
                      </div>
                    )}

                    {account.notes && (
                      <p className="text-xs text-muted-foreground italic truncate" title={account.notes}>
                        {account.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onEditAccount(account)}
                      >
                        <Pencil className="size-3.5 text-blue-600" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingAccount(account)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Movements Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="size-4 text-primary" />
              Movimientos y Transferencias Bancarias
            </CardTitle>
            <CardDescription>
              Trazabilidad en tiempo real de ingresos por ventas, transferencias y ajustes de saldo.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Filtrar por cuenta:</span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="h-8 rounded-lg border bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas las cuentas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency === "BRL" ? "R$ BRL" : "$ ARS"})
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="px-2 sm:px-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Concepto / Detalle</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Saldo Posterior</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    No hay movimientos registrados para esta cuenta aún.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((m) => {
                  const isIngreso = m.type === "ingreso" || m.category?.includes("recibida");
                  const movCurrency = (m as any).currency || accounts.find((a) => a.id === m.account_id)?.currency || "ARS";
                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {formatDate(m.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm">{m.account_name || "Cuenta"}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{m.description || m.category}</p>
                        <span className="text-[11px] text-muted-foreground">{m.category}</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {m.reference || "—"}
                      </TableCell>
                      <TableCell className={`text-right font-bold text-sm whitespace-nowrap ${
                        isIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {isIngreso ? "+" : "-"}{formatMoney(m.amount, movCurrency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {m.balance_after !== undefined ? formatMoney(m.balance_after, movCurrency) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deletingAccount)} onOpenChange={(v) => !v && setDeletingAccount(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la cuenta {deletingAccount?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar la cuenta <strong>{deletingAccount?.name}</strong> ({deletingAccount?.bank_name}).
              {Number(deletingAccount?.balance || 0) > 0 && (
                <span className="mt-2 block font-semibold text-destructive">
                  ¡Atención! Esta cuenta registra un saldo de {formatMoney(deletingAccount.balance, deletingAccount.currency || "ARS")}. Al eliminarla se perderá el control de ese saldo.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingAccount) {
                  onDeleteAccount(deletingAccount);
                  setDeletingAccount(null);
                }
              }}
            >
              Sí, eliminar cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
