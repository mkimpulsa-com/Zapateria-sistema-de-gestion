"use client";

import { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, MessageCircle, X, FileText, ArrowDownLeft, ArrowUpRight, Building2 } from "lucide-react";

interface CashReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: any | null;
  settings?: any;
}

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);

const dateFmt = (value?: string) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return value;
  }
};

const timeFmt = (value?: string) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
};

export function CashReceiptModal({
  open,
  onOpenChange,
  movement,
  settings = {},
}: CashReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-invoice");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  if (!movement) return null;

  const isIncome = movement.type === "ingreso";
  const businessName = settings.business_name || "Mi Zapatería";
  const branchName = settings.branch_name || "Casa Central";
  const logoUrl = settings.logo_url || "";
  const phone = settings.phone || settings.whatsapp || "";
  const address = settings.address || "";
  const taxId = settings.tax_id || "";

  const receiptNo = `MOV-${String(movement.id).slice(-8).toUpperCase()}`;
  const amount = Number(movement.amount || 0);

  // Dedicated Print function
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) {
      document.body.classList.add("printing-invoice");
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById("print-cash-receipt-frame");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "print-cash-receipt-frame";
      iframe.setAttribute(
        "style",
        "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;"
      );
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.classList.add("printing-invoice");
        window.print();
        return;
      }

      const styles = Array.from(
        document.querySelectorAll("style, link[rel='stylesheet']")
      )
        .map((node) => node.outerHTML)
        .join("\n");

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Recibo de Caja - ${receiptNo}</title>
  ${styles}
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: "Inter", "Segoe UI", Arial, sans-serif !important;
      width: 100% !important;
    }
    .receipt-paper-print {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      box-shadow: none !important;
      border: none !important;
      display: block !important;
    }
  </style>
</head>
<body>
  <div class="receipt-paper-print">
    ${printContent.innerHTML}
  </div>
</body>
</html>`);
      iframeDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          document.body.classList.add("printing-invoice");
          window.print();
        } finally {
          setTimeout(() => {
            iframe.remove();
          }, 1500);
        }
      }, 300);
    } catch (err) {
      document.body.classList.add("printing-invoice");
      window.print();
    }
  };

  // WhatsApp share
  const handleWhatsApp = () => {
    const typeLabel = isIncome ? "INGRESO DE CAJA" : "EGRESO DE CAJA";
    const sign = isIncome ? "+" : "-";
    const message = encodeURIComponent(
      `💼 *${businessName}* - Comprobante de Caja\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📄 *Recibo:* ${receiptNo}\n` +
        `🔖 *Tipo:* ${typeLabel}\n` +
        `📅 *Fecha:* ${dateFmt(movement.created_at)} ${timeFmt(movement.created_at)}\n` +
        `📂 *Categoría:* ${movement.category || "General"}\n` +
        (movement.reference ? `🔍 *Referencia:* ${movement.reference}\n` : "") +
        (movement.description ? `📝 *Descripción:* ${movement.description}\n` : "") +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*IMPORTE:* ${sign}${money(amount)}\n\n` +
        `Comprobante interno de caja registrado en el sistema operativo.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[96vh] sm:max-w-2xl overflow-y-auto p-0 gap-0 border-0 bg-slate-900/90 backdrop-blur-xl shadow-2xl print:bg-transparent print:p-0 print:m-0 print:max-h-none print:max-w-none print:overflow-visible print:shadow-none print:border-0 print:static print:translate-none"
        data-testid="cash-receipt-dialog"
      >
        {/* Top Actions Bar (No print) */}
        <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 bg-slate-950/80 px-5 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-white">
            <span
              className={`grid size-8 place-items-center rounded-lg ${
                isIncome
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isIncome ? (
                <ArrowDownLeft className="size-4" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
            </span>
            <div>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                Recibo de Caja
                <span className="rounded bg-primary/20 text-primary text-[11px] px-1.5 py-0.2 font-mono">
                  {receiptNo}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {isIncome ? "Comprobante de Ingreso" : "Comprobante de Egreso"} · Registro oficial de caja
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="h-8 gap-1.5 rounded-lg border-emerald-600/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-200 text-xs font-semibold"
              title="Compartir comprobante por WhatsApp"
            >
              <MessageCircle className="size-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold shadow-sm"
              title="Imprimir o guardar como PDF (Ctrl+P)"
            >
              <Printer className="size-3.5" />
              Imprimir / PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 gap-1 rounded-lg border-white/10 text-xs text-white hover:bg-white/10"
            >
              <X className="size-3.5" />
              <span className="hidden sm:inline">Cerrar</span>
            </Button>
          </div>
        </div>

        {/* Paper Document Container */}
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-950/40 flex justify-center print:p-0 print:bg-transparent print:block">
          <div
            id="printable-invoice"
            ref={printRef}
            className="invoice-paper w-full max-w-xl bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-200 font-sans print:border-0 print:shadow-none print:p-0 print:rounded-none print:max-w-none print:w-full print:m-0"
          >
            {/* VOUCHER HEADER */}
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="size-12 max-w-[120px] overflow-hidden flex items-center shrink-0">
                      <img
                        src={logoUrl}
                        alt={businessName}
                        className="max-h-12 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <span className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white shrink-0">
                      <Building2 className="size-5" />
                    </span>
                  )}
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                      {businessName}
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-600">
                      {branchName} {phone ? `· Tel: ${phone}` : ""}
                    </p>
                    {address && (
                      <p className="text-[10px] text-slate-500">{address}</p>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                      isIncome
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    {isIncome ? "Comprobante de Ingreso" : "Comprobante de Egreso"}
                  </span>
                  <p className="text-xs font-mono font-black text-slate-900 mt-1">
                    {receiptNo}
                  </p>
                </div>
              </div>

              {/* DETAILS GRID */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-white">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Fecha y Hora
                  </span>
                  <span className="font-semibold text-slate-900">
                    {dateFmt(movement.created_at)} · {timeFmt(movement.created_at)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Categoría
                  </span>
                  <span className="font-semibold text-slate-900">
                    {movement.category || "General"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Referencia
                  </span>
                  <span className="font-mono text-slate-800">
                    {movement.reference || "—"}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Descripción / Concepto
                  </span>
                  <p className="font-medium text-slate-800 text-sm mt-0.5">
                    {movement.description || movement.category || "Movimiento de caja registrado"}
                  </p>
                </div>
              </div>
            </div>

            {/* AMOUNT BOX */}
            <div className="mt-4 border-2 border-slate-900 rounded-xl overflow-hidden bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  {isIncome ? "Total Ingresado" : "Total Egresado / Retirado"}
                </span>
                <span className="text-xs text-slate-400">
                  {isIncome ? "Fondos ingresados a la caja" : "Salida registrada de fondos"}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-3xl font-black font-mono tracking-tight ${
                    isIncome ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isIncome ? "+" : "-"}{money(amount)}
                </span>
              </div>
            </div>

            {/* SIGNATURES SECTION */}
            <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
              <div className="flex flex-col items-center justify-end">
                <div className="w-40 border-b border-dashed border-slate-500 mb-1.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Entregó Conforme
                </span>
                <span className="text-[9px] text-slate-400">Firma y Aclaración</span>
              </div>

              <div className="flex flex-col items-center justify-end">
                <div className="w-40 border-b border-dashed border-slate-500 mb-1.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Recibió Conforme (Caja)
                </span>
                <span className="text-[9px] text-slate-400">Responsable de Caja</span>
              </div>
            </div>

            {/* FOOTER NOTE */}
            <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
              <p className="font-semibold text-slate-700">
                {businessName} · Sistema de Gestión de Zapatería
              </p>
              <p>Comprobante de movimiento interno de tesorería y arqueo de caja.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
