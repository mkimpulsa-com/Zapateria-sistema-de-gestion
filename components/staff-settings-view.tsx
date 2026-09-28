"use client";

import { FormEvent, useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  Mail,
  User,
  Power,
  ShieldAlert,
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface StaffSettingsViewProps {
  staff: any[];
  onSave: (payload: any, message: string) => Promise<any>;
  busy: boolean;
  storeName?: string;
}

export function StaffSettingsView({
  staff = [],
  onSave,
  busy,
  storeName = "Mi Zapatería",
}: StaffSettingsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCreateCashier = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "").trim();

    if (!name || !email || !password) {
      setFormError("Todos los campos son obligatorios.");
      return;
    }
    if (password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    const ok = await onSave(
      {
        action: "create_cashier",
        name,
        email,
        password,
      },
      `Cajera "${name}" creada exitosamente`
    );

    if (ok) {
      setModalOpen(false);
    }
  };

  const handleToggleStatus = async (item: any) => {
    const nextStatus = item.active === false ? true : false;
    await onSave(
      {
        action: "toggle_cashier_status",
        cashierUid: item.uid || item.id,
        active: nextStatus,
      },
      nextStatus
        ? `Acceso de "${item.name}" reactivado`
        : `Acceso de "${item.name}" pausado`
    );
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    const ok = await onSave(
      {
        action: "delete_cashier",
        cashierUid: deletingStaff.uid || deletingStaff.id,
      },
      `Cajera "${deletingStaff.name}" eliminada del sistema`
    );
    if (ok) {
      setDeletingStaff(null);
    }
  };

  const dateFmt = (value?: string) => {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  return (
    <>
      <Card className="settings-panel border-0 shadow-sm">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="settings-panel-icon grid size-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Users className="size-5" />
              </span>
              <div>
                <CardTitle className="text-xl">Personal y Cajeras</CardTitle>
                <CardDescription className="mt-1">
                  Administrá las cuentas de tus empleadas de mostrador. Cada cajera accede con su propio correo y contraseña sin ver costos, reportes ni configuraciones sensibles.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => {
                setFormError("");
                setShowPassword(false);
                setModalOpen(true);
              }}
              className="shrink-0 gap-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
            >
              <UserPlus className="size-4" />
              Nueva Cajera
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                <strong className="font-semibold text-amber-950 dark:text-amber-200">
                  Protección de información sensible:
                </strong>{" "}
                Las cuentas creadas aquí tienen rol exclusivo de <strong>Cajera</strong>. Pueden utilizar el Punto de Venta, consultar stock por talle, gestionar caja chica de turno, registrar clientes y emitir comprobantes X con su nombre. Tienen <strong>bloqueado</strong> el acceso a costos de compra, margen de ganancia, balances de proveedores, reportes contables globales y configuraciones del negocio.
              </div>
            </div>
          </div>

          {staff.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-12 text-center">
              <Users className="mx-auto size-10 text-muted-foreground/50" />
              <p className="mt-3 text-base font-semibold">No tenés cajeras registradas todavía</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Creá una cuenta para tu personal de mostrador haciendo clic en &quot;Nueva Cajera&quot;.
              </p>
              <Button
                variant="outline"
                className="mt-4 gap-2 rounded-xl"
                onClick={() => setModalOpen(true)}
              >
                <UserPlus className="size-4" />
                Registrar primer cajera
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Nombre de la cajera</TableHead>
                    <TableHead>Correo de acceso</TableHead>
                    <TableHead>Rol asignado</TableHead>
                    <TableHead>Fecha de alta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((item: any) => {
                    const isActive = item.active !== false;
                    return (
                      <TableRow key={item.uid || item.id} className="hover:bg-muted/20">
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {item.name ? item.name.slice(0, 2).toUpperCase() : "CA"}
                            </span>
                            <span>{item.name || "Sin nombre"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold"
                          >
                            Cajera
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {dateFmt(item.created_at)}
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5" />
                              Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                              <XCircle className="size-3.5" />
                              Pausada
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => handleToggleStatus(item)}
                              className="h-8 gap-1 rounded-lg text-xs"
                              title={isActive ? "Pausar acceso" : "Reactivar acceso"}
                            >
                              <Power
                                className={`size-3.5 ${
                                  isActive ? "text-amber-600" : "text-emerald-600"
                                }`}
                              />
                              {isActive ? "Pausar" : "Reactivar"}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={busy}
                              onClick={() => setDeletingStaff(item)}
                              className="size-8 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                              title="Eliminar cajera"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Crear Cajera */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="size-5 text-amber-600" />
              Registrar Nueva Cajera
            </DialogTitle>
            <DialogDescription>
              La cajera iniciará sesión con este correo y contraseña para operar el Punto de Venta de <strong>{storeName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCashier} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre y Apellido
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  name="name"
                  placeholder="Ej: Camila Gómez"
                  className="pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Correo Electrónico de Acceso
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  name="email"
                  type="email"
                  placeholder="cajera@mitienda.com"
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Se usará exclusivamente para que la cajera ingrese al sistema.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
              >
                {busy ? "Creando..." : "Crear Cuenta de Cajera"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación Eliminar */}
      <AlertDialog
        open={Boolean(deletingStaff)}
        onOpenChange={(v) => !v && setDeletingStaff(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="size-5" />
              ¿Eliminar cuenta de cajera?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar el acceso de <strong>{deletingStaff?.name}</strong> (
              {deletingStaff?.email}). Esta persona ya no podrá iniciar sesión en el sistema. Las ventas pasadas que haya registrado mantendrán su nombre para trazabilidad.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={handleDeleteStaff}
            >
              {busy ? "Eliminando..." : "Eliminar definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
