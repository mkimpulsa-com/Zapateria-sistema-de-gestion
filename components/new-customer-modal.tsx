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
import {
  UserPlus,
  Phone,
  Mail,
  FileText,
  MapPin,
  CreditCard,
  Building,
  DollarSign,
} from "lucide-react";

interface NewCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (payload: any) => Promise<boolean>;
}

export function NewCustomerModal({
  open,
  onOpenChange,
  busy,
  onSubmit,
}: NewCustomerModalProps) {
  const [type, setType] = useState<"mayorista">("mayorista");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      action: "create_customer",
      name: String(form.get("name") || "").trim(),
      type: "mayorista",
      document: String(form.get("document") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(),
      address: String(form.get("address") || "").trim(),
      city: String(form.get("city") || "").trim(),
      creditLimit: Number(form.get("creditLimit")) || 0,
      balance: Number(form.get("balance")) || 0,
      notes: String(form.get("notes") || "").trim(),
    };

    const ok = await onSubmit(payload);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-orange-500/10 text-orange-600">
              <UserPlus className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl">Nuevo cliente mayorista</DialogTitle>
              <DialogDescription>
                Registrá un comercio, revendedor o cliente mayorista con cuenta corriente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3.5 text-xs text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-200 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Building className="size-4 text-orange-600 dark:text-orange-400" />
              <span>Tipo de cuenta: <strong>Cliente Mayorista (Comercial / Reventa)</strong></span>
            </div>
            <Badge className="bg-orange-600 text-white text-[10px]">Mayorista</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Nombre o razón social *</span>
                <Input
                  name="name"
                  required
                  placeholder="Ej. Juan Pérez / Calzados del Valle"
                  className="rounded-xl"
                  autoFocus
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                DNI / CUIT
              </span>
              <Input
                name="document"
                placeholder="Ej. 35.123.456 o 20-35123456-9"
                className="rounded-xl"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                Teléfono / WhatsApp
              </span>
              <Input
                name="phone"
                placeholder="Ej. 3757 555-1234"
                className="rounded-xl"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                Email
              </span>
              <Input
                name="email"
                type="email"
                placeholder="cliente@ejemplo.com"
                className="rounded-xl"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                Ciudad / Localidad
              </span>
              <Input
                name="city"
                placeholder="Ej. Puerto Iguazú"
                className="rounded-xl"
              />
            </label>

            <div className="sm:col-span-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  Dirección
                </span>
                <Input
                  name="address"
                  placeholder="Ej. Av. Victoria Aguirre 450"
                  className="rounded-xl"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="size-3.5" />
              Cuenta corriente y crédito
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-muted-foreground" />
                  Límite de crédito ($)
                </span>
                <Input
                  name="creditLimit"
                  type="number"
                  min="0"
                  step="1000"
                  defaultValue="0"
                  className="rounded-xl bg-background"
                />
                <span className="text-[11px] text-muted-foreground font-normal">
                  $0 = sin límite o venta al contado únicamente.
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-amber-600" />
                  Saldo inicial adeudado ($)
                </span>
                <Input
                  name="balance"
                  type="number"
                  step="100"
                  defaultValue="0"
                  className="rounded-xl bg-background"
                />
                <span className="text-[11px] text-muted-foreground font-normal">
                  Deuda previa acumulada que trae el cliente.
                </span>
              </label>
            </div>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Notas u observaciones internas</span>
            <textarea
              name="notes"
              rows={2}
              placeholder="Preferencias de calzado, días de entrega, referencias..."
              className="resize-none rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="rounded-xl">
              {busy ? "Guardando..." : "Crear cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
