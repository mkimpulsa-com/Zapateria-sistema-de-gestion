"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDownLeft, ArrowUpRight, DollarSign, Tag, FileText, Bookmark } from "lucide-react";

interface EditCashMovementModalProps {
  movement: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (payload: any) => Promise<boolean>;
}

const commonCategories = [
  "Aporte inicial",
  "Cobro cliente",
  "Venta",
  "Retiro de efectivo",
  "Pago a proveedor",
  "Servicios e impuestos",
  "Alquiler",
  "Sueldos",
  "Librería y embalaje",
  "Gastos generales",
  "Otro",
];

export function EditCashMovementModal({
  movement,
  open,
  onOpenChange,
  busy,
  onSubmit,
}: EditCashMovementModalProps) {
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso");
  const [category, setCategory] = useState("General");
  const [amount, setAmount] = useState<number | string>("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (movement) {
      setType(movement.type === "egreso" ? "egreso" : "ingreso");
      setCategory(movement.category || "General");
      setAmount(movement.amount || "");
      setReference(movement.reference || "");
      setDescription(movement.description || "");
    }
  }, [movement]);

  if (!movement) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const valAmount = Number(amount);
    if (!valAmount || valAmount <= 0) return;

    await onSubmit({
      action: "update_cash_movement",
      id: movement.id,
      type,
      category: category.trim() || "General",
      amount: valAmount,
      reference: reference.trim(),
      description: description.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className={`grid size-9 place-items-center rounded-xl ${
                type === "ingreso"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
              }`}
            >
              {type === "ingreso" ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">Editar movimiento de caja</DialogTitle>
              <DialogDescription className="text-xs">
                Modificá el importe, motivo o tipo de este movimiento registrado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* TIPO DE MOVIMIENTO */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("ingreso")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-semibold text-sm transition ${
                  type === "ingreso"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <ArrowDownLeft className="size-4 text-emerald-600" />
                Ingreso (+ entrada)
              </button>
              <button
                type="button"
                onClick={() => setType("egreso")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-semibold text-sm transition ${
                  type === "egreso"
                    ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <ArrowUpRight className="size-4 text-red-600" />
                Egreso (- salida)
              </button>
            </div>
          </div>

          {/* IMPORTE */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Importe ($ ARS) *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-9 h-11 text-lg font-bold"
              />
            </div>
          </div>

          {/* CATEGORIA */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Categoría</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Alquiler, Cobro cliente, Retiro..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {commonCategories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition ${
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* REFERENCIA */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Referencia / N° de comprobante</label>
            <div className="relative">
              <Bookmark className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej. Factura 001-234, Ticket, Transferencia #8812"
                className="pl-9"
              />
            </div>
          </div>

          {/* DESCRIPCION */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Descripción o detalle</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle o justificación del movimiento..."
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="font-semibold">
              {busy ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
