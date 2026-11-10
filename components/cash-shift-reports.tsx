"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Calendar,
  Filter,
  Download,
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  WalletCards,
  Lock,
  LockOpen,
  Coins,
  BarChart3,
  Search,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Building2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currency";
import { printShiftCloseThermalTicket } from "@/lib/thermal-printer";
import { toast } from "sonner";

interface CashShiftReportsProps {
  cashShifts: any[];
  sales?: any[];
  pettyCashMovements?: any[];
  settings?: any;
  onViewShift?: (shift: any) => void;
  onDeleteShift?: (shift: any) => void;
  isCashier?: boolean;
}

export function CashShiftReports({
  cashShifts = [],
  sales = [],
  pettyCashMovements = [],
  settings = {},
  onViewShift,
  onDeleteShift,
  isCashier = false,
}: CashShiftReportsProps) {
  const getShiftPettyStats = (shift: any) => {
    const openTime = shift?.opened_at ? String(shift.opened_at) : "";
    const closeTime = shift?.closed_at ? String(shift.closed_at) : "";
    const moves = openTime
      ? (pettyCashMovements || []).filter((m: any) => {
          const t = String(m.created_at || "");
          return closeTime ? t >= openTime && t <= closeTime : t >= openTime;
        })
      : [];
    const inArs = shift?.petty_cash_incomes_ars !== undefined
      ? Number(shift.petty_cash_incomes_ars)
      : moves.filter((m: any) => (m.currency || "ARS") === "ARS" && m.type === "ingreso").reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const outArs = shift?.petty_cash_expenses_ars !== undefined
      ? Number(shift.petty_cash_expenses_ars)
      : moves.filter((m: any) => (m.currency || "ARS") === "ARS" && m.type !== "ingreso").reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const inBrl = shift?.petty_cash_incomes_brl !== undefined
      ? Number(shift.petty_cash_incomes_brl)
      : moves.filter((m: any) => m.currency === "BRL" && m.type === "ingreso").reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    const outBrl = shift?.petty_cash_expenses_brl !== undefined
      ? Number(shift.petty_cash_expenses_brl)
      : moves.filter((m: any) => m.currency === "BRL" && m.type !== "ingreso").reduce((s: number, m: any) => s + Number(m.amount || 0), 0);
    return { inArs, outArs, inBrl, outBrl, count: shift?.petty_cash_count ?? moves.length };
  };
  // --- Estados de Filtro ---
  const [periodPreset, setPeriodPreset] = useState<"hoy" | "ayer" | "7dias" | "mes" | "mes_anterior" | "historico" | "custom">("mes");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [selectedCashier, setSelectedCashier] = useState<string>("todos");
  const [differenceFilter, setDifferenceFilter] = useState<"todos" | "exacta" | "sobrante" | "faltante">("todos");
  const [statusFilter, setStatusFilter] = useState<"todos" | "closed" | "open">("todos");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Lista de cajeros únicos para el filtro
  const uniqueCashiers = useMemo(() => {
    const set = new Set<string>();
    cashShifts.forEach((s) => {
      if (s.opened_by_name) set.add(s.opened_by_name);
      if (s.closed_by_name) set.add(s.closed_by_name);
    });
    return Array.from(set).filter(Boolean);
  }, [cashShifts]);

  // --- Filtrado de Turnos ---
  const filteredShifts = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    const last7DaysStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);

    const [curYear, curMonth] = selectedMonth.split("-").map(Number);
    const startOfSelectedMonth = new Date(curYear, curMonth - 1, 1, 0, 0, 0);
    const endOfSelectedMonth = new Date(curYear, curMonth, 0, 23, 59, 59, 999);

    const prevMonthYear = curMonth === 1 ? curYear - 1 : curYear;
    const prevMonthNum = curMonth === 1 ? 12 : curMonth - 1;
    const startOfPrevMonth = new Date(prevMonthYear, prevMonthNum - 1, 1, 0, 0, 0);
    const endOfPrevMonth = new Date(prevMonthYear, prevMonthNum, 0, 23, 59, 59, 999);

    return cashShifts.filter((shift) => {
      const shiftDate = new Date(shift.opened_at || shift.created_at || Date.now());

      // 1. Filtro temporal
      if (periodPreset === "hoy") {
        if (shiftDate < startOfToday || shiftDate > endOfToday) return false;
      } else if (periodPreset === "ayer") {
        if (shiftDate < startOfYesterday || shiftDate > endOfYesterday) return false;
      } else if (periodPreset === "7dias") {
        if (shiftDate < last7DaysStart || shiftDate > endOfToday) return false;
      } else if (periodPreset === "mes") {
        if (shiftDate < startOfSelectedMonth || shiftDate > endOfSelectedMonth) return false;
      } else if (periodPreset === "mes_anterior") {
        if (shiftDate < startOfPrevMonth || shiftDate > endOfPrevMonth) return false;
      } else if (periodPreset === "custom") {
        if (customFrom) {
          const fromD = new Date(`${customFrom}T00:00:00`);
          if (shiftDate < fromD) return false;
        }
        if (customTo) {
          const toD = new Date(`${customTo}T23:59:59`);
          if (shiftDate > toD) return false;
        }
      }

      // 2. Filtro por estado
      if (statusFilter !== "todos" && shift.status !== statusFilter) return false;

      // 3. Filtro por cajero
      if (selectedCashier !== "todos") {
        const openedBy = shift.opened_by_name || "";
        const closedBy = shift.closed_by_name || "";
        if (openedBy !== selectedCashier && closedBy !== selectedCashier) return false;
      }

      // 4. Filtro por diferencia de arqueo
      if (differenceFilter !== "todos") {
        if (shift.status !== "closed") return false;
        const diff = Number(shift.difference || 0);
        if (differenceFilter === "exacta" && diff !== 0) return false;
        if (differenceFilter === "sobrante" && diff <= 0) return false;
        if (differenceFilter === "faltante" && diff >= 0) return false;
      }

      // 5. Búsqueda de texto (número de turno, notas, cajero)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const str = [
          `#${shift.shift_number || ""}`,
          shift.opened_by_name,
          shift.closed_by_name,
          shift.closing_notes,
          shift.opening_notes,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!str.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => String(b.opened_at || "").localeCompare(String(a.opened_at || "")));
  }, [cashShifts, periodPreset, selectedMonth, customFrom, customTo, statusFilter, selectedCashier, differenceFilter, searchTerm]);

  // --- KPIs Consolidados ---
  const metrics = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let otherSales = 0;
    let withdrawnCash = 0;
    let retainedCash = 0;
    let netDifference = 0;
    let totalSalesCount = 0;
    let closedCount = 0;
    let openCount = 0;
    let exactCount = 0;
    let surplusCount = 0;
    let shortageCount = 0;

    let cashSalesArs = 0;
    let cashSalesBrl = 0;
    let cashSalesUsd = 0;

    filteredShifts.forEach((s) => {
      const isClosed = s.status === "closed";
      if (isClosed) closedCount++;
      else openCount++;

      const sTotal = Number(s.total_sales || (Number(s.cash_sales || 0) + Number(s.other_sales || 0)));
      const sCash = Number(s.cash_sales || 0);
      const sOther = Number(s.other_sales || 0);

      totalSales += sTotal;
      cashSales += sCash;
      otherSales += sOther;
      totalSalesCount += Number(s.sales_count || 0);

      cashSalesArs += Number(s.cash_sales_ars !== undefined ? s.cash_sales_ars : sCash);
      cashSalesBrl += Number(s.cash_sales_brl || 0);
      cashSalesUsd += Number(s.cash_sales_usd || 0);

      if (isClosed) {
        withdrawnCash += Number(s.withdrawn_cash || 0);
        retainedCash += Number(s.retained_cash || 0);
        const diff = Number(s.difference || 0);
        netDifference += diff;

        if (diff === 0) exactCount++;
        else if (diff > 0) surplusCount++;
        else shortageCount++;
      }
    });

    const avgPerShift = closedCount + openCount > 0 ? Math.round(totalSales / (closedCount + openCount)) : 0;

    return {
      totalSales,
      cashSales,
      otherSales,
      withdrawnCash,
      retainedCash,
      netDifference,
      totalSalesCount,
      closedCount,
      openCount,
      exactCount,
      surplusCount,
      shortageCount,
      avgPerShift,
      cashSalesArs,
      cashSalesBrl,
      cashSalesUsd,
      hasMultiCurrency: cashSalesBrl > 0 || cashSalesUsd > 0,
    };
  }, [filteredShifts]);

  // --- Datos para Gráficos Recharts ---
  // 1. Gráfico de Evolución Cronológica (por día / turno)
  const chartTimelineData = useMemo(() => {
    // Tomamos cronológicamente (más antiguo a más reciente) hasta 30 turnos para legibilidad
    const chronShifts = [...filteredShifts].reverse().slice(-25);

    return chronShifts.map((s) => {
      const openDate = s.opened_at ? new Date(s.opened_at) : new Date();
      const dateStr = openDate.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
      const label = `T#${s.shift_number || 1} (${dateStr})`;

      const cash = Number(s.cash_sales || 0);
      const other = Number(s.other_sales || 0);
      const total = Number(s.total_sales || (cash + other));
      const diff = Number(s.difference || 0);

      return {
        name: label,
        shiftNumber: s.shift_number || 1,
        date: dateStr,
        cashSales: cash,
        otherSales: other,
        totalSales: total,
        difference: diff,
        withdrawn: Number(s.withdrawn_cash || 0),
        cajero: s.closed_by_name || s.opened_by_name || "Admin",
      };
    });
  }, [filteredShifts]);

  // 2. Gráfico Donut de Composición de Cobros
  const chartPaymentPieData = useMemo(() => {
    const data = [];
    if (metrics.cashSales > 0) {
      data.push({ name: "Efectivo Físico", value: metrics.cashSales, color: "#10b981" });
    }
    if (metrics.otherSales > 0) {
      data.push({ name: "Transferencia / Tarjeta", value: metrics.otherSales, color: "#3b82f6" });
    }
    return data;
  }, [metrics]);

  // --- Exportación a CSV ---
  const handleExportCSV = () => {
    if (filteredShifts.length === 0) {
      toast.error("No hay turnos para exportar con los filtros seleccionados.");
      return;
    }

    const headers = [
      "Turno Nro",
      "Estado",
      "Fecha Apertura",
      "Hora Apertura",
      "Abierto Por",
      "Fecha Cierre",
      "Hora Cierre",
      "Cerrado Por",
      "Fondo Inicial ARS",
      "Fondo Inicial BRL",
      "Ventas Efectivo Total ARS",
      "Ventas Digitales ARS",
      "Total Ventas Turno",
      "Cantidad Ventas",
      "Efectivo Esperado",
      "Efectivo Real Contado",
      "Diferencia Arqueo",
      "Retirado a Tesoreria",
      "Fondo Retenido Proximo Turno",
      "Caja Chica Ingresos ARS",
      "Caja Chica Gastos ARS",
      "Caja Chica Ingresos BRL",
      "Caja Chica Gastos BRL",
      "Notas Cierre",
    ];

    const rows = filteredShifts.map((s) => {
      const openD = s.opened_at ? new Date(s.opened_at) : null;
      const closeD = s.closed_at ? new Date(s.closed_at) : null;
      const ps = getShiftPettyStats(s);

      return [
        s.shift_number || 1,
        s.status === "closed" ? "Cerrado" : "Abierto",
        openD ? openD.toLocaleDateString("es-AR") : "",
        openD ? openD.toLocaleTimeString("es-AR") : "",
        `"${(s.opened_by_name || "").replace(/"/g, '""')}"`,
        closeD ? closeD.toLocaleDateString("es-AR") : "",
        closeD ? closeD.toLocaleTimeString("es-AR") : "",
        `"${(s.closed_by_name || "").replace(/"/g, '""')}"`,
        Number(s.initial_cash_ars || s.initial_cash || 0),
        Number(s.initial_cash_brl || 0),
        Number(s.cash_sales || 0),
        Number(s.other_sales || 0),
        Number(s.total_sales || 0),
        Number(s.sales_count || 0),
        Number(s.expected_cash || 0),
        Number(s.actual_cash !== undefined ? s.actual_cash : s.expected_cash || 0),
        Number(s.difference || 0),
        Number(s.withdrawn_cash || 0),
        Number(s.retained_cash || 0),
        ps.inArs,
        ps.outArs,
        ps.inBrl,
        ps.outBrl,
        `"${(s.closing_notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Cierres_Caja_${periodPreset}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte CSV descargado correctamente.");
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <VaultIcon className="size-4" />
            </span>
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Reporte y Auditoría de Cierres Z
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análisis financiero de turnos, arqueos físicos de efectivo, diferencias de caja y métricas por período.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 rounded-xl font-bold text-xs shadow-2xs hover:bg-muted"
          >
            <Download className="size-3.5 text-primary" />
            <span>Exportar Excel / CSV</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros Inteligentes */}
      <Card className="border border-border/70 shadow-2xs bg-card">
        <CardContent className="p-4 space-y-3.5">
          {/* Fila 1: Botones Rápidos de Período */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b pb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
                <Calendar className="size-3.5 text-primary" />
                Período:
              </span>
              {[
                { id: "hoy", label: "Hoy" },
                { id: "ayer", label: "Ayer" },
                { id: "7dias", label: "Últimos 7 días" },
                { id: "mes", label: "Este mes" },
                { id: "mes_anterior", label: "Mes anterior" },
                { id: "historico", label: "Histórico completo" },
                { id: "custom", label: "Personalizado" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodPreset(p.id as any)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                    periodPreset === p.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Selector de Mes (si período es "mes" o "mes_anterior") */}
            {(periodPreset === "mes" || periodPreset === "mes_anterior") && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground font-medium">Mes:</span>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-8 text-xs font-mono font-bold w-36 bg-background"
                />
              </div>
            )}
          </div>

          {/* Rango Personalizado de Fechas (si se activa "custom") */}
          {periodPreset === "custom" && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs flex-wrap animate-in fade-in-50 duration-200">
              <span className="font-bold text-foreground">Rango específico:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Desde:</span>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 text-xs font-mono w-36 bg-background"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Hasta:</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 text-xs font-mono w-36 bg-background"
                />
              </div>
              {(customFrom || customTo) && (
                <button
                  type="button"
                  onClick={() => { setCustomFrom(""); setCustomTo(""); }}
                  className="text-xs text-destructive hover:underline ml-auto"
                >
                  Limpiar fechas
                </button>
              )}
            </div>
          )}

          {/* Fila 2: Filtros de Cajero, Diferencia y Búsqueda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-0.5">
            {/* Buscador de texto */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por Turno #, notas, cajero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Filtro por Cajero */}
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-muted-foreground shrink-0" />
              <select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="todos">Todos los cajeros</option>
                {uniqueCashiers.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Diferencia de Arqueo */}
            <div className="flex items-center gap-1.5">
              <Filter className="size-3.5 text-muted-foreground shrink-0" />
              <select
                value={differenceFilter}
                onChange={(e) => setDifferenceFilter(e.target.value as any)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="todos">Cualquier arqueo</option>
                <option value="exacta">Solo Cajas Exactas ($ 0)</option>
                <option value="faltante">Con Faltante de dinero</option>
                <option value="sobrante">Con Sobrante de dinero</option>
              </select>
            </div>

            {/* Filtro por Estado */}
            <div className="flex items-center gap-1.5">
              <Lock className="size-3.5 text-muted-foreground shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="todos">Todos los estados</option>
                <option value="closed">Solo turnos cerrados</option>
                <option value="open">Solo turnos en curso (abiertos)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel de Métricas Ejecutivas (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Ventas del Período */}
        <Card className="border border-border/70 shadow-2xs bg-gradient-to-br from-emerald-500/10 via-card to-card">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Recaudación Total</span>
              <TrendingUp className="size-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatMoney(metrics.totalSales, "ARS")}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex justify-between border-t border-border/50">
              <span>Efectivo: <strong>{formatMoney(metrics.cashSales, "ARS")}</strong></span>
              <span>Digital: <strong>{formatMoney(metrics.otherSales, "ARS")}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Retiros a Tesorería / Dueño */}
        <Card className="border border-border/70 shadow-2xs bg-card">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Retirado a Tesorería</span>
              <Building2 className="size-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black font-mono text-foreground">
              {formatMoney(metrics.withdrawnCash, "ARS")}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex justify-between border-t border-border/50">
              <span>Quedó en cajón:</span>
              <span className="font-bold text-foreground">{formatMoney(metrics.retainedCash, "ARS")}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Control de Diferencias y Faltantes */}
        <Card className={`border shadow-2xs ${
          metrics.netDifference === 0
            ? "border-emerald-500/40 bg-emerald-500/5"
            : metrics.netDifference > 0
            ? "border-blue-500/40 bg-blue-500/5"
            : "border-red-500/40 bg-red-500/5"
        }`}>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-foreground">Auditoría de Arqueos</span>
              {metrics.netDifference === 0 ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertTriangle className={`size-4 ${metrics.netDifference > 0 ? "text-blue-600" : "text-red-600"}`} />
              )}
            </div>
            <div className={`text-2xl font-black font-mono ${
              metrics.netDifference === 0
                ? "text-emerald-600"
                : metrics.netDifference > 0
                ? "text-blue-600"
                : "text-red-600"
            }`}>
              {metrics.netDifference > 0
                ? `+${formatMoney(metrics.netDifference, "ARS")}`
                : metrics.netDifference < 0
                ? `-${formatMoney(Math.abs(metrics.netDifference), "ARS")}`
                : "Exacta ($ 0)"}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between border-t border-border/50">
              <span>{metrics.exactCount} exactas · {metrics.shortageCount} faltantes</span>
              {metrics.surplusCount > 0 && <span>· {metrics.surplusCount} sobrantes</span>}
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Turnos y Promedio */}
        <Card className="border border-border/70 shadow-2xs bg-card">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
              <span>Turnos Auditados</span>
              <Coins className="size-4 text-primary" />
            </div>
            <div className="text-2xl font-black font-mono text-foreground">
              {filteredShifts.length}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">
                ({metrics.closedCount} cerrados)
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 flex justify-between border-t border-border/50">
              <span>Promedio / Turno:</span>
              <span className="font-bold text-foreground font-mono">{formatMoney(metrics.avgPerShift, "ARS")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Profesionales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico 1: Evolución por Día y Turno (2 columnas) */}
        <Card className="lg:col-span-2 border border-border/70 shadow-2xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <BarChart3 className="size-4 text-primary" />
                  Evolución de Recaudación por Turno
                </CardTitle>
                <CardDescription className="text-xs">
                  Comparativa de ingresos en Efectivo vs Transferencia/Tarjeta de cada turno
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {chartTimelineData.length === 0 ? (
              <div className="h-64 grid place-items-center text-xs text-muted-foreground italic">
                No hay datos suficientes para graficar en este período.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        formatMoney(Number(val), "ARS"),
                        name === "cashSales" ? "Ventas Efectivo" : name === "otherSales" ? "Transferencia / Digital" : "Total",
                      ]}
                      labelFormatter={(label) => `Turno: ${label}`}
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={28}
                      formatter={(value) => (value === "cashSales" ? "Efectivo" : "Transferencia / Tarjeta")}
                    />
                    <Bar dataKey="cashSales" name="cashSales" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="otherSales" name="otherSales" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Composición Efectivo vs Digital (1 columna) */}
        <Card className="border border-border/70 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <PieIcon className="size-4 text-primary" />
              Medios de Cobro
            </CardTitle>
            <CardDescription className="text-xs">
              Proporción recaudada en el período
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col items-center justify-center">
            {chartPaymentPieData.length === 0 ? (
              <div className="h-64 grid place-items-center text-xs text-muted-foreground italic">
                Sin ventas en el período.
              </div>
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartPaymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartPaymentPieData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name?: any) => [formatMoney(Number(val), "ARS"), name || "Monto"]}
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "10px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full space-y-1.5 pt-2 border-t text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-emerald-500" />
                      Efectivo:
                    </span>
                    <span className="font-mono font-bold">{formatMoney(metrics.cashSales, "ARS")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-blue-500" />
                      Digital / Banco:
                    </span>
                    <span className="font-mono font-bold">{formatMoney(metrics.otherSales, "ARS")}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Auditoría Detallada */}
      <Card className="border border-border/70 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Auditoría de Turnos y Cierres Z</span>
                <Badge variant="secondary" className="font-bold text-[11px]">
                  {filteredShifts.length} {filteredShifts.length === 1 ? "turno" : "turnos"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Registro detallado de aperturas, ventas, arqueos y retiros
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-20 font-bold">Turno</TableHead>
                  <TableHead className="font-bold">Apertura</TableHead>
                  <TableHead className="font-bold">Cierre</TableHead>
                  <TableHead className="text-right font-bold">Fondo Inicial</TableHead>
                  <TableHead className="text-right font-bold">Ventas Efectivo</TableHead>
                  <TableHead className="text-right font-bold">Ventas Digitales</TableHead>
                  <TableHead className="text-right font-bold">Total Vendido</TableHead>
                  <TableHead className="text-center font-bold">Diferencia</TableHead>
                  <TableHead className="text-right font-bold">Retirado</TableHead>
                  <TableHead className="text-right font-bold">Quedó</TableHead>
                  <TableHead className="text-right font-bold text-purple-700 dark:text-purple-400">Caja Chica</TableHead>
                  <TableHead className="text-right font-bold w-28">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-10 text-muted-foreground italic">
                      No se encontraron turnos con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShifts.map((shift) => {
                    const isOpen = shift.status === "open";
                    const diff = Number(shift.difference || 0);
                    const openD = shift.opened_at ? new Date(shift.opened_at) : null;
                    const closeD = shift.closed_at ? new Date(shift.closed_at) : null;

                    const cash = Number(shift.cash_sales || 0);
                    const other = Number(shift.other_sales || 0);
                    const total = Number(shift.total_sales || (cash + other));
                    const withdrawn = Number(shift.withdrawn_cash || 0);
                    const retained = Number(shift.retained_cash || 0);
                    const ps = getShiftPettyStats(shift);
                    const hasPetty = ps.inArs > 0 || ps.outArs > 0 || ps.inBrl > 0 || ps.outBrl > 0;

                    return (
                      <TableRow key={shift.id} className="hover:bg-muted/30 text-xs">
                        {/* Turno # y Estado */}
                        <TableCell className="font-mono font-bold">
                          <div className="flex items-center gap-1.5">
                            <span>#{shift.shift_number || 1}</span>
                            {isOpen ? (
                              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Turno Abierto" />
                            ) : null}
                          </div>
                        </TableCell>

                        {/* Apertura */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold block text-foreground">
                              {openD ? openD.toLocaleDateString("es-AR") : "—"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              {openD ? openD.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""} hs · {shift.opened_by_name || "Admin"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Cierre */}
                        <TableCell>
                          {isOpen ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              En curso
                            </Badge>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="font-semibold block text-foreground">
                                {closeD ? closeD.toLocaleDateString("es-AR") : "—"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono block">
                                {closeD ? closeD.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""} hs · {shift.closed_by_name || "Admin"}
                              </span>
                            </div>
                          )}
                        </TableCell>

                        {/* Fondo Inicial */}
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatMoney(Number(shift.initial_cash || 0), "ARS")}
                        </TableCell>

                        {/* Ventas Efectivo */}
                        <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{formatMoney(cash, "ARS")}
                          {shift.sales_count > 0 && (
                            <span className="text-[10px] text-muted-foreground font-sans block">
                              ({shift.sales_count} vtas)
                            </span>
                          )}
                        </TableCell>

                        {/* Ventas Digitales */}
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {other > 0 ? `+${formatMoney(other, "ARS")}` : "—"}
                        </TableCell>

                        {/* Total Vendido */}
                        <TableCell className="text-right font-mono font-black text-foreground">
                          {formatMoney(total, "ARS")}
                        </TableCell>

                        {/* Diferencia / Arqueo */}
                        <TableCell className="text-center">
                          {isOpen ? (
                            <span className="text-[10px] text-muted-foreground italic">Pendiente</span>
                          ) : diff === 0 ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] h-5">
                              Exacta
                            </Badge>
                          ) : diff > 0 ? (
                            <Badge className="bg-blue-600 text-white text-[10px] h-5 font-mono">
                              +{formatMoney(diff, "ARS")}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] h-5 font-mono">
                              -{formatMoney(Math.abs(diff), "ARS")}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Retirado */}
                        <TableCell className="text-right font-mono text-foreground">
                          {withdrawn > 0 ? formatMoney(withdrawn, "ARS") : "—"}
                        </TableCell>

                        {/* Quedó en Cajón */}
                        <TableCell className="text-right font-mono text-muted-foreground font-semibold">
                          {isOpen ? "—" : formatMoney(retained, "ARS")}
                        </TableCell>

                        {/* Caja Chica en este Turno */}
                        <TableCell className="text-right font-mono text-[11px]">
                          {!hasPetty ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="space-y-0.5">
                              {ps.inArs > 0 && <div className="text-emerald-600 dark:text-emerald-400 font-semibold">+{formatMoney(ps.inArs, "ARS")}</div>}
                              {ps.outArs > 0 && <div className="text-rose-600 dark:text-rose-400 font-semibold">-{formatMoney(ps.outArs, "ARS")}</div>}
                              {ps.inBrl > 0 && <div className="text-emerald-600 dark:text-emerald-400 font-semibold">+{formatMoney(ps.inBrl, "BRL")}</div>}
                              {ps.outBrl > 0 && <div className="text-rose-600 dark:text-rose-400 font-semibold">-{formatMoney(ps.outBrl, "BRL")}</div>}
                            </div>
                          )}
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => onViewShift && onViewShift(shift)}
                              className="h-7 px-2 text-xs font-semibold gap-1 rounded-lg"
                              title="Ver detalle de ventas del turno"
                            >
                              <FileText className="size-3 text-primary" />
                              <span className="hidden sm:inline">Detalle</span>
                            </Button>
                            {!isOpen && (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => printShiftCloseThermalTicket({ shift, settings, paperWidth: "80mm", pettyCashMovements })}
                                className="h-7 px-2 text-xs font-semibold gap-1 rounded-lg text-emerald-600 hover:text-emerald-700"
                                title="Reimprimir Ticket Z"
                              >
                                <Printer className="size-3" />
                                <span className="hidden md:inline">Z</span>
                              </Button>
                            )}
                            {!isCashier && (
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => onDeleteShift && onDeleteShift(shift)}
                                className="h-7 px-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                                title="Eliminar registro de turno"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VaultIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
      <path d="m7.9 7.9 2.7 2.7" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
      <path d="m13.4 10.6 2.7-2.7" />
      <circle cx="7.5" cy="16.5" r=".5" fill="currentColor" />
      <path d="m7.9 16.1 2.7-2.7" />
      <circle cx="16.5" cy="16.5" r=".5" fill="currentColor" />
      <path d="m13.4 13.4 2.7 2.7" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function PieIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

