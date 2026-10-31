"use client";

import { useRef, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  MessageCircle,
  Check,
  X,
  FileText,
  Share2,
  Download,
  Building2,
  Image as ImageIcon,
  Loader2,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { BarcodeView } from "@/components/barcode-view";
import { printSaleThermalTicket } from "@/lib/thermal-printer";

interface SaleInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: any | null;
  settings?: any;
  products?: any[];
  onNewSale?: () => void;
}

import { formatMoney } from "@/lib/currency";

const money = (value: number, curr: "BRL" | "ARS" | "USD" = "ARS") => formatMoney(value, curr);
const moneyBrl = (value: number) => formatMoney(value, "BRL");
const moneyUsd = (value: number) => formatMoney(value, "USD");
const moneyArs = (value: number) => formatMoney(value, "ARS");

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

function InvoiceBarcode({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center">
      <BarcodeView
        value={value || "REM-0000"}
        className="h-8 w-full max-w-48"
        height={30}
        width={1.5}
        margin={6}
        lineColor="#1e293b"
      />
      <span className="mt-0.5 font-mono text-[10px] tracking-widest text-slate-600 font-bold">
        {value}
      </span>
    </div>
  );
}

export function SaleInvoiceModal({
  open,
  onOpenChange,
  sale,
  settings = {},
  products = [],
  onNewSale,
}: SaleInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<"pdf" | "image" | null>(null);
  const [viewFormat, setViewFormat] = useState<"thermal" | "a4">("thermal");

  // Clean afterprint listener
  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove("printing-invoice");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  if (!sale) return null;

  const businessName = settings.business_name || "CR BAZAR";
  const branchName = settings.branch_name || "Casa Central";
  const logoUrl = settings.logo_url || "";
  const phone = settings.phone || settings.whatsapp || "";
  const address = settings.address || "";
  const taxId = settings.tax_id || "";
  const email = settings.email || "";

  const receiptNo = sale.receipt_no || "X-0001-00000000";
  const invoiceLetter = (sale.invoice_letter || sale.invoice_type || (receiptNo.includes("-") ? receiptNo.split("-")[0] : "X")).toUpperCase();
  const isInvoiceA = invoiceLetter === "A";
  const isInvoiceB = invoiceLetter === "B";
  const isInvoiceC = invoiceLetter === "C";
  const isInvoiceX = invoiceLetter === "X";

  const afipCode = isInvoiceA ? "COD. 001" : isInvoiceB ? "COD. 006" : isInvoiceC ? "COD. 011" : "COD. 090";
  const invoiceTitle = isInvoiceX ? 'FACTURA "X"' : `FACTURA "${invoiceLetter}"`;
  const invoiceSubtitle = isInvoiceX ? "DOCUMENTO NO VÁLIDO COMO FACTURA · REMITO" : "COMPROBANTE FISCAL OFICIAL";

  const sellerVat = sale.seller_vat_condition || settings.vat_condition || (isInvoiceC ? "Monotributo" : "Responsable Inscripto");
  const sellerTaxId = sale.seller_tax_id || taxId;
  const sellerIibb = sale.seller_iibb || settings.iibb_number || "";
  const activityStartDate = settings.activity_start_date || "";

  const customerVat = sale.customer_vat_condition || (sale.customer_type === "mayorista" ? "Responsable Inscripto" : "Consumidor Final");
  const customerDoc = sale.customer_document ? `${sale.customer_document_type || (sale.customer_document.replace(/[^0-9]/g, "").length === 11 ? "CUIT" : "DNI")}: ${sale.customer_document}` : "—";

  const items: any[] = Array.isArray(sale.items) ? sale.items : [];
  const totalPairs = items.reduce((sum, it) => sum + Number(it.quantity || 1), 0);
  const subtotal = Number(sale.subtotal || sale.total || 0);
  const discount = Number(sale.discount || 0);
  const rawTotal = Number(sale.total || 0);
  const paymentMethod = sale.payment_method || "Efectivo";
  const channel = (sale.channel || "mayorista").toUpperCase();

  const curr = (sale.currency || settings?.currency || "ARS") as "BRL" | "ARS" | "USD";
  const isBrl = curr === "BRL";
  const isUsd = curr === "USD";
  const isArs = curr === "ARS";
  const brlRate = Number(sale.exchange_rate_ars || sale.exchange_rate) || 250;
  const usdRate = Number(sale.exchange_rate_usd) || 5.70;

  // Totales en las 3 monedas
  const totalBrl = sale.total_brl !== undefined
    ? Number(sale.total_brl)
    : isBrl ? rawTotal : Math.round(((isArs ? rawTotal / brlRate : rawTotal * usdRate)) * 100) / 100;

  const totalArs = sale.total_ars !== undefined
    ? Number(sale.total_ars)
    : isArs ? rawTotal : Math.round(totalBrl * brlRate);

  const totalUsd = sale.total_usd !== undefined
    ? Number(sale.total_usd)
    : isUsd ? rawTotal : Math.round((totalBrl / usdRate) * 100) / 100;

  const total = isBrl ? totalBrl : isUsd ? totalUsd : totalArs;

  // Montos abonados
  const paidBrl = sale.paid_amount_brl !== undefined
    ? Number(sale.paid_amount_brl)
    : isBrl ? Number(sale.paid_amount || 0) : Math.round(((isArs ? Number(sale.paid_amount || 0) / brlRate : Number(sale.paid_amount || 0) * usdRate)) * 100) / 100;

  const paidArs = sale.paid_amount_ars !== undefined
    ? Number(sale.paid_amount_ars)
    : isArs ? Number(sale.paid_amount || 0) : Math.round(paidBrl * brlRate);

  const paidUsd = sale.paid_amount_usd !== undefined
    ? Number(sale.paid_amount_usd)
    : isUsd ? Number(sale.paid_amount || 0) : Math.round((paidBrl / usdRate) * 100) / 100;

  const paidCur = isBrl ? paidBrl : isUsd ? paidUsd : paidArs;

  const debtBrl = Math.max(0, Math.round((totalBrl - paidBrl) * 100) / 100);
  const debtArs = Math.max(0, Math.round(totalArs - paidArs));
  const debtUsd = Math.max(0, Math.round((totalUsd - paidUsd) * 100) / 100);
  const debtCur = isBrl ? debtBrl : isUsd ? debtUsd : debtArs;

  // Fiscal & IVA amounts (discriminación fiscal)
  const netAmount = Number(sale.net_amount !== undefined ? sale.net_amount : (
    items.reduce((sum, it) => {
      const rate = Number(it.vat_rate !== undefined ? it.vat_rate : (it.vatRate !== undefined ? it.vatRate : 21));
      const gross = Number(it.total || (Number(it.quantity || 1) * Number(it.unit_price || 0)));
      return sum + (gross / (1 + rate / 100));
    }, 0)
  ));
  const vatAmount = Number(sale.vat_amount !== undefined ? sale.vat_amount : Math.max(0, subtotal - netAmount));
  const vatAmount21 = Number(sale.vat_amount_21 !== undefined ? sale.vat_amount_21 : 0);
  const vatAmount105 = Number(sale.vat_amount_105 !== undefined ? sale.vat_amount_105 : 0);
  const vatAmount27 = Number(sale.vat_amount_27 !== undefined ? sale.vat_amount_27 : 0);
  const exemptAmount = Number(sale.exempt_amount !== undefined ? sale.exempt_amount : 0);

  // Dedicated Print function for Thermal Tickets (80mm / 58mm)
  const handlePrintThermal = (width: "80mm" | "58mm" = "80mm") => {
    printSaleThermalTicket({ sale, settings, paperWidth: width });
  };

  // Dedicated Print function for Standard A4 Invoices
  const handlePrintA4 = () => {
    const printContent = printRef.current;
    if (!printContent) {
      document.body.classList.add("printing-invoice");
      window.print();
      return;
    }

    try {
      // Clean up previous print iframe if any
      const existingFrame = document.getElementById("print-invoice-frame");
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "print-invoice-frame";
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

      // Collect parent styles
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
  <title>Factura X - ${receiptNo}</title>
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
    .invoice-paper-print {
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
  <div class="invoice-paper-print">
    ${printContent.innerHTML}
  </div>
</body>
</html>`);
      iframeDoc.close();

      const triggerPrint = () => {
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
      };

      // Wait for all product images inside iframe to load before printing
      const iframeImages = Array.from(iframeDoc.images || []);
      if (iframeImages.length === 0) {
        setTimeout(triggerPrint, 250);
      } else {
        Promise.all(
          iframeImages.map(
            (img) =>
              new Promise<void>((res) => {
                if (img.complete && img.naturalHeight !== 0) return res();
                img.onload = () => res();
                img.onerror = () => res();
                setTimeout(() => res(), 2000);
              })
          )
        ).then(() => {
          setTimeout(triggerPrint, 200);
        });
      }
    } catch (err) {
      document.body.classList.add("printing-invoice");
      window.print();
    }
  };

  const handlePrint = () => {
    if (viewFormat === "thermal") {
      handlePrintThermal("80mm");
    } else {
      handlePrintA4();
    }
  };

  // WhatsApp share
  const handleWhatsApp = () => {
    const rawPhone = String(sale.customer_phone || "").replace(/[^0-9]/g, "");
    const itemsText = items
      .map(
        (it) =>
          `• ${it.quantity}x ${it.name} (Talle ${it.size}) - ${money(it.total || it.unit_price * it.quantity)}`
      )
      .join("\n");

    const message = encodeURIComponent(
      `👟 *${businessName}* - Comprobante de Compra\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📄 *Comprobante:* Factura X / Remito ${receiptNo}\n` +
        `📅 *Fecha:* ${dateFmt(sale.created_at)} ${timeFmt(sale.created_at)}\n` +
        `👤 *Cliente:* ${sale.customer_name || "Consumidor Final"}\n` +
        `💳 *Forma de pago:* ${paymentMethod}\n` +
        (isBrl
          ? `🇧🇷 *Moneda de cobro:* Reales (R$ BRL)\n` +
            `💱 *Cotizaciones:* 1 R$ = $${brlRate.toLocaleString("es-AR")} ARS · 1 US$ = R$ ${usdRate.toFixed(2)}\n`
          : isUsd
          ? `🇺🇸 *Moneda de cobro:* Dólares (US$ USD)\n` +
            `💱 *Cotización:* 1 US$ = R$ ${usdRate.toFixed(2)} BRL\n`
          : `🇦🇷 *Moneda de cobro:* Pesos ($ ARS)\n` +
            `💱 *Cotización:* 1 R$ = $${brlRate.toLocaleString("es-AR")} ARS\n`) +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Artículos:*\n${itemsText}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        (discount > 0
          ? `Subtotal: ${formatMoney(subtotal, curr)}\nDescuento${sale.discount_percent ? ` (${sale.discount_percent}%)` : ""}: -${formatMoney(discount, curr)}\n`
          : "") +
        (Number(sale.additional_charge || 0) > 0
          ? `Cargo Adicional${sale.additional_charge_description ? ` (${sale.additional_charge_description})` : ""}: +${formatMoney(Number(sale.additional_charge), curr)}\n`
          : "") +
        `*TOTAL DE LA VENTA:* ${formatMoney(total, curr)}\n` +
        (isBrl
          ? `💵 *Equivalencias:* $${totalArs.toLocaleString("es-AR")} ARS · US$ ${totalUsd.toFixed(2)}\n`
          : isUsd
          ? `💵 *Equivalencias:* R$ ${totalBrl.toFixed(2)} BRL · $${totalArs.toLocaleString("es-AR")} ARS\n`
          : `💵 *Equivalencias:* R$ ${totalBrl.toFixed(2)} BRL · US$ ${totalUsd.toFixed(2)}\n`) +
        `💰 *Monto Abonado:* ${formatMoney(paidCur, curr)}\n` +
        (debtCur > 0 ? `⚠️ *Saldo Pendiente (Deuda):* ${formatMoney(debtCur, curr)}\n` : "") +
        `📌 *Estado:* ${sale.status === "pago_parcial" ? "Pago Parcial" : sale.status === "con_deuda" ? "Con Deuda" : "Pagada Total"}\n\n` +
        `¡Muchas gracias por tu compra! Conservá este comprobante ante cambios o garantías.`
    );

    if (rawPhone) {
      window.open(`https://wa.me/${rawPhone}?text=${message}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  };

  const getInvoiceDataUrl = async (element: HTMLElement): Promise<string> => {
    // Asegurar que todas las imágenes del documento estén totalmente cargadas
    const images = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight !== 0) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(() => resolve(), 2500);
          })
      )
    );

    const html2canvasPro = (await import("html2canvas-pro")).default;
    const canvas = await html2canvasPro(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    return canvas.toDataURL("image/png");
  };

  // Dedicated PDF Download function
  const handleDownloadPdf = async () => {
    const printContent = printRef.current;
    if (!printContent) {
      toast.error("No se encontró el contenido de la factura para exportar.");
      return;
    }

    setDownloading("pdf");
    try {
      const dataUrl = await getInvoiceDataUrl(printContent);
      const { jsPDF } = await import("jspdf");

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (img.height * contentWidth) / img.width;

      if (contentHeight <= pageHeight - margin * 2) {
        pdf.addImage(dataUrl, "PNG", margin, margin, contentWidth, contentHeight, undefined, "FAST");
      } else {
        let heightLeft = contentHeight;
        let position = margin;

        pdf.addImage(dataUrl, "PNG", margin, position, contentWidth, contentHeight, undefined, "FAST");
        heightLeft -= (pageHeight - margin * 2);

        while (heightLeft > 0) {
          position = heightLeft - contentHeight + margin;
          pdf.addPage();
          pdf.addImage(dataUrl, "PNG", margin, position, contentWidth, contentHeight, undefined, "FAST");
          heightLeft -= (pageHeight - margin * 2);
        }
      }

      const safeReceipt = (receiptNo || "Factura").replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`Factura_${safeReceipt}.pdf`);
      toast.success("Factura descargada en PDF con éxito.");
    } catch (err) {
      console.error("Error al generar PDF:", err);
      toast.error("No se pudo generar el archivo PDF directamente. Podés utilizar la opción Imprimir / PDF.");
    } finally {
      setDownloading(null);
    }
  };

  // Dedicated Image Download function (PNG)
  const handleDownloadImage = async () => {
    const printContent = printRef.current;
    if (!printContent) {
      toast.error("No se encontró el contenido de la factura para exportar.");
      return;
    }

    setDownloading("image");
    try {
      const dataUrl = await getInvoiceDataUrl(printContent);
      const link = document.createElement("a");
      const safeReceipt = (receiptNo || "Factura").replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `Factura_${safeReceipt}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Factura descargada en imagen PNG con éxito.");
    } catch (err) {
      console.error("Error al generar imagen:", err);
      toast.error("No se pudo descargar la imagen de la factura.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[96vh] sm:max-w-3xl overflow-y-auto p-0 gap-0 border-0 bg-slate-900/90 backdrop-blur-xl shadow-2xl print:bg-transparent print:p-0 print:m-0 print:max-h-none print:max-w-none print:overflow-visible print:shadow-none print:border-0 print:static print:translate-none"
        data-testid="sale-invoice-dialog"
      >
        {/* Top Actions Bar (No print) */}
        <div className="no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 bg-slate-950/80 px-5 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5 text-white">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/20 text-primary">
              <FileText className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                {invoiceTitle} · {isInvoiceX ? "Remito Comercial" : "Comprobante Fiscal"}
                <span className="rounded bg-primary/20 text-primary text-[11px] px-1.5 py-0.2 font-mono">
                  {receiptNo}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Comprobante emitido · Formato optimizado para ticketera térmica y PDF
              </DialogDescription>
            </div>
          </div>

          {/* Formato Selector: Ticket Térmico vs Hoja A4 */}
          <div className="flex items-center rounded-lg bg-white/5 p-0.5 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewFormat("thermal")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                viewFormat === "thermal"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Ver formato compacto para impresora térmica de ticket"
            >
              <Receipt className="size-3.5" />
              <span>Ticket Térmico</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFormat("a4")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                viewFormat === "a4"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Ver formato oficial en hoja completa A4"
            >
              <FileText className="size-3.5" />
              <span>Factura A4</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => handlePrintThermal("80mm")}
              className="h-8 gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
              title="Imprimir ticket optimizado para impresora térmica de 80mm o 58mm"
            >
              <Printer className="size-3.5" />
              <span>Imprimir Ticket</span>
            </Button>

            <Button
              size="sm"
              onClick={handleWhatsApp}
              className="h-8 gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900 hover:text-white text-xs font-semibold shadow-sm"
              title="Compartir comprobante detallado por WhatsApp"
            >
              <MessageCircle className="size-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>

            <Button
              size="sm"
              disabled={Boolean(downloading)}
              onClick={handleDownloadImage}
              className="h-8 gap-1.5 rounded-lg border border-sky-500/40 bg-sky-950/80 text-sky-200 hover:bg-sky-900 hover:text-white text-xs font-semibold shadow-sm"
              title="Descargar imagen PNG para enviar por WhatsApp o guardar"
            >
              {downloading === "image" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImageIcon className="size-3.5" />
              )}
              <span className="hidden sm:inline">Imagen</span>
            </Button>

            <Button
              size="sm"
              disabled={Boolean(downloading)}
              onClick={handleDownloadPdf}
              className="h-8 gap-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white text-xs font-semibold shadow-sm"
              title="Descargar factura en archivo PDF para enviar al cliente"
            >
              {downloading === "pdf" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrintA4}
              className="h-8 gap-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white text-xs font-semibold shadow-sm"
              title="Imprimir en hoja A4 / impresora estándar"
            >
              <Printer className="size-3.5" />
              <span className="hidden xl:inline">Imprimir A4</span>
            </Button>

            {onNewSale && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onNewSale();
                }}
                className="h-8 gap-1 rounded-lg border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white text-xs font-semibold shadow-sm"
              >
                <Check className="size-3.5" />
                <span className="hidden sm:inline">Listo</span>
              </Button>
            )}
          </div>
        </div>

        {/* Paper Document Container */}
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-950/40 flex justify-center print:p-0 print:bg-transparent print:block">
          {/* Vista 1: Ticket Térmico Compacto & Profesional (80mm / 58mm) */}
          {viewFormat === "thermal" && (
            <div className="w-full max-w-sm bg-white text-slate-900 rounded-xl shadow-2xl p-6 border border-slate-200 font-mono text-xs flex flex-col items-stretch animate-in fade-in duration-200">
              {/* Encabezado */}
              <div className="text-center space-y-0.5">
                <h2 className="text-base font-black tracking-tight uppercase text-slate-900">
                  {businessName}
                </h2>
                {branchName && (
                  <p className="text-[11px] text-slate-600 font-sans">{branchName}</p>
                )}
                {address && (
                  <p className="text-[10px] text-slate-500 font-sans">{address}</p>
                )}
                {phone && (
                  <p className="text-[10px] text-slate-500 font-sans">Tel / WhatsApp: {phone}</p>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 my-3" />

              {/* Datos de Ticket */}
              <div className="space-y-1 text-[11px] text-slate-700">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Ticket: {receiptNo}</span>
                  <span>{dateFmt(sale.created_at)} {timeFmt(sale.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente: <strong className="text-slate-800">{sale.customer_name || "Consumidor Final"}</strong></span>
                  {sale.customer_document && (
                    <span className="text-[10px] text-slate-500">Doc: {sale.customer_document}</span>
                  )}
                </div>
                {sale.cashier_name && (
                  <div className="text-[10px] text-slate-500">
                    Atendido por: {sale.cashier_name}
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 my-3" />

              {/* Cabecera de Ítems */}
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200">
                <span className="w-8">Cant</span>
                <span className="flex-1 px-1">Descripción</span>
                <span className="w-16 text-right">Total</span>
              </div>

              {/* Lista de Ítems */}
              <div className="divide-y divide-slate-100 py-1">
                {items.map((item: any, idx: number) => {
                  const qty = Number(item.quantity || 1);
                  const unitPrice = Number(item.unit_price || 0);
                  const itemTotal = Number(item.total || (qty * unitPrice));
                  const extra = [
                    item.size && !["Único", "Unico", "General", "Estándar"].includes(item.size) ? `Talle: ${item.size}` : null,
                    item.sku ? `Cód: ${item.sku}` : null,
                    qty > 1 ? `(${qty} x ${formatMoney(unitPrice, curr)})` : null,
                  ].filter(Boolean).join(" · ");

                  return (
                    <div key={idx} className="py-1.5 space-y-0.5">
                      <div className="flex justify-between items-start">
                        <span className="w-8 font-bold text-slate-900">{qty}</span>
                        <span className="flex-1 px-1 font-semibold text-slate-900">{item.name}</span>
                        <span className="w-16 text-right font-bold text-slate-900">{formatMoney(itemTotal, curr)}</span>
                      </div>
                      {extra && (
                        <div className="text-[9.5px] text-slate-500 pl-8 font-sans">
                          {extra}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-slate-300 my-3" />

              {/* Resumen de Totales */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Total unidades:</span>
                  <span className="font-bold text-slate-800">{totalPairs}</span>
                </div>
                {discount > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatMoney(subtotal, curr)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                      <span>Descuento{sale.discount_percent ? ` (${sale.discount_percent}%)` : ""}:</span>
                      <span>-{formatMoney(discount, curr)}</span>
                    </div>
                  </>
                )}
                {Number(sale.additional_charge || 0) > 0 && (
                  <div className="flex justify-between text-[11px] text-blue-700">
                    <span>Cargo adicional:</span>
                    <span>+{formatMoney(Number(sale.additional_charge), curr)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black border-y border-slate-900 py-2 my-2 text-slate-900">
                  <span>TOTAL A PAGAR:</span>
                  <span>{formatMoney(total, curr)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-700">
                  <span>Forma de pago:</span>
                  <span className="font-bold">{paymentMethod}</span>
                </div>
                {debtCur > 0 ? (
                  <div className="space-y-1 pt-1 border-t border-dashed border-red-200">
                    <div className="flex justify-between text-[11px] text-slate-700">
                      <span>Monto abonado:</span>
                      <span>{formatMoney(paidCur, curr)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-red-600">
                      <span>SALDO PENDIENTE:</span>
                      <span>{formatMoney(debtCur, curr)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>Estado:</span>
                    <span className="font-bold text-emerald-700">PAGADO TOTAL</span>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-slate-900 my-4" />

              {/* Despedida y Garantía */}
              <div className="text-center text-[10px] text-slate-600 space-y-0.5 leading-tight">
                <p className="font-bold text-slate-900 text-[11px]">¡GRACIAS POR TU COMPRA!</p>
                <p>Conservá este comprobante para cambios</p>
                <p>dentro de los 30 días de realizada la compra.</p>
              </div>

              {/* Código de barra */}
              <div className="mt-4 pt-2 border-t border-slate-200 flex flex-col items-center">
                <InvoiceBarcode value={receiptNo} />
              </div>

              {/* Botón rápido de impresión térmica al pie */}
              <div className="mt-5 pt-3 border-t border-slate-200 text-center">
                <Button
                  onClick={() => handlePrintThermal("80mm")}
                  className="w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                >
                  <Printer className="size-4" />
                  Imprimir en Impresora Térmica
                </Button>
              </div>
            </div>
          )}

          {/* Vista 2: Factura A4 Formal (y referencia para exportar PDF/Imagen) */}
          <div
            id="printable-invoice"
            ref={printRef}
            className={`invoice-paper max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-200 font-sans print:border-0 print:shadow-none print:p-0 print:rounded-none print:max-w-none print:w-full print:m-0 ${
              viewFormat === "a4"
                ? "w-full block"
                : "fixed -left-[9999px] top-0 pointer-events-none opacity-0 w-[794px]"
            }`}
          >
            {/* INVOICE HEADER */}
            <div className="border border-slate-900 rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 border-b border-slate-900">
                {/* Left Column: Brand & Store Information */}
                <div className="col-span-5 p-4 flex flex-col justify-between border-r border-slate-900">
                  <div>
                    {logoUrl ? (
                      <div className="mb-2 max-h-14 max-w-[170px] overflow-hidden flex items-center">
                        <img
                          src={logoUrl}
                          alt={businessName}
                          crossOrigin="anonymous"
                          className="max-h-14 max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="mb-2 flex items-center gap-2">
                        <span className="grid size-9 place-items-center rounded-lg bg-slate-900 text-white">
                          <Building2 className="size-5" />
                        </span>
                        <span className="text-lg font-black tracking-tight leading-none text-slate-900 uppercase">
                          {businessName}
                        </span>
                      </div>
                    )}
                    {logoUrl && (
                      <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                        {businessName}
                      </h2>
                    )}
                    <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      {branchName}
                    </p>
                  </div>

                  <div className="mt-3 space-y-0.5 text-[10px] text-slate-600 leading-tight">
                    {address && <p><strong className="text-slate-800">Dirección:</strong> {address}</p>}
                    {phone && <p><strong className="text-slate-800">Tel:</strong> {phone}</p>}
                    {email && <p><strong className="text-slate-800">Email:</strong> {email}</p>}
                    {sellerTaxId && <p><strong className="text-slate-800">CUIT:</strong> {sellerTaxId}</p>}
                    <p><strong className="text-slate-800">IVA:</strong> {sellerVat}</p>
                    {sellerIibb && <p><strong className="text-slate-800">Ing. Brutos:</strong> {sellerIibb}</p>}
                    {activityStartDate && <p><strong className="text-slate-800">Inicio Act.:</strong> {activityStartDate}</p>}
                  </div>
                </div>

                {/* Center Badge: The Classic Argentine Fiscal Letter Box */}
                <div className="col-span-2 flex flex-col items-center justify-center p-2 bg-slate-50 relative">
                  <div className="size-14 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center bg-white shadow-xs">
                    <span className="text-3xl font-black font-serif leading-none text-slate-900">
                      {invoiceLetter}
                    </span>
                    <span className="text-[8px] font-black tracking-tighter text-slate-700 leading-none mt-0.5">
                      {afipCode}
                    </span>
                  </div>
                  <div className="mt-1 text-center">
                    <span className="block text-[7.5px] font-black uppercase tracking-tighter text-slate-700 leading-tight">
                      {isInvoiceX ? "DOCUMENTO" : "COMPROBANTE"}
                    </span>
                    <span className="block text-[7.5px] font-bold uppercase tracking-tighter text-slate-600 leading-tight">
                      {isInvoiceX ? "NO VÁLIDO" : "FISCAL"}
                    </span>
                    <span className="block text-[7px] font-semibold uppercase tracking-tighter text-slate-500 leading-tight">
                      {isInvoiceX ? "COMO FACTURA" : "HOMOLOGADO"}
                    </span>
                  </div>
                </div>

                {/* Right Column: Invoice Details */}
                <div className="col-span-5 p-4 flex flex-col justify-between border-l border-slate-900 bg-white">
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900 uppercase">
                      {invoiceTitle}
                    </h3>
                    <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      {invoiceSubtitle}
                    </p>

                    <div className="mt-2.5">
                      <p className="text-[10px] text-slate-500 font-semibold">N° COMPROBANTE:</p>
                      <p className="text-sm font-mono font-black text-slate-900 tracking-wider">
                        {receiptNo}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-0.5 text-[10px] text-slate-700 leading-tight">
                    <p>
                      <strong className="text-slate-900">Fecha de emisión:</strong>{" "}
                      {dateFmt(sale.created_at)}
                    </p>
                    <p>
                      <strong className="text-slate-900">Hora:</strong> {timeFmt(sale.created_at)} hs
                    </p>
                    <p>
                      <strong className="text-slate-900">Condición de pago:</strong> {paymentMethod}
                    </p>
                    <p>
                      <strong className="text-slate-900">Canal comercial:</strong>{" "}
                      <span className="font-bold uppercase">{channel}</span>
                    </p>
                    {sale.cashier_name && (
                      <p>
                        <strong className="text-slate-900">Atendió:</strong>{" "}
                        <span className="font-medium">{sale.cashier_name}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* CUSTOMER INFORMATION BAR */}
              <div className="p-3 bg-slate-50 border-t border-slate-900">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Señor(es) / Cliente:
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {sale.customer_name || "Consumidor Final"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Documento:
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {customerDoc}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Condición IVA:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {customerVat}
                    </span>
                  </div>

                  {(sale.customer_address || sale.customer_city) && (
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Domicilio / Localidad:
                      </span>
                      <span className="text-slate-800">
                        {[sale.customer_address, sale.customer_city].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}

                  {sale.customer_phone && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Teléfono:
                      </span>
                      <span className="text-slate-800">{sale.customer_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TABLE OF SOLD ITEMS */}
            <div className="mt-4 border border-slate-900 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-2 text-center w-12 border-r border-slate-700">Cant.</th>
                    <th className="py-2 px-2 text-center w-12 border-r border-slate-700">Foto</th>
                    <th className="py-2 px-3 border-r border-slate-700">Descripción / Artículo</th>
                    <th className="py-2 px-3 text-center w-20 border-r border-slate-700">
                      {isInvoiceA ? "Alíc. IVA" : "Variante"}
                    </th>
                    <th className="py-2 px-3 text-right w-24 border-r border-slate-700">
                      {isInvoiceA ? "Neto Unit." : "P. Unitario"}
                    </th>
                    <th className="py-2 px-3 text-right w-28">
                      {isInvoiceA ? "Subtotal Neto" : "Subtotal"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                        Sin artículos registrados
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const rate = Number(item.vat_rate !== undefined ? item.vat_rate : (item.vatRate !== undefined ? item.vatRate : 21));
                      const grossTotal = Number(item.total || (Number(item.quantity || 1) * Number(item.unit_price || 0)));
                      const unitGross = Number(item.unit_price || 0);
                      const unitNet = unitGross / (1 + rate / 100);
                      const itemNetTotal = grossTotal / (1 + rate / 100);

                      const prod = (products || []).find((p: any) =>
                        String(p.id) === String(item.product_id || item.productId || item.id) ||
                        (item.sku && p.sku && String(p.sku).trim().toLowerCase() === String(item.sku).trim().toLowerCase()) ||
                        (item.name && p.name && String(p.name).trim().toLowerCase() === String(item.name).trim().toLowerCase())
                      );
                      const itemImg = item.image_url || prod?.image_url || (Array.isArray(prod?.images) && prod.images[0]) || "";

                      return (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="py-2 px-2 text-center font-bold text-slate-900 border-r border-slate-200">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-200 w-12 align-middle">
                            {itemImg ? (
                              <div className="size-10 mx-auto rounded-md overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                                <img
                                  src={itemImg}
                                  alt={item.name}
                                  crossOrigin="anonymous"
                                  className="size-full object-cover"
                                  loading="eager"
                                />
                              </div>
                            ) : (
                              <div className="size-10 mx-auto rounded-md border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-300">
                                <ShoppingBag className="size-4" />
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <span className="font-bold text-slate-900 block">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {[
                                item.brand,
                                item.sku,
                                !["Único", "Unico", "General", "Estándar"].includes(item.size) ? `Talle/Var: ${item.size}` : null
                              ].filter(Boolean).join(" · ")}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                            {isInvoiceA ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">
                                {rate}%
                              </span>
                            ) : (
                              ["Único", "Unico", "General", "Estándar"].includes(item.size) ? "—" : item.size
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                            {money(isInvoiceA ? unitNet : unitGross)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {money(isInvoiceA ? itemNetTotal : grossTotal)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* TOTALS & SUMMARY SECTION */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              {/* Left note & payment stamp */}
              <div className="sm:col-span-7 rounded-xl border border-slate-300 p-3 bg-slate-50/50 text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Total unidades entregadas:</span>
                  <span className="font-mono font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-200">
                    {totalPairs} {totalPairs === 1 ? "unidad" : "unidades"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Forma de pago registrada:</span>
                  <span className="font-semibold text-slate-900">{paymentMethod}</span>
                </div>
                {isInvoiceA && (
                  <div className="rounded bg-blue-50/70 border border-blue-200/60 p-2 text-[10px] text-blue-800">
                    <p className="font-bold">Factura discriminada para cómputo de Crédito Fiscal (IVA).</p>
                    <p className="opacity-80">R.G. AFIP 1415 / Ley 23.349 de Impuesto al Valor Agregado.</p>
                  </div>
                )}
                <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 leading-tight">
                  La entrega de la mercadería se realiza en perfecto estado de conservación y embalaje.
                  Garantía de cambio válida por 30 días corridos presentando este comprobante.
                </p>
              </div>

              {/* Right Totals Box */}
              <div className="sm:col-span-5 rounded-xl border-2 border-slate-900 overflow-hidden bg-white">
                <div className="p-2.5 space-y-1 text-xs">
                  {isInvoiceA ? (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <span className="font-semibold">Subtotal Neto Gravado</span>
                        <span className="font-mono font-bold">{formatMoney(netAmount, curr)}</span>
                      </div>
                      <div className="flex justify-between text-blue-700 font-semibold">
                        <span>IVA Débito Fiscal 21%</span>
                        <span className="font-mono">{formatMoney(vatAmount21 > 0 ? vatAmount21 : vatAmount, curr)}</span>
                      </div>
                      {vatAmount105 > 0 && (
                        <div className="flex justify-between text-blue-700 font-semibold">
                          <span>IVA Débito Fiscal 10.5%</span>
                          <span className="font-mono">{formatMoney(vatAmount105, curr)}</span>
                        </div>
                      )}
                      {vatAmount27 > 0 && (
                        <div className="flex justify-between text-blue-700 font-semibold">
                          <span>IVA Débito Fiscal 27%</span>
                          <span className="font-mono">{formatMoney(vatAmount27, curr)}</span>
                        </div>
                      )}
                      {exemptAmount > 0 && (
                        <div className="flex justify-between text-slate-600 font-semibold">
                          <span>Operaciones Exentas</span>
                          <span className="font-mono">{formatMoney(exemptAmount, curr)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal mercadería</span>
                      <span className="font-mono font-semibold">{money(subtotal)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>
                        Descuento {sale.discount_percent ? `(${sale.discount_percent}%)` : ""}
                      </span>
                      <span className="font-mono">- {money(discount)}</span>
                    </div>
                  )}
                  {Number(sale.vat_amount || sale.vat_charge || 0) > 0 && (
                    <div className="flex justify-between text-blue-700 font-semibold">
                      <span>Cargo IVA (+{sale.vat_rate || 21}%)</span>
                      <span className="font-mono shrink-0">+ {formatMoney(Number(sale.vat_amount || sale.vat_charge), curr)}</span>
                    </div>
                  )}
                  {Number(sale.additional_charge || 0) > 0 && (
                    <div className="flex justify-between text-blue-700 font-semibold">
                      <span className="truncate pr-2">
                        Cargo Adicional {sale.additional_charge_description ? `(${sale.additional_charge_description})` : ""}
                      </span>
                      <span className="font-mono shrink-0">+ {money(Number(sale.additional_charge))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900">
                    <span>Total Facturado ({curr === "BRL" ? "R$ BRL" : curr === "USD" ? "US$ USD" : "$ ARS"})</span>
                    <span className="font-mono text-sm">{formatMoney(total, curr)}</span>
                  </div>

                  {isInvoiceB && (
                    <p className="text-[9px] text-slate-500 italic text-right leading-tight">
                      El importe total incluye IVA s/ Ley 23.349.
                    </p>
                  )}
                  {isInvoiceC && (
                    <p className="text-[9px] text-slate-500 italic text-right leading-tight">
                      Régimen Simplificado (Monotributo).
                    </p>
                  )}
                  {isInvoiceX && (
                    <p className="text-[9px] text-slate-500 italic text-right leading-tight">
                      Documento no válido como factura.
                    </p>
                  )}

                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 my-1 space-y-1 text-slate-800">
                    <div className="flex justify-between font-bold text-xs">
                      <span>Moneda de cobro</span>
                      <span>{curr === "BRL" ? "🇧🇷 Reales (R$ BRL)" : curr === "USD" ? "🇺🇸 Dólares (US$ USD)" : "🇦🇷 Pesos ($ ARS)"}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Cotización aplicada</span>
                      <span>
                        {curr === "USD"
                          ? `1 US$ = R$ ${usdRate.toFixed(2)} BRL`
                          : `1 R$ = $${brlRate.toLocaleString("es-AR")} ARS`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 border-t border-slate-200 pt-1">
                      <span>Equivalencias</span>
                      <span className="font-mono font-medium">
                        {curr === "BRL"
                          ? `${moneyArs(totalArs)} · ${moneyUsd(totalUsd)}`
                          : curr === "USD"
                          ? `${moneyBrl(totalBrl)} · ${moneyArs(totalArs)}`
                          : `${moneyBrl(totalBrl)} · ${moneyUsd(totalUsd)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Monto Abonado</span>
                    <span className="font-mono">
                      {formatMoney(paidCur, curr)}
                    </span>
                  </div>
                  {debtCur > 0 && (
                    <div className="flex justify-between text-red-600 font-black border-t border-dashed border-red-200 pt-1">
                      <span>Saldo Deudor (Deuda)</span>
                      <span className="font-mono">
                        {formatMoney(debtCur, curr)}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`p-2.5 flex items-center justify-between text-white ${
                  sale.status === "pago_parcial"
                    ? "bg-amber-600"
                    : sale.status === "con_deuda"
                    ? "bg-red-700"
                    : "bg-slate-900"
                }`}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      {sale.status === "pago_parcial"
                        ? "PAGO PARCIAL"
                        : sale.status === "con_deuda"
                        ? "VENTA A DEUDA"
                        : "PAGADA TOTAL"}
                    </span>
                    <span className="text-[10px] opacity-80 font-mono">
                      Cobro en {curr === "BRL" ? "Reales (BRL)" : curr === "USD" ? "Dólares (USD)" : "Pesos (ARS)"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black tracking-tight font-mono block">
                      {formatMoney(paidCur, curr)}
                    </span>
                    {curr !== "BRL" && (
                      <span className="text-[10px] opacity-80 font-mono">
                        Base: {moneyBrl(paidBrl)}
                      </span>
                    )}
                    {curr === "BRL" && (
                      <span className="text-[10px] opacity-80 font-mono">
                        Eq. {moneyArs(paidArs)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* REMITO CONFORMITY SIGNATURE SECTION */}
            <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
              <div className="flex flex-col items-center justify-end">
                <div className="w-48 border-b border-dashed border-slate-500 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Firma del Receptor
                </span>
                <span className="text-[9px] text-slate-400">Recibí conforme mercadería</span>
              </div>

              <div className="flex flex-col items-center justify-end">
                <div className="w-48 border-b border-dashed border-slate-500 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Aclaración y DNI
                </span>
                <span className="text-[9px] text-slate-400">Responsable de recepción</span>
              </div>
            </div>

            {/* BARCODE FOOTER */}
            <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[9px] text-slate-500 text-center sm:text-left">
                <p className="font-semibold text-slate-700">
                  {businessName} · Sistema de Gestión Comercial & Facturación
                </p>
                <p>
                  {isInvoiceX
                    ? "Comprobante de uso interno y control de mercadería entregada."
                    : `Comprobante Fiscal Homologado · ${afipCode} · Impuesto al Valor Agregado (AFIP)`}
                </p>
              </div>

              <InvoiceBarcode value={receiptNo} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
