"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  UserPlus,
  Search,
  MessageCircle,
  Coins,
  Pencil,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Building,
  CreditCard,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

interface CustomersViewProps {
  customers: any[];
  sales: any[];
  customerMoves: any[];
  onNewCustomer: () => void;
  onEditCustomer: (customer: any) => void;
  onAdjustDebt: (customer: any) => void;
  onViewDetail: (customer: any) => void;
  onDeleteCustomer: (customer: any) => void;
  isCashier?: boolean;
}

const money = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val || 0);

export function CustomersView({
  customers = [],
  sales = [],
  customerMoves = [],
  onNewCustomer,
  onEditCustomer,
  onAdjustDebt,
  onViewDetail,
  onDeleteCustomer,
  isCashier = false,
}: CustomersViewProps) {
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"todos" | "con_deuda" | "al_dia" | "mayoristas" | "minoristas">("todos");
  const [sortBy, setSortBy] = useState<"deuda" | "nombre" | "recientes">("deuda");

  // Statistics
  const totalCustomers = customers.length;
  const withDebt = customers.filter((c: any) => Number(c.balance || 0) > 0);
  const totalDebt = withDebt.reduce((sum: number, c: any) => sum + Number(c.balance || 0), 0);
  const totalCreditLimit = customers.reduce((sum: number, c: any) => sum + Number(c.credit_limit || 0), 0);
  const wholesalers = customers.filter((c: any) => c.type === "mayorista").length;
  const retailers = customers.filter((c: any) => c.type !== "mayorista").length;

  // Filtered and sorted list
  const filteredCustomers = useMemo(() => {
    const q = query.toLowerCase().trim();

    return customers
      .filter((c: any) => {
        // Search query
        if (q) {
          const match = [
            c.name,
            c.phone,
            c.email,
            c.document,
            c.city,
            c.address,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!match.includes(q)) return false;
        }

        // Filter tab
        const bal = Number(c.balance || 0);
        if (filterTab === "con_deuda") return bal > 0;
        if (filterTab === "al_dia") return bal <= 0;
        if (filterTab === "mayoristas") return c.type === "mayorista";
        if (filterTab === "minoristas") return c.type !== "mayorista";

        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "deuda") {
          return Number(b.balance || 0) - Number(a.balance || 0);
        }
        if (sortBy === "nombre") {
          return String(a.name || "").localeCompare(String(b.name || ""));
        }
        if (sortBy === "recientes") {
          return String(b.created_at || "").localeCompare(String(a.created_at || ""));
        }
        return 0;
      });
  }, [customers, query, filterTab, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
            Relaciones comerciales
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Clientes y Cuentas Corrientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control de saldos, cobranzas, límites de crédito para clientes minoristas y mayoristas.
          </p>
        </div>
        <Button onClick={onNewCustomer} className="rounded-xl shrink-0 font-semibold">
          <UserPlus className="size-4" />
          Nuevo cliente
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-3 border-0 py-5 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardContent className="flex items-start justify-between px-5">
            <div>
              <p className="text-sm text-muted-foreground">Total de clientes</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{totalCustomers}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {wholesalers} mayoristas · {retailers} minoristas
              </p>
            </div>
            <span className="clay-icon rounded-2xl p-3 bg-blue-50 text-blue-700 dark:bg-blue-950/40">
              <Users className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card className="gap-3 border-0 py-5 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardContent className="flex items-start justify-between px-5">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Deuda Total de Clientes</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {money(totalDebt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {withDebt.length} clientes con saldo deudor
              </p>
            </div>
            <span className="clay-icon rounded-2xl p-3 bg-red-50 text-red-700 dark:bg-red-950/40">
              <DollarSign className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card className="gap-3 border-0 py-5 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardContent className="flex items-start justify-between px-5">
            <div>
              <p className="text-sm text-muted-foreground">Clientes con deuda</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{withDebt.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalCustomers > 0
                  ? `${Math.round((withDebt.length / totalCustomers) * 100)}% del total registrado`
                  : "Sin clientes"}
              </p>
            </div>
            <span className="clay-icon rounded-2xl p-3 bg-orange-50 text-orange-700 dark:bg-orange-950/40">
              <AlertCircle className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card className="gap-3 border-0 py-5 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardContent className="flex items-start justify-between px-5">
            <div>
              <p className="text-sm text-muted-foreground">Crédito otorgado</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{money(totalCreditLimit)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Límite total de crédito configurado
              </p>
            </div>
            <span className="clay-icon rounded-2xl p-3 bg-violet-50 text-violet-700 dark:bg-violet-950/40">
              <CreditCard className="size-5" />
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono, DNI/CUIT o ciudad..."
            className="h-10 pl-9 rounded-xl bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros por pestaña */}
          <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
            <button
              onClick={() => setFilterTab("todos")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterTab === "todos" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground"
              }`}
            >
              Todos ({totalCustomers})
            </button>
            <button
              onClick={() => setFilterTab("mayoristas")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterTab === "mayoristas" ? "bg-card shadow-xs text-orange-600 font-bold" : "text-muted-foreground"
              }`}
            >
              Mayoristas ({wholesalers})
            </button>
            <button
              onClick={() => setFilterTab("minoristas")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterTab === "minoristas" ? "bg-card shadow-xs text-blue-600 font-bold" : "text-muted-foreground"
              }`}
            >
              Minoristas ({retailers})
            </button>
            <button
              onClick={() => setFilterTab("con_deuda")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterTab === "con_deuda" ? "bg-card shadow-xs text-amber-600 font-bold" : "text-muted-foreground"
              }`}
            >
              Con deuda ({withDebt.length})
            </button>
            <button
              onClick={() => setFilterTab("al_dia")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterTab === "al_dia" ? "bg-card shadow-xs text-foreground font-bold" : "text-muted-foreground"
              }`}
            >
              Al día
            </button>
          </div>

          {/* Ordenar */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="h-9 rounded-xl border bg-background px-3 text-xs font-semibold"
          >
            <option value="deuda">Mayor deuda</option>
            <option value="nombre">Nombre A-Z</option>
            <option value="recientes">Más recientes</option>
          </select>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-5">Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Deuda Total / Saldo Deudor</TableHead>
                <TableHead>Límite de crédito</TableHead>
                <TableHead className="text-right pr-5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Users className="size-10 opacity-30" />
                      <p className="text-base font-semibold">No se encontraron clientes</p>
                      <p className="text-xs">
                        {query ? "Probá con otro término de búsqueda." : "Registrá tu primer cliente para comenzar."}
                      </p>
                      {!query && (
                        <Button size="sm" onClick={onNewCustomer} className="mt-3 rounded-xl">
                          <UserPlus className="size-4 mr-1.5" />
                          Crear cliente
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c: any) => {
                  const bal = Number(c.balance || 0);
                  const limit = Number(c.credit_limit || 0);
                  const pct = limit > 0 ? Math.min(100, Math.round((Math.max(0, bal) / limit) * 100)) : 0;
                  const cleanPhone = String(c.phone || "").replace(/[^0-9]/g, "");

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/25 transition-colors">
                      <TableCell className="pl-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                            {c.name?.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground leading-tight hover:underline cursor-pointer" onClick={() => onViewDetail(c)}>
                              {c.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {c.document ? `DNI/CUIT ${c.document}` : c.city || "Sin documento"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`border-0 text-xs font-semibold gap-1 inline-flex items-center ${
                            c.type === "mayorista"
                              ? "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                          }`}
                        >
                          {c.type === "mayorista" ? (
                            <>
                              <Building className="size-3 text-orange-600 dark:text-orange-400" />
                              Mayorista
                            </>
                          ) : (
                            <>
                              <UserRound className="size-3 text-blue-600 dark:text-blue-400" />
                              Minorista
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">
                            {c.phone || c.email || "—"}
                          </span>
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="size-7 grid place-items-center rounded-lg border text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="size-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-extrabold ${
                                bal > 0
                                  ? "text-red-600 dark:text-red-400"
                                  : bal < 0
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {money(bal)}
                            </span>
                            <Badge
                              variant={bal > 0 ? "destructive" : "outline"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {bal > 0 ? "Debe" : bal < 0 ? "A favor" : "Al día"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {limit > 0 ? (
                          <div className="max-w-32 space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>{money(limit)}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Cobrar / Ajustar saldo */}
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                            onClick={() => onAdjustDebt(c)}
                            title="Ajustar saldo o registrar cobro"
                          >
                            <Coins className="size-3.5" />
                            <span className="hidden md:inline">Cobrar / Saldo</span>
                          </Button>

                          {/* Ver Ficha */}
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 rounded-lg text-primary hover:bg-primary/10"
                            onClick={() => onViewDetail(c)}
                            title="Ver ficha y movimientos"
                          >
                            <Eye className="size-3.5" />
                            <span className="hidden lg:inline">Ficha</span>
                          </Button>

                          {/* Editar */}
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={() => onEditCustomer(c)}
                            title="Editar datos"
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          {/* Eliminar (Solo Admin) */}
                          {!isCashier && (
                            <Button
                              variant="outline"
                              size="xs"
                              className="h-8 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                              onClick={() => onDeleteCustomer(c)}
                              title="Eliminar cliente"
                            >
                              <Trash2 className="size-3.5" />
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
        </CardContent>
      </Card>
    </div>
  );
}
