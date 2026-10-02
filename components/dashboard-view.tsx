"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  CircleDollarSign,
  MessageCircle,
  Percent,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface DashboardViewProps {
  data: {
    settings: any;
    products: any[];
    customers: any[];
    suppliers: any[];
    sales: any[];
    movements: any[];
    stockMoves: any[];
    customerMoves: any[];
    supplierMoves: any[];
    stats: {
      revenueToday: number;
      salesToday: number;
      stockValue: number;
      cashBalance: number;
      lowStock: number;
      productCount: number;
    };
  };
  setSection: (section: string) => void;
  addVariant: (product: any, variant: any) => void;
  setModal?: (modal: string) => void;
}

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);

const dateShort = (value: string) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const dateFull = (value: string) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const CHANNEL_COLORS = {
  minorista: "#3b82f6", // Blue
  mayorista: "#f97316", // Orange
};

export type PeriodFilter = "dia" | "semanas" | "mes" | "historico";

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  dia: "Día",
  semanas: "Semanas",
  mes: "Mes",
  historico: "Histórico",
};

export const PERIOD_FULL_LABELS: Record<PeriodFilter, string> = {
  dia: "Hoy y últimas 24 hs",
  semanas: "Últimos 7 días",
  mes: "Últimos 30 días",
  historico: "Histórico total",
};

export function PeriodFilterButtons({
  value,
  onChange,
  size = "sm",
}: {
  value: PeriodFilter;
  onChange: (val: PeriodFilter) => void;
  size?: "xs" | "sm";
}) {
  return (
    <div className="inline-flex items-center rounded-xl bg-muted/80 p-0.5 border border-border/60 shadow-2xs">
      {(
        [
          ["dia", "Día"],
          ["semanas", "Semanas"],
          ["mes", "Mes"],
          ["historico", "Histórico"],
        ] as const
      ).map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`rounded-lg transition-all font-semibold cursor-pointer ${
            size === "xs" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          } ${
            value === k
              ? "bg-card text-primary shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function DashboardView({ data, setSection, addVariant }: DashboardViewProps) {
  const [period, setPeriod] = useState<PeriodFilter>("mes");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const businessName = data.settings?.business_name || "CR MAYORISTA";
  const products = data.products || [];
  const sales = data.sales || [];
  const customers = data.customers || [];
  const movements = data.movements || [];

  // Filter sales and movements by selected period
  const { filteredSales, filteredMovements } = useMemo(() => {
    if (period === "historico") {
      return { filteredSales: sales, filteredMovements: movements };
    }

    const now = new Date();
    const start = new Date();

    if (period === "dia") {
      start.setHours(0, 0, 0, 0);
      const todaySales = sales.filter((s: any) => s.created_at && new Date(s.created_at) >= start);

      // Fallback: If no sales today, show last 24 hours so recent sales are visible
      if (todaySales.length === 0) {
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last24hSales = sales.filter((s: any) => s.created_at && new Date(s.created_at) >= last24h);
        if (last24hSales.length > 0) {
          const matchedMovs = movements.filter((m: any) => m.created_at && new Date(m.created_at) >= last24h);
          return { filteredSales: last24hSales, filteredMovements: matchedMovs };
        }
      }

      const matchedMovs = movements.filter((m: any) => m.created_at && new Date(m.created_at) >= start);
      return { filteredSales: todaySales, filteredMovements: matchedMovs };
    } else if (period === "semanas") {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === "mes") {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }

    const fSales = sales.filter((s: any) => {
      if (!s.created_at) return true;
      return new Date(s.created_at) >= start;
    });
    const fMovements = movements.filter((m: any) => {
      if (!m.created_at) return true;
      return new Date(m.created_at) >= start;
    });

    return { filteredSales: fSales, filteredMovements: fMovements };
  }, [sales, movements, period]);

  // Overall Financial & Operational Summary for selected period
  const periodStats = useMemo(() => {
    const revenue = filteredSales.reduce((acc: number, s: any) => acc + Number(s.total || 0), 0);
    const count = filteredSales.length;
    const avgTicket = count > 0 ? revenue / count : 0;

    const retailSales = filteredSales.filter((s: any) => s.channel === "minorista");
    const wholesaleSales = filteredSales.filter((s: any) => s.channel === "mayorista");

    const retailRevenue = retailSales.reduce((acc: number, s: any) => acc + Number(s.total || 0), 0);
    const wholesaleRevenue = wholesaleSales.reduce((acc: number, s: any) => acc + Number(s.total || 0), 0);

    const totalPairsSold = filteredSales.reduce((sum: number, s: any) => {
      if (Array.isArray(s.items) && s.items.length > 0) {
        return sum + s.items.reduce((acc: number, item: any) => acc + Number(item.quantity || 1), 0);
      }
      return sum + 1;
    }, 0);

    const totalCustomersWithDebt = customers.filter((c: any) => Number(c.balance || 0) > 0);
    const totalDebtAmount = totalCustomersWithDebt.reduce((acc: number, c: any) => acc + Number(c.balance || 0), 0);

    // Cash movements for the selected period
    const periodIncome = filteredMovements.filter((m: any) => m.type === "ingreso").reduce((acc: number, m: any) => acc + Number(m.amount || 0), 0);
    const periodExpenses = filteredMovements.filter((m: any) => m.type === "egreso").reduce((acc: number, m: any) => acc + Number(m.amount || 0), 0);
    const periodNetCash = periodIncome - periodExpenses;

    return {
      revenue,
      count,
      avgTicket,
      retailRevenue,
      wholesaleRevenue,
      retailCount: retailSales.length,
      wholesaleCount: wholesaleSales.length,
      totalPairsSold,
      customersWithDebt: totalCustomersWithDebt.length,
      totalDebtAmount,
      periodIncome,
      periodExpenses,
      periodNetCash,
      periodMovementsCount: filteredMovements.length,
    };
  }, [filteredSales, filteredMovements, customers]);

  // Chart 1: Revenue & Sales Evolution over time (grouped by day/hour/week)
  const salesTimelineData = useMemo(() => {
    if (period === "dia") {
      // 8 intervals throughout daytime: 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
      const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
      const map = new Map<string, { date: string; displayDate: string; minorista: number; mayorista: number; total: number; pares: number }>();

      hours.forEach((h) => {
        map.set(h, { date: h, displayDate: h, minorista: 0, mayorista: 0, total: 0, pares: 0 });
      });

      for (const sale of filteredSales) {
        if (!sale.created_at) continue;
        const d = new Date(sale.created_at);
        const h = d.getHours();
        const slotHour = Math.min(22, Math.max(8, Math.round(h / 2) * 2));
        const slotKey = `${String(slotHour).padStart(2, "0")}:00`;
        const entry = map.get(slotKey) || map.get("12:00")!;
        const tot = Number(sale.total || 0);
        entry.total += tot;
        if (sale.channel === "mayorista") entry.mayorista += tot;
        else entry.minorista += tot;
        const pairs = Array.isArray(sale.items) && sale.items.length > 0
          ? sale.items.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0)
          : 1;
        entry.pares += pairs;
      }
      return Array.from(map.values());
    }

    if (period === "semanas") {
      // 7 days of the week
      const days: Array<{ key: string; label: string }> = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
        days.push({ key, label });
      }

      const map = new Map<string, { date: string; displayDate: string; minorista: number; mayorista: number; total: number; pares: number }>();
      days.forEach((d) => {
        map.set(d.key, { date: d.key, displayDate: d.label, minorista: 0, mayorista: 0, total: 0, pares: 0 });
      });

      for (const sale of filteredSales) {
        if (!sale.created_at) continue;
        const dayKey = sale.created_at.slice(0, 10);
        const entry = map.get(dayKey);
        if (entry) {
          const tot = Number(sale.total || 0);
          entry.total += tot;
          if (sale.channel === "mayorista") entry.mayorista += tot;
          else entry.minorista += tot;
          const pairs = Array.isArray(sale.items) && sale.items.length > 0
            ? sale.items.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0)
            : 1;
          entry.pares += pairs;
        }
      }
      return Array.from(map.values());
    }

    if (period === "mes") {
      const map = new Map<string, { date: string; displayDate: string; minorista: number; mayorista: number; total: number; pares: number }>();
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = `${d.getDate()} ${new Intl.DateTimeFormat("es-AR", { month: "short" }).format(d)}`;
        map.set(key, { date: key, displayDate: label, minorista: 0, mayorista: 0, total: 0, pares: 0 });
      }

      for (const sale of filteredSales) {
        if (!sale.created_at) continue;
        const dayKey = sale.created_at.slice(0, 10);
        const entry = map.get(dayKey);
        if (entry) {
          const tot = Number(sale.total || 0);
          entry.total += tot;
          if (sale.channel === "mayorista") entry.mayorista += tot;
          else entry.minorista += tot;
          const pairs = Array.isArray(sale.items) && sale.items.length > 0
            ? sale.items.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0)
            : 1;
          entry.pares += pairs;
        }
      }

      const allDays = Array.from(map.values());
      return allDays.filter((d, idx) => d.total > 0 || idx % 4 === 0 || idx === allDays.length - 1);
    }

    // "historico"
    const map = new Map<string, { date: string; displayDate: string; minorista: number; mayorista: number; total: number; pares: number }>();
    const sorted = [...filteredSales].sort((a: any, b: any) =>
      String(a.created_at || "").localeCompare(String(b.created_at || ""))
    );

    for (const sale of sorted) {
      if (!sale.created_at) continue;
      const dayKey = sale.created_at.slice(0, 10);
      const entry = map.get(dayKey) || {
        date: dayKey,
        displayDate: dateShort(dayKey),
        minorista: 0,
        mayorista: 0,
        total: 0,
        pares: 0,
      };
      const tot = Number(sale.total || 0);
      entry.total += tot;
      if (sale.channel === "mayorista") entry.mayorista += tot;
      else entry.minorista += tot;
      const pairs = Array.isArray(sale.items) && sale.items.length > 0
        ? sale.items.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0)
        : 1;
      entry.pares += pairs;
      map.set(dayKey, entry);
    }

    const dataArray = Array.from(map.values());
    if (dataArray.length === 0) {
      return [{ date: "Sin datos", displayDate: "Sin datos", minorista: 0, mayorista: 0, total: 0, pares: 0 }];
    }
    if (dataArray.length === 1) {
      const p = dataArray[0];
      return [
        { date: "Inicio", displayDate: "Inicio", minorista: 0, mayorista: 0, total: 0, pares: 0 },
        p,
        { date: "Fin", displayDate: "Actual", minorista: p.minorista, mayorista: p.mayorista, total: p.total, pares: p.pares },
      ];
    }
    return dataArray;
  }, [filteredSales, period]);

  // Chart 2: Payment Methods Breakdown (Mayorista)
  const paymentMethodData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filteredSales) {
      const method = s.payment_method || "Efectivo";
      map.set(method, (map.get(method) || 0) + Number(s.total || 0));
    }

    const palette = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"];
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);

    if (total === 0 || map.size === 0) {
      return [
        { name: "Sin operaciones", value: 1, revenue: 0, percent: 100, color: "#94a3b8" },
      ];
    }

    return Array.from(map.entries()).map(([name, val], idx) => ({
      name,
      value: val,
      revenue: val,
      percent: total > 0 ? Math.round((val / total) * 100) : 0,
      color: palette[idx % palette.length],
    }));
  }, [filteredSales]);

  // TOP 5 MEJORES PRODUCTOS
  const topProducts = useMemo(() => {
    const productStats = new Map<
      string,
      {
        id: string;
        name: string;
        brand: string;
        category: string;
        color: string;
        image_url?: string;
        soldUnits: number;
        revenue: number;
        currentStock: number;
        minStock: number;
      }
    >();

    // Initialize with existing products catalog
    for (const p of products) {
      productStats.set(String(p.id), {
        id: String(p.id),
        name: p.name,
        brand: p.brand,
        category: p.category,
        color: p.color,
        image_url: p.image_url,
        soldUnits: 0,
        revenue: 0,
        currentStock: Number(p.total_stock || 0),
        minStock: Number(p.min_stock || 2),
      });
    }

    // Accumulate sales items
    for (const s of filteredSales) {
      if (Array.isArray(s.items)) {
        for (const item of s.items) {
          const pId = String(item.product_id || "");
          const existing = productStats.get(pId);
          const qty = Number(item.quantity || 1);
          const rev = Number(item.total || item.unit_price * qty || 0);

          if (existing) {
            existing.soldUnits += qty;
            existing.revenue += rev;
          } else if (pId) {
            productStats.set(pId, {
              id: pId,
              name: item.name || "Producto",
              brand: "—",
              category: "General",
              color: "—",
              soldUnits: qty,
              revenue: rev,
              currentStock: 0,
              minStock: 2,
            });
          }
        }
      }
    }

    const all = Array.from(productStats.values());

    // Filter those with sales first, or fall back to high stock / catalog
    const withSales = all.filter((p) => p.soldUnits > 0);
    if (withSales.length >= 3) {
      return withSales
        .sort((a, b) => (b.soldUnits !== a.soldUnits ? b.soldUnits - a.soldUnits : b.revenue - a.revenue))
        .slice(0, 5);
    }

    // If few or no sales, sort by stock value / units to showcase models
    return all
      .sort((a, b) => (b.soldUnits * 1000 + b.currentStock) - (a.soldUnits * 1000 + a.currentStock))
      .slice(0, 5);
  }, [products, filteredSales]);

  // TOP 5 MEJOR CLIENTE (Clientes con mayor volumen de compra)
  const topCustomers = useMemo(() => {
    const customerAgg = new Map<
      string,
      {
        id: string;
        name: string;
        type: string;
        phone: string;
        totalSpent: number;
        orderCount: number;
        balance: number;
        creditLimit: number;
      }
    >();

    // Initialize with registered customers
    for (const c of customers) {
      customerAgg.set(String(c.id), {
        id: String(c.id),
        name: c.name,
        type: "mayorista",
        phone: c.phone || "",
        totalSpent: 0,
        orderCount: 0,
        balance: Number(c.balance || 0),
        creditLimit: Number(c.credit_limit || 0),
      });
    }

    // Aggregate sales
    for (const s of filteredSales) {
      if (!s.customer_id && !s.customer_name) continue;
      const cId = s.customer_id ? String(s.customer_id) : "";
      const existing = cId ? customerAgg.get(cId) : null;
      const total = Number(s.total || 0);

      if (existing) {
        existing.totalSpent += total;
        existing.orderCount += 1;
      } else if (s.customer_name && s.customer_name !== "Consumidor final") {
        const tempKey = `name-${s.customer_name}`;
        const tempExisting = customerAgg.get(tempKey);
        if (tempExisting) {
          tempExisting.totalSpent += total;
          tempExisting.orderCount += 1;
        } else {
          customerAgg.set(tempKey, {
            id: tempKey,
            name: s.customer_name,
            type: "mayorista",
            phone: "",
            totalSpent: total,
            orderCount: 1,
            balance: 0,
            creditLimit: 0,
          });
        }
      }
    }

    const all = Array.from(customerAgg.values());

    // Sort by total spent descending, then by order count
    return all
      .sort((a, b) => {
        if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
        if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);
  }, [customers, filteredSales]);

  // CLIENTE MAYORISTA: Spotlight VIP y Ranking de mayoristas
  const wholesaleAnalysis = useMemo(() => {
    const wholesaleCustomers = customers;

    // Sales by wholesale customers
    const map = new Map<
      string,
      {
        customer: any;
        totalPurchases: number;
        ordersCount: number;
        pairsCount: number;
      }
    >();

    for (const c of wholesaleCustomers) {
      map.set(String(c.id), {
        customer: c,
        totalPurchases: 0,
        ordersCount: 0,
        pairsCount: 0,
      });
    }

    for (const s of filteredSales) {
      const cId = s.customer_id ? String(s.customer_id) : "";
      let entry = cId ? map.get(cId) : undefined;

      if (!entry && s.customer_name) {
        // Find matching customer by name
        const match = wholesaleCustomers.find(
          (c: any) => c.name.toLowerCase().trim() === s.customer_name?.toLowerCase().trim()
        );
        if (match) entry = map.get(String(match.id));
      }

      if (entry) {
        entry.totalPurchases += Number(s.total || 0);
        entry.ordersCount += 1;
        const pairs = Array.isArray(s.items)
          ? s.items.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0)
          : 0;
        entry.pairsCount += pairs;
      }
    }

    const rankedWholesalers = Array.from(map.values()).sort((a, b) => {
      if (b.totalPurchases !== a.totalPurchases) return b.totalPurchases - a.totalPurchases;
      if (b.customer.balance !== a.customer.balance) return Number(b.customer.balance) - Number(a.customer.balance);
      return a.customer.name.localeCompare(b.customer.name);
    });

    const topWholesaler = rankedWholesalers[0] || null;

    return {
      topWholesaler,
      allWholesalers: rankedWholesalers,
      totalWholesaleClients: wholesaleCustomers.length,
    };
  }, [customers, filteredSales]);

  // Stock en movimiento (Modelos destacados para venta rápida)
  const stockQuickList = products.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* HEADER WITH PERIOD SELECTOR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">
              Panel de Control General
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            Resumen de {businessName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Métricas clave, análisis de ventas, mejores productos y clientes en tiempo real.
          </p>
        </div>

        {/* Action buttons & Period Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <PeriodFilterButtons value={period} onChange={setPeriod} size="sm" />

          <Button
            onClick={() => setSection("ventas")}
            className="rounded-xl shadow-sm bg-gradient-to-r from-[#ff7a5c] to-[#e9684c] text-white hover:opacity-95"
          >
            <ShoppingCart className="size-4" />
            Nueva venta
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS 3D CLAYMORPHISM */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Sales */}
        <Card className="group relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Ventas · {PERIOD_LABELS[period]}
                </p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {money(periodStats.revenue)}
                </p>
              </div>
              <span className="clay-pill-3d clay-pill-blue size-12 shrink-0">
                <CircleDollarSign className="size-6" strokeWidth={2.3} />
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="secondary" className="font-semibold text-[11px] px-1.5 py-0">
                  {periodStats.count} {periodStats.count === 1 ? "operación" : "operaciones"}
                </Badge>
                <span className="text-[11px]">· Prom. {money(periodStats.avgTicket)}</span>
              </div>
              <PeriodFilterButtons value={period} onChange={setPeriod} size="xs" />
            </div>
          </CardContent>
        </Card>

        {/* Cash Balance */}
        <Card className="group relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Saldo en Caja ({PERIOD_LABELS[period]})
                </p>
                <p className={`mt-1.5 text-2xl sm:text-3xl font-black tracking-tight ${data.stats.cashBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {money(data.stats.cashBalance)}
                </p>
              </div>
              <span className="clay-pill-3d clay-pill-green size-12 shrink-0">
                <WalletCards className="size-6" strokeWidth={2.3} />
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <ArrowDownLeft className="size-3 mr-0.5" /> +{money(periodStats.periodIncome)}
              </span>
              <span className="inline-flex items-center text-red-500 font-semibold text-[11px]">
                <ArrowUpRight className="size-3 mr-0.5" /> -{money(periodStats.periodExpenses)}
              </span>
              <span className="text-[11px] font-medium text-foreground">
                Flujo: {periodStats.periodNetCash >= 0 ? "+" : ""}{money(periodStats.periodNetCash)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Capital Stock */}
        <Card className="group relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-purple-500 to-violet-600" />
          <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Capital en Inventario
                </p>
                <p className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {money(data.stats.stockValue)}
                </p>
              </div>
              <span className="clay-pill-3d clay-pill-violet size-12 shrink-0">
                <Boxes className="size-6" strokeWidth={2.3} />
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <span>{products.reduce((acc, p) => acc + Number(p.total_stock || 0), 0)} unidades ({data.stats.productCount} prod.)</span>
              <span className="text-primary font-semibold">{periodStats.totalPairsSold} vendidas ({PERIOD_LABELS[period]})</span>
            </div>
          </CardContent>
        </Card>

        {/* Operational Alerts & Debt */}
        <Card className="group relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Alertas y Saldos a Cobrar
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                    {data.stats.lowStock}
                  </p>
                  <span className="text-xs text-muted-foreground">modelos a reponer</span>
                </div>
              </div>
              <span className="clay-pill-3d clay-pill-coral size-12 shrink-0">
                <Archive className="size-6" strokeWidth={2.3} />
              </span>
            </div>
            <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
              {periodStats.customersWithDebt > 0 ? (
                <span className="text-amber-700 dark:text-amber-300 font-medium">
                  {periodStats.customersWithDebt} clientes con deuda ({money(periodStats.totalDebtAmount)})
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">Cuentas corrientes al día</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION: CHARTS ROW (EVOLUTION & CHANNEL SPLIT) */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Chart 1: Revenue Timeline */}
        <Card className="border-0 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="size-5 text-primary" />
                Evolución de Ventas Mayoristas
              </CardTitle>
              <CardDescription>
                Facturación y unidades vendidas · {PERIOD_FULL_LABELS[period]}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1 font-mono text-xs">
                Total: {money(periodStats.revenue)}
              </Badge>
              <PeriodFilterButtons value={period} onChange={setPeriod} size="xs" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[270px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff7a5c" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ff7a5c" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-xl border bg-card p-3 shadow-xl text-xs space-y-1">
                              <p className="font-bold text-foreground">{item.date || item.displayDate}</p>
                              <div className="flex justify-between gap-4 text-muted-foreground">
                                <span>Facturación Mayorista:</span>
                                <span className="font-semibold text-primary">{money(item.total)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-muted-foreground">
                                <span>Unidades despachadas:</span>
                                <span className="font-semibold text-orange-600">{item.pares} u.</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Facturación"
                      stroke="#ff7a5c"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" /> Facturación Mayorista ($)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-orange-400" /> Volumen en Unidades
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Payment Methods Split Donut */}
        <Card className="border-0 shadow-[0_8px_28px_rgb(15_33_55/7%)] flex flex-col justify-between">
          <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent className="size-5 text-primary" />
                Medios de Pago y Cobranzas
              </CardTitle>
              <CardDescription>
                Distribución por medio de cobro · {PERIOD_LABELS[period]}
              </CardDescription>
            </div>
            <PeriodFilterButtons value={period} onChange={setPeriod} size="xs" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center pt-0">
            <div className="h-[180px] w-full relative flex items-center justify-center">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any, item: any) => [
                        `${money(item.payload.revenue)} (${item.payload.percent}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-foreground">
                  {periodStats.count}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Ventas
                </span>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 dark:bg-primary/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">Facturación Total</span>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {periodStats.count} op.
                  </Badge>
                </div>
                <p className="mt-1 text-base font-extrabold text-foreground">
                  {money(periodStats.revenue)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {periodStats.totalPairsSold} unidades mayoristas
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Cuentas Corrientes</span>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {periodStats.customersWithDebt} con saldo
                  </Badge>
                </div>
                <p className="mt-1 text-base font-extrabold text-foreground">
                  {money(periodStats.totalDebtAmount)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Saldo pendiente a cobrar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION: TOP 5 MEJORES PRODUCTOS & TOP 5 MEJOR CLIENTE */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* TOP 5 MEJORES PRODUCTOS */}
        <Card className="border-0 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingBag className="size-5 text-primary" />
                Top 5 Modelos Más Vendidos
              </CardTitle>
              <CardDescription>
                Modelos con mayor rotación e ingresos ({PERIOD_LABELS[period]})
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSection("productos")}
              className="text-xs h-8 rounded-lg"
            >
              Ver catálogo
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {topProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aún no hay productos registrados en el catálogo.
              </div>
            ) : (
              topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5 transition hover:bg-muted/40"
                >
                  <span className="size-6 shrink-0 grid place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {index + 1}
                  </span>

                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          const fallback = document.createElement('div');
                          fallback.className = 'grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground border border-border/60';
                          fallback.innerHTML = '<svg class="lucide lucide-shopping-bag size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
                          e.currentTarget.parentElement.appendChild(fallback);
                        }
                      }}
                      className="size-11 rounded-xl object-cover border border-border/60 shrink-0"
                    />
                  ) : (
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground border border-border/60">
                      <ShoppingBag className="size-4" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-sm text-foreground">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {product.brand} · {product.color} · {product.category}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-sm text-foreground">
                      {product.soldUnits > 0 ? `${product.soldUnits} u.` : `${product.currentStock} en stock`}
                    </p>
                    <p className="text-xs text-primary font-semibold">
                      {product.revenue > 0 ? money(product.revenue) : "Sin ventas"}
                    </p>
                    <Badge
                      variant={product.currentStock <= product.minStock ? "destructive" : "outline"}
                      className="text-[10px] h-4 px-1 mt-0.5"
                    >
                      Stock: {product.currentStock}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* TOP 5 MEJOR CLIENTE */}
        <Card className="border-0 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="size-5 text-primary" />
                Top 5 Clientes Frecuentes
              </CardTitle>
              <CardDescription>
                Clientes con mayor volumen acumulado ({PERIOD_LABELS[period]})
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSection("clientes")}
              className="text-xs h-8 rounded-lg"
            >
              Ver clientes
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {topCustomers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay clientes registrados o con compras todavía.
              </div>
            ) : (
              topCustomers.map((customer, index) => {
                const initials =
                  customer.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "CL";

                const cleanPhone = String(customer.phone || "").replace(/[^0-9]/g, "");

                return (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5 transition hover:bg-muted/40"
                  >
                    <span className="size-6 shrink-0 grid place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>

                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground font-bold text-xs border border-border/60">
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-sm text-foreground">
                          {customer.name}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1 capitalize text-primary font-semibold border-primary/30"
                        >
                          Mayorista
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{customer.orderCount > 0 ? `${customer.orderCount} compras` : "Registrado"}</span>
                        {customer.balance > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            · Deuda: {money(customer.balance)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">· Al día</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-extrabold text-sm text-foreground">
                          {money(customer.totalSpent)}
                        </p>
                        <span className="text-[11px] text-muted-foreground block">
                          Comprado
                        </span>
                      </div>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid size-8 place-items-center rounded-lg border border-border/70 bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition"
                          title={`WhatsApp a ${customer.name}`}
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION: CLIENTE MAYORISTA - DISEÑO LIMPIO Y PROFESIONAL */}
      <Card className="border-0 shadow-[0_8px_28px_rgb(15_33_55/7%)] overflow-hidden">
        <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              Ventas y Clientes Mayoristas
            </CardTitle>
            <CardDescription className="mt-0.5">
              Seguimiento de compras por volumen, saldo en cuenta corriente y límites de crédito
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
              {wholesaleAnalysis.totalWholesaleClients} clientes mayoristas
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSection("clientes")}
              className="text-xs h-8 rounded-lg"
            >
              Ver clientes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {wholesaleAnalysis.allWholesalers.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <Truck className="mx-auto size-10 text-muted-foreground/50 mb-2" />
              <p className="font-semibold text-foreground">No tenés clientes mayoristas registrados aún</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Podés crear clientes con tipo "Mayorista" desde la sección Clientes para habilitar compras por curva y líneas de crédito.
              </p>
              <Button
                onClick={() => setSection("clientes")}
                variant="outline"
                className="mt-4 rounded-xl text-xs"
              >
                Ir a Clientes
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1.7fr]">
              {/* Resumen Mayorista Destacado */}
              {wholesaleAnalysis.topWholesaler && (
                <div className="rounded-2xl border border-border/70 bg-card p-5 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Mayor volumen de compra
                      </span>
                      <Badge variant="outline" className="text-[11px] font-medium">
                        Mayorista
                      </Badge>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mt-1.5">
                      {wholesaleAnalysis.topWholesaler.customer.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {wholesaleAnalysis.topWholesaler.customer.phone || "Sin teléfono"} · {wholesaleAnalysis.topWholesaler.customer.city || "Sucursal"}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                        <span className="text-[11px] text-muted-foreground block">Volumen Comprado</span>
                        <p className="text-base font-extrabold text-foreground mt-0.5">
                          {money(wholesaleAnalysis.topWholesaler.totalPurchases)}
                        </p>
                        <span className="text-[10px] text-muted-foreground block">
                          {wholesaleAnalysis.topWholesaler.ordersCount} pedidos ({wholesaleAnalysis.topWholesaler.pairsCount} u.)
                        </span>
                      </div>

                      <div className="rounded-xl bg-muted/40 p-3 border border-border/50">
                        <span className="text-[11px] text-muted-foreground block">Saldo en Cuenta</span>
                        <p className={`text-base font-extrabold mt-0.5 ${Number(wholesaleAnalysis.topWholesaler.customer.balance) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {money(wholesaleAnalysis.topWholesaler.customer.balance)}
                        </p>
                        <span className="text-[10px] text-muted-foreground block">
                          {Number(wholesaleAnalysis.topWholesaler.customer.balance) > 0 ? "Pendiente" : "Al día"}
                        </span>
                      </div>
                    </div>

                    {Number(wholesaleAnalysis.topWholesaler.customer.credit_limit || 0) > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                          <span>Límite de crédito utilizado</span>
                          <span className="font-semibold text-foreground">
                            {money(wholesaleAnalysis.topWholesaler.customer.balance)} / {money(wholesaleAnalysis.topWholesaler.customer.credit_limit || 0)}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(
                            100,
                            Math.round(
                              (Number(wholesaleAnalysis.topWholesaler.customer.balance || 0) /
                                Number(wholesaleAnalysis.topWholesaler.customer.credit_limit || 1)) *
                                100
                            )
                          )}
                          className="h-1.5"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Contacto directo</span>
                    {wholesaleAnalysis.topWholesaler.customer.phone && (
                      <a
                        href={`https://wa.me/${String(wholesaleAnalysis.topWholesaler.customer.phone).replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition"
                      >
                        <MessageCircle className="size-3.5 text-emerald-600" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Wholesalers Table */}
              <div className="rounded-2xl border border-border/70 overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Cliente Mayorista</TableHead>
                      <TableHead>Total Comprado</TableHead>
                      <TableHead>Saldo Corriente</TableHead>
                      <TableHead className="text-right">Límite Crédito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wholesaleAnalysis.allWholesalers.slice(0, 5).map((w, idx) => (
                      <TableRow key={w.customer.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="size-5 shrink-0 grid place-items-center rounded bg-muted text-[11px] font-semibold text-muted-foreground">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">{w.customer.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {w.customer.phone || w.customer.city || "Mayorista"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-sm text-foreground">{money(w.totalPurchases)}</p>
                          <p className="text-[11px] text-muted-foreground">{w.ordersCount} compras</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={Number(w.customer.balance) > 0 ? "secondary" : "outline"}
                            className={Number(w.customer.balance) > 0 ? "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40" : "text-emerald-600"}
                          >
                            {money(w.customer.balance)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-medium text-xs text-muted-foreground">
                            {Number(w.customer.credit_limit || 0) > 0 ? money(w.customer.credit_limit || 0) : "Sin límite"}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION: STOCK EN MOVIMIENTO & ÚLTIMOS MOVIMIENTOS */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Quick stock add */}
        <Card className="border-0 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Boxes className="size-5 text-primary" />
                Stock en Movimiento
              </CardTitle>
              <CardDescription>
                Modelos disponibles listos para sumar al punto de venta por talle
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSection("productos")}
              className="text-xs h-8 rounded-lg"
            >
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 pt-2">
            {stockQuickList.map((p: any) => (
              <div
                key={p.id}
                className="rounded-2xl border bg-muted/20 p-4 flex flex-col justify-between hover:border-primary/30 transition"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="size-11 rounded-xl object-cover border border-border/80 shrink-0"
                        />
                      ) : (
                        <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ShoppingBag className="size-5" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.brand} · {p.color}
                        </p>
                      </div>
                    </div>
                    <Badge variant={p.total_stock <= p.min_stock ? "destructive" : "secondary"}>
                      {p.total_stock} u.
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-primary">
                    {money(p.retail_price)}
                  </p>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Tocar variante para vender:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(p.variants || []).map((v: any) => (
                      <button
                        key={v.id}
                        disabled={!v.stock}
                        onClick={() => addVariant(p, v)}
                        className="rounded-lg border bg-card px-2 py-1 text-xs font-semibold disabled:opacity-30 hover:border-primary transition"
                        title={`Agregar talle ${v.size} al carrito`}
                      >
                        {v.size}
                        <span className="ml-1 text-[10px] text-muted-foreground">{v.stock}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent cash movements */}
        <Card className="border-0 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="size-5 text-primary" />
                Últimos Movimientos
              </CardTitle>
              <CardDescription>
                Registros recientes de caja e ingresos
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSection("caja")}
              className="text-xs h-8 rounded-lg"
            >
              Libro de caja
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {movements.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay movimientos de caja registrados.
              </div>
            ) : (
              movements.slice(0, 6).map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-2.5 transition hover:bg-muted/30"
                >
                  <span
                    className={`grid size-9 place-items-center rounded-xl shrink-0 ${
                      m.type === "ingreso"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    }`}
                  >
                    {m.type === "ingreso" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">
                      {m.description || m.category}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {dateFull(m.created_at)}
                    </p>
                  </div>
                  <p
                    className={`text-xs font-black shrink-0 ${
                      m.type === "ingreso"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {m.type === "ingreso" ? "+" : "-"}
                    {money(m.amount)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
