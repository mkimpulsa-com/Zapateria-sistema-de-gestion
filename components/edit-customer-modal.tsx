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
import {
  Pencil,
  Phone,
  Mail,
  FileText,
  MapPin,
  CreditCard,
  Building,
  DollarSign,
} from "lucide-react";

interface EditCustomerModalProps {
  customer: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (payload: any) => Promise<boolean>;
}

export function EditCustomerModal({
  customer,
  open,
  onOpenChange,
  busy,
  onSubmit,
}: EditCustomerModalProps) {
  const [type, setType] = useState<"minorista" | "mayorista">("minorista");

  useEffect(() => {
    if (customer) {
      setType(customer.type === "mayorista" ? "mayorista" : "minorista");
    }
  }, [customer]);

  if (!customer) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      action: "edit_customer",
      customerId: customer.id,
      name: String(form.get("name") || "").trim(),
      type,
      document: String(form.get("document") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(),
      address: String(form.get("address") || "").trim(),
      city: String(form.get("city") || "").trim(),
      creditLimit: Number(form.get("creditLimit")) || 0,
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
            <span className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
              <Pencil className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl">Editar cliente</DialogTitle>
              <DialogDescription>
                Modificá los datos de contacto y condiciones comerciales de {customer.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Tipo de cliente
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("minorista")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${
                  type === "minorista"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span className="size-2 rounded-full bg-blue-500" />
                Minorista
              </button>
              <button
                type="button"
                onClick={() => setType("mayorista")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${
                  type === "mayorista"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Building className="size-4" />
                Mayorista
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Nombre o razón social *</span>
                <Input
                  name="name"
                  required
                  defaultValue={customer.name}
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
                defaultValue={customer.document || ""}
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
                defaultValue={customer.phone || ""}
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
                defaultValue={customer.email || ""}
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
                defaultValue={customer.city || ""}
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
                  defaultValue={customer.address || ""}
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
                  defaultValue={customer.credit_limit || 0}
                  className="rounded-xl bg-background"
                />
                <span className="text-[11px] text-muted-foreground font-normal">
                  $0 = sin límite establecido.
                </span>
              </label>

              <div className="rounded-xl border bg-background p-3 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground">Saldo actual en cuenta</span>
                <span className={`text-xl font-extrabold mt-0.5 ${Number(customer.balance) > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  ${new Intl.NumberFormat("es-AR").format(customer.balance || 0)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  El saldo se modifica desde el botón &quot;Cobrar / Ajustar saldo&quot;.
                </span>
              </div>
            </div>
          </div>

          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Notas u observaciones internas</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={customer.notes || ""}
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
              {busy ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
