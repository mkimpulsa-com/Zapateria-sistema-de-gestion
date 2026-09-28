"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Truck,
  Plus,
  Search,
  MessageCircle,
  Pencil,
  Trash2,
  Eye,
  AlertCircle,
  DollarSign,
  Landmark,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

interface SuppliersViewProps {
  suppliers: any[];
  supplierMoves: any[];
  onNewSupplier: () => void;
  onEditSupplier: (supplier: any) => void;
  onAdjustDebt: (supplier: any) => void;
  onViewDetail: (supplier: any) => void;
  onDeleteSupplier: (supplier: any) => void;
}

const money = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val || 0);

export function SuppliersView({
  suppliers = [],
  supplierMoves = [],
  onNewSupplier,
  onEditSupplier,
  onAdjustDebt,
  onViewDetail,
  onDeleteSupplier,
}: SuppliersViewProps) {
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"todos" | "con_deuda" | "al_dia">("todos");
  const [sortBy, setSortBy] = useState<"deuda" | "nombre" | "recientes">("deuda");

  // Statistics
  const totalSuppliers = suppliers.length;
  const withDebt = suppliers.filter((s: any) => Number(s.balance || 0) > 0);
  const totalDebt = withDebt.reduce((sum: number, s: any) => sum + Number(s.balance || 0), 0);
  const upToDate = suppliers.filter((s: any) => Number(s.balance || 0) <= 0).length;

  // Filtered and sorted list
  const filteredSuppliers = useMemo(() => {
    const q = query.toLowerCase().trim();

    return suppliers
      .filter((s: any) => {
        // Search query
        if (q) {
          const match = [
            s.name,
            s.contact,
            s.phone,
            s.email,
            s.document,
            s.category,
            s.city,
            s.address,
            s.bank_info,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!match.includes(q)) return false;
        }

        // Filter tab
        const bal = Number(s.balance || 0);
        if (filterTab === "con_deuda") return bal > 0;
        if (filterTab === "al_dia") return bal <= 0;

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
  }, [suppliers, query, filterTab, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">
            Abastecimiento y compras
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Proveedores y cuentas a pagar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fabricantes, distribuidores, saldos pendientes y pagos de mercadería.
          </p>
        </div>
        <Button onClick={onNewSupplier} className="rounded-xl shrink-0">
          <Plus className="size-4" />
          Nuevo proveedor
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-3 border-0 py-5 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardContent className="flex items-start justify-between px-5">
            <div>
              <p className="text-sm text-muted-foreground">Total proveedores</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{totalSuppliers}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Fabricantes y distribuidores activos
              </p>
            </div>
            <span className="clay-icon rounded-2xl p-3 bg-blue-50 text-blue-700 dark:bg-blue-950/40">
              <Truck className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card className="gap-3 border-0 py-5 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardContent className="flex items-start justify-between px-5">
            <div>
              <p className="text-sm text-muted-foreground">Deuda total a pagar</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {money(totalDebt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Saldo pendiente a cancelar
              </p>
            </div>
            <span className="clay-icon rounded-2xl p-3 bg-amber-50 text-amber-700 dark:bg-amber-950/40">
              <DollarSign className="size-5" />
            </span>
          </CardContent>
        </Card>

        <Card className="gap-3 border-0 py-5 shadow-[0_8px_28px_rgb(15_33_55/7%)]">
          <CardContent className="flex items-start justify-between px-5">
            <div>
              <p className="text-sm text-muted-foreground">Con saldo pendiente</p>
              <p className="mt-2 text-2xl font-bold tracking-tight">{withDebt.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalSuppliers > 0
                  ? `${Math.round((withDebt.length / totalSuppliers) * 100)}% de los proveedores`
                  : "Sin proveedores"}
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
              <p className="text-sm text-muted-foreground">Cuentas al día</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {upToDate}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sin saldo deudor pendiente
              </p>
            </div>
            <span className="clay-icon rounded-2xl p-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40">
              <CheckCircle2 className="size-5" />
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
            placeholder="Buscar por empresa, contacto, teléfono, CUIT o rubro..."
            className="h-10 pl-9 rounded-xl bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros por pestaña */}
          <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
            <button
              onClick={() => setFilterTab("todos")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterTab === "todos" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
              }`}
            >
              Todos ({totalSuppliers})
            </button>
            <button
              onClick={() => setFilterTab("con_deuda")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterTab === "con_deuda" ? "bg-card shadow-xs text-amber-600 font-bold" : "text-muted-foreground"
              }`}
            >
              Con saldo pendiente ({withDebt.length})
            </button>
            <button
              onClick={() => setFilterTab("al_dia")}
              className={`rounded-lg px-3 py-1.5 transition ${
                filterTab === "al_dia" ? "bg-card shadow-xs text-foreground" : "text-muted-foreground"
              }`}
            >
              Al día ({upToDate})
            </button>
          </div>

          {/* Ordenar */}
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="h-9 rounded-xl border bg-background px-3 text-xs font-semibold"
          >
            <option value="deuda">Mayor deuda pendiente</option>
            <option value="nombre">Nombre A-Z</option>
            <option value="recientes">Más recientes</option>
          </select>
        </div>
      </div>

      {/* Tabla de Proveedores */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="pl-5">Proveedor / Empresa</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Rubro</TableHead>
                <TableHead>Datos bancarios (CBU/Alias)</TableHead>
                <TableHead>Saldo adeudado</TableHead>
                <TableHead className="text-right pr-5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Truck className="size-10 opacity-30" />
                      <p className="text-base font-semibold">No se encontraron proveedores</p>
                      <p className="text-xs">
                        {query ? "Probá con otro término de búsqueda." : "Registrá tu primer proveedor para comenzar."}
                      </p>
                      {!query && (
                        <Button size="sm" onClick={onNewSupplier} className="mt-3 rounded-xl">
                          <Plus className="size-4 mr-1.5" />
                          Crear proveedor
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((s: any) => {
                  const bal = Number(s.balance || 0);
                  const cleanPhone = String(s.phone || "").replace(/[^0-9]/g, "");

                  return (
                    <TableRow key={s.id} className="hover:bg-muted/25 transition-colors">
                      <TableCell className="pl-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                            <Truck className="size-5" />
                          </span>
                          <div>
                            <p
                              className="font-semibold text-foreground leading-tight hover:underline cursor-pointer"
                              onClick={() => onViewDetail(s)}
                            >
                              {s.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {s.document ? `CUIT ${s.document}` : s.city || "Sin CUIT"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold">{s.contact || "—"}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">{s.phone || "—"}</span>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="size-6 grid place-items-center rounded-md border text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                                title="Enviar WhatsApp"
                              >
                                <MessageCircle className="size-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {s.category || "Calzado"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {s.bank_info ? (
                          <div className="flex items-center gap-1.5">
                            <Landmark className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-xs max-w-44 truncate select-all" title={s.bank_info}>
                              {s.bank_info}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                              {bal > 0 ? "Pendiente" : bal < 0 ? "A favor" : "Al día"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Pagar / Saldo */}
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                            onClick={() => onAdjustDebt(s)}
                            title="Pagar o ajustar saldo de cuenta corriente"
                          >
                            <CreditCard className="size-3.5" />
                            <span className="hidden md:inline">Pagar / Saldo</span>
                          </Button>

                          {/* Ver Ficha */}
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 rounded-lg text-primary hover:bg-primary/10"
                            onClick={() => onViewDetail(s)}
                            title="Ver ficha y cuenta corriente"
                          >
                            <Eye className="size-3.5" />
                            <span className="hidden lg:inline">Ficha</span>
                          </Button>

                          {/* Editar */}
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={() => onEditSupplier(s)}
                            title="Editar datos"
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          {/* Eliminar */}
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-8 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                            onClick={() => onDeleteSupplier(s)}
                            title="Eliminar proveedor"
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
        </CardContent>
      </Card>
    </div>
  );
}
