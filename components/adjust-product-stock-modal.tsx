"use client";

import { FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Boxes, Plus, Minus, Check } from "lucide-react";

interface AdjustProductStockModalProps {
  product: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (payload: any) => Promise<boolean>;
}

export function AdjustProductStockModal({
  product,
  open,
  onOpenChange,
  busy,
  onSubmit,
}: AdjustProductStockModalProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso");
  const [amount, setAmount] = useState<number>(1);
  const [note, setNote] = useState<string>("Ajuste manual");

  if (!product) return null;

  const variants = product.variants || [];
  const currentVariant = variants.find((v: any) => String(v.id) === String(selectedVariantId)) || variants[0];
  const activeId = selectedVariantId || (variants[0]?.id ? String(variants[0].id) : "");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentVariant) return;

    const qty = Math.max(1, Number(amount) || 1);
    const quantity = type === "ingreso" ? qty : -qty;

    const ok = await onSubmit({
      action: "adjust_stock",
      variantId: currentVariant.id,
      quantity,
      note: note.trim() || "Ajuste manual",
    });

    if (ok) {
      onOpenChange(false);
      setAmount(1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Boxes className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold">Ajustar stock de {product.name}</DialogTitle>
              <DialogDescription className="text-xs">
                {product.brand} · {product.color} · Total actual: {product.total_stock} unidades
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* TIPO: INGRESO O EGRESO */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setType("ingreso")}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                type === "ingreso"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="size-3.5" />
              Ingreso (+ unidades)
            </button>
            <button
              type="button"
              onClick={() => setType("egreso")}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                type === "egreso"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Minus className="size-3.5" />
              Egreso (− unidades)
            </button>
          </div>

          {/* SELECCIONAR VARIANTE / TALLE */}
          {variants.length > 1 || (variants[0] && !["Único", "Unico", "General"].includes(variants[0].size)) ? (
            <div>
              <label className="text-xs font-semibold block mb-2">Seleccioná la variante / talle a ajustar:</label>
              <div className="flex flex-wrap gap-1.5">
                {variants.map((v: any) => {
                  const isSelected = String(v.id) === String(activeId);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(String(v.id))}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                          : "bg-card hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{v.size}</span>
                      <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                        {v.stock}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground flex items-center justify-between font-semibold">
              <span>Inventario general</span>
              <span className="font-bold text-foreground">{variants[0]?.stock || 0} u. actuales</span>
            </div>
          )}

          {/* CANTIDAD */}
          <div>
            <label className="text-xs font-semibold block mb-1.5">
              Cantidad de unidades a {type === "ingreso" ? "ingresar" : "dar de baja"}:
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={type === "egreso" ? currentVariant?.stock || 9999 : 9999}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
                className="h-11 text-center text-lg font-black rounded-xl"
              />
              <div className="flex gap-1">
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(n)}
                    className="rounded-lg border bg-muted/40 px-2.5 py-1 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {currentVariant && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Stock actual: <strong>{currentVariant.stock} pares</strong> → Quedará en:{" "}
                <strong className={type === "ingreso" ? "text-emerald-600" : "text-amber-600"}>
                  {type === "ingreso"
                    ? currentVariant.stock + amount
                    : Math.max(0, currentVariant.stock - amount)}{" "}
                  pares
                </strong>
              </p>
            )}
          </div>

          {/* MOTIVO */}
          <div>
            <label className="text-xs font-semibold block mb-1">Motivo del movimiento:</label>
            <select
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10 w-full rounded-xl border bg-background px-3 text-xs mb-1.5"
            >
              <option value="Recepción de mercadería / Proveedor">Recepción de mercadería / Proveedor</option>
              <option value="Ajuste por recuento físico">Ajuste por recuento físico</option>
              <option value="Falla de fábrica / Devolución">Falla de fábrica / Devolución</option>
              <option value="Consumo interno / Muestra">Consumo interno / Muestra</option>
              <option value="Ajuste manual">Otro motivo</option>
            </select>
            {note === "Ajuste manual" && (
              <Input
                placeholder="Especificá el motivo…"
                onChange={(e) => setNote(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            )}
          </div>

          {/* BOTONES */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className={`rounded-xl ${
                type === "ingreso" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {busy ? "Registrando…" : type === "ingreso" ? `+ Sumar ${amount} pares` : `− Restar ${amount} pares`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
