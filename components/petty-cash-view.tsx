"use client";

import { useState, useMemo } from "react";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Minus,
  Search,
  Filter,
  Download,
  Pencil,
  Trash2,
  Calendar,
  Receipt,
  Tag,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/currency";

export interface PettyCashMovement {
  id: string;
  type: "ingreso" | "egreso";
  currency: "ARS" | "BRL";
  amount: number;
  category: string;
  description: string;
  reference?: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
}

interface PettyCashViewProps {
  data: any;
  action: (payload: any, successMessage: string) => Promise<any>;
  isCashier?: boolean;
  user?: any;
  staffProfile?: any;
}

const INCOME_CATEGORIES = [
  "Aporte de Capital / Fondeo Dueño",
  "Cobro / Venta por fuera",
  "Pase desde Mostrador",
  "Devolución de gasto",
  "Otro ingreso",
];

const EXPENSE_CATEGORIES = [
  "Gastos de Local / Mantenimiento",
  "Artículos de Limpieza e Insumos",
  "Flete y Envíos",
  "Pago a Proveedor (Por fuera)",
  "Retiro del Dueño / Ganancia",
  "Refrigerio / Viáticos del personal",
  "Impuestos / Tasas menores",
  "Pase a Mostrador (Cambio)",
  "Otro egreso",
];

export function PettyCashView({
  data,
  action,
  isCashier = false,
  user,
  staffProfile,
}: PettyCashViewProps) {
  const pettyMovements: PettyCashMovement[] = useMemo(() => {
    return Array.isArray(data?.pettyCashMovements) ? data.pettyCashMovements : [];
  }, [data?.pettyCashMovements]);

  // Filtros
  const [currencyFilter, setCurrencyFilter] = useState<"ALL" | "ARS" | "BRL">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "ingreso" | "egreso">("ALL");
  const [periodFilter, setPeriodFilter] = useState<"today" | "yesterday" | "7d" | "this_month" | "last_month" | "all">("this_month");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modales
  const [modalMode, setModalMode] = useState<"ingreso" | "egreso" | null>(null);
  const [editingMovement, setEditingMovement] = useState<PettyCashMovement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<PettyCashMovement | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Form states para nuevo movimiento
  const [formCurrency, setFormCurrency] = useState<"ARS" | "BRL">("ARS");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 16));

  // Form states para edición
  const [editCurrency, setEditCurrency] = useState<"ARS" | "BRL">("ARS");
  const [editType, setEditType] = useState<"ingreso" | "egreso">("ingreso");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReference, setEditReference] = useState("");

  // Form states para traspaso
  const [transferDirection, setTransferDirection] = useState<"to_petty" | "to_cash">("to_petty");
  const [transferCurrency, setTransferCurrency] = useState<"ARS" | "BRL">("ARS");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");

  // Cálculo de Saldo Total Histórico
  const balanceArs = useMemo(() => {
    return pettyMovements
      .filter((m) => (m.currency || "ARS") === "ARS")
      .reduce((sum, m) => sum + (m.type === "ingreso" ? Number(m.amount || 0) : -Number(m.amount || 0)), 0);
  }, [pettyMovements]);

  const balanceBrl = useMemo(() => {
    return pettyMovements
      .filter((m) => m.currency === "BRL")
      .reduce((sum, m) => sum + (m.type === "ingreso" ? Number(m.amount || 0) : -Number(m.amount || 0)), 0);
  }, [pettyMovements]);

  // Lista única de categorías registradas para el filtro
  const registeredCategories = useMemo(() => {
    const set = new Set<string>();
    pettyMovements.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set).sort();
  }, [pettyMovements]);

  // Rango de fechas según el filtro de período
  const periodRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (periodFilter === "today") {
      return { start: todayStr, end: todayStr };
    }
    if (periodFilter === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      return { start: yStr, end: yStr };
    }
    if (periodFilter === "7d") {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      return { start: d7.toISOString().slice(0, 10), end: todayStr };
    }
    if (periodFilter === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { start: first, end: todayStr };
    }
    if (periodFilter === "last_month") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const last = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { start: first, end: last };
    }
    return null; // all
  }, [periodFilter]);

  // Movimientos filtrados
  const filteredMovements = useMemo(() => {
    return pettyMovements.filter((m) => {
      // Filtro de moneda
      if (currencyFilter !== "ALL" && (m.currency || "ARS") !== currencyFilter) {
        return false;
      }

      // Filtro de tipo
      if (typeFilter !== "ALL" && m.type !== typeFilter) {
        return false;
      }

      // Filtro de categoría
      if (categoryFilter !== "ALL" && m.category !== categoryFilter) {
        return false;
      }

      // Filtro de período
      if (periodRange && m.created_at) {
        const itemDate = String(m.created_at).slice(0, 10);
        if (itemDate < periodRange.start || itemDate > periodRange.end) {
          return false;
        }
      }

      // Búsqueda libre
      if (search.trim()) {
        const term = search.toLowerCase();
        const descMatch = (m.description || "").toLowerCase().includes(term);
        const catMatch = (m.category || "").toLowerCase().includes(term);
        const refMatch = (m.reference || "").toLowerCase().includes(term);
        const creatorMatch = (m.created_by_name || "").toLowerCase().includes(term);
        if (!descMatch && !catMatch && !refMatch && !creatorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [pettyMovements, currencyFilter, typeFilter, categoryFilter, periodRange, search]);

  // Métricas del período filtrado
  const filteredMetrics = useMemo(() => {
    let incomeArs = 0;
    let incomeBrl = 0;
    let expenseArs = 0;
    let expenseBrl = 0;

    filteredMovements.forEach((m) => {
      const amt = Number(m.amount || 0);
      const cur = m.currency || "ARS";
      if (m.type === "ingreso") {
        if (cur === "BRL") incomeBrl += amt;
        else incomeArs += amt;
      } else {
        if (cur === "BRL") expenseBrl += amt;
        else expenseArs += amt;
      }
    });

    return {
      incomeArs,
      incomeBrl,
      expenseArs,
      expenseBrl,
      netArs: incomeArs - expenseArs,
      netBrl: incomeBrl - expenseBrl,
    };
  }, [filteredMovements]);

  // Handlers para Nuevo Movimiento
  const openNewModal = (type: "ingreso" | "egreso") => {
    setModalMode(type);
    setFormCurrency("ARS");
    setFormAmount("");
    setFormCategory(type === "ingreso" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setFormDescription("");
    setFormReference("");
    setFormDate(new Date().toISOString().slice(0, 16));
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(formAmount);
    if (!amt || amt <= 0) return;

    setBusy(true);
    try {
      await action(
        {
          action: "petty_cash_movement",
          type: modalMode,
          currency: formCurrency,
          amount: amt,
          category: formCategory.trim() || (modalMode === "ingreso" ? "Ingreso" : "Gasto"),
          description: formDescription.trim(),
          reference: formReference.trim(),
          created_at: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
          cashierId: user?.uid || null,
          cashierName: staffProfile?.name || user?.email || "Administrador",
        },
        modalMode === "ingreso" ? "Ingreso registrado en Caja Chica" : "Gasto registrado en Caja Chica"
      );
      setModalMode(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  // Handlers para Edición
  const openEditModal = (mov: PettyCashMovement) => {
    setEditingMovement(mov);
    setEditType(mov.type);
    setEditCurrency(mov.currency || "ARS");
    setEditAmount(String(mov.amount || ""));
    setEditCategory(mov.category || "General");
    setEditDescription(mov.description || "");
    setEditReference(mov.reference || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement) return;
    const amt = Number(editAmount);
    if (!amt || amt <= 0) return;

    setBusy(true);
    try {
      await action(
        {
          action: "update_petty_cash_movement",
          id: editingMovement.id,
          type: editType,
          currency: editCurrency,
          amount: amt,
          category: editCategory.trim() || "General",
          description: editDescription.trim(),
          reference: editReference.trim(),
        },
        "Movimiento actualizado con éxito"
      );
      setEditingMovement(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  // Handlers para Eliminar
  const handleDelete = async () => {
    if (!deletingMovement) return;
    setBusy(true);
    try {
      await action(
        {
          action: "delete_petty_cash_movement",
          id: deletingMovement.id,
        },
        "Movimiento eliminado de Caja Chica"
      );
      setDeletingMovement(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  // Handlers para Traspaso de Fondos
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(transferAmount);
    if (!amt || amt <= 0) return;

    setBusy(true);
    try {
      await action(
        {
          action: "transfer_petty_cash",
          direction: transferDirection,
          currency: transferCurrency,
          amount: amt,
          description: transferNote.trim(),
          cashierId: user?.uid || null,
          cashierName: staffProfile?.name || user?.email || "Administrador",
        },
        transferDirection === "to_petty"
          ? "Traspaso de Mostrador a Caja Chica realizado"
          : "Traspaso de Caja Chica a Mostrador realizado"
      );
      setIsTransferOpen(false);
      setTransferAmount("");
      setTransferNote("");
    } catch (err: any) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    if (filteredMovements.length === 0) return;

    const headers = [
      "Fecha",
      "Hora",
      "Tipo",
      "Moneda",
      "Importe",
      "Categoría",
      "Concepto / Detalle",
      "Comprobante / Ref",
      "Registrado Por",
    ];

    const rows = filteredMovements.map((m) => {
      const d = m.created_at ? new Date(m.created_at) : new Date();
      const fecha = d.toLocaleDateString("es-AR");
      const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
      const tipo = m.type === "ingreso" ? "Ingreso" : "Egreso";
      const moneda = m.currency || "ARS";
      const monto = (m.type === "ingreso" ? "+" : "-") + String(m.amount);
      const cat = m.category || "General";
      const desc = `"${(m.description || "").replace(/"/g, '""')}"`;
      const ref = `"${(m.reference || "").replace(/"/g, '""')}"`;
      const user = `"${(m.created_by_name || "Admin").replace(/"/g, '""')}"`;

      return [fecha, hora, tipo, moneda, monto, `"${cat}"`, desc, ref, user].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Caja_Chica_CR_Bazar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </span>
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Caja Chica (Movimientos por fuera)
            </h2>
            <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary bg-primary/5">
              Multimoneda ARS / BRL
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Fondo independiente para gastos diarios, compras menores, viáticos, pagos a proveedores y retiros.
            No altera el arqueo de los cajeros en el mostrador.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => openNewModal("ingreso")}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm shadow-emerald-600/30"
          >
            <Plus className="size-4" />
            Nuevo Ingreso
          </Button>

          <Button
            onClick={() => openNewModal("egreso")}
            className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1.5 shadow-sm shadow-rose-600/30"
          >
            <Minus className="size-4" />
            Registrar Gasto
          </Button>

          {!isCashier && (
            <Button
              variant="outline"
              onClick={() => setIsTransferOpen(true)}
              className="h-10 px-3.5 rounded-xl font-semibold text-xs gap-1.5"
            >
              <ArrowLeftRight className="size-4" />
              Traspaso Mostrador
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleExportCSV}
            disabled={filteredMovements.length === 0}
            className="h-10 px-3 rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            title="Exportar a Excel / CSV"
          >
            <Download className="size-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI de Saldo Disponible y Movimientos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo en Pesos */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Saldo Caja Chica (Pesos)
              </span>
              <span className="text-base">🇦🇷</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${balanceArs < 0 ? "text-rose-600" : "text-foreground"}`}>
              {formatMoney(balanceArs, "ARS")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fondo disponible actual en efectivo ARS
            </p>
          </CardContent>
        </Card>

        {/* Saldo en Reales */}
        <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-card to-card shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                Saldo Caja Chica (Reales)
              </span>
              <span className="text-base">🇧🇷</span>
            </div>
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${balanceBrl < 0 ? "text-rose-600" : "text-foreground"}`}>
              {formatMoney(balanceBrl, "BRL")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fondo disponible actual en efectivo BRL
            </p>
          </CardContent>
        </Card>

        {/* Ingresos Período Filtrado */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-emerald-600">
                Ingresos (Período)
              </span>
              <ArrowDownLeft className="size-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600">
              +{formatMoney(filteredMetrics.incomeArs, "ARS")}
            </div>
            {filteredMetrics.incomeBrl > 0 && (
              <div className="text-xs font-mono font-bold text-teal-600 mt-0.5">
                +{formatMoney(filteredMetrics.incomeBrl, "BRL")}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Fondeos, cobranzas y pases
            </p>
          </CardContent>
        </Card>

        {/* Gastos Período Filtrado */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-rose-600">
                Gastos / Egresos
              </span>
              <ArrowUpRight className="size-4 text-rose-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-600">
              -{formatMoney(filteredMetrics.expenseArs, "ARS")}
            </div>
            {filteredMetrics.expenseBrl > 0 && (
              <div className="text-xs font-mono font-bold text-rose-500 mt-0.5">
                -{formatMoney(filteredMetrics.expenseBrl, "BRL")}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Compras, fletes, retiros y servicios
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card className="border shadow-xs">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Presets de Período */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-muted-foreground mr-1.5 flex items-center gap-1 shrink-0">
                <Calendar className="size-3.5" />
                Período:
              </span>
              {[
                { id: "today", label: "Hoy" },
                { id: "yesterday", label: "Ayer" },
                { id: "7d", label: "7 días" },
                { id: "this_month", label: "Este mes" },
                { id: "last_month", label: "Mes anterior" },
                { id: "all", label: "Histórico" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    periodFilter === p.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por detalle, categoría, ref..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-xs">
            {/* Filtro Moneda */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
              <span className="text-muted-foreground font-semibold px-1.5">Moneda:</span>
              <button
                type="button"
                onClick={() => setCurrencyFilter("ALL")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  currencyFilter === "ALL" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setCurrencyFilter("ARS")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  currencyFilter === "ARS" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇦🇷 Pesos
              </button>
              <button
                type="button"
                onClick={() => setCurrencyFilter("BRL")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  currencyFilter === "BRL" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🇧🇷 Reales
              </button>
            </div>

            {/* Filtro Tipo */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
              <span className="text-muted-foreground font-semibold px-1.5">Tipo:</span>
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  typeFilter === "ALL" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("ingreso")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  typeFilter === "ingreso" ? "bg-card text-emerald-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ingresos (+)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("egreso")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  typeFilter === "egreso" ? "bg-card text-rose-600 shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Egresos (-)
              </button>
            </div>

            {/* Filtro Categoría */}
            {registeredCategories.length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-muted-foreground font-semibold">Categoría:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-8 rounded-lg border bg-background px-2.5 text-xs font-medium"
                >
                  <option value="ALL">Todas las categorías</option>
                  {registeredCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Movimientos */}
      <Card className="border shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Libro de Movimientos de Caja Chica</CardTitle>
            <CardDescription className="text-xs">
              {filteredMovements.length}{" "}
              {filteredMovements.length === 1 ? "movimiento encontrado" : "movimientos encontrados"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-[11px]">
                  <TableHead className="w-32">Fecha y Hora</TableHead>
                  <TableHead className="w-24">Tipo</TableHead>
                  <TableHead className="w-20">Moneda</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Concepto / Detalle</TableHead>
                  <TableHead className="w-28">Comprobante</TableHead>
                  <TableHead className="w-28">Responsable</TableHead>
                  <TableHead className="text-right w-32">Importe</TableHead>
                  <TableHead className="text-right w-20">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Wallet className="size-8 text-muted-foreground/40" />
                        <p className="text-sm font-semibold">No se encontraron movimientos en este filtro</p>
                        <p className="text-xs">
                          Podés registrar un nuevo ingreso o egreso haciendo clic en los botones superiores.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((mov) => {
                    const isIngreso = mov.type === "ingreso";
                    const movCur = mov.currency || "ARS";
                    const d = mov.created_at ? new Date(mov.created_at) : new Date();

                    return (
                      <TableRow key={mov.id} className="hover:bg-muted/30 transition-colors text-xs">
                        {/* Fecha y Hora */}
                        <TableCell className="font-mono text-muted-foreground">
                          <div>{d.toLocaleDateString("es-AR")}</div>
                          <div className="text-[10px] text-muted-foreground/70">
                            {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                          </div>
                        </TableCell>

                        {/* Tipo */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                              isIngreso
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {isIngreso ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
                            {isIngreso ? "Ingreso" : "Egreso"}
                          </span>
                        </TableCell>

                        {/* Moneda */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] font-bold ${
                              movCur === "BRL"
                                ? "border-teal-500/30 text-teal-700 dark:text-teal-300 bg-teal-500/5"
                                : "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5"
                            }`}
                          >
                            {movCur === "BRL" ? "🇧🇷 BRL" : "🇦🇷 ARS"}
                          </Badge>
                        </TableCell>

                        {/* Categoría */}
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {mov.category || "General"}
                          </Badge>
                        </TableCell>

                        {/* Detalle */}
                        <TableCell>
                          <div className="font-medium text-foreground max-w-sm truncate" title={mov.description}>
                            {mov.description || "—"}
                          </div>
                        </TableCell>

                        {/* Comprobante */}
                        <TableCell className="font-mono text-[11px] text-muted-foreground">
                          {mov.reference ? (
                            <span className="inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                              <Receipt className="size-3 text-muted-foreground/70" />
                              {mov.reference}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        {/* Responsable */}
                        <TableCell className="text-muted-foreground text-[11px]">
                          {mov.created_by_name || "Admin"}
                        </TableCell>

                        {/* Importe */}
                        <TableCell className="text-right font-mono font-black text-xs sm:text-sm">
                          <span className={isIngreso ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                            {isIngreso ? "+" : "-"}
                            {formatMoney(mov.amount, movCur)}
                          </span>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(mov)}
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Editar"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingMovement(mov)}
                              className="size-7 text-muted-foreground hover:text-rose-600"
                              title="Eliminar"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
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

      {/* Modal: Registrar Nuevo Ingreso o Gasto */}
      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && setModalMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span
                className={`p-2 rounded-xl ${
                  modalMode === "ingreso"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-rose-500/10 text-rose-600"
                }`}
              >
                {modalMode === "ingreso" ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {modalMode === "ingreso" ? "Registrar Ingreso en Caja Chica" : "Registrar Gasto de Caja Chica"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {modalMode === "ingreso"
                    ? "Inyección de capital, cobros por fuera o reposición de fondo."
                    : "Compras menores, fletes, pagos por fuera y gastos diarios."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveNew} className="space-y-4 pt-2">
            {/* Selector de Moneda */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormCurrency("ARS")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                  formCurrency === "ARS"
                    ? "border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-xs"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <span className="text-base">🇦🇷</span>
                <span>Pesos ($ ARS)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormCurrency("BRL")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 font-bold text-xs transition-all ${
                  formCurrency === "BRL"
                    ? "border-teal-600 bg-teal-500/10 text-teal-800 dark:text-teal-300 shadow-xs"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <span className="text-base">🇧🇷</span>
                <span>Reales (R$ BRL)</span>
              </button>
            </div>

            {/* Importe */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Importe ({formCurrency === "BRL" ? "R$ BRL" : "$ ARS"}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-sm">
                  {formCurrency === "BRL" ? "R$" : "$"}
                </span>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="pl-9 font-mono text-base font-bold h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Categoría *
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {(modalMode === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormCategory(cat)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      formCategory === cat
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <Input
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="O escribe una categoría personalizada..."
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Concepto / Motivo */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Concepto / Motivo detallado
              </label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={
                  modalMode === "ingreso"
                    ? "Ej: Aporte semanal del dueño, cobro particular..."
                    : "Ej: Lavandina y bolsas, flete bultos, almuerzo..."
                }
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Comprobante y Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  N° Comprobante / Recibo
                </label>
                <Input
                  value={formReference}
                  onChange={(e) => setFormReference(e.target.value)}
                  placeholder="Opcional"
                  className="h-9 text-xs font-mono rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Fecha y Hora
                </label>
                <Input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 text-xs font-mono rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalMode(null)}
                className="rounded-xl h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={busy || !formAmount || Number(formAmount) <= 0}
                className={`rounded-xl h-10 font-bold ${
                  modalMode === "ingreso"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-rose-600 hover:bg-rose-500 text-white"
                }`}
              >
                {busy ? "Guardando..." : modalMode === "ingreso" ? "Guardar Ingreso" : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Movimiento */}
      <Dialog open={editingMovement !== null} onOpenChange={(open) => !open && setEditingMovement(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Modificar Movimiento de Caja Chica</DialogTitle>
            <DialogDescription className="text-xs">
              Corregí importe, categoría o concepto del registro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditType("ingreso")}
                className={`p-2 rounded-xl font-bold text-xs border ${
                  editType === "ingreso"
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500"
                    : "text-muted-foreground border-border"
                }`}
              >
                Ingreso (+)
              </button>
              <button
                type="button"
                onClick={() => setEditType("egreso")}
                className={`p-2 rounded-xl font-bold text-xs border ${
                  editType === "egreso"
                    ? "bg-rose-500/10 text-rose-700 border-rose-500"
                    : "text-muted-foreground border-border"
                }`}
              >
                Egreso (-)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditCurrency("ARS")}
                className={`p-2 rounded-xl font-bold text-xs border ${
                  editCurrency === "ARS"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground border-border"
                }`}
              >
                🇦🇷 Pesos ($ ARS)
              </button>
              <button
                type="button"
                onClick={() => setEditCurrency("BRL")}
                className={`p-2 rounded-xl font-bold text-xs border ${
                  editCurrency === "BRL"
                    ? "bg-teal-500/10 text-teal-700 border-teal-500"
                    : "text-muted-foreground border-border"
                }`}
              >
                🇧🇷 Reales (R$ BRL)
              </button>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Importe</label>
              <Input
                type="number"
                step="any"
                min="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="font-mono font-bold h-10 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Categoría</label>
              <Input
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">Concepto / Detalle</label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Comprobante</label>
              <Input
                value={editReference}
                onChange={(e) => setEditReference(e.target.value)}
                className="h-9 text-xs font-mono rounded-xl"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingMovement(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Traspaso de Fondos entre Mostrador y Caja Chica */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <ArrowLeftRight className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Traspaso de Efectivo</DialogTitle>
                <DialogDescription className="text-xs">
                  Transferir dinero entre la Caja de Mostrador y la Caja Chica.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleTransfer} className="space-y-4 pt-2">
            {/* Dirección del traspaso */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold block">Dirección del traspaso</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferDirection("to_petty")}
                  className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all ${
                    transferDirection === "to_petty"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold">
                    <span>Mostrador</span>
                    <span>➔</span>
                    <span>Caja Chica</span>
                  </div>
                  <p className="text-[10px] font-normal text-muted-foreground">
                    Saca de mostrador para fondear caja chica
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferDirection("to_cash")}
                  className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all ${
                    transferDirection === "to_cash"
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold">
                    <span>Caja Chica</span>
                    <span>➔</span>
                    <span>Mostrador</span>
                  </div>
                  <p className="text-[10px] font-normal text-muted-foreground">
                    Aporta cambio o fondo al mostrador
                  </p>
                </button>
              </div>
            </div>

            {/* Moneda */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferCurrency("ARS")}
                className={`p-2 rounded-xl font-bold text-xs border ${
                  transferCurrency === "ARS"
                    ? "bg-primary/10 text-primary border-primary"
                    : "text-muted-foreground border-border"
                }`}
              >
                🇦🇷 Pesos ($ ARS)
              </button>
              <button
                type="button"
                onClick={() => setTransferCurrency("BRL")}
                className={`p-2 rounded-xl font-bold text-xs border ${
                  transferCurrency === "BRL"
                    ? "bg-teal-500/10 text-teal-700 border-teal-500"
                    : "text-muted-foreground border-border"
                }`}
              >
                🇧🇷 Reales (R$ BRL)
              </button>
            </div>

            {/* Importe */}
            <div>
              <label className="text-xs font-bold block mb-1">
                Importe a transferir ({transferCurrency === "BRL" ? "R$ BRL" : "$ ARS"}) *
              </label>
              <Input
                type="number"
                step="any"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="font-mono font-bold h-11 text-base rounded-xl"
              />
            </div>

            {/* Nota */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Motivo / Nota del traspaso
              </label>
              <Input
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Ej: Fondeo de caja chica para compras de la semana"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={busy || !transferAmount || Number(transferAmount) <= 0}
                className="font-bold"
              >
                {busy ? "Transfiriendo..." : "Confirmar Traspaso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar Eliminación */}
      <AlertDialog open={deletingMovement !== null} onOpenChange={(open) => !open && setDeletingMovement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este movimiento de caja chica?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Se eliminará el registro de{" "}
              <strong>
                {deletingMovement?.type === "ingreso" ? "Ingreso" : "Egreso"} por{" "}
                {deletingMovement && formatMoney(deletingMovement.amount, deletingMovement.currency || "ARS")}
              </strong>
              {deletingMovement?.description ? ` ("${deletingMovement.description}")` : ""}. Esta acción actualizará los
              saldos inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              {busy ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

