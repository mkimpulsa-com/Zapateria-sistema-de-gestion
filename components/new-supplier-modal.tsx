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
import {
  Truck,
  User,
  Phone,
  Mail,
  FileText,
  MapPin,
  Landmark,
  DollarSign,
  Tag,
} from "lucide-react";

interface NewSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (payload: any) => Promise<boolean>;
}

export function NewSupplierModal({
  open,
  onOpenChange,
  busy,
  onSubmit,
}: NewSupplierModalProps) {
  const [category, setCategory] = useState("Calzado y zapatillas");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      action: "create_supplier",
      name: String(form.get("name") || "").trim(),
      contact: String(form.get("contact") || "").trim(),
      document: String(form.get("document") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      email: String(form.get("email") || "").trim(),
      address: String(form.get("address") || "").trim(),
      city: String(form.get("city") || "").trim(),
      bankInfo: String(form.get("bankInfo") || "").trim(),
      category,
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
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Truck className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl">Nuevo proveedor</DialogTitle>
              <DialogDescription>
                Registrá un fabricante, distribuidor o proveedor de calzado con cuenta corriente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Empresa o razón social *</span>
                <Input
                  name="name"
                  required
                  placeholder="Ej. Fábrica Sur S.A. / Distribuidora Andina"
                  className="rounded-xl"
                  autoFocus
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                Persona de contacto
              </span>
              <Input
                name="contact"
                placeholder="Ej. Lucas / Carla Rossi"
                className="rounded-xl"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" />
                CUIT / Identificación
              </span>
              <Input
                name="document"
                placeholder="Ej. 30-71234567-8"
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
                placeholder="Ej. 11 5555-1300"
                className="rounded-xl"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                Email de pedidos/pagos
              </span>
              <Input
                name="email"
                type="email"
                placeholder="ventas@proveedor.com"
                className="rounded-xl"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-muted-foreground" />
                Rubro principal
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 rounded-xl border bg-background px-3 text-sm font-medium"
              >
                <option value="Calzado y zapatillas">Calzado y zapatillas</option>
                <option value="Botas y borcegos">Botas y borcegos</option>
                <option value="Zapatos y sandalias">Zapatos y sandalias</option>
                <option value="Infantil y colegial">Infantil y colegial</option>
                <option value="Cuero y marroquinería">Cuero y marroquinería</option>
                <option value="Insumos y accesorios">Insumos y accesorios</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                Ciudad / Provincia
              </span>
              <Input
                name="city"
                placeholder="Ej. Rosario, Santa Fe"
                className="rounded-xl"
              />
            </label>

            <div className="sm:col-span-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  Dirección del depósito o fábrica
                </span>
                <Input
                  name="address"
                  placeholder="Ej. Parque Industrial Lote 12"
                  className="rounded-xl"
                />
              </label>
            </div>
          </div>

          {/* Datos Bancarios y CBU/Alias */}
          <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Landmark className="size-3.5" />
              Datos bancarios para transferencias
            </p>
            <div>
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>CBU / CVU o Alias de transferencia</span>
                <Input
                  name="bankInfo"
                  placeholder="Ej. 0110599520000012345678 o CALZADOS.SUR.PAGOS"
                  className="rounded-xl bg-background"
                />
                <span className="text-[11px] text-muted-foreground font-normal">
                  Podrás copiar este dato con un clic al momento de transferir.
                </span>
              </label>
            </div>
          </div>

          {/* Saldo inicial pendiente */}
          <div className="rounded-2xl border bg-muted/20 p-4">
            <label className="grid gap-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-amber-600" />
                Saldo pendiente adeudado inicial ($)
              </span>
              <Input
                name="balance"
                type="number"
                step="100"
                defaultValue="0"
                className="rounded-xl bg-background"
              />
              <span className="text-[11px] text-muted-foreground font-normal">
                Importe que la empresa adeuda actualmente a este proveedor por facturas o remitos previos.
              </span>
            </label>
          </div>

          {/* Observaciones */}
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Notas comerciales y plazos de entrega</span>
            <textarea
              name="notes"
              rows={2}
              placeholder="Días de despacho, catálogo digital, condiciones de pago a 30 días..."
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
              {busy ? "Guardando..." : "Crear proveedor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
