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
import { Switch } from "@/components/ui/switch";
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  WalletCards,
  CheckCircle2,
  AlertTriangle,
  Receipt,
} from "lucide-react";

interface AdjustSupplierDebtModalProps {
  supplier: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (payload: any) => Promise<boolean>;
}

const money = (val: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(val || 0);

export function AdjustSupplierDebtModal({
  supplier,
  open,
  onOpenChange,
  busy,
  onSubmit,
}: AdjustSupplierDebtModalProps) {
  const [type, setType] = useState<"pago" | "cargo" | "ajuste_manual">("pago");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("Transferencia");
  const [registerCash, setRegisterCash] = useState(true);
  const [note, setNote] = useState("");

  // Campos fiscales para factura de compra
  const [invoiceType, setInvoiceType] = useState<"A" | "B" | "C" | "X">("A");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vatRate, setVatRate] = useState<number>(21);
  const [isPaidDirectly, setIsPaidDirectly] = useState(false);
  const [perceptions, setPerceptions] = useState("");

  const currentBalance = Number(supplier?.balance || 0);
  const numericAmount = Math.abs(Number(amount) || 0);
  const percNum = Math.max(0, Number(perceptions) || 0);

  // Cálculos fiscales automáticos para Factura de Proveedor
  const taxableBase = Math.max(0, numericAmount - percNum);
  const netCalculated = invoiceType === "A"
    ? Math.round((taxableBase / (1 + vatRate / 100)) * 100) / 100
    : taxableBase;
  const vatCalculated = invoiceType === "A"
    ? Math.round((taxableBase - netCalculated) * 100) / 100
    : 0;

  let resultingBalance = currentBalance;
  if (type === "pago") {
    resultingBalance = currentBalance - numericAmount;
  } else if (type === "cargo") {
    resultingBalance = isPaidDirectly ? currentBalance : currentBalance + numericAmount;
  } else if (type === "ajuste_manual") {
    resultingBalance = Number(amount) || 0;
  }

  useEffect(() => {
    if (open && supplier) {
      setType(currentBalance > 0 ? "pago" : "cargo");
      setAmount("");
      setNote("");
      setRegisterCash(true);
      setPaymentMethod("Transferencia");
      setInvoiceNumber("");
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setVatRate(21);
      setIsPaidDirectly(false);
      setPerceptions("");
      setInvoiceType(supplier.vat_condition === "Monotributo" ? "C" : "A");
    }
  }, [open, supplier, currentBalance]);

  if (!supplier) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (type !== "ajuste_manual" && numericAmount <= 0) return;

    const payload = {
      action: "adjust_supplier_debt",
      supplierId: supplier.id,
      type,
      amount: numericAmount,
      newBalance: type === "ajuste_manual" ? Number(amount) || 0 : undefined,
      paymentMethod,
      registerCashMovement: type === "pago" ? registerCash : (type === "cargo" && isPaidDirectly ? registerCash : false),
      note: note.trim() || (type === "pago" ? "Pago a cuenta de saldo" : type === "cargo" ? `Compra Factura ${invoiceType}${invoiceNumber ? ` N° ${invoiceNumber}` : ""}` : "Ajuste manual de saldo"),
      invoiceType: type === "cargo" ? invoiceType : undefined,
      invoiceNumber: type === "cargo" ? invoiceNumber.trim() : undefined,
      invoiceDate: type === "cargo" ? invoiceDate : undefined,
      vatRate: type === "cargo" ? vatRate : undefined,
      netAmount: type === "cargo" ? netCalculated : undefined,
      vatAmount: type === "cargo" ? vatCalculated : undefined,
      vat21: type === "cargo" && vatRate === 21 ? vatCalculated : 0,
      vat105: type === "cargo" && vatRate === 10.5 ? vatCalculated : 0,
      vat27: type === "cargo" && vatRate === 27 ? vatCalculated : 0,
      exemptAmount: type === "cargo" && vatRate === 0 ? netCalculated : 0,
      perceptions: type === "cargo" ? percNum : 0,
      isPaidDirectly: type === "cargo" ? isPaidDirectly : false,
    };

    const ok = await onSubmit(payload);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <Landmark className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl">Pagar a proveedor / Ajustar saldo</DialogTitle>
              <DialogDescription>
                Cuenta corriente de <span className="font-semibold text-foreground">{supplier.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* Selector de operación */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType("pago")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                type === "pago"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <ArrowDownLeft className="size-4 text-emerald-600" />
              <span>Registrar pago</span>
              <span className="text-[10px] font-normal text-muted-foreground">Baja deuda</span>
            </button>

            <button
              type="button"
              onClick={() => setType("cargo")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                type === "cargo"
                  ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <Receipt className="size-4 text-red-600" />
              <span>Nueva compra / Cargo</span>
              <span className="text-[10px] font-normal text-muted-foreground">Suma deuda</span>
            </button>

            <button
              type="button"
              onClick={() => setType("ajuste_manual")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                type === "ajuste_manual"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40"
              }`}
            >
              <SlidersHorizontal className="size-4" />
              <span>Fijar saldo</span>
              <span className="text-[10px] font-normal text-muted-foreground">Saldo exacto</span>
            </button>
          </div>

          {/* Tarjeta de simulación de saldos */}
          <div className="rounded-2xl border bg-muted/25 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Deuda actual</span>
              <span>{type === "pago" ? "Menos pago" : type === "cargo" ? "Más nueva compra" : "Nuevo saldo"}</span>
              <span className="font-bold">Deuda resultante</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className={`text-base ${currentBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {money(currentBalance)}
              </span>
              <span className="text-muted-foreground text-sm font-normal">
                {type === "pago" && `− ${money(numericAmount)}`}
                {type === "cargo" && `+ ${money(numericAmount)}`}
                {type === "ajuste_manual" && "➔"}
              </span>
              <span className={`text-lg font-black ${resultingBalance > 0 ? "text-red-600" : resultingBalance < 0 ? "text-blue-600" : "text-emerald-600"}`}>
                {money(resultingBalance)}
              </span>
            </div>
            <div className="mt-2 text-xs flex items-center gap-1.5 text-muted-foreground">
              {resultingBalance === 0 ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="size-3.5" /> La cuenta quedará al día (sin deuda pendiente).
                </span>
              ) : resultingBalance < 0 ? (
                <span className="text-blue-600 font-medium">
                  Quedará un saldo a favor de la empresa de {money(Math.abs(resultingBalance))}.
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <AlertTriangle className="size-3.5" /> Saldo restante por pagar al proveedor: {money(resultingBalance)}.
                </span>
              )}
            </div>
          </div>

          {/* Campo de Importe */}
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>
              {type === "pago"
                ? "Monto a pagar al proveedor *"
                : type === "cargo"
                ? "Monto de la factura o compra *"
                : "Nuevo saldo exacto adeudado *"}
            </span>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                $
              </span>
              <Input
                type="number"
                min={type === "ajuste_manual" ? undefined : "1"}
                step="1"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pl-8 text-lg font-bold rounded-xl h-11"
              />
            </div>
          </label>

          {/* Opciones para Pago */}
          {type === "pago" && (
            <div className="space-y-3 rounded-xl border bg-card p-3">
              <label className="grid gap-1.5 text-xs font-semibold">
                <span>Medio de pago utilizado</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-10 rounded-xl border bg-background px-3 text-sm font-medium"
                >
                  <option value="Transferencia">Transferencia bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Cheque">Cheque propio</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                </select>
              </label>

              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <WalletCards className="size-3.5 text-primary" />
                    Registrar egreso en Caja diaria
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Descuenta este pago del libro de caja de la sucursal.
                  </p>
                </div>
                <Switch
                  checked={registerCash}
                  onCheckedChange={setRegisterCash}
                />
              </div>
            </div>
          )}

          {/* Opciones y Datos Fiscales para Factura de Compra / Proveedor */}
          {type === "cargo" && (
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Receipt className="size-4 text-primary" />
                  Datos Fiscales de la Factura de Compra
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {supplier.vat_condition || "Responsable Inscripto"}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Tipo de Comprobante recibido
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "A", label: "Factura A", desc: "Crédito Fiscal" },
                    { id: "B", label: "Factura B", desc: "IVA incluido" },
                    { id: "C", label: "Factura C", desc: "Monotributo" },
                    { id: "X", label: "Remito X", desc: "Uso interno" },
                  ].map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => setInvoiceType(inv.id as any)}
                      className={`rounded-xl border p-2 text-center transition-all ${
                        invoiceType === inv.id
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40 font-medium"
                      }`}
                    >
                      <span className="block text-xs leading-none">{inv.label}</span>
                      <span className={`block text-[9px] mt-0.5 truncate leading-tight ${invoiceType === inv.id ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}>
                        {inv.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
                  <span>N° de Comprobante Proveedor</span>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ej. 0001-00045231"
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </label>

                <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
                  <span>Fecha de Emisión</span>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </label>
              </div>

              {invoiceType === "A" && (
                <div className="rounded-xl border bg-card p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
                      <span>Alícuota IVA Principal</span>
                      <select
                        value={vatRate}
                        onChange={(e) => setVatRate(Number(e.target.value))}
                        className="h-9 rounded-xl border bg-background px-2.5 text-xs font-semibold"
                      >
                        <option value={21}>21% (Estándar)</option>
                        <option value={10.5}>10.5% (Reducida)</option>
                        <option value={27}>27% (Especial)</option>
                        <option value={0}>0% (Exento)</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-[11px] font-semibold text-muted-foreground">
                      <span>Percepciones IIBB / IVA ($)</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={perceptions}
                        onChange={(e) => setPerceptions(e.target.value)}
                        placeholder="0"
                        className="h-9 rounded-xl text-xs font-mono"
                      />
                    </label>
                  </div>

                  {numericAmount > 0 && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                          Crédito Fiscal IVA a favor:
                        </span>
                        <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">
                          {money(vatCalculated)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Neto Gravado:</span>
                        <span className="text-xs font-bold font-mono text-foreground">
                          {money(netCalculated)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">
                      {isPaidDirectly ? "Factura Pagada al Contado" : "Cargar a Cuenta Corriente (Deuda)"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isPaidDirectly
                        ? "No genera deuda pendiente con el proveedor."
                        : "Suma este importe al saldo que se le debe al proveedor."}
                    </p>
                  </div>
                  <Switch
                    checked={isPaidDirectly}
                    onCheckedChange={setIsPaidDirectly}
                  />
                </div>

                {isPaidDirectly && (
                  <div className="pt-2 border-t flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold flex items-center gap-1.5">
                        <WalletCards className="size-3 text-primary" />
                        Registrar egreso en Caja diaria
                      </p>
                    </div>
                    <Switch
                      checked={registerCash}
                      onCheckedChange={setRegisterCash}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Motivo o Nota */}
          <label className="grid gap-1.5 text-sm font-semibold">
            <span>Concepto o nota de referencia</span>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                type === "pago"
                  ? "Ej. Pago factura N° 1089 / Transferencia cuota 1"
                  : type === "cargo"
                  ? "Ej. Factura A-0001-0004523 / Remito 889"
                  : "Ej. Conciliación y ajuste de saldo acordado"
              }
              className="rounded-xl"
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
            <Button
              type="submit"
              disabled={busy || (type !== "ajuste_manual" && numericAmount <= 0)}
              className="rounded-xl bg-[#ff7a5c] hover:bg-[#e9684c] text-white"
            >
              {busy
                ? "Guardando..."
                : type === "pago"
                ? `Registrar pago de ${money(numericAmount)}`
                : type === "cargo"
                ? `Cargar ${money(numericAmount)} a la cuenta`
                : "Aplicar ajuste de saldo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
