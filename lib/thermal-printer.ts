import JsBarcode from "jsbarcode";
import { formatMoney } from "@/lib/currency";

export interface ThermalSalePrintData {
  sale: any;
  settings?: any;
  paperWidth?: "80mm" | "58mm";
}

export interface ThermalCashPrintData {
  movement: any;
  settings?: any;
  paperWidth?: "80mm" | "58mm";
}

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
  if (!value) return "";
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
};

/**
 * Genera un código de barra en formato base64 usando JsBarcode sobre un canvas temporal
 */
function generateBarcodeBase64(value: string): string {
  if (typeof document === "undefined" || !value) return "";
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, String(value).trim(), {
      format: "CODE128",
      width: 1.6,
      height: 38,
      displayValue: true,
      fontSize: 10,
      margin: 4,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("No se pudo generar el código de barra para el ticket térmico:", err);
    return "";
  }
}

/**
 * Imprime un ticket térmico de venta discreto y profesional
 */
export function printSaleThermalTicket({ sale, settings = {}, paperWidth = "80mm" }: ThermalSalePrintData) {
  if (typeof window === "undefined" || !sale) return;

  const businessName = settings.business_name || "CR BAZAR";
  const branchName = settings.branch_name || "Sucursal Principal";
  const address = settings.address || "";
  const phone = settings.phone || settings.whatsapp || "";
  const receiptNo = sale.receipt_no || "TICKET";

  const curr = (sale.currency || settings.currency || "ARS") as "ARS" | "BRL" | "USD";
  const items: any[] = Array.isArray(sale.items) ? sale.items : [];
  const totalUnits = items.reduce((acc, it) => acc + Number(it.quantity || 1), 0);
  const subtotal = Number(sale.subtotal || sale.total || 0);
  const discount = Number(sale.discount || 0);
  const additionalCharge = Number(sale.additional_charge || 0);
  const total = Number(sale.total || 0);
  const paidAmount = Number(sale.paid_amount !== undefined ? sale.paid_amount : total);
  const debtAmount = Math.max(0, total - paidAmount);
  const paymentMethod = sale.payment_method || "Efectivo";

  const customerName = sale.customer_name && sale.customer_name !== "Consumidor final" && sale.customer_name !== "Consumidor Final"
    ? sale.customer_name
    : "Consumidor Final";

  const customerDoc = sale.customer_document ? String(sale.customer_document).trim() : "";
  const cashierName = sale.cashier_name || "";

  const barcodeImg = generateBarcodeBase64(receiptNo);
  const is58mm = paperWidth === "58mm";

  const printHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Ticket - ${receiptNo}</title>
  <style>
    @page {
      size: ${is58mm ? "58mm auto" : "80mm auto"};
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: ${is58mm ? "2mm 2mm 8mm 2mm" : "3mm 4mm 10mm 4mm"};
      width: ${is58mm ? "54mm" : "74mm"};
      max-width: 100%;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, monospace, 'Segoe UI', Arial, sans-serif;
      font-size: ${is58mm ? "11px" : "12px"};
      line-height: 1.25;
      text-align: left;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    
    .divider {
      border-top: 1px dashed #000000;
      margin: 4px 0;
    }
    .divider-double {
      border-top: 2px solid #000000;
      margin: 5px 0;
    }

    /* Encabezado */
    .brand-title {
      font-size: ${is58mm ? "14px" : "16px"};
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: ${is58mm ? "9.5px" : "11px"};
      font-weight: normal;
      margin-bottom: 2px;
    }
    .brand-info {
      font-size: ${is58mm ? "9px" : "10px"};
      margin-bottom: 3px;
    }

    /* Metadatos */
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? "9.5px" : "11px"};
      margin: 1.5px 0;
    }

    /* Tabla de artículos */
    .items-table {
      width: 100%;
      margin: 4px 0;
      border-collapse: collapse;
    }
    .items-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: ${is58mm ? "9.5px" : "10.5px"};
      padding-bottom: 2px;
      border-bottom: 1px dashed #000000;
      margin-bottom: 3px;
    }
    .item-block {
      margin-bottom: 4px;
    }
    .item-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: ${is58mm ? "10px" : "11.5px"};
    }
    .item-desc {
      font-size: ${is58mm ? "8.5px" : "9.5px"};
      padding-left: 14px;
      opacity: 0.85;
    }

    /* Totales */
    .totals-block {
      margin: 4px 0;
      font-size: ${is58mm ? "10px" : "11.5px"};
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 1.5px 0;
    }
    .grand-total {
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? "13px" : "15px"};
      font-weight: 900;
      padding: 3px 0;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      margin: 4px 0;
    }

    /* Pie de ticket */
    .footer-block {
      text-align: center;
      margin-top: 6px;
      font-size: ${is58mm ? "9px" : "10px"};
      line-height: 1.35;
    }
    .footer-highlight {
      font-weight: bold;
      font-size: ${is58mm ? "10px" : "11px"};
      margin-bottom: 2px;
    }
    .barcode-container {
      margin-top: 6px;
      text-align: center;
    }
    .barcode-container img {
      max-width: ${is58mm ? "46mm" : "58mm"};
      height: auto;
    }

    /* Espacio de corte */
    .cut-feed {
      height: 15mm;
    }
  </style>
</head>
<body>
  <!-- Encabezado del Local -->
  <div class="text-center">
    <div class="brand-title">${businessName}</div>
    ${branchName ? `<div class="brand-subtitle">${branchName}</div>` : ""}
    ${address ? `<div class="brand-info">${address}</div>` : ""}
    ${phone ? `<div class="brand-info">Tel / WhatsApp: ${phone}</div>` : ""}
  </div>

  <div class="divider"></div>

  <!-- Información de la Venta -->
  <div class="meta-row">
    <span><strong>Ticket:</strong> ${receiptNo}</span>
    <span><strong>${dateFmt(sale.created_at)}</strong> ${timeFmt(sale.created_at)}</span>
  </div>
  <div class="meta-row">
    <span>Cliente: ${customerName}</span>
    ${customerDoc ? `<span>Doc: ${customerDoc}</span>` : ""}
  </div>
  ${cashierName ? `<div class="meta-row"><span>Atendido por: ${cashierName}</span></div>` : ""}

  <div class="divider"></div>

  <!-- Detalle de Productos -->
  <div class="items-header">
    <span style="width: 25px;">CANT</span>
    <span style="flex: 1; padding: 0 4px;">DESCRIPCIÓN</span>
    <span style="width: 55px; text-align: right;">TOTAL</span>
  </div>

  ${items.map((item) => {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.unit_price || 0);
    const itemTotal = Number(item.total || (qty * unitPrice));
    const extraDetails = [
      item.size && !["Único", "Unico", "General", "Estándar"].includes(item.size) ? `Talle: ${item.size}` : null,
      item.sku ? `Cód: ${item.sku}` : null,
      qty > 1 ? `(${qty} x ${formatMoney(unitPrice, curr)})` : null,
    ].filter(Boolean).join(" · ");

    return `
      <div class="item-block">
        <div class="item-main">
          <span style="width: 25px; font-weight: bold;">${qty}</span>
          <span style="flex: 1; padding: 0 4px; font-weight: bold;">${item.name}</span>
          <span style="width: 55px; text-align: right; font-weight: bold;">${formatMoney(itemTotal, curr)}</span>
        </div>
        ${extraDetails ? `<div class="item-desc">${extraDetails}</div>` : ""}
      </div>
    `;
  }).join("")}

  <div class="divider"></div>

  <!-- Totales y Pago -->
  <div class="totals-block">
    <div class="meta-row">
      <span>Total de artículos:</span>
      <span>${totalUnits} ${totalUnits === 1 ? "unidad" : "unidades"}</span>
    </div>

    ${discount > 0 ? `
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${formatMoney(subtotal, curr)}</span>
      </div>
      <div class="total-row">
        <span>Descuento${sale.discount_percent ? ` (${sale.discount_percent}%)` : ""}:</span>
        <span>-${formatMoney(discount, curr)}</span>
      </div>
    ` : ""}

    ${additionalCharge > 0 ? `
      <div class="total-row">
        <span>Cargo Adicional:</span>
        <span>+${formatMoney(additionalCharge, curr)}</span>
      </div>
    ` : ""}

    <div class="grand-total">
      <span>TOTAL:</span>
      <span>${formatMoney(total, curr)}</span>
    </div>

    <div class="total-row">
      <span>Forma de pago:</span>
      <span><strong>${paymentMethod}</strong></span>
    </div>

    ${debtAmount > 0 ? `
      <div class="total-row" style="color: #000; font-weight: bold;">
        <span>Monto abonado:</span>
        <span>${formatMoney(paidAmount, curr)}</span>
      </div>
      <div class="total-row" style="font-weight: 900;">
        <span>SALDO PENDIENTE:</span>
        <span>${formatMoney(debtAmount, curr)}</span>
      </div>
      <div style="margin-top: 15px; text-align: center;">
        <div style="border-top: 1px dashed #000; width: 80%; margin: 0 auto 3px auto;"></div>
        <div style="font-size: 9px;">Firma del cliente (Conforme saldo)</div>
      </div>
    ` : `
      <div class="total-row">
        <span>Estado:</span>
        <span><strong>PAGADO TOTAL</strong></span>
      </div>
    `}
  </div>

  <div class="divider-double"></div>

  <!-- Mensaje de Despedida -->
  <div class="footer-block">
    <div class="footer-highlight">¡GRACIAS POR TU COMPRA!</div>
    <div>Conservá este comprobante para cambios</div>
    <div>dentro de los 30 días de realizada la compra.</div>
  </div>

  ${barcodeImg ? `
    <div class="barcode-container">
      <img src="${barcodeImg}" alt="${receiptNo}" />
    </div>
  ` : ""}

  <!-- Espacio para corte de papel -->
  <div class="cut-feed"></div>
</body>
</html>`;

  executeThermalPrint(printHtml, receiptNo);
}

/**
 * Imprime un ticket térmico de movimiento de caja (ingreso / egreso)
 */
export function printCashThermalTicket({ movement, settings = {}, paperWidth = "80mm" }: ThermalCashPrintData) {
  if (typeof window === "undefined" || !movement) return;

  const businessName = settings.business_name || "CR BAZAR";
  const branchName = settings.branch_name || "Sucursal Principal";
  const isIncome = movement.type === "ingreso";
  const receiptNo = `CAJA-${String(movement.id).slice(-6).toUpperCase()}`;
  const amount = Number(movement.amount || 0);
  const is58mm = paperWidth === "58mm";

  const printHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Movimiento de Caja - ${receiptNo}</title>
  <style>
    @page {
      size: ${is58mm ? "58mm auto" : "80mm auto"};
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: ${is58mm ? "2mm 2mm 8mm 2mm" : "3mm 4mm 10mm 4mm"};
      width: ${is58mm ? "54mm" : "74mm"};
      max-width: 100%;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier New', Courier, monospace, 'Segoe UI', Arial, sans-serif;
      font-size: ${is58mm ? "11px" : "12px"};
      line-height: 1.25;
    }
    .text-center { text-align: center; }
    .divider { border-top: 1px dashed #000000; margin: 4px 0; }
    .divider-double { border-top: 2px solid #000000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 11px; }
    .amount-box {
      font-size: 15px;
      font-weight: 900;
      border: 1px solid #000;
      padding: 5px;
      text-align: center;
      margin: 6px 0;
    }
    .cut-feed { height: 12mm; }
  </style>
</head>
<body>
  <div class="text-center">
    <div style="font-size: 15px; font-weight: 900; text-transform: uppercase;">${businessName}</div>
    ${branchName ? `<div style="font-size: 10px;">${branchName}</div>` : ""}
    <div style="font-size: 11px; font-weight: bold; margin-top: 3px;">
      COMPROBANTE DE ${isIncome ? "INGRESO" : "EGRESO"}
    </div>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span><strong>N°:</strong> ${receiptNo}</span>
    <span><strong>${dateFmt(movement.created_at)}</strong> ${timeFmt(movement.created_at)}</span>
  </div>
  <div class="row">
    <span>Categoría: ${movement.category || "General"}</span>
  </div>
  ${movement.description ? `<div class="row"><span>Concepto: ${movement.description}</span></div>` : ""}
  ${movement.reference ? `<div class="row"><span>Ref: ${movement.reference}</span></div>` : ""}

  <div class="amount-box">
    ${isIncome ? "+ " : "- "}${formatMoney(amount, "ARS")}
  </div>

  <div class="divider"></div>

  <div style="margin-top: 20px; text-align: center;">
    <div style="border-top: 1px dashed #000; width: 75%; margin: 0 auto 3px auto;"></div>
    <div style="font-size: 9px;">Firma y Aclaración (Responsable)</div>
  </div>

  <div class="cut-feed"></div>
</body>
</html>`;

  executeThermalPrint(printHtml, receiptNo);
}

/**
 * Función interna para enviar el HTML al iframe de impresión
 */
function executeThermalPrint(html: string, title: string) {
  try {
    const existingFrame = document.getElementById("thermal-print-frame");
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "thermal-print-frame";
    iframe.setAttribute(
      "style",
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;"
    );
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.error("No se pudo acceder al documento del iframe de impresión térmica.");
      window.print();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Error al disparar iframe.contentWindow.print:", e);
        window.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }
    }, 250);
  } catch (err) {
    console.error("Error general en executeThermalPrint:", err);
    window.print();
  }
}

