"use client";

import { useState, useEffect } from "react";
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
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { printShiftCloseThermalTicket } from "@/lib/thermal-printer";
import { toast } from "sonner";

const DENOMINATIONS_ARS = [20000, 10000, 2000, 1000, 500, 200, 100];
const DENOMINATIONS_BRL = [200, 100, 50, 20, 10, 5, 2];
const DENOMINATIONS_USD = [100, 50, 20, 10, 5, 2, 1];

interface OpenCashShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    initialCash: number;
    initialCashArs?: number;
    initialCashBrl?: number;
    initialCashUsd?: number;
    exchangeRateArs?: number;
    exchangeRateUsd?: number;
    openingNotes: string;
    cashierName: string;
  }) => Promise<void>;
  lastClosedShift?: any;
  defaultCashierName?: string;
  settings?: any;
}

export function OpenCashShiftModal({
  open,
  onOpenChange,
  onSubmit,
  lastClosedShift,
  defaultCashierName = "Administrador",
  settings = {},
}: OpenCashShiftModalProps) {
  const rateArs = Number(settings?.exchange_rate_ars || settings?.exchange_rate_brl) || 250;
  const rateUsd = Number(settings?.exchange_rate_usd) || 5.70;

  const suggestedArs = Number(lastClosedShift?.retained_cash_ars !== undefined ? lastClosedShift.retained_cash_ars : (lastClosedShift?.retained_cash || 0));
  const suggestedBrl = Number(lastClosedShift?.retained_cash_brl || 0);
  const suggestedUsd = Number(lastClosedShift?.retained_cash_usd || 0);
  const hasSuggested = suggestedArs > 0 || suggestedBrl > 0 || suggestedUsd > 0;

  const [initialCashArs, setInitialCashArs] = useState<number>(suggestedArs);
  const [initialCashBrl, setInitialCashBrl] = useState<number>(suggestedBrl);
  const [initialCashUsd, setInitialCashUsd] = useState<number>(suggestedUsd);

  const [openingNotes, setOpeningNotes] = useState("");
  const [cashierName, setCashierName] = useState(defaultCashierName);
  const [showDenominations, setShowDenominations] = useState(false);
  const [activeDenomTab, setActiveDenomTab] = useState<"ARS" | "BRL" | "USD">("ARS");

  const [countsArs, setCountsArs] = useState<Record<number, number>>({});
  const [countsBrl, setCountsBrl] = useState<Record<number, number>>({});
  const [countsUsd, setCountsUsd] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setInitialCashArs(suggestedArs);
      setInitialCashBrl(suggestedBrl);
      setInitialCashUsd(suggestedUsd);
      setCountsArs({});
      setCountsBrl({});
      setCountsUsd({});
      setShowDenominations(false);
    }
  }, [open, suggestedArs, suggestedBrl, suggestedUsd]);

  // Conversión y consolidación de montos
  const totalArs = Math.round(initialCashArs + (initialCashBrl * rateArs) + (initialCashUsd * rateUsd * rateArs));
  const totalBrl = Math.round((totalArs / rateArs) * 100) / 100;
  const totalUsd = Math.round((totalBrl / rateUsd) * 100) / 100;

  const handleApplySuggested = () => {
    setInitialCashArs(suggestedArs);
    setInitialCashBrl(suggestedBrl);
    setInitialCashUsd(suggestedUsd);
  };

  const handleCountChange = (currency: "ARS" | "BRL" | "USD", denom: number, qty: number) => {
    const validQty = Math.max(0, qty);
    if (currency === "ARS") {
      const nextCounts = { ...countsArs, [denom]: validQty };
      setCountsArs(nextCounts);
      const sum = Object.entries(nextCounts).reduce(
        (acc, [val, q]) => acc + Number(val) * Number(q || 0),
        0
      );
      setInitialCashArs(sum);
    } else if (currency === "BRL") {
      const nextCounts = { ...countsBrl, [denom]: validQty };
      setCountsBrl(nextCounts);
      const sum = Object.entries(nextCounts).reduce(
        (acc, [val, q]) => acc + Number(val) * Number(q || 0),
        0
      );
      setInitialCashBrl(sum);
    } else {
      const nextCounts = { ...countsUsd, [denom]: validQty };
      setCountsUsd(nextCounts);
      const sum = Object.entries(nextCounts).reduce(
        (acc, [val, q]) => acc + Number(val) * Number(q || 0),
        0
      );
      setInitialCashUsd(sum);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initialCashArs < 0 || initialCashBrl < 0 || initialCashUsd < 0) {
      toast.error("Los montos iniciales no pueden ser negativos.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        initialCash: totalArs,
        initialCashArs,
        initialCashBrl,
        initialCashUsd,
        exchangeRateArs: rateArs,
        exchangeRateUsd: rateUsd,
        openingNotes,
        cashierName,
      });
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
      <DialogContent className="sm:max-w-md bg-card max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <LockOpen className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold">Apertura de Caja</DialogTitle>
              <DialogDescription className="text-xs">
                Registrá el fondo inicial en multi-moneda para comenzar el turno.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {hasSuggested && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 block">
                  Fondo del turno anterior
                </span>
                <span className="text-muted-foreground text-[11px] block">
                  Se dejaron:{" "}
                  <strong>${suggestedArs.toLocaleString("es-AR")} ARS</strong>
                  {suggestedBrl > 0 && <> · <strong>R$ {suggestedBrl.toFixed(2)} BRL</strong></>}
                  {suggestedUsd > 0 && <> · <strong>US$ {suggestedUsd.toFixed(2)} USD</strong></>}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleApplySuggested}
                className="h-7 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 shrink-0 ml-2"
              >
                Usar sugerido
              </Button>
            </div>
          )}

          {/* Campos de Multi-Moneda para el Fondo Inicial */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Fondo Inicial en Efectivo por Moneda
              </Label>
              <span className="text-[10px] text-muted-foreground">
                Dinero en cajón para cambio
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Pesos Argentinos (ARS) */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span>🇦🇷</span> Pesos Argentinos ($ ARS)
                  </span>
                  {initialCashArs > 0 && (
                    <span className="font-mono text-emerald-600 font-bold text-xs">
                      {formatMoney(initialCashArs, "ARS")}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs font-bold">$</span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={initialCashArs === 0 ? "" : initialCashArs}
                    onChange={(e) => setInitialCashArs(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="pl-7 h-9 font-mono font-bold text-sm"
                    autoFocus
                  />
                </div>
              </div>

              {/* Reales Brasileños (BRL) */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span>🇧🇷</span> Reales Brasileños (R$ BRL)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-normal">
                      1 R$ = ${rateArs.toLocaleString("es-AR")} ARS
                    </span>
                    {initialCashBrl > 0 && (
                      <span className="font-mono text-emerald-600 font-bold text-xs">
                        {formatMoney(initialCashBrl, "BRL")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs font-bold">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={initialCashBrl === 0 ? "" : initialCashBrl}
                    onChange={(e) => setInitialCashBrl(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0.00"
                    className="pl-9 h-9 font-mono font-bold text-sm"
                  />
                </div>
              </div>

              {/* Dólares Estadounidenses (USD) */}
              <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span>🇺🇸</span> Dólares (US$ USD)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-normal">
                      1 US$ = R$ {rateUsd.toFixed(2)}
                    </span>
                    {initialCashUsd > 0 && (
                      <span className="font-mono text-emerald-600 font-bold text-xs">
                        {formatMoney(initialCashUsd, "USD")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs font-bold">US$</span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={initialCashUsd === 0 ? "" : initialCashUsd}
                    onChange={(e) => setInitialCashUsd(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0.00"
                    className="pl-11 h-9 font-mono font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Total Consolidado en tiempo real */}
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Coins className="size-3.5" /> Total Inicial Consolidado:
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Eq. {formatMoney(totalBrl, "BRL")} · {formatMoney(totalUsd, "USD")}
                </span>
              </div>
              <span className="font-mono font-black text-base text-foreground">
                {formatMoney(totalArs, "ARS")}
              </span>
            </div>
          </div>

          {/* Desglose rápido de billetes multi-moneda */}
          <div className="border rounded-xl p-2.5 bg-muted/20 space-y-2">
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
              <div className="pt-2 border-t space-y-2">
                <div className="flex gap-1 bg-muted/60 p-0.5 rounded-lg border text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveDenomTab("ARS")}
                    className={`flex-1 py-1 px-2 rounded-md font-bold text-xs transition-all ${
                      activeDenomTab === "ARS"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🇦🇷 ARS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDenomTab("BRL")}
                    className={`flex-1 py-1 px-2 rounded-md font-bold text-xs transition-all ${
                      activeDenomTab === "BRL"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🇧🇷 BRL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDenomTab("USD")}
                    className={`flex-1 py-1 px-2 rounded-md font-bold text-xs transition-all ${
                      activeDenomTab === "USD"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🇺🇸 USD
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {activeDenomTab === "ARS" &&
                    DENOMINATIONS_ARS.map((denom) => (
                      <div key={denom} className="flex items-center justify-between gap-1 text-xs">
                        <span className="font-mono text-[11px] text-muted-foreground">${denom.toLocaleString("es-AR")}</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-16 text-right font-mono text-xs px-1.5"
                          placeholder="0"
                          value={countsArs[denom] || ""}
                          onChange={(e) => handleCountChange("ARS", denom, Number(e.target.value) || 0)}
                        />
                      </div>
                    ))}

                  {activeDenomTab === "BRL" &&
                    DENOMINATIONS_BRL.map((denom) => (
                      <div key={denom} className="flex items-center justify-between gap-1 text-xs">
                        <span className="font-mono text-[11px] text-muted-foreground">R$ {denom}</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-16 text-right font-mono text-xs px-1.5"
                          placeholder="0"
                          value={countsBrl[denom] || ""}
                          onChange={(e) => handleCountChange("BRL", denom, Number(e.target.value) || 0)}
                        />
                      </div>
                    ))}

                  {activeDenomTab === "USD" &&
                    DENOMINATIONS_USD.map((denom) => (
                      <div key={denom} className="flex items-center justify-between gap-1 text-xs">
                        <span className="font-mono text-[11px] text-muted-foreground">US$ {denom}</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-16 text-right font-mono text-xs px-1.5"
                          placeholder="0"
                          value={countsUsd[denom] || ""}
                          onChange={(e) => handleCountChange("USD", denom, Number(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                </div>
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
              disabled={busy}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm gap-2 shadow-md shadow-emerald-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <LockOpen className="size-4" />
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
    actualCashArs?: number;
    actualCashBrl?: number;
    actualCashUsd?: number;
    withdrawnCashArs?: number;
    withdrawnCashBrl?: number;
    withdrawnCashUsd?: number;
    retainedCashArs?: number;
    retainedCashBrl?: number;
    retainedCashUsd?: number;
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
  const shift = activeShift || {};
  const rateArs = Number(shift.exchange_rate_ars || settings?.exchange_rate_ars || settings?.exchange_rate_brl) || 250;
  const rateUsd = Number(shift.exchange_rate_usd || settings?.exchange_rate_usd) || 5.70;

  const initialCash = Number(shift.initial_cash || 0);
  const initialCashArs = Number(shift.initial_cash_ars !== undefined ? shift.initial_cash_ars : initialCash);
  const initialCashBrl = Number(shift.initial_cash_brl || 0);
  const initialCashUsd = Number(shift.initial_cash_usd || 0);

  const cashSales = Number(shift.cash_sales || 0);
  const cashSalesArs = Number(shift.cash_sales_ars !== undefined ? shift.cash_sales_ars : cashSales);
  const cashSalesBrl = Number(shift.cash_sales_brl || 0);
  const cashSalesUsd = Number(shift.cash_sales_usd || 0);

  const otherSales = Number(shift.other_sales || 0);
  const totalSales = Number(shift.total_sales || (cashSales + otherSales));
  const salesCount = Number(shift.sales_count || 0);
  const cashIncomes = Number(shift.cash_incomes || 0);
  const cashExpenses = Number(shift.cash_expenses || 0);

  const expectedCash = Number(shift.expected_cash !== undefined ? shift.expected_cash : (initialCash + cashSales + cashIncomes - cashExpenses));
  const expectedCashArs = Number(shift.expected_cash_ars !== undefined ? shift.expected_cash_ars : (initialCashArs + cashSalesArs + cashIncomes - cashExpenses));
  const expectedCashBrl = Number(shift.expected_cash_brl !== undefined ? shift.expected_cash_brl : (initialCashBrl + cashSalesBrl));
  const expectedCashUsd = Number(shift.expected_cash_usd !== undefined ? shift.expected_cash_usd : (initialCashUsd + cashSalesUsd));

  const hasMultiCurrency = initialCashBrl > 0 || initialCashUsd > 0 || cashSalesBrl > 0 || cashSalesUsd > 0;

  const [actualCashArs, setActualCashArs] = useState<number>(0);
  const [actualCashBrl, setActualCashBrl] = useState<number>(0);
  const [actualCashUsd, setActualCashUsd] = useState<number>(0);

  const [withdrawnCashArs, setWithdrawnCashArs] = useState<number>(0);
  const [withdrawnCashBrl, setWithdrawnCashBrl] = useState<number>(0);
  const [withdrawnCashUsd, setWithdrawnCashUsd] = useState<number>(0);

  const [closingNotes, setClosingNotes] = useState("");
  const [cashierName, setCashierName] = useState(defaultCashierName);
  const [showDenominations, setShowDenominations] = useState(false);
  const [activeDenomTab, setActiveDenomTab] = useState<"ARS" | "BRL" | "USD">("ARS");

  const [countsArs, setCountsArs] = useState<Record<number, number>>({});
  const [countsBrl, setCountsBrl] = useState<Record<number, number>>({});
  const [countsUsd, setCountsUsd] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && activeShift) {
      setActualCashArs(expectedCashArs);
      setActualCashBrl(expectedCashBrl);
      setActualCashUsd(expectedCashUsd);
      setWithdrawnCashArs(0);
      setWithdrawnCashBrl(0);
      setWithdrawnCashUsd(0);
      setClosingNotes("");
      setShowDenominations(false);
      setCountsArs({});
      setCountsBrl({});
      setCountsUsd({});
    }
  }, [open, activeShift, expectedCashArs, expectedCashBrl, expectedCashUsd]);

  // Consolidación en ARS
  const actualCashTotal = Math.round(actualCashArs + (actualCashBrl * rateArs) + (actualCashUsd * rateUsd * rateArs));
  const differenceTotal = actualCashTotal - expectedCash;

  const diffArs = actualCashArs - expectedCashArs;
  const diffBrl = Math.round((actualCashBrl - expectedCashBrl) * 100) / 100;
  const diffUsd = Math.round((actualCashUsd - expectedCashUsd) * 100) / 100;

  const retainedCashArs = Math.max(0, actualCashArs - withdrawnCashArs);
  const retainedCashBrl = Math.max(0, Math.round((actualCashBrl - withdrawnCashBrl) * 100) / 100);
  const retainedCashUsd = Math.max(0, Math.round((actualCashUsd - withdrawnCashUsd) * 100) / 100);

  const withdrawnCashTotal = Math.round(withdrawnCashArs + (withdrawnCashBrl * rateArs) + (withdrawnCashUsd * rateUsd * rateArs));
  const retainedCashTotal = Math.max(0, actualCashTotal - withdrawnCashTotal);

  const handleCountChange = (currency: "ARS" | "BRL" | "USD", denom: number, qty: number) => {
    const validQty = Math.max(0, qty);
    if (currency === "ARS") {
      const nextCounts = { ...countsArs, [denom]: validQty };
      setCountsArs(nextCounts);
      const sum = Object.entries(nextCounts).reduce(
        (acc, [val, q]) => acc + Number(val) * Number(q || 0),
        0
      );
      setActualCashArs(sum);
    } else if (currency === "BRL") {
      const nextCounts = { ...countsBrl, [denom]: validQty };
      setCountsBrl(nextCounts);
      const sum = Object.entries(nextCounts).reduce(
        (acc, [val, q]) => acc + Number(val) * Number(q || 0),
        0
      );
      setActualCashBrl(sum);
    } else {
      const nextCounts = { ...countsUsd, [denom]: validQty };
      setCountsUsd(nextCounts);
      const sum = Object.entries(nextCounts).reduce(
        (acc, [val, q]) => acc + Number(val) * Number(q || 0),
        0
      );
      setActualCashUsd(sum);
    }
  };

  const handleSetExactCash = () => {
    setActualCashArs(expectedCashArs);
    setActualCashBrl(expectedCashBrl);
    setActualCashUsd(expectedCashUsd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualCashArs < 0 || actualCashBrl < 0 || actualCashUsd < 0) {
      toast.error("El efectivo contado no puede ser negativo.");
      return;
    }
    if (withdrawnCashArs > actualCashArs || withdrawnCashBrl > actualCashBrl || withdrawnCashUsd > actualCashUsd) {
      toast.error("El monto retirado no puede superar el efectivo disponible en caja para cada moneda.");
      return;
    }

    setBusy(true);
    try {
      const result = await onSubmit({
        shiftId: activeShift.id,
        actualCash: actualCashTotal,
        withdrawnCash: withdrawnCashTotal,
        retainedCash: retainedCashTotal,
        actualCashArs,
        actualCashBrl,
        actualCashUsd,
        withdrawnCashArs,
        withdrawnCashBrl,
        withdrawnCashUsd,
        retainedCashArs,
        retainedCashBrl,
        retainedCashUsd,
        closingNotes,
        cashierName,
      });

      toast.success("Turno de caja cerrado con éxito.");
      onOpenChange(false);

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

  if (!activeShift) return null;

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
                <span>(+) Fondo Inicial Total:</span>
                <span className="font-mono font-semibold text-foreground">{formatMoney(initialCash, "ARS")}</span>
              </div>
              {hasMultiCurrency && (
                <div className="pl-3 text-[11px] space-y-0.5 text-muted-foreground/90 pb-1">
                  {initialCashArs > 0 && <div>· En Pesos: {formatMoney(initialCashArs, "ARS")}</div>}
                  {initialCashBrl > 0 && <div>· En Reales: {formatMoney(initialCashBrl, "BRL")}</div>}
                  {initialCashUsd > 0 && <div>· En Dólares: {formatMoney(initialCashUsd, "USD")}</div>}
                </div>
              )}

              <div className="flex justify-between">
                <span>(+) Ventas en Efectivo ({salesCount}):</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(cashSales, "ARS")}
                </span>
              </div>
              {hasMultiCurrency && (
                <div className="pl-3 text-[11px] space-y-0.5 text-emerald-600 dark:text-emerald-400 pb-1">
                  {cashSalesArs > 0 && <div>· Ventas Pesos: +{formatMoney(cashSalesArs, "ARS")}</div>}
                  {cashSalesBrl > 0 && <div>· Ventas Reales: +{formatMoney(cashSalesBrl, "BRL")}</div>}
                  {cashSalesUsd > 0 && <div>· Ventas Dólares: +{formatMoney(cashSalesUsd, "USD")}</div>}
                </div>
              )}

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
            {hasMultiCurrency && (
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground border-t">
                <span>Esperado:</span>
                <span className="font-mono font-bold text-foreground">🇦🇷 {formatMoney(expectedCashArs, "ARS")}</span>
                {expectedCashBrl > 0 && <span className="font-mono font-bold text-emerald-600">· 🇧🇷 {formatMoney(expectedCashBrl, "BRL")}</span>}
                {expectedCashUsd > 0 && <span className="font-mono font-bold text-blue-600">· 🇺🇸 {formatMoney(expectedCashUsd, "USD")}</span>}
              </div>
            )}

            {otherSales > 0 && (
              <div className="pt-1 border-t text-[11px] text-muted-foreground flex justify-between">
                <span>Ventas por Transferencia / Tarjeta:</span>
                <span className="font-mono font-medium">{formatMoney(otherSales, "ARS")}</span>
              </div>
            )}
          </div>

          {/* Arqueo: Ingreso del Efectivo Real Multi-moneda */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                Efectivo Real Contado en el Cajón
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleSetExactCash}
                className="text-[11px] h-6 text-primary hover:text-primary/80"
              >
                Caja exacta ({formatMoney(expectedCash, "ARS")})
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Pesos ARS */}
              <div className="rounded-xl border p-2 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1">
                    <span>🇦🇷</span> Efectivo en Pesos ($ ARS)
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Esperado: <strong>{formatMoney(expectedCashArs, "ARS")}</strong>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs font-bold">$</span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={actualCashArs === 0 ? "" : actualCashArs}
                    onChange={(e) => setActualCashArs(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="pl-7 h-9 font-mono font-bold text-sm"
                  />
                </div>
              </div>

              {/* Reales BRL */}
              {(hasMultiCurrency || expectedCashBrl > 0) && (
                <div className="rounded-xl border p-2 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      <span>🇧🇷</span> Efectivo en Reales (R$ BRL)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Esperado: <strong>{formatMoney(expectedCashBrl, "BRL")}</strong>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs font-bold">R$</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={actualCashBrl === 0 ? "" : actualCashBrl}
                      onChange={(e) => setActualCashBrl(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0.00"
                      className="pl-9 h-9 font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Dólares USD */}
              {(hasMultiCurrency || expectedCashUsd > 0) && (
                <div className="rounded-xl border p-2 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      <span>🇺🇸</span> Efectivo en Dólares (US$ USD)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Esperado: <strong>{formatMoney(expectedCashUsd, "USD")}</strong>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground font-mono text-xs font-bold">US$</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={actualCashUsd === 0 ? "" : actualCashUsd}
                      onChange={(e) => setActualCashUsd(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0.00"
                      className="pl-11 h-9 font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Indicador de Diferencia Consolidada */}
            <div className={`rounded-xl p-3 flex items-center justify-between border text-xs font-semibold ${
              differenceTotal === 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : differenceTotal > 0
                ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400"
                : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
            }`}>
              <div className="space-y-0.5">
                <span className="flex items-center gap-1.5 font-bold">
                  {differenceTotal === 0 ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="size-4" />
                  )}
                  {differenceTotal === 0 ? "Caja Exacta (Sin diferencias)" : differenceTotal > 0 ? "Sobrante de Caja" : "Faltante de Caja"}
                </span>
                {hasMultiCurrency && (
                  <div className="text-[10px] text-muted-foreground space-x-2 pl-5">
                    <span>ARS: {diffArs > 0 ? `+$${diffArs}` : diffArs < 0 ? `-$${Math.abs(diffArs)}` : "$0"}</span>
                    {expectedCashBrl > 0 && <span>· BRL: {diffBrl > 0 ? `+R$${diffBrl}` : diffBrl < 0 ? `-R$${Math.abs(diffBrl)}` : "R$0"}</span>}
                    {expectedCashUsd > 0 && <span>· USD: {diffUsd > 0 ? `+US$${diffUsd}` : diffUsd < 0 ? `-US$${Math.abs(diffUsd)}` : "US$0"}</span>}
                  </div>
                )}
              </div>
              <span className="font-mono text-sm font-black">
                {differenceTotal > 0 ? `+${formatMoney(differenceTotal, "ARS")}` : differenceTotal < 0 ? `-${formatMoney(Math.abs(differenceTotal), "ARS")}` : "$ 0"}
              </span>
            </div>
          </div>

          {/* Calculadora de Billetes para el Arqueo */}
          <div className="border rounded-xl p-2.5 bg-muted/20 space-y-2">
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
              <div className="pt-2 border-t space-y-2">
                <div className="flex gap-1 bg-muted/60 p-0.5 rounded-lg border text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveDenomTab("ARS")}
                    className={`flex-1 py-1 px-2 rounded-md font-bold text-xs transition-all ${
                      activeDenomTab === "ARS"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🇦🇷 ARS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDenomTab("BRL")}
                    className={`flex-1 py-1 px-2 rounded-md font-bold text-xs transition-all ${
                      activeDenomTab === "BRL"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🇧🇷 BRL
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDenomTab("USD")}
                    className={`flex-1 py-1 px-2 rounded-md font-bold text-xs transition-all ${
                      activeDenomTab === "USD"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🇺🇸 USD
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {activeDenomTab === "ARS" &&
                    DENOMINATIONS_ARS.map((denom) => (
                      <div key={denom} className="flex items-center justify-between gap-1 text-xs">
                        <span className="font-mono text-[11px] text-muted-foreground">${denom.toLocaleString("es-AR")}</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-16 text-right font-mono text-xs px-1.5"
                          placeholder="0"
                          value={countsArs[denom] || ""}
                          onChange={(e) => handleCountChange("ARS", denom, Number(e.target.value) || 0)}
                        />
                      </div>
                    ))}

                  {activeDenomTab === "BRL" &&
                    DENOMINATIONS_BRL.map((denom) => (
                      <div key={denom} className="flex items-center justify-between gap-1 text-xs">
                        <span className="font-mono text-[11px] text-muted-foreground">R$ {denom}</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-16 text-right font-mono text-xs px-1.5"
                          placeholder="0"
                          value={countsBrl[denom] || ""}
                          onChange={(e) => handleCountChange("BRL", denom, Number(e.target.value) || 0)}
                        />
                      </div>
                    ))}

                  {activeDenomTab === "USD" &&
                    DENOMINATIONS_USD.map((denom) => (
                      <div key={denom} className="flex items-center justify-between gap-1 text-xs">
                        <span className="font-mono text-[11px] text-muted-foreground">US$ {denom}</span>
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-16 text-right font-mono text-xs px-1.5"
                          placeholder="0"
                          value={countsUsd[denom] || ""}
                          onChange={(e) => handleCountChange("USD", denom, Number(e.target.value) || 0)}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Destino de los Fondos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="withdrawn-cash" className="text-xs font-semibold">
                Retirar a Tesorería / Dueño
              </Label>
              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-muted-foreground font-mono text-xs">$</span>
                  <Input
                    id="withdrawn-cash"
                    type="number"
                    min={0}
                    max={actualCashArs}
                    value={withdrawnCashArs === 0 ? "" : withdrawnCashArs}
                    onChange={(e) => setWithdrawnCashArs(Math.min(actualCashArs, Math.max(0, Number(e.target.value) || 0)))}
                    placeholder="0 ARS"
                    className="pl-6 h-8 font-mono text-xs font-bold"
                  />
                </div>
                {hasMultiCurrency && actualCashBrl > 0 && (
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-muted-foreground font-mono text-xs">R$</span>
                    <Input
                      type="number"
                      min={0}
                      max={actualCashBrl}
                      value={withdrawnCashBrl === 0 ? "" : withdrawnCashBrl}
                      onChange={(e) => setWithdrawnCashBrl(Math.min(actualCashBrl, Math.max(0, Number(e.target.value) || 0)))}
                      placeholder="0.00 BRL"
                      className="pl-8 h-8 font-mono text-xs font-bold"
                    />
                  </div>
                )}
                {hasMultiCurrency && actualCashUsd > 0 && (
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-muted-foreground font-mono text-xs">US$</span>
                    <Input
                      type="number"
                      min={0}
                      max={actualCashUsd}
                      value={withdrawnCashUsd === 0 ? "" : withdrawnCashUsd}
                      onChange={(e) => setWithdrawnCashUsd(Math.min(actualCashUsd, Math.max(0, Number(e.target.value) || 0)))}
                      placeholder="0.00 USD"
                      className="pl-10 h-8 font-mono text-xs font-bold"
                    />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Efectivo que se retira del local.</p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-2 py-0 border-border"
                  onClick={() => {
                    setWithdrawnCashArs(Math.max(0, actualCashArs - initialCashArs));
                    setWithdrawnCashBrl(Math.max(0, actualCashBrl - initialCashBrl));
                    setWithdrawnCashUsd(Math.max(0, actualCashUsd - initialCashUsd));
                  }}
                >
                  Dejar fondo inicial
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-2 py-0 border-border"
                  onClick={() => {
                    setWithdrawnCashArs(actualCashArs);
                    setWithdrawnCashBrl(actualCashBrl);
                    setWithdrawnCashUsd(actualCashUsd);
                  }}
                >
                  Retirar todo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-[10px] h-6 px-2 py-0 border-border"
                  onClick={() => {
                    setWithdrawnCashArs(0);
                    setWithdrawnCashBrl(0);
                    setWithdrawnCashUsd(0);
                  }}
                >
                  Dejar todo
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="retained-cash" className="text-xs font-semibold">
                Queda en Cajón (Siguiente turno)
              </Label>
              <div className="rounded-xl border bg-muted/40 p-2 text-xs space-y-1 font-mono">
                <div className="flex justify-between font-bold text-foreground">
                  <span>Total Consolidado:</span>
                  <span>{formatMoney(retainedCashTotal, "ARS")}</span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-0.5 pt-0.5 border-t">
                  <div className="flex justify-between">
                    <span>🇦🇷 Pesos:</span>
                    <span>{formatMoney(retainedCashArs, "ARS")}</span>
                  </div>
                  {hasMultiCurrency && (
                    <>
                      <div className="flex justify-between">
                        <span>🇧🇷 Reales:</span>
                        <span>{formatMoney(retainedCashBrl, "BRL")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>🇺🇸 Dólares:</span>
                        <span>{formatMoney(retainedCashUsd, "USD")}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Fondo disponible para el próximo turno.</p>
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
              disabled={busy}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-sm gap-2 shadow-md shadow-rose-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Printer className="size-4" />
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
  const initialCashArs = Number(shift.initial_cash_ars !== undefined ? shift.initial_cash_ars : initialCash);
  const initialCashBrl = Number(shift.initial_cash_brl || 0);
  const initialCashUsd = Number(shift.initial_cash_usd || 0);

  const cashSales = Number(shift.cash_sales || 0);
  const cashSalesArs = Number(shift.cash_sales_ars !== undefined ? shift.cash_sales_ars : cashSales);
  const cashSalesBrl = Number(shift.cash_sales_brl || 0);
  const cashSalesUsd = Number(shift.cash_sales_usd || 0);

  const otherSales = Number(shift.other_sales || 0);
  const totalSales = Number(shift.total_sales || (cashSales + otherSales));
  const expectedCash = Number(shift.expected_cash || 0);
  const actualCash = Number(shift.actual_cash !== undefined ? shift.actual_cash : expectedCash);
  const difference = Number(shift.difference || 0);
  const withdrawnCash = Number(shift.withdrawn_cash || 0);
  const retainedCash = Number(shift.retained_cash || 0);

  const hasMultiCurrency = initialCashBrl > 0 || initialCashUsd > 0 || cashSalesBrl > 0 || cashSalesUsd > 0;
  const isClosed = shift.status === "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card max-h-[92vh] overflow-y-auto">
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
              <span className="text-muted-foreground">Fondo Inicial Total:</span>
              <span className="font-mono font-semibold">{formatMoney(initialCash, "ARS")}</span>
            </div>
            {hasMultiCurrency && (
              <div className="pl-3 text-[11px] text-muted-foreground space-y-0.5 border-l-2 border-primary/30 my-1">
                {initialCashArs > 0 && <div>· ARS: {formatMoney(initialCashArs, "ARS")}</div>}
                {initialCashBrl > 0 && <div>· BRL: {formatMoney(initialCashBrl, "BRL")}</div>}
                {initialCashUsd > 0 && <div>· USD: {formatMoney(initialCashUsd, "USD")}</div>}
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Ventas en Efectivo ({shift.sales_count || 0}):</span>
              <span className="font-mono font-semibold text-emerald-600">+{formatMoney(cashSales, "ARS")}</span>
            </div>
            {hasMultiCurrency && (
              <div className="pl-3 text-[11px] text-emerald-600 dark:text-emerald-400 space-y-0.5 border-l-2 border-emerald-500/30 my-1">
                {cashSalesArs > 0 && <div>· Ventas ARS: +{formatMoney(cashSalesArs, "ARS")}</div>}
                {cashSalesBrl > 0 && <div>· Ventas BRL: +{formatMoney(cashSalesBrl, "BRL")}</div>}
                {cashSalesUsd > 0 && <div>· Ventas USD: +{formatMoney(cashSalesUsd, "USD")}</div>}
              </div>
            )}

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
                {hasMultiCurrency && (shift.retained_cash_brl > 0 || shift.retained_cash_usd > 0) && (
                  <div className="pl-3 text-[10px] text-muted-foreground">
                    {shift.retained_cash_ars !== undefined && <span>· ARS: {formatMoney(shift.retained_cash_ars, "ARS")} </span>}
                    {shift.retained_cash_brl > 0 && <span>· BRL: {formatMoney(shift.retained_cash_brl, "BRL")} </span>}
                    {shift.retained_cash_usd > 0 && <span>· USD: {formatMoney(shift.retained_cash_usd, "USD")}</span>}
                  </div>
                )}
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
