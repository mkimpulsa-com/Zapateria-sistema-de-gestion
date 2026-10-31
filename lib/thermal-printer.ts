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

export interface ThermalShiftPrintData {
  shift: any;
  settings?: any;
  paperWidth?: "80mm" | "58mm";
}

/**
 * Normaliza y sanea cualquier texto para impresoras térmicas ESC/POS:
 * - Elimina acentos/tildes diacríticas (ó -> o, í -> i, etc.)
 * - Convierte la ñ/Ñ en n/N
 * - Reemplaza espacios de no separación (\\u00A0) por espacio ASCII estándar (evita caracteres extraños como 'ù' o '¿')
 * - Reemplaza guiones largos (—, –) y puntos medios (·) por guión estándar (-)
 * - Reemplaza viñetas (•, ●) por asterisco (*)
 * - Reemplaza comillas tipográficas por comillas ASCII
 */
export function cleanThermalText(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[ñ]/g, "n")
    .replace(/[Ñ]/g, "N")
    .replace(/\u00A0/g, " ") // espacio indivisible a espacio simple
    .replace(/[—–]/g, "-")
    .replace(/[•●▪]/g, "*")
    .replace(/·/g, "-")
    .replace(/°/g, ".")
    .replace(/[«»“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[¡]/g, "")
    .replace(/[¿]/g, "")
    .trim();
}

/**
 * Formatea un monto monetario para impresora térmica asegurando caracteres 100% compatibles
 */
export function thermalMoney(value: number | string | null | undefined, curr: string = "ARS"): string {
  const n = Number(value || 0);
  const formatted = n.toLocaleString("es-AR", {
    minimumFractionDigits: curr === "ARS" ? 0 : 2,
    maximumFractionDigits: curr === "ARS" ? 0 : 2,
  }).replace(/\u00A0/g, " ");

  const symbol = curr === "USD" ? "US$" : (curr === "BRL" ? "R$" : "$");
  return `${symbol} ${formatted}`;
}

const dateFmt = (value?: string) => {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return cleanThermalText(value);
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
      width: 1.5,
      height: 32,
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
 * Imprime un ticket térmico de venta discreto, limpio y profesional
 */
export function printSaleThermalTicket({ sale, settings = {}, paperWidth = "80mm" }: ThermalSalePrintData) {
  if (typeof window === "undefined" || !sale) return;

  const rawBusinessName = settings.business_name || "CR BAZAR";
  const businessName = cleanThermalText(rawBusinessName).toUpperCase();
  const branchName = cleanThermalText(settings.branch_name || "");
  const address = cleanThermalText(settings.address || "");
  const phone = cleanThermalText(settings.phone || settings.whatsapp || "");
  const receiptNo = cleanThermalText(sale.receipt_no || "TICKET");

  const curr = (sale.currency || settings.currency || "ARS") as "ARS" | "BRL" | "USD";
  const items: any[] = Array.isArray(sale.items) ? sale.items : [];
  const totalUnits = items.reduce((acc, it) => acc + Number(it.quantity || 1), 0);
  const subtotal = Number(sale.subtotal || sale.total || 0);
  const discount = Number(sale.discount || 0);
  const additionalCharge = Number(sale.additional_charge || 0);
  const total = Number(sale.total || 0);
  const paidAmount = Number(sale.paid_amount !== undefined ? sale.paid_amount : total);
  const debtAmount = Math.max(0, total - paidAmount);
  const rawPayment = sale.payment_method || "Efectivo";
  const paymentMethod = cleanThermalText(rawPayment);

  const rawCustomerName = sale.customer_name && sale.customer_name !== "Consumidor final" && sale.customer_name !== "Consumidor Final"
    ? sale.customer_name
    : "Consumidor Final";
  const customerName = cleanThermalText(rawCustomerName);
  const customerDoc = sale.customer_document ? cleanThermalText(String(sale.customer_document).trim()) : "";
  const cashierName = sale.cashier_name ? cleanThermalText(sale.cashier_name) : "";

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
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: ${is58mm ? "2mm 2mm 6mm 2mm" : "3mm 4mm 8mm 4mm"};
      width: ${is58mm ? "54mm" : "74mm"};
      max-width: 100%;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace, sans-serif;
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
      margin-bottom: 2px;
    }

    /* Metadatos */
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? "9.5px" : "11px"};
      margin: 1.5px 0;
    }

    /* Tabla de artículos */
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
      margin-bottom: 3px;
    }
    .item-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: ${is58mm ? "10px" : "11.5px"};
    }
    .col-qty {
      width: ${is58mm ? "20px" : "26px"};
      flex-shrink: 0;
      font-weight: bold;
    }
    .col-desc {
      flex: 1;
      padding: 0 4px;
      word-break: break-word;
    }
    .col-tot {
      width: ${is58mm ? "55px" : "70px"};
      text-align: right;
      flex-shrink: 0;
      font-weight: bold;
      white-space: nowrap;
    }
    .item-desc {
      font-size: ${is58mm ? "8.5px" : "9.5px"};
      padding-left: ${is58mm ? "20px" : "26px"};
      color: #333333;
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
      max-width: ${is58mm ? "46mm" : "56mm"};
      height: auto;
    }

    /* Espacio de corte */
    .cut-feed {
      height: 12mm;
    }
  </style>
</head>
<body>
  <!-- Encabezado del Local -->
  <div class="text-center">
    <div class="brand-title">${businessName}</div>
    ${branchName ? `<div class="brand-subtitle">${branchName}</div>` : ""}
    ${address ? `<div class="brand-info">${address}</div>` : ""}
    ${phone ? `<div class="brand-info">Tel: ${phone}</div>` : ""}
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
    <span class="col-qty">CANT</span>
    <span class="col-desc">DESCRIPCION</span>
    <span class="col-tot">TOTAL</span>
  </div>

  ${items.map((item) => {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.unit_price || 0);
    const itemTotal = Number(item.total || (qty * unitPrice));
    const name = cleanThermalText(item.name || "Articulo");
    const size = cleanThermalText(item.size || "");
    const sku = cleanThermalText(item.sku || "");

    const extraDetails = [
      size && !["Unico", "General", "Estandar"].includes(size) ? `Var: ${size}` : null,
      sku ? `Cod: ${sku}` : null,
      qty > 1 ? `(${qty} x ${thermalMoney(unitPrice, curr)})` : null,
    ].filter(Boolean).join(" - ");

    return `
      <div class="item-block">
        <div class="item-main">
          <span class="col-qty">${qty}</span>
          <span class="col-desc font-bold">${name}</span>
          <span class="col-tot font-bold">${thermalMoney(itemTotal, curr)}</span>
        </div>
        ${extraDetails ? `<div class="item-desc">${extraDetails}</div>` : ""}
      </div>
    `;
  }).join("")}

  <div class="divider"></div>

  <!-- Totales y Pago -->
  <div class="totals-block">
    <div class="meta-row">
      <span>Total de articulos:</span>
      <span>${totalUnits} ${totalUnits === 1 ? "unidad" : "unidades"}</span>
    </div>

    ${discount > 0 ? `
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${thermalMoney(subtotal, curr)}</span>
      </div>
      <div class="total-row">
        <span>Descuento${sale.discount_percent ? ` (${sale.discount_percent}%)` : ""}:</span>
        <span>-${thermalMoney(discount, curr)}</span>
      </div>
    ` : ""}

    ${additionalCharge > 0 ? `
      <div class="total-row">
        <span>Cargo Adicional:</span>
        <span>+${thermalMoney(additionalCharge, curr)}</span>
      </div>
    ` : ""}

    <div class="grand-total">
      <span>TOTAL:</span>
      <span>${thermalMoney(total, curr)}</span>
    </div>

    <div class="total-row">
      <span>Medio de pago:</span>
      <span><strong>${paymentMethod}</strong></span>
    </div>

    ${debtAmount > 0 ? `
      <div class="total-row" style="color: #000; font-weight: bold;">
        <span>Monto abonado:</span>
        <span>${thermalMoney(paidAmount, curr)}</span>
      </div>
      <div class="total-row" style="font-weight: 900;">
        <span>SALDO PENDIENTE:</span>
        <span>${thermalMoney(debtAmount, curr)}</span>
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

  <!-- Mensaje de Despedida Discreto -->
  <div class="footer-block">
    <div class="footer-highlight">GRACIAS POR SU COMPRA</div>
    <div>Cambios dentro de los 30 dias</div>
    <div>presentando este comprobante.</div>
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
 * Imprime el ticket térmico de Cierre y Arqueo Z de Caja (Turno)
 */
export function printShiftCloseThermalTicket({ shift, settings = {}, paperWidth = "80mm" }: ThermalShiftPrintData) {
  if (typeof window === "undefined" || !shift) return;

  const rawBusinessName = settings.business_name || "CR BAZAR";
  const businessName = cleanThermalText(rawBusinessName).toUpperCase();
  const branchName = cleanThermalText(settings.branch_name || "");
  const shiftNumber = shift.shift_number || 1;
  const is58mm = paperWidth === "58mm";

  const initialCash = Number(shift.initial_cash || 0);
  const cashSales = Number(shift.cash_sales || 0);
  const otherSales = Number(shift.other_sales || 0);
  const totalSales = Number(shift.total_sales || (cashSales + otherSales));
  const salesCount = Number(shift.sales_count || 0);
  const cashIncomes = Number(shift.cash_incomes || 0);
  const cashExpenses = Number(shift.cash_expenses || 0);
  const expectedCash = Number(shift.expected_cash || 0);
  const actualCash = Number(shift.actual_cash !== undefined ? shift.actual_cash : expectedCash);
  const difference = Number(shift.difference !== undefined ? shift.difference : (actualCash - expectedCash));
  const withdrawnCash = Number(shift.withdrawn_cash || 0);
  const retainedCash = Number(shift.retained_cash !== undefined ? shift.retained_cash : (actualCash - withdrawnCash));

  const diffLabel = difference === 0 
    ? "EXACTA ($ 0)" 
    : difference > 0 
      ? `SOBRANTE (+${thermalMoney(difference, "ARS")})` 
      : `FALTANTE (-${thermalMoney(Math.abs(difference), "ARS")})`;

  const openedByName = cleanThermalText(shift.opened_by_name || "Administrador");
  const closedByName = cleanThermalText(shift.closed_by_name || "Administrador");

  const printHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Cierre de Caja - Turno #${shiftNumber}</title>
  <style>
    @page {
      size: ${is58mm ? "58mm auto" : "80mm auto"};
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: ${is58mm ? "2mm 2mm 6mm 2mm" : "3mm 4mm 8mm 4mm"};
      width: ${is58mm ? "54mm" : "74mm"};
      max-width: 100%;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace, sans-serif;
      font-size: ${is58mm ? "10.5px" : "11.5px"};
      line-height: 1.25;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000000; margin: 4px 0; }
    .divider-double { border-top: 2px solid #000000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 1.5px 0; }
    .title {
      font-size: ${is58mm ? "13px" : "15px"};
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .subtitle {
      font-size: ${is58mm ? "10.5px" : "12px"};
      font-weight: bold;
      margin-top: 2px;
    }
    .highlight-box {
      border: 1px solid #000;
      padding: 4px;
      margin: 4px 0;
    }
    .grand-row {
      display: flex;
      justify-content: space-between;
      font-size: ${is58mm ? "12px" : "13.5px"};
      font-weight: 900;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 2.5px 0;
      margin: 3px 0;
    }
    .cut-feed { height: 12mm; }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">${businessName}</div>
    ${branchName ? `<div>${branchName}</div>` : ""}
    <div class="subtitle">CIERRE Y ARQUEO DE CAJA</div>
    <div class="font-bold">TURNO N. ${shiftNumber}</div>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span>Apertura:</span>
    <span>${dateFmt(shift.opened_at)} ${timeFmt(shift.opened_at)}</span>
  </div>
  <div class="row">
    <span>Abierto por:</span>
    <span><strong>${openedByName}</strong></span>
  </div>

  <div class="row" style="margin-top: 3px;">
    <span>Cierre:</span>
    <span>${dateFmt(shift.closed_at)} ${timeFmt(shift.closed_at)}</span>
  </div>
  <div class="row">
    <span>Cerrado por:</span>
    <span><strong>${closedByName}</strong></span>
  </div>

  <div class="divider"></div>

  <!-- MOVIMIENTOS EN EFECTIVO -->
  <div class="font-bold text-center" style="margin: 2px 0;">CONTROL DE EFECTIVO (CAJON)</div>

  <div class="row">
    <span>(+) Fondo Inicial de Caja:</span>
    <span>${thermalMoney(initialCash, "ARS")}</span>
  </div>
  <div class="row">
    <span>(+) Ventas en Efectivo (${salesCount}):</span>
    <span>${thermalMoney(cashSales, "ARS")}</span>
  </div>
  ${cashIncomes > 0 ? `
    <div class="row">
      <span>(+) Ingresos / Aportes Caja:</span>
      <span>+${thermalMoney(cashIncomes, "ARS")}</span>
    </div>
  ` : ""}
  ${cashExpenses > 0 ? `
    <div class="row">
      <span>(-) Retiros / Gastos Caja:</span>
      <span>-${thermalMoney(cashExpenses, "ARS")}</span>
    </div>
  ` : ""}

  <div class="divider"></div>

  <div class="row font-bold">
    <span>EFECTIVO ESPERADO:</span>
    <span>${thermalMoney(expectedCash, "ARS")}</span>
  </div>
  <div class="row font-bold" style="font-size: ${is58mm ? "11.5px" : "13px"};">
    <span>EFECTIVO REAL CONTADO:</span>
    <span>${thermalMoney(actualCash, "ARS")}</span>
  </div>

  <div class="highlight-box">
    <div class="row font-bold">
      <span>DIFERENCIA:</span>
      <span>${diffLabel}</span>
    </div>
  </div>

  <div class="divider"></div>

  <!-- DESTINO DE FONDOS -->
  <div class="font-bold text-center" style="margin: 2px 0;">DESTINO DEL EFECTIVO</div>
  <div class="row">
    <span>Retiro / Entrega Tesoreria:</span>
    <span><strong>${thermalMoney(withdrawnCash, "ARS")}</strong></span>
  </div>
  <div class="row">
    <span>Queda en Cajon (Sig. Turno):</span>
    <span><strong>${thermalMoney(retainedCash, "ARS")}</strong></span>
  </div>

  <div class="divider"></div>

  <!-- OTROS MEDIOS DE PAGO -->
  <div class="font-bold text-center" style="margin: 2px 0;">TOTAL FACTURADO DEL TURNO</div>
  <div class="row">
    <span>Ventas Efectivo:</span>
    <span>${thermalMoney(cashSales, "ARS")}</span>
  </div>
  <div class="row">
    <span>Transferencia / Tarjeta:</span>
    <span>${thermalMoney(otherSales, "ARS")}</span>
  </div>
  <div class="grand-row">
    <span>TOTAL VENDIDO:</span>
    <span>${thermalMoney(totalSales, "ARS")}</span>
  </div>

  ${shift.closing_notes ? `
    <div class="divider"></div>
    <div style="font-size: 9.5px; margin: 3px 0;">
      <strong>Observaciones:</strong> ${cleanThermalText(shift.closing_notes)}
    </div>
  ` : ""}

  <div class="divider-double"></div>

  <!-- FIRMAS DE CONFORMIDAD -->
  <div style="margin-top: 16px; text-align: center;">
    <div style="border-top: 1px dashed #000; width: 75%; margin: 0 auto 2px auto;"></div>
    <div style="font-size: 9px;">Firma Cajero (${closedByName})</div>
  </div>

  <div style="margin-top: 16px; text-align: center;">
    <div style="border-top: 1px dashed #000; width: 75%; margin: 0 auto 2px auto;"></div>
    <div style="font-size: 9px;">Firma Encargado / Supervisor</div>
  </div>

  <div class="cut-feed"></div>
</body>
</html>`;

  executeThermalPrint(printHtml, `Cierre-Turno-${shiftNumber}`);
}

/**
 * Imprime un ticket térmico de movimiento de caja (ingreso / egreso)
 */
export function printCashThermalTicket({ movement, settings = {}, paperWidth = "80mm" }: ThermalCashPrintData) {
  if (typeof window === "undefined" || !movement) return;

  const rawBusinessName = settings.business_name || "CR BAZAR";
  const businessName = cleanThermalText(rawBusinessName).toUpperCase();
  const branchName = cleanThermalText(settings.branch_name || "");
  const isIncome = movement.type === "ingreso";
  const receiptNo = `CAJA-${String(movement.id).slice(-6).toUpperCase()}`;
  const amount = Number(movement.amount || 0);
  const is58mm = paperWidth === "58mm";
  const category = cleanThermalText(movement.category || "General");
  const description = cleanThermalText(movement.description || "");
  const reference = cleanThermalText(movement.reference || "");

  const printHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Movimiento de Caja - ${receiptNo}</title>
  <style>
    @page {
      size: ${is58mm ? "58mm auto" : "80mm auto"};
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: ${is58mm ? "2mm 2mm 6mm 2mm" : "3mm 4mm 8mm 4mm"};
      width: ${is58mm ? "54mm" : "74mm"};
      max-width: 100%;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace, sans-serif;
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
    <span><strong>N.:</strong> ${receiptNo}</span>
    <span><strong>${dateFmt(movement.created_at)}</strong> ${timeFmt(movement.created_at)}</span>
  </div>
  <div class="row">
    <span>Categoria: ${category}</span>
  </div>
  ${description ? `<div class="row"><span>Concepto: ${description}</span></div>` : ""}
  ${reference ? `<div class="row"><span>Ref: ${reference}</span></div>` : ""}

  <div class="amount-box">
    ${isIncome ? "+ " : "- "}${thermalMoney(amount, "ARS")}
  </div>

  <div class="divider"></div>

  <div style="margin-top: 18px; text-align: center;">
    <div style="border-top: 1px dashed #000; width: 75%; margin: 0 auto 3px auto;"></div>
    <div style="font-size: 9px;">Firma y Aclaracion (Responsable)</div>
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
      "position:fixed;top:-9999px;left:-9999px;width:80mm;height:400px;border:0;opacity:0;pointer-events:none;"
    );
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      console.warn("No se pudo acceder al iframe de impresion termica, usando ventana auxiliar.");
      openPrintWindow(html);
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
        console.warn("Fallo impresion por iframe, abriendo ventana auxiliar:", e);
        openPrintWindow(html);
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }
    }, 250);
  } catch (err) {
    console.warn("Error general en executeThermalPrint, usando ventana auxiliar:", err);
    openPrintWindow(html);
  }
}

/**
 * Fallback seguro que abre una pequeña ventana para imprimir sólo el ticket térmico
 * sin afectar la interfaz principal de la aplicación
 */
function openPrintWindow(html: string) {
  try {
    const win = window.open("", "_blank", "width=380,height=550,top=100,left=100");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      try {
        win.print();
        setTimeout(() => {
          try {
            win.close();
          } catch {}
        }, 800);
      } catch {}
    }, 250);
  } catch (e) {
    console.error("No se pudo abrir la ventana de impresion termica:", e);
  }
}
